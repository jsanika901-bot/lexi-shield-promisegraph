import {
  getGenerativeModel,
  InferenceMode,
  InferenceSource,
} from 'firebase/ai';
import { PRELIMINARY_DISCLAIMER } from '../../data/presets';
import type {
  AnalysisReport,
  EvidenceItem,
  HealthStatus,
  InferenceEngineId,
  ModuleId,
  VerificationPriority,
} from '../../types/lexi';
import {
  getFirebaseRuntimeInstances,
  getFirebaseRuntimeStatus,
} from '../firebase/firebaseConfig';
import { runLocalDeterministicAnalysis } from './localAnalyzer';

export interface InferenceProvider {
  readonly id: InferenceEngineId;
  readonly label: string;
  isAvailable(): Promise<boolean>;
  analyze(
    mode: Exclude<ModuleId, 'dashboard' | 'vault'>,
    items: EvidenceItem[],
    focusPrompt?: string
  ): Promise<AnalysisReport>;
}

const HYBRID_SYSTEM_INSTRUCTION = `You are LEXI-SHIELD, an analytical cross-document verification and cybersecurity risk intelligence engine.
Examine user-submitted messages, employment offers, contracts, and payment requests objectively.

CRITICAL RULES:
1. NEVER declare a person guilty or label someone a "scammer" or "criminal".
2. Distinguish employer-paid salary/compensation (e.g. CTC per annum) from candidate-paid upfront fees.
3. Only compare payment/response deadlines across documents that actually contain a deadline.
4. Classify unilateral arbitration clauses under legal governance/dispute resolution, never under payment risk.
5. Return ONLY valid JSON matching:
{
  "overallPriority": "low" | "moderate" | "high",
  "executiveSummary": "string",
  "extractedClaims": [{ "id": "string", "documentId": "string", "documentTitle": "string", "documentType": "string", "category": "compensation|fee_waiver|fee_demand|payment_channel|identity|timeline|obligation|termination|governance|urgency", "statement": "string", "exactQuote": "string", "polarity": "promise|demand|restriction|neutral" }],
  "contradictions": [{ "id": "string", "claimAId": "string", "claimBId": "string", "docAId": "string", "docBId": "string", "docATitle": "string", "docBTitle": "string", "quoteA": "string", "quoteB": "string", "conflictType": "string", "explanation": "string", "severity": "moderate|high", "verificationQuestion": "string" }],
  "indicators": [{ "id": "string", "title": "string", "category": "string", "level": "low|moderate|high", "summary": "string", "evidenceQuote": "string", "recommendedCheck": "string" }],
  "verificationQuestions": ["string"],
  "clarificationDraft": "string"
}`;

function sanitizePriority(val: unknown): VerificationPriority {
  if (val === 'high' || val === 'moderate' || val === 'low') {
    return val;
  }
  return 'moderate';
}

function buildEvidencePrompt(
  mode: Exclude<ModuleId, 'dashboard' | 'vault'>,
  items: EvidenceItem[],
  focusPrompt?: string
): string {
  const formattedDocs = items
    .map((item, index) => {
      const metaEntries = item.metadata
        ? Object.entries(item.metadata)
            .filter(([, v]) => Boolean(v))
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ')
        : '';
      return [
        `--- EVIDENCE ITEM ${index + 1} ---`,
        `ID: ${item.id}`,
        `Title: ${item.title}`,
        `Type: ${item.type}`,
        item.sourceLabel ? `Source: ${item.sourceLabel}` : '',
        metaEntries ? `Structured Fields: ${metaEntries}` : '',
        `Content:\n${item.content}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  return [
    `Analysis Mode: ${mode}`,
    focusPrompt ? `Focus: ${focusPrompt}` : '',
    'Extract claims, detect genuine cross-document contradictions, list verification signals separately, and provide human verification questions.',
    '',
    formattedDocs,
  ]
    .filter(Boolean)
    .join('\n');
}

function parseJsonModelText(rawText: string): Record<string, unknown> {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

/**
 * Real Firebase AI Logic Hybrid Inference provider using `firebase/ai`:
 * - Uses `InferenceMode.PREFER_ON_DEVICE` with `gemini-2.5-flash` cloud fallback.
 * - Reports actual live path (`On-Device Nano`, `Firebase Cloud`, or `Local Deterministic Fallback`).
 */
export const FirebaseAILogicAdapter: InferenceProvider & {
  getIntegrationStatus(): {
    connected: boolean;
    onDeviceReady: boolean;
    cloudFallbackReady: boolean;
    projectId?: string;
    aiBackend: 'googleai' | 'vertexai';
    statusNote: string;
  };
} = {
  id: 'firebase-ai-logic-hybrid',
  label: 'Firebase AI Logic Hybrid Inference',
  async isAvailable() {
    const status = getFirebaseRuntimeStatus();
    return status.configured && status.aiReady;
  },
  getIntegrationStatus() {
    const status = getFirebaseRuntimeStatus();
    const hasPromptApi =
      typeof window !== 'undefined' &&
      Boolean((window as unknown as { LanguageModel?: unknown }).LanguageModel);

    if (status.configured && status.aiReady) {
      return {
        connected: true,
        onDeviceReady: hasPromptApi,
        cloudFallbackReady: true,
        projectId: status.projectId,
        aiBackend: status.aiBackend,
        statusNote: `Connected to Firebase project "${status.projectId}" (${status.aiBackend === 'vertexai' ? 'Vertex/Agent Platform' : 'Google AI Backend'}) with PREFER_ON_DEVICE + gemini-2.5-flash fallback.`,
      };
    }

    return {
      connected: false,
      onDeviceReady: hasPromptApi,
      cloudFallbackReady: false,
      aiBackend: status.aiBackend,
      statusNote:
        'Firebase Web Config not set. Click "Firebase Hybrid" in the header to paste your Firebase Web Config JSON, or configure VITE_FIREBASE_* env vars.',
    };
  },
  async analyze(mode, items, focusPrompt) {
    const { ai } = getFirebaseRuntimeInstances();
    const status = getFirebaseRuntimeStatus();

    if (!ai || !status.configured) {
      const fallback = runLocalDeterministicAnalysis(mode, items);
      return {
        ...fallback,
        engineUsed: 'firebase-ai-logic-hybrid',
        engineLabel: 'Firebase Hybrid (Local Fallback)',
        inferencePath: 'local-deterministic-fallback',
        inferencePathLabel: 'Local Deterministic Fallback',
        fallbackReason:
          'Firebase Web Config is not configured yet — ran deterministic local verification instead.',
      };
    }

    try {
      const model = getGenerativeModel(ai, {
        mode: InferenceMode.PREFER_ON_DEVICE,
        onDeviceParams: {
          createOptions: {
            initialPrompts: [
              {
                role: 'system',
                content: [{ type: 'text', value: HYBRID_SYSTEM_INSTRUCTION }],
              },
            ],
          },
        },
        inCloudParams: {
          model: 'gemini-2.5-flash',
          systemInstruction: HYBRID_SYSTEM_INSTRUCTION,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        },
      });

      const prompt = buildEvidencePrompt(mode, items, focusPrompt);
      const result = await model.generateContent(prompt);
      const response = result.response;
      const rawText = response.text();
      const parsed = parseJsonModelText(rawText);

      const isOnDevice = response.inferenceSource === InferenceSource.ON_DEVICE;
      const inferencePath = isOnDevice ? 'on-device-nano' : 'firebase-cloud';
      const inferencePathLabel = isOnDevice ? 'On-Device Nano' : 'Firebase Cloud';

      return {
        id: `rep_fb_${Date.now()}`,
        mode,
        title:
          items.length > 1
            ? `Cross-Document PromiseGraph (${items.length} items)`
            : `${items[0]?.title || 'Evidence'} Verification`,
        engineUsed: 'firebase-ai-logic-hybrid',
        engineLabel: `Firebase AI Logic (${inferencePathLabel})`,
        inferencePath,
        inferencePathLabel,
        modelName: isOnDevice ? 'gemini-nano (on-device)' : 'gemini-2.5-flash',
        timestamp: new Date().toISOString(),
        overallPriority: sanitizePriority(parsed.overallPriority),
        executiveSummary: String(parsed.executiveSummary || ''),
        sourceDocumentIds: items.map((i) => i.id),
        extractedClaims: Array.isArray(parsed.extractedClaims)
          ? (parsed.extractedClaims as AnalysisReport['extractedClaims'])
          : [],
        contradictions: Array.isArray(parsed.contradictions)
          ? (parsed.contradictions as AnalysisReport['contradictions'])
          : [],
        indicators: Array.isArray(parsed.indicators)
          ? (parsed.indicators as AnalysisReport['indicators'])
          : [],
        verificationQuestions: Array.isArray(parsed.verificationQuestions)
          ? (parsed.verificationQuestions as string[])
          : [],
        clarificationDraft: parsed.clarificationDraft
          ? String(parsed.clarificationDraft)
          : undefined,
        disclaimer: PRELIMINARY_DISCLAIMER,
      };
    } catch (err: unknown) {
      const reason =
        err instanceof Error
          ? err.message
          : 'Firebase AI Logic on-device and cloud calls were unavailable.';
      const fallback = runLocalDeterministicAnalysis(mode, items);
      return {
        ...fallback,
        engineUsed: 'firebase-ai-logic-hybrid',
        engineLabel: 'Firebase Hybrid (Local Fallback)',
        inferencePath: 'local-deterministic-fallback',
        inferencePathLabel: 'Local Deterministic Fallback',
        fallbackReason: reason,
      };
    }
  },
};

export async function fetchBackendHealth(): Promise<HealthStatus> {
  const fbStatus = getFirebaseRuntimeStatus();
  try {
    const res = await fetch('/api/health');
    if (!res.ok) {
      throw new Error(`Health check failed (${res.status})`);
    }
    const serverHealth = (await res.json()) as HealthStatus;
    return {
      ...serverHealth,
      firebaseAILogicConnected: fbStatus.configured && fbStatus.aiReady,
      firestoreConnected: fbStatus.firestoreConnected,
    };
  } catch {
    return {
      ok: false,
      serverGeminiConfigured: false,
      model: 'gemini-4-hydrogen',
      firebaseAILogicConnected: fbStatus.configured && fbStatus.aiReady,
      firestoreConnected: fbStatus.firestoreConnected,
    };
  }
}

export async function runVerificationAnalysis(params: {
  engine: InferenceEngineId;
  mode: Exclude<ModuleId, 'dashboard' | 'vault'>;
  items: EvidenceItem[];
  focusPrompt?: string;
}): Promise<AnalysisReport> {
  const { engine, mode, items, focusPrompt } = params;

  if (engine === 'firebase-ai-logic-hybrid') {
    return FirebaseAILogicAdapter.analyze(mode, items, focusPrompt);
  }

  if (engine === 'local-deterministic') {
    return runLocalDeterministicAnalysis(mode, items);
  }

  // Server-side Gemini AI path — never fabricates or silently masks server errors
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode,
      focusPrompt,
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        sourceLabel: item.sourceLabel,
        content: item.content,
        metadata: item.metadata,
      })),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.message === 'string'
        ? payload.message
        : `Server AI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (!payload?.report) {
    throw new Error('Server returned an unexpected response format.');
  }

  const report = payload.report as AnalysisReport;
  return {
    ...report,
    inferencePath: 'server-gemini',
    inferencePathLabel: 'Server Gemini API',
  };
}

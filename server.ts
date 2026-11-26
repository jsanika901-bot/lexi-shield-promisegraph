import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_NAME = 'gemini-4-hydrogen';

const PRELIMINARY_DISCLAIMER =
  'Preliminary verification aid only: LEXI-SHIELD highlights textual inconsistencies, unusual payment patterns, and clauses that warrant independent human verification. It does not determine guilt, accuse any individual, or provide legal advice.';

const SYSTEM_INSTRUCTION = `You are LEXI-SHIELD, an analytical cross-document verification and cybersecurity risk intelligence engine.
Your role is to examine user-submitted messages, employment offers, contracts, and payment requests objectively.

CRITICAL ETHICAL & ACCURACY CONSTRAINTS:
1. NEVER declare a person guilty, call someone a "scammer", "criminal", or "fraudster", or claim certainty of illegal intent.
2. Frame all findings strictly as verifiable signals, textual contradictions, anomalies, and reasons to pause and verify independently.
3. Quote exact phrases from the provided documents when identifying claims, contradictions, or indicators.
4. Provide practical, non-escalatory verification questions the user can ask through official channels.
5. Keep language crisp, objective, plain-spoken, and actionable for mobile and desktop readers.`;

const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    overallPriority: {
      type: Type.STRING,
      description: 'Must be one of: low, moderate, high',
    },
    executiveSummary: {
      type: Type.STRING,
      description: 'Concise 2-3 sentence objective summary of what aligns and what requires verification.',
    },
    extractedClaims: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          documentId: { type: Type.STRING },
          documentTitle: { type: Type.STRING },
          documentType: { type: Type.STRING },
          category: {
            type: Type.STRING,
            description:
              'One of: fee_waiver, fee_demand, payment_channel, identity, timeline, obligation, termination, urgency',
          },
          statement: { type: Type.STRING },
          exactQuote: { type: Type.STRING },
          polarity: {
            type: Type.STRING,
            description: 'One of: promise, demand, restriction, neutral',
          },
        },
        required: [
          'id',
          'documentId',
          'documentTitle',
          'documentType',
          'category',
          'statement',
          'exactQuote',
          'polarity',
        ],
      },
    },
    contradictions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          claimAId: { type: Type.STRING },
          claimBId: { type: Type.STRING },
          docAId: { type: Type.STRING },
          docBId: { type: Type.STRING },
          docATitle: { type: Type.STRING },
          docBTitle: { type: Type.STRING },
          quoteA: { type: Type.STRING },
          quoteB: { type: Type.STRING },
          conflictType: { type: Type.STRING },
          explanation: { type: Type.STRING },
          severity: {
            type: Type.STRING,
            description: 'One of: moderate, high',
          },
          verificationQuestion: { type: Type.STRING },
        },
        required: [
          'id',
          'claimAId',
          'claimBId',
          'docAId',
          'docBId',
          'docATitle',
          'docBTitle',
          'quoteA',
          'quoteB',
          'conflictType',
          'explanation',
          'severity',
          'verificationQuestion',
        ],
      },
    },
    indicators: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          level: {
            type: Type.STRING,
            description: 'One of: low, moderate, high',
          },
          summary: { type: Type.STRING },
          evidenceQuote: { type: Type.STRING },
          recommendedCheck: { type: Type.STRING },
        },
        required: ['id', 'title', 'category', 'level', 'summary', 'evidenceQuote', 'recommendedCheck'],
      },
    },
    contractFindings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          clauseTopic: { type: Type.STRING },
          level: { type: Type.STRING },
          excerpt: { type: Type.STRING },
          plainExplanation: { type: Type.STRING },
          clarificationPrompt: { type: Type.STRING },
        },
        required: ['id', 'clauseTopic', 'level', 'excerpt', 'plainExplanation', 'clarificationPrompt'],
      },
    },
    verificationQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    clarificationDraft: {
      type: Type.STRING,
      description: 'Polite, professional verification message the user can send to the counterparty.',
    },
  },
  required: [
    'overallPriority',
    'executiveSummary',
    'extractedClaims',
    'contradictions',
    'indicators',
    'verificationQuestions',
  ],
};

function sanitizePriority(val: unknown): 'low' | 'moderate' | 'high' {
  if (val === 'high' || val === 'moderate' || val === 'low') {
    return val;
  }
  return 'moderate';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      serverGeminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
      model: MODEL_NAME,
      firebaseAILogicConnected: false,
      firestoreConnected: false,
    });
  });

  app.post('/api/analyze', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        error: 'SERVER_GEMINI_UNCONFIGURED',
        message:
          'Server-side Gemini API key is not configured in this environment. You can run Local Rule-Based Verification or configure GEMINI_API_KEY.',
      });
      return;
    }

    const body = req.body as {
      mode?: string;
      items?: Array<{
        id: string;
        title: string;
        type: string;
        sourceLabel?: string;
        content: string;
        metadata?: Record<string, string | undefined>;
      }>;
      focusPrompt?: string;
    };

    const items = Array.isArray(body?.items) ? body.items : [];
    const mode = body?.mode || 'promisegraph';

    if (items.length === 0) {
      res.status(400).json({
        error: 'MISSING_EVIDENCE',
        message: 'At least one evidence document or message is required for analysis.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

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

      const prompt = [
        `Analysis Mode: ${mode}`,
        body.focusPrompt ? `User Focus: ${body.focusPrompt}` : '',
        'Examine the following evidence items carefully. Extract concrete claims/promises, identify any cross-document contradictions (especially around fees, payment channels, identities, deadlines, or obligations), flag verification indicators with exact quotes, and draft practical human verification questions.',
        '',
        formattedDocs,
      ]
        .filter(Boolean)
        .join('\n');

      const runWithRetry = async () => {
        let lastErr: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await ai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt,
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: analysisResponseSchema,
              },
            });
          } catch (err: unknown) {
            lastErr = err;
            const msg = err instanceof Error ? err.message : String(err);
            const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE');
            if (!isTransient || attempt === 2) {
              throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
          }
        }
        throw lastErr;
      };

      const response = await runWithRetry();

      const rawText = response.text;
      if (!rawText) {
        res.status(502).json({
          error: 'EMPTY_MODEL_RESPONSE',
          message: 'The server AI model returned an empty response. Please try again.',
        });
        return;
      }

      const parsed = JSON.parse(rawText);

      const report = {
        id: `rep_${Date.now()}`,
        mode,
        title:
          items.length > 1
            ? `Cross-Document PromiseGraph (${items.length} items)`
            : `${items[0].title} Verification`,
        engineUsed: 'server-gemini',
        engineLabel: 'Server-Side Gemini AI',
        modelName: MODEL_NAME,
        timestamp: new Date().toISOString(),
        overallPriority: sanitizePriority(parsed.overallPriority),
        executiveSummary: String(parsed.executiveSummary || ''),
        sourceDocumentIds: items.map((i) => i.id),
        extractedClaims: Array.isArray(parsed.extractedClaims) ? parsed.extractedClaims : [],
        contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions : [],
        indicators: Array.isArray(parsed.indicators) ? parsed.indicators : [],
        contractFindings: Array.isArray(parsed.contractFindings) ? parsed.contractFindings : undefined,
        verificationQuestions: Array.isArray(parsed.verificationQuestions) ? parsed.verificationQuestions : [],
        clarificationDraft: parsed.clarificationDraft ? String(parsed.clarificationDraft) : undefined,
        disclaimer: PRELIMINARY_DISCLAIMER,
      };

      res.json({ report });
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : 'Unexpected server AI error';
      let cleanMessage = rawMessage;
      try {
        const maybeJson = JSON.parse(rawMessage);
        if (maybeJson?.error?.message) {
          cleanMessage = String(maybeJson.error.message);
        }
      } catch {
        // Keep rawMessage when not JSON
      }

      const status =
        rawMessage.includes('403') || rawMessage.includes('PERMISSION_DENIED')
          ? 403
          : rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')
            ? 429
            : rawMessage.includes('503') || rawMessage.includes('UNAVAILABLE')
              ? 503
              : 500;
      res.status(status).json({
        error: 'GEMINI_REQUEST_FAILED',
        message: cleanMessage,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LEXI-SHIELD server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start LEXI-SHIELD server:', err);
  process.exit(1);
});

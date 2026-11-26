export type ModuleId =
  | 'dashboard'
  | 'scanner'
  | 'contracts'
  | 'payments'
  | 'promisegraph'
  | 'rights'
  | 'vault';

export type EvidenceType =
  | 'job_offer'
  | 'contract'
  | 'message'
  | 'payment_request'
  | 'email'
  | 'invoice';

export type VerificationPriority = 'low' | 'moderate' | 'high';

export type InferenceEngineId =
  | 'server-gemini'
  | 'local-deterministic'
  | 'firebase-ai-logic-hybrid';

export type InferencePathId =
  | 'on-device-nano'
  | 'firebase-cloud'
  | 'server-gemini'
  | 'local-deterministic'
  | 'local-deterministic-fallback';

export type ClaimCategory =
  | 'compensation'
  | 'fee_waiver'
  | 'fee_demand'
  | 'payment_channel'
  | 'identity'
  | 'timeline'
  | 'obligation'
  | 'termination'
  | 'governance'
  | 'urgency';

export type ClaimPolarity = 'promise' | 'demand' | 'restriction' | 'neutral';

export interface EvidenceItem {
  id: string;
  title: string;
  type: EvidenceType;
  sourceLabel: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  includedInGraph: boolean;
  metadata?: {
    payeeName?: string;
    paymentHandle?: string;
    requestedAmount?: string;
    organizationName?: string;
  };
}

export interface ExtractedClaim {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: EvidenceType;
  category: ClaimCategory;
  statement: string;
  exactQuote: string;
  polarity: ClaimPolarity;
}

export interface ContradictionLink {
  id: string;
  claimAId: string;
  claimBId: string;
  docAId: string;
  docBId: string;
  docATitle: string;
  docBTitle: string;
  quoteA: string;
  quoteB: string;
  conflictType: string;
  explanation: string;
  severity: 'moderate' | 'high';
  verificationQuestion: string;
}

export interface RiskIndicator {
  id: string;
  title: string;
  category: string;
  level: VerificationPriority;
  summary: string;
  evidenceQuote: string;
  recommendedCheck: string;
}

export interface ContractClauseFinding {
  id: string;
  clauseTopic: string;
  level: VerificationPriority;
  excerpt: string;
  plainExplanation: string;
  clarificationPrompt: string;
}

export interface AnalysisReport {
  id: string;
  mode: Exclude<ModuleId, 'dashboard' | 'vault'>;
  title: string;
  engineUsed: InferenceEngineId;
  engineLabel: string;
  inferencePath?: InferencePathId;
  inferencePathLabel?: string;
  fallbackReason?: string;
  modelName?: string;
  timestamp: string;
  overallPriority: VerificationPriority;
  executiveSummary: string;
  sourceDocumentIds: string[];
  extractedClaims: ExtractedClaim[];
  contradictions: ContradictionLink[];
  indicators: RiskIndicator[];
  contractFindings?: ContractClauseFinding[];
  verificationQuestions: string[];
  clarificationDraft?: string;
  disclaimer: string;
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

export interface FirebaseRuntimeSettings {
  config: FirebaseWebConfig | null;
  appCheckSiteKey?: string;
  appCheckDebugToken?: string;
  aiBackend: 'googleai' | 'vertexai';
  source: 'localStorage' | 'env' | 'none';
}

export interface FirebaseRuntimeStatus {
  configured: boolean;
  source: 'localStorage' | 'env' | 'none';
  projectId?: string;
  aiReady: boolean;
  aiBackend: 'googleai' | 'vertexai';
  appCheckActive: boolean;
  appCheckMode: 'recaptcha-v3' | 'debug-token' | 'unconfigured';
  firestoreReady: boolean;
  firestoreConnected: boolean;
  firestoreError?: string;
  lastError?: string;
}

export interface HealthStatus {
  ok: boolean;
  serverGeminiConfigured: boolean;
  model: string;
  firebaseAILogicConnected: boolean;
  firestoreConnected: boolean;
}

export interface SavedVaultDossier {
  id: string;
  sourceReportId?: string;
  title: string;
  notes: string;
  savedAt: string;
  cloudSynced?: boolean;
  cloudSyncedAt?: string;
  evidenceItems: EvidenceItem[];
  report?: AnalysisReport;
}

export interface VaultSaveResult {
  ok: boolean;
  storageBackend: 'local-storage' | 'firestore-and-local';
  firestoreConnected: boolean;
  cloudSynced: boolean;
  cloudError?: string;
  dossierId?: string;
  message: string;
  error?: string;
  counts?: {
    documents: number;
    claims: number;
    conflicts: number;
    signals: number;
    questions: number;
  };
}

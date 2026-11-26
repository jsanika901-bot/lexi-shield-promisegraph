import {
  ArrowRight,
  CreditCard,
  FileSearch,
  FolderLock,
  GitCompare,
  Scale,
  ScanSearch,
  Shield,
} from 'lucide-react';
import type {
  AnalysisReport,
  EvidenceItem,
  FirebaseRuntimeStatus,
  HealthStatus,
  ModuleId,
  SavedVaultDossier,
} from '../../types/lexi';
import { DisclaimerBanner } from '../shared/DisclaimerBanner';

interface DashboardOverviewProps {
  onNavigate: (module: ModuleId) => void;
  onLaunchFlagshipCase: () => void;
  onReopenDossier: (dossier: SavedVaultDossier) => void;
  evidenceItems: EvidenceItem[];
  savedReports: AnalysisReport[];
  savedDossiers: SavedVaultDossier[];
  health: HealthStatus;
  firebaseStatus: FirebaseRuntimeStatus;
  onOpenFirebaseConfig: () => void;
}

const MODULES: Array<{
  id: Exclude<ModuleId, 'dashboard'>;
  index: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  icon: typeof ScanSearch;
  featured?: boolean;
}> = [
  {
    id: 'promisegraph',
    index: '01',
    title: 'PROMISEGRAPH',
    subtitle:
      'Compare job offers, contracts, and recruiter or payment messages side-by-side to uncover hidden contradictions.',
    actionLabel: 'Open PromiseGraph',
    icon: GitCompare,
    featured: true,
  },
  {
    id: 'scanner',
    index: '02',
    title: 'Smart Scam Scanner',
    subtitle:
      'Inspect suspicious SMS, WhatsApp messages, or emails for urgency pressure, impersonation cues, and unverified links.',
    actionLabel: 'Scan Message',
    icon: ScanSearch,
  },
  {
    id: 'contracts',
    index: '03',
    title: 'Contract Intelligence',
    subtitle:
      'Analyze employment offers, NDAs, and freelance agreements for hidden fees, lock-in bonds, and one-sided clauses.',
    actionLabel: 'Review Contract',
    icon: FileSearch,
  },
  {
    id: 'payments',
    index: '04',
    title: 'Payment Risk Analyzer',
    subtitle:
      'Verify UPI handles, beneficiary details, and upfront deposit requests before transferring funds.',
    actionLabel: 'Check Payment',
    icon: CreditCard,
  },
  {
    id: 'rights',
    index: '05',
    title: 'Digital Rights Assistant',
    subtitle:
      'Follow structured verification checklists, draft polite clarification messages, and view official reporting directories.',
    actionLabel: 'Open Assistant',
    icon: Scale,
  },
  {
    id: 'vault',
    index: '06',
    title: 'Evidence Vault',
    subtitle:
      'Store captured evidence items, cross-check snapshots, and export preliminary verification dossiers.',
    actionLabel: 'Open Vault',
    icon: FolderLock,
  },
];

export function DashboardOverview({
  onNavigate,
  onLaunchFlagshipCase,
  onReopenDossier,
  evidenceItems,
  savedReports,
  savedDossiers,
  health,
  firebaseStatus,
  onOpenFirebaseConfig,
}: DashboardOverviewProps) {
  return (
    <div className="space-y-8">
      {/* Hero Workspace Banner */}
      <section className="rounded-2xl border border-slate-800 bg-[#0B1221] p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-blue-400 font-medium">
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                Cross-Document Verification System
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {firebaseStatus.configured && firebaseStatus.aiReady
                  ? `Firebase Hybrid AI Live (${firebaseStatus.projectId})`
                  : health.serverGeminiConfigured
                    ? `Server Gemini AI Ready (${health.model})`
                    : 'Local Rule Engine Ready · Hybrid AI Standby'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white text-balance leading-tight">
              One Promise. Multiple Documents. One Intelligence System.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Compare employment offers, onboarding contracts, payment requests, and chat messages together in one workspace to spot contradictions before you transfer money or sign.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onLaunchFlagshipCase}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Launch 3-Document PromiseGraph Demo
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('scanner')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-700 bg-[#060911] hover:bg-slate-800/80 text-sm font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Paste Message to Scan
              </button>
            </div>
          </div>

          {/* Factual Workspace State Summary */}
          <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-[#060911] p-5 space-y-4">
            <p className="text-xs font-medium text-slate-400">Workspace Readiness</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">Active Evidence</p>
                <p className="text-2xl font-bold text-white tabular-nums mt-0.5">
                  {evidenceItems.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Saved Reports</p>
                <p className="text-2xl font-bold text-white tabular-nums mt-0.5">
                  {savedReports.length}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800/90 space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center justify-between gap-2">
                <span>Local Rule Verification</span>
                <span className="text-emerald-400 font-medium">Available</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Server Gemini AI</span>
                <span className={health.serverGeminiConfigured ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                  {health.serverGeminiConfigured ? 'Configured' : 'Key Not Set'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Firebase Hybrid AI</span>
                <button
                  type="button"
                  onClick={onOpenFirebaseConfig}
                  className={`font-medium cursor-pointer hover:underline ${
                    firebaseStatus.aiReady ? 'text-emerald-400' : 'text-blue-400'
                  }`}
                >
                  {firebaseStatus.aiReady ? 'Connected' : 'Configure'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Cloud Firestore</span>
                <span
                  className={
                    firebaseStatus.firestoreConnected
                      ? 'text-emerald-400 font-medium'
                      : 'text-slate-400'
                  }
                >
                  {firebaseStatus.firestoreConnected ? 'Connected' : 'Local Only'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Core Modules Grid */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Verification Modules</h2>
          <span className="text-xs text-slate-400">6 Core Workspaces</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onNavigate(mod.id)}
                className={`group text-left rounded-2xl border p-5 transition-colors flex flex-col justify-between gap-5 cursor-pointer min-h-[168px] ${
                  mod.featured
                    ? 'border-blue-500/40 bg-[#0D172B] hover:border-blue-500/70'
                    : 'border-slate-800 bg-[#0B1221] hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#060911] border border-slate-800 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-blue-400" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-mono text-slate-500 tabular-nums">{mod.index}</span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white">{mod.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mt-1.5">
                      {mod.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-medium text-blue-400 group-hover:text-blue-300">
                  <span>{mod.actionLabel}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {savedDossiers.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Saved Vault Snapshots</h2>
            <button
              type="button"
              onClick={() => onNavigate('vault')}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              View All in Vault
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedDossiers.slice(0, 4).map((dossier) => (
              <div
                key={dossier.id}
                className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="tabular-nums">
                      {new Date(dossier.savedAt).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{dossier.evidenceItems.length} docs</span>
                    {dossier.report && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {dossier.report.extractedClaims.length} claims
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {dossier.report.contradictions.length} conflicts
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white">{dossier.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{dossier.notes}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <span
                    className={`text-[11px] ${
                      dossier.cloudSynced ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {dossier.cloudSynced
                      ? 'Cloud Firestore synced'
                      : firebaseStatus.firestoreConnected
                        ? 'Local cache · Firestore ready'
                        : 'Local storage · Firestore not connected'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onReopenDossier(dossier)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Reopen Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <DisclaimerBanner />
    </div>
  );
}

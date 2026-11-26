import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  Database,
  FileWarning,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import type { AnalysisReport, VaultSaveResult, VerificationPriority } from '../../types/lexi';

function getPriorityPresentation(level: VerificationPriority) {
  if (level === 'high') {
    return {
      label: 'High Verification Priority',
      icon: ShieldAlert,
      textColor: 'text-red-400',
      borderColor: 'border-red-500/30',
      surface: 'bg-red-500/5',
    };
  }
  if (level === 'moderate') {
    return {
      label: 'Needs Independent Verification',
      icon: AlertTriangle,
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      surface: 'bg-amber-500/5',
    };
  }
  return {
    label: 'Low Detected Inconsistency',
    icon: ShieldCheck,
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    surface: 'bg-emerald-500/5',
  };
}

interface AnalysisResultCardsProps {
  report: AnalysisReport;
  onSendToRightsAssistant?: (report: AnalysisReport) => void;
  onSaveReport?: (report: AnalysisReport) => void;
  saveResult?: VaultSaveResult | null;
}

export function AnalysisResultCards({
  report,
  onSendToRightsAssistant,
  onSaveReport,
  saveResult,
}: AnalysisResultCardsProps) {
  const [copiedDraft, setCopiedDraft] = useState(false);
  const priority = getPriorityPresentation(report.overallPriority);
  const PriorityIcon = priority.icon;

  const copyDraft = async () => {
    if (!report.clarificationDraft) return;
    try {
      await navigator.clipboard.writeText(report.clarificationDraft);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Verification Summary Card */}
      <div className={`rounded-2xl border ${priority.borderColor} ${priority.surface} p-5 sm:p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 font-semibold ${priority.textColor}`}>
                <PriorityIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {priority.label}
              </span>
              <span aria-hidden="true">·</span>
              <span>{report.engineLabel}</span>
              {report.inferencePathLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-blue-300 font-medium">
                    Path: {report.inferencePathLabel}
                  </span>
                </>
              )}
              {report.modelName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-300">{report.modelName}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-semibold text-white">{report.title}</h3>
            <p className="text-sm text-slate-200 leading-relaxed max-w-3xl">{report.executiveSummary}</p>
            {report.fallbackReason && (
              <p className="text-xs text-amber-300/90 leading-relaxed">
                Hybrid fallback notice: {report.fallbackReason}
              </p>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
            {onSaveReport && (
              <button
                type="button"
                onClick={() => onSaveReport(report)}
                className={`min-h-[44px] px-4 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  saveResult?.ok
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-950/60'
                    : 'border-slate-700 bg-[#0B1221] hover:bg-slate-800 text-white'
                }`}
              >
                {saveResult?.ok ? 'Saved Locally to Vault' : 'Save to Evidence Vault'}
              </button>
            )}
            {onSendToRightsAssistant && (
              <button
                type="button"
                onClick={() => onSendToRightsAssistant(report)}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Verification Steps
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Explicit Save Success / Error & Honest Firestore Status Banner */}
        {saveResult && (
          <div
            role={saveResult.ok ? 'status' : 'alert'}
            className={`mt-4 rounded-xl border p-3.5 flex items-start gap-2.5 text-xs ${
              saveResult.ok
                ? 'border-emerald-500/35 bg-emerald-950/30 text-emerald-200'
                : 'border-red-500/40 bg-red-950/30 text-red-200'
            }`}
          >
            {saveResult.ok ? (
              <Database className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="space-y-1">
              <p className="font-medium leading-relaxed">{saveResult.message}</p>
              {saveResult.ok ? (
                saveResult.cloudSynced ? (
                  <p className="text-emerald-300">
                    Persistence status: Cloud Firestore synced + Browser Local Storage offline cache active.
                  </p>
                ) : (
                  <p className="text-slate-300">
                    Persistence status: Browser Local Storage active · Firebase Firestore is{' '}
                    <span className="font-semibold text-amber-300">
                      {saveResult.firestoreConnected ? 'sync failed' : 'not connected'}
                    </span>
                    {saveResult.cloudError ? ` (${saveResult.cloudError})` : ' (no cloud sync)'}.
                  </p>
                )
              ) : (
                saveResult.error && <p className="text-red-300">{saveResult.error}</p>
              )}
            </div>
          </div>
        )}

        {/* Factual Count Summary Row (tabular numerals, clean hairline divider) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-800/80">
          <div>
            <p className="text-xs text-slate-400">Source Documents</p>
            <p className="text-xl font-semibold text-white tabular-nums mt-0.5">
              {report.sourceDocumentIds.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Claims Extracted</p>
            <p className="text-xl font-semibold text-white tabular-nums mt-0.5">
              {report.extractedClaims.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Contradictions</p>
            <p className="text-xl font-semibold text-white tabular-nums mt-0.5">
              {report.contradictions.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Signals to Verify</p>
            <p className="text-xl font-semibold text-white tabular-nums mt-0.5">
              {report.indicators.length}
            </p>
          </div>
        </div>
      </div>

      {/* Extracted Claims Section */}
      {report.extractedClaims.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h4 className="text-base font-semibold text-white">Extracted Claims & Promises</h4>
            <span className="text-xs text-slate-400 tabular-nums">
              {report.extractedClaims.length} claim{report.extractedClaims.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.extractedClaims.map((claim) => (
              <div
                key={claim.id}
                className="rounded-xl border border-slate-800 bg-[#0B1221] p-4 space-y-2"
              >
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span
                    className={
                      claim.polarity === 'promise'
                        ? 'text-emerald-400 font-medium'
                        : claim.polarity === 'demand'
                          ? 'text-amber-400 font-medium'
                          : claim.polarity === 'restriction'
                            ? 'text-red-400 font-medium'
                            : 'text-slate-300 font-medium'
                    }
                  >
                    {claim.polarity === 'promise'
                      ? 'Promise / Waiver'
                      : claim.polarity === 'demand'
                        ? 'Payment / Fee Demand'
                        : claim.polarity === 'restriction'
                          ? 'Restriction / Pressure'
                          : 'Statement'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{claim.documentTitle}</span>
                </div>
                <p className="text-sm text-white font-medium leading-snug">{claim.statement}</p>
                <p className="text-xs font-mono text-slate-300 bg-[#060911] border border-slate-800/90 rounded-lg p-2.5 break-words">
                  “{claim.exactQuote}”
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contradictions Section */}
      {report.contradictions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h4 className="text-base font-semibold text-white">Cross-Document Contradictions</h4>
            <span className="text-xs text-slate-400 tabular-nums">
              {report.contradictions.length} conflict{report.contradictions.length === 1 ? '' : 's'} flagged
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {report.contradictions.map((c) => {
              const isHigh = c.severity === 'high';
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          isHigh ? 'text-red-400' : 'text-amber-400'
                        }`}
                      >
                        <FileWarning className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {isHigh ? 'Direct Contradiction' : 'Discrepancy'}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-slate-300 font-medium">{c.conflictType}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-[#060911] border border-slate-800/90 p-3.5 space-y-1.5">
                      <p className="text-xs font-medium text-blue-400 truncate">{c.docATitle}</p>
                      <p className="text-sm text-slate-200 leading-relaxed">“{c.quoteA}”</p>
                    </div>
                    <div className="rounded-xl bg-[#060911] border border-amber-500/30 p-3.5 space-y-1.5">
                      <p className="text-xs font-medium text-amber-400 truncate">{c.docBTitle}</p>
                      <p className="text-sm text-slate-200 leading-relaxed">“{c.quoteB}”</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">{c.explanation}</p>

                  <div className="pt-3 border-t border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300">
                    <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-medium text-white">Suggested Verification Question: </span>
                      <span>{c.verificationQuestion}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Verification Signals / Risk Indicators */}
      {report.indicators.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h4 className="text-base font-semibold text-white">Verification Signals</h4>
            <span className="text-xs text-slate-400 tabular-nums">
              {report.indicators.length} indicator{report.indicators.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.indicators.map((ind) => {
              const p = getPriorityPresentation(ind.level);
              const Icon = p.icon;
              return (
                <div
                  key={ind.id}
                  className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1.5 font-medium ${p.textColor}`}>
                        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        {ind.level === 'high'
                          ? 'High Priority'
                          : ind.level === 'moderate'
                            ? 'Verify'
                            : 'Advisory'}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-slate-400">{ind.category}</span>
                    </div>

                    <h5 className="text-sm font-semibold text-white">{ind.title}</h5>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{ind.summary}</p>

                    {ind.evidenceQuote && (
                      <p className="text-xs font-mono text-slate-300 bg-[#060911] border border-slate-800/90 rounded-lg p-2.5 break-words">
                        “{ind.evidenceQuote}”
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-300">
                    <span className="font-medium text-blue-400">Next check: </span>
                    {ind.recommendedCheck}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Questions & Polite Clarification Draft */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 space-y-3">
          <h4 className="text-sm font-semibold text-white">Questions to Confirm Before Proceeding</h4>
          <ul className="space-y-2.5">
            {report.verificationQuestions.map((q, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>

        {report.clarificationDraft && (
          <div className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-white">Polite Verification Request Draft</h4>
              <button
                type="button"
                onClick={copyDraft}
                className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" />
                {copiedDraft ? 'Copied' : 'Copy Draft'}
              </button>
            </div>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-[#060911] border border-slate-800/90 rounded-xl p-3.5">
              {report.clarificationDraft}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

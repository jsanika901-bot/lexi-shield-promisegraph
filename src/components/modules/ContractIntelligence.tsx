import { AlertCircle, AlertTriangle, FileSearch, GitCompare, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { CONTRACT_PRESETS } from '../../data/presets';
import { runVerificationAnalysis } from '../../services/inference/hybridInference';
import type {
  AnalysisReport,
  EvidenceItem,
  FirebaseRuntimeStatus,
  HealthStatus,
  InferenceEngineId,
  VaultSaveResult,
} from '../../types/lexi';
import { AnalysisResultCards } from '../shared/AnalysisResultCards';
import { DisclaimerBanner } from '../shared/DisclaimerBanner';
import { EngineSelector } from '../shared/EngineSelector';

interface ContractIntelligenceProps {
  selectedEngine: InferenceEngineId;
  onSelectEngine: (engine: InferenceEngineId) => void;
  health: HealthStatus;
  firebaseStatus: FirebaseRuntimeStatus;
  onOpenFirebaseConfig: () => void;
  onAddToPromiseGraph: (item: EvidenceItem) => void;
  onSaveReportToVault: (item: EvidenceItem, report: AnalysisReport) => Promise<VaultSaveResult>;
  onSendToRightsAssistant: (report: AnalysisReport) => void;
}

export function ContractIntelligence({
  selectedEngine,
  onSelectEngine,
  health,
  firebaseStatus,
  onOpenFirebaseConfig,
  onAddToPromiseGraph,
  onSaveReportToVault,
  onSendToRightsAssistant,
}: ContractIntelligenceProps) {
  const [docTitle, setDocTitle] = useState(CONTRACT_PRESETS[0].title);
  const [docType, setDocType] = useState<'contract' | 'job_offer'>('contract');
  const [contractText, setContractText] = useState(CONTRACT_PRESETS[0].text);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [activeItem, setActiveItem] = useState<EvidenceItem | null>(null);
  const [saveResult, setSaveResult] = useState<VaultSaveResult | null>(null);

  const loadPreset = (id: string) => {
    const found = CONTRACT_PRESETS.find((c) => c.id === id);
    if (!found) return;
    setDocTitle(found.title);
    setContractText(found.text);
    setErrorMsg(null);
  };

  const handleAnalyze = async (overrideEngine?: InferenceEngineId) => {
    const engine = overrideEngine ?? selectedEngine;
    if (!contractText.trim()) {
      setErrorMsg('Paste an offer letter, NDA, or contract text to analyze.');
      return;
    }

    const now = new Date().toISOString();
    const item: EvidenceItem = {
      id: `ctr_${Date.now()}`,
      title: docTitle.trim() || 'Contract Document',
      type: docType,
      sourceLabel: 'Contract Intelligence Workspace',
      content: contractText.trim(),
      createdAt: now,
      updatedAt: now,
      includedInGraph: true,
    };

    setIsAnalyzing(true);
    setErrorMsg(null);
    setSaveResult(null);
    setActiveItem(item);

    try {
      const result = await runVerificationAnalysis({
        engine,
        mode: 'contracts',
        items: [item],
        focusPrompt:
          'Perform a clause-by-clause review identifying upfront fee requirements, asymmetric termination, employment bonds, broad IP transfers, and clarification questions.',
      });
      setReport(result);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Contract analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-blue-400 font-medium">Clause & Term Verification</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Contract Intelligence</h1>
        <p className="text-sm text-slate-400 mt-1">
          Examine employment offers, service agreements, and addendums for hidden fees, lock-in penalties, and one-sided clauses.
        </p>
      </div>

      <EngineSelector
        selectedEngine={selectedEngine}
        onSelectEngine={onSelectEngine}
        health={health}
        firebaseStatus={firebaseStatus}
        onOpenFirebaseConfig={onOpenFirebaseConfig}
      />

      <div className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-400">Sample Agreements</span>
          <div className="flex flex-wrap gap-1.5">
            {CONTRACT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => loadPreset(preset.id)}
                className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-700 bg-[#060911] hover:border-blue-500/60 text-xs text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Document Title</span>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g., Onboarding Agreement"
              className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Document Category</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as 'contract' | 'job_offer')}
              className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="contract">Contract / Addendum / NDA</option>
              <option value="job_offer">Employment Offer Letter</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Paste Contract Clauses or Full Text</span>
          <textarea
            rows={7}
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            placeholder="Paste contract sections, fee clauses, bond terms, or IP provisions..."
            className="w-full rounded-xl bg-[#060911] border border-slate-700 p-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (!contractText.trim()) return;
              const item: EvidenceItem = activeItem ?? {
                id: `ctr_${Date.now()}`,
                title: docTitle.trim() || 'Contract Document',
                type: docType,
                sourceLabel: 'Contract Intelligence',
                content: contractText.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                includedInGraph: true,
              };
              onAddToPromiseGraph(item);
            }}
            disabled={!contractText.trim()}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 bg-[#060911] hover:bg-slate-800 disabled:opacity-50 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <GitCompare className="w-4 h-4 text-blue-400" aria-hidden="true" />
            Compare in PromiseGraph
          </button>

          <button
            type="button"
            onClick={() => handleAnalyze()}
            disabled={isAnalyzing || !contractText.trim()}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileSearch className="w-4 h-4" aria-hidden="true" />
            )}
            {isAnalyzing ? 'Reviewing Clauses...' : 'Review Clauses'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
          {selectedEngine === 'server-gemini' && (
            <button
              type="button"
              onClick={() => {
                onSelectEngine('local-deterministic');
                handleAnalyze('local-deterministic');
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#0B1221] border border-slate-700 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Run Local Rule Engine
            </button>
          )}
        </div>
      )}

      {/* Clause-by-Clause Findings */}
      {report?.contractFindings && report.contractFindings.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Clause Breakdown to Clarify</h2>
          <div className="grid grid-cols-1 gap-4">
            {report.contractFindings.map((finding) => (
              <div
                key={finding.id}
                className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs">
                  {finding.level === 'low' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 ${
                        finding.level === 'high' ? 'text-red-400' : 'text-amber-400'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <span className="font-semibold text-white">{finding.clauseTopic}</span>
                </div>
                <p className="text-xs font-mono text-slate-300 bg-[#060911] border border-slate-800/90 rounded-lg p-3">
                  “{finding.excerpt}”
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">{finding.plainExplanation}</p>
                <div className="pt-2.5 border-t border-slate-800/80 text-xs text-slate-300">
                  <span className="font-medium text-blue-400">Clarification to request: </span>
                  {finding.clarificationPrompt}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {report && activeItem && (
        <AnalysisResultCards
          report={report}
          saveResult={saveResult}
          onSaveReport={async (rep) => {
            setSaveResult(await onSaveReportToVault(activeItem, rep));
          }}
          onSendToRightsAssistant={onSendToRightsAssistant}
        />
      )}

      <DisclaimerBanner />
    </div>
  );
}

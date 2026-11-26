import { AlertCircle, CreditCard, GitCompare, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { PAYMENT_PRESETS } from '../../data/presets';
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

interface PaymentRiskAnalyzerProps {
  selectedEngine: InferenceEngineId;
  onSelectEngine: (engine: InferenceEngineId) => void;
  health: HealthStatus;
  firebaseStatus: FirebaseRuntimeStatus;
  onOpenFirebaseConfig: () => void;
  onAddToPromiseGraph: (item: EvidenceItem) => void;
  onSaveReportToVault: (item: EvidenceItem, report: AnalysisReport) => Promise<VaultSaveResult>;
  onSendToRightsAssistant: (report: AnalysisReport) => void;
}

export function PaymentRiskAnalyzer({
  selectedEngine,
  onSelectEngine,
  health,
  firebaseStatus,
  onOpenFirebaseConfig,
  onAddToPromiseGraph,
  onSaveReportToVault,
  onSendToRightsAssistant,
}: PaymentRiskAnalyzerProps) {
  const initial = PAYMENT_PRESETS[0];
  const [payeeName, setPayeeName] = useState(initial.payeeName);
  const [paymentHandle, setPaymentHandle] = useState(initial.paymentHandle);
  const [requestedAmount, setRequestedAmount] = useState(initial.requestedAmount);
  const [organizationName, setOrganizationName] = useState(initial.organizationName);
  const [purpose, setPurpose] = useState(initial.purpose);
  const [rawText, setRawText] = useState(initial.rawText);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [activeItem, setActiveItem] = useState<EvidenceItem | null>(null);
  const [saveResult, setSaveResult] = useState<VaultSaveResult | null>(null);

  const loadPreset = (id: string) => {
    const found = PAYMENT_PRESETS.find((p) => p.id === id);
    if (!found) return;
    setPayeeName(found.payeeName);
    setPaymentHandle(found.paymentHandle);
    setRequestedAmount(found.requestedAmount);
    setOrganizationName(found.organizationName);
    setPurpose(found.purpose);
    setRawText(found.rawText);
    setErrorMsg(null);
  };

  const buildPaymentEvidenceItem = (): EvidenceItem => {
    const now = new Date().toISOString();
    const combinedContent = [
      `Requested By: ${payeeName || 'Unspecified'} (${organizationName || 'Organization not stated'})`,
      `Payment Handle / Account / Link: ${paymentHandle || 'Unspecified'}`,
      `Amount: ${requestedAmount || 'Unspecified'}`,
      `Stated Purpose: ${purpose || 'Unspecified'}`,
      rawText ? `Request Context: ${rawText}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      id: `pay_${Date.now()}`,
      title: `Payment Request — ${requestedAmount || 'Amount Unspecified'}`,
      type: 'payment_request',
      sourceLabel: paymentHandle ? `Payee Handle: ${paymentHandle}` : 'Payment Request Details',
      content: combinedContent,
      createdAt: now,
      updatedAt: now,
      includedInGraph: true,
      metadata: {
        payeeName: payeeName.trim() || undefined,
        paymentHandle: paymentHandle.trim() || undefined,
        requestedAmount: requestedAmount.trim() || undefined,
        organizationName: organizationName.trim() || undefined,
      },
    };
  };

  const handleAnalyze = async (overrideEngine?: InferenceEngineId) => {
    const engine = overrideEngine ?? selectedEngine;
    if (!paymentHandle.trim() && !rawText.trim()) {
      setErrorMsg('Enter a UPI ID, account/link, or payment message to analyze.');
      return;
    }

    const item = buildPaymentEvidenceItem();
    setIsAnalyzing(true);
    setErrorMsg(null);
    setSaveResult(null);
    setActiveItem(item);

    try {
      const result = await runVerificationAnalysis({
        engine,
        mode: 'payments',
        items: [item],
        focusPrompt:
          'Evaluate payment channel risks: check whether a personal UPI/consumer wallet handle is being used on behalf of a company, whether upfront fees are requested, and outline safe verification steps.',
      });
      setReport(result);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Payment analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-blue-400 font-medium">Beneficiary & Channel Verification</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Payment Risk Analyzer</h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect UPI IDs, deposit demands, and beneficiary-to-organization alignment before initiating any transfer.
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
          <span className="text-xs font-medium text-slate-400">Sample Requests</span>
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_PRESETS.map((preset) => (
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
            <span className="text-xs font-medium text-slate-300">UPI ID / Bank Account / Payment URL</span>
            <input
              type="text"
              value={paymentHandle}
              onChange={(e) => setPaymentHandle(e.target.value)}
              placeholder="e.g., rahul.hr.verify@okaxis"
              className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Requested Amount</span>
            <input
              type="text"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              placeholder="e.g., ₹4,999"
              className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 tabular-nums"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Payee / Contact Name</span>
            <input
              type="text"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="e.g., Rahul Verma"
              className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Claimed Organization</span>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g., Meridian Core Technologies"
              className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Stated Purpose</span>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g., Training fee, refundable security deposit, KYC token"
            className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Full Payment Message / Invoice Text</span>
          <textarea
            rows={4}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste any accompanying payment instructions or deadline notices..."
            className="w-full rounded-xl bg-[#060911] border border-slate-700 p-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onAddToPromiseGraph(buildPaymentEvidenceItem())}
            disabled={!paymentHandle.trim() && !rawText.trim()}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 bg-[#060911] hover:bg-slate-800 disabled:opacity-50 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <GitCompare className="w-4 h-4 text-blue-400" aria-hidden="true" />
            Compare in PromiseGraph
          </button>

          <button
            type="button"
            onClick={() => handleAnalyze()}
            disabled={isAnalyzing || (!paymentHandle.trim() && !rawText.trim())}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard className="w-4 h-4" aria-hidden="true" />
            )}
            {isAnalyzing ? 'Evaluating Risk...' : 'Evaluate Payment Risk'}
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

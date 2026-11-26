import { AlertCircle, GitCompare, Loader2, ScanSearch } from 'lucide-react';
import { useState } from 'react';
import { SCANNER_PRESETS } from '../../data/presets';
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

interface SmartScamScannerProps {
  selectedEngine: InferenceEngineId;
  onSelectEngine: (engine: InferenceEngineId) => void;
  health: HealthStatus;
  firebaseStatus: FirebaseRuntimeStatus;
  onOpenFirebaseConfig: () => void;
  onAddToPromiseGraph: (item: EvidenceItem) => void;
  onSaveReportToVault: (item: EvidenceItem, report: AnalysisReport) => Promise<VaultSaveResult>;
  onSendToRightsAssistant: (report: AnalysisReport) => void;
}

export function SmartScamScanner({
  selectedEngine,
  onSelectEngine,
  health,
  firebaseStatus,
  onOpenFirebaseConfig,
  onAddToPromiseGraph,
  onSaveReportToVault,
  onSendToRightsAssistant,
}: SmartScamScannerProps) {
  const [messageTitle, setMessageTitle] = useState('Suspicious Message Check');
  const [sourceLabel, setSourceLabel] = useState(SCANNER_PRESETS[0].sourceLabel);
  const [messageText, setMessageText] = useState(SCANNER_PRESETS[0].text);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [scannedItem, setScannedItem] = useState<EvidenceItem | null>(null);
  const [saveResult, setSaveResult] = useState<VaultSaveResult | null>(null);

  const applyPreset = (presetId: string) => {
    const found = SCANNER_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setMessageTitle(found.label);
    setSourceLabel(found.sourceLabel);
    setMessageText(found.text);
    setErrorMsg(null);
  };

  const handleScan = async (overrideEngine?: InferenceEngineId) => {
    const engine = overrideEngine ?? selectedEngine;
    if (!messageText.trim()) {
      setErrorMsg('Paste or enter a message, SMS, or email text to analyze.');
      return;
    }

    const now = new Date().toISOString();
    const item: EvidenceItem = {
      id: `scan_${Date.now()}`,
      title: messageTitle.trim() || 'Scanned Message',
      type: 'message',
      sourceLabel: sourceLabel.trim() || 'User-pasted message',
      content: messageText.trim(),
      createdAt: now,
      updatedAt: now,
      includedInGraph: true,
    };

    setIsScanning(true);
    setErrorMsg(null);
    setSaveResult(null);
    setScannedItem(item);

    try {
      const result = await runVerificationAnalysis({
        engine,
        mode: 'scanner',
        items: [item],
        focusPrompt:
          'Analyze this single message for urgency pressure, impersonation cues, fee requests, payment handles, and suspicious links without declaring guilt.',
      });
      setReport(result);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-blue-400 font-medium">Message & Communication Inspection</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">Smart Scam Scanner</h1>
          <p className="text-sm text-slate-400 mt-1">
            Inspect SMS, WhatsApp chats, emails, or job invites for payment pressure, channel mismatches, and link risks.
          </p>
        </div>
      </div>

      <EngineSelector
        selectedEngine={selectedEngine}
        onSelectEngine={onSelectEngine}
        health={health}
        firebaseStatus={firebaseStatus}
        onOpenFirebaseConfig={onOpenFirebaseConfig}
      />

      {/* Input Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-400">Sample Scenarios</span>
          <div className="flex flex-wrap gap-1.5">
            {SCANNER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-700 bg-[#060911] hover:border-blue-500/60 text-xs text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Label</span>
            <input
              type="text"
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              placeholder="e.g., Recruiter WhatsApp Message"
              className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Sender / Channel (Optional)</span>
            <input
              type="text"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="e.g., WhatsApp +91-98XXX or SMS"
              className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Paste Message Text</span>
          <textarea
            rows={5}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Paste the exact text message, email body, or chat excerpt here..."
            className="w-full rounded-xl bg-[#060911] border border-slate-700 p-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (!messageText.trim()) return;
              const item: EvidenceItem = scannedItem ?? {
                id: `scan_${Date.now()}`,
                title: messageTitle.trim() || 'Scanned Message',
                type: 'message',
                sourceLabel: sourceLabel.trim() || 'Message',
                content: messageText.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                includedInGraph: true,
              };
              onAddToPromiseGraph(item);
            }}
            disabled={!messageText.trim()}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 bg-[#060911] hover:bg-slate-800 disabled:opacity-50 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <GitCompare className="w-4 h-4 text-blue-400" aria-hidden="true" />
            Send to PromiseGraph
          </button>

          <button
            type="button"
            onClick={() => handleScan()}
            disabled={isScanning || !messageText.trim()}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <ScanSearch className="w-4 h-4" aria-hidden="true" />
            )}
            {isScanning ? 'Analyzing...' : 'Analyze Message'}
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
                handleScan('local-deterministic');
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#0B1221] border border-slate-700 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Run Local Rule Engine
            </button>
          )}
        </div>
      )}

      {report && scannedItem && (
        <AnalysisResultCards
          report={report}
          saveResult={saveResult}
          onSaveReport={async (rep) => {
            setSaveResult(await onSaveReportToVault(scannedItem, rep));
          }}
          onSendToRightsAssistant={onSendToRightsAssistant}
        />
      )}

      <DisclaimerBanner />
    </div>
  );
}

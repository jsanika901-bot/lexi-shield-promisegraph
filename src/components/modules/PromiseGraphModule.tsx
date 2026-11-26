import {
  AlertCircle,
  CheckSquare,
  Edit3,
  GitCompare,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Square,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { FLAGSHIP_PROMISEGRAPH_ITEMS } from '../../data/presets';
import { runVerificationAnalysis } from '../../services/inference/hybridInference';
import type {
  AnalysisReport,
  EvidenceItem,
  EvidenceType,
  FirebaseRuntimeStatus,
  HealthStatus,
  InferenceEngineId,
  VaultSaveResult,
} from '../../types/lexi';
import { AnalysisResultCards } from '../shared/AnalysisResultCards';
import { DisclaimerBanner } from '../shared/DisclaimerBanner';
import { EngineSelector } from '../shared/EngineSelector';
import { PromiseGraphDiagram } from '../shared/PromiseGraphDiagram';

interface PromiseGraphModuleProps {
  evidenceItems: EvidenceItem[];
  onUpdateEvidenceItems: (items: EvidenceItem[]) => void;
  selectedEngine: InferenceEngineId;
  onSelectEngine: (engine: InferenceEngineId) => void;
  health: HealthStatus;
  firebaseStatus: FirebaseRuntimeStatus;
  onOpenFirebaseConfig: () => void;
  activeReport: AnalysisReport | null;
  onReportGenerated: (report: AnalysisReport) => void;
  onSaveDossier: (items: EvidenceItem[], report: AnalysisReport) => Promise<VaultSaveResult>;
  onSendToRightsAssistant: (report: AnalysisReport) => void;
}

const TYPE_LABELS: Record<EvidenceType, string> = {
  job_offer: 'Job Offer',
  contract: 'Contract',
  message: 'Recruiter / Chat Message',
  payment_request: 'Payment Request',
  email: 'Email Notice',
  invoice: 'Invoice / Receipt',
};

export function PromiseGraphModule({
  evidenceItems,
  onUpdateEvidenceItems,
  selectedEngine,
  onSelectEngine,
  health,
  firebaseStatus,
  onOpenFirebaseConfig,
  activeReport,
  onReportGenerated,
  onSaveDossier,
  onSendToRightsAssistant,
}: PromiseGraphModuleProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<VaultSaveResult | null>(null);

  // Add / Edit form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftType, setDraftType] = useState<EvidenceType>('message');
  const [draftSource, setDraftSource] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftPayeeHandle, setDraftPayeeHandle] = useState('');
  const [draftOrg, setDraftOrg] = useState('');

  const includedItems = evidenceItems.filter((item) => item.includedInGraph);

  const openNewForm = () => {
    setEditingId(null);
    setDraftTitle('');
    setDraftType('message');
    setDraftSource('');
    setDraftContent('');
    setDraftPayeeHandle('');
    setDraftOrg('');
    setShowAddForm(true);
  };

  const openEditForm = (item: EvidenceItem) => {
    setEditingId(item.id);
    setDraftTitle(item.title);
    setDraftType(item.type);
    setDraftSource(item.sourceLabel);
    setDraftContent(item.content);
    setDraftPayeeHandle(item.metadata?.paymentHandle || '');
    setDraftOrg(item.metadata?.organizationName || '');
    setShowAddForm(true);
  };

  const handleSaveEvidenceItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim() || !draftContent.trim()) return;

    const now = new Date().toISOString();
    if (editingId) {
      const updated = evidenceItems.map((item) =>
        item.id === editingId
          ? {
              ...item,
              title: draftTitle.trim(),
              type: draftType,
              sourceLabel: draftSource.trim() || 'User-entered evidence',
              content: draftContent.trim(),
              updatedAt: now,
              metadata: {
                ...item.metadata,
                paymentHandle: draftPayeeHandle.trim() || undefined,
                organizationName: draftOrg.trim() || undefined,
              },
            }
          : item
      );
      onUpdateEvidenceItems(updated);
    } else {
      const newItem: EvidenceItem = {
        id: `ev_${Date.now()}`,
        title: draftTitle.trim(),
        type: draftType,
        sourceLabel: draftSource.trim() || 'User-entered evidence',
        content: draftContent.trim(),
        createdAt: now,
        updatedAt: now,
        includedInGraph: true,
        metadata: {
          paymentHandle: draftPayeeHandle.trim() || undefined,
          organizationName: draftOrg.trim() || undefined,
        },
      };
      onUpdateEvidenceItems([...evidenceItems, newItem]);
    }

    setShowAddForm(false);
    setEditingId(null);
  };

  const toggleInclude = (id: string) => {
    onUpdateEvidenceItems(
      evidenceItems.map((item) =>
        item.id === id ? { ...item, includedInGraph: !item.includedInGraph } : item
      )
    );
  };

  const removeItem = (id: string) => {
    onUpdateEvidenceItems(evidenceItems.filter((item) => item.id !== id));
  };

  const loadFlagshipScenario = () => {
    onUpdateEvidenceItems(FLAGSHIP_PROMISEGRAPH_ITEMS);
    setErrorMsg(null);
  };

  const handleRunCrossCheck = async (overrideEngine?: InferenceEngineId) => {
    const engineToUse = overrideEngine ?? selectedEngine;
    if (includedItems.length === 0) {
      setErrorMsg('Select or add at least one evidence item to run PromiseGraph.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setSaveResult(null);

    try {
      const report = await runVerificationAnalysis({
        engine: engineToUse,
        mode: 'promisegraph',
        items: includedItems,
        focusPrompt:
          'Compare all included offers, contracts, and messages for contradictions around fees, payment handles, deadlines, and organizational identity.',
      });
      onReportGenerated(report);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to complete verification check.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!activeReport) return;
    const result = await onSaveDossier(
      includedItems.length > 0 ? includedItems : evidenceItems,
      activeReport
    );
    setSaveResult(result);
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-blue-400 font-medium">Core Cross-Document Intelligence</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">PROMISEGRAPH</h1>
          <p className="text-sm text-slate-400 mt-1">
            Compare promises across offers, contracts, and payment messages to detect contradictions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadFlagshipScenario}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B1221] hover:bg-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Load 3-Doc Demo Case
          </button>

          <button
            type="button"
            onClick={openNewForm}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B1221] hover:bg-slate-800 text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Evidence
          </button>

          <button
            type="button"
            onClick={() => handleRunCrossCheck()}
            disabled={isAnalyzing || includedItems.length === 0}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <GitCompare className="w-4 h-4" aria-hidden="true" />
            )}
            {isAnalyzing ? 'Cross-Checking...' : 'Run Cross-Check'}
          </button>
        </div>
      </div>

      <EngineSelector
        selectedEngine={selectedEngine}
        onSelectEngine={onSelectEngine}
        health={health}
        firebaseStatus={firebaseStatus}
        onOpenFirebaseConfig={onOpenFirebaseConfig}
      />

      {/* Add / Edit Evidence Form Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleSaveEvidenceItem}
          className="rounded-2xl border border-blue-500/40 bg-[#0B1221] p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">
              {editingId ? 'Edit Evidence Item' : 'Add Evidence to PromiseGraph'}
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-white min-h-[36px] px-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Document or Message Title</span>
              <input
                type="text"
                required
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="e.g., Recruiter WhatsApp Message"
                className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Evidence Type</span>
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value as EvidenceType)}
                className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Sender / Source Label</span>
              <input
                type="text"
                value={draftSource}
                onChange={(e) => setDraftSource(e.target.value)}
                placeholder="e.g., WhatsApp +91-98XXX or careers@company.com"
                className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">
                Organization or Payment Handle (Optional)
              </span>
              <input
                type="text"
                value={draftPayeeHandle || draftOrg}
                onChange={(e) => {
                  setDraftPayeeHandle(e.target.value);
                  setDraftOrg(e.target.value);
                }}
                placeholder="e.g., rahul.hr.verify@okaxis or Meridian Corp"
                className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Exact Text / Clause / Message</span>
            <textarea
              required
              rows={4}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Paste the exact text from the offer, contract clause, email, or chat message..."
              className="w-full rounded-xl bg-[#060911] border border-slate-700 p-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {editingId ? 'Save Changes' : 'Add to Evidence Set'}
            </button>
          </div>
        </form>
      )}

      {/* Active Evidence Items Deck */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Evidence Set ({includedItems.length} of {evidenceItems.length} active in comparison)
          </h2>
        </div>

        {evidenceItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0B1221] p-6 text-center space-y-3">
            <p className="text-sm text-slate-300">No evidence documents in PromiseGraph yet.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={loadFlagshipScenario}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
              >
                Load 3-Document Contradiction Demo
              </button>
              <button
                type="button"
                onClick={openNewForm}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
              >
                Add Custom Document
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {evidenceItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-colors ${
                  item.includedInGraph
                    ? 'border-slate-700 bg-[#0B1221]'
                    : 'border-slate-800/60 bg-[#070B14] opacity-65'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleInclude(item.id)}
                      className="flex items-center gap-2 text-xs text-slate-300 hover:text-white min-h-[36px] cursor-pointer text-left"
                      title={item.includedInGraph ? 'Exclude from graph' : 'Include in graph'}
                    >
                      {item.includedInGraph ? (
                        <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                      )}
                      <span>{TYPE_LABELS[item.type]}</span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditForm(item)}
                        aria-label={`Edit ${item.title}`}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.title}`}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-[11px] text-slate-400 truncate">{item.sourceLabel}</p>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Error State with Honest Engine Switch Offer */}
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
                handleRunCrossCheck('local-deterministic');
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#0B1221] border border-slate-700 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Run Local Rule Engine Instead
            </button>
          )}
        </div>
      )}

      {/* Visual PromiseGraph Topology & Analysis Cards */}
      {activeReport && (
        <div className="space-y-6">
          <PromiseGraphDiagram
            items={includedItems.length > 0 ? includedItems : evidenceItems}
            claims={activeReport.extractedClaims}
            contradictions={activeReport.contradictions}
          />
          <AnalysisResultCards
            report={activeReport}
            onSaveReport={handleSaveSnapshot}
            onSendToRightsAssistant={onSendToRightsAssistant}
            saveResult={saveResult}
          />
        </div>
      )}

      <DisclaimerBanner />
    </div>
  );
}

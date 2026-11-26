import {
  AlertCircle,
  ArrowLeft,
  Database,
  Download,
  Eye,
  FileText,
  FolderLock,
  GitCompare,
  Search,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { getFirestoreCollectionBlueprint } from '../../services/firebase/vaultRepository';
import { FirebaseAILogicAdapter } from '../../services/inference/hybridInference';
import type {
  EvidenceItem,
  FirebaseRuntimeStatus,
  HealthStatus,
  SavedVaultDossier,
} from '../../types/lexi';
import { AnalysisResultCards } from '../shared/AnalysisResultCards';
import { DisclaimerBanner } from '../shared/DisclaimerBanner';
import { PromiseGraphDiagram } from '../shared/PromiseGraphDiagram';

interface EvidenceVaultProps {
  dossiers: SavedVaultDossier[];
  storedItems: EvidenceItem[];
  onDeleteDossier: (id: string) => void;
  onDeleteStoredItem: (id: string) => void;
  onLoadDossierIntoPromiseGraph: (dossier: SavedVaultDossier) => void;
  onLoadItemIntoPromiseGraph: (item: EvidenceItem) => void;
  health: HealthStatus;
  firebaseStatus: FirebaseRuntimeStatus;
  onOpenFirebaseConfig: () => void;
  vaultError?: string | null;
}

export function EvidenceVault({
  dossiers,
  storedItems,
  onDeleteDossier,
  onDeleteStoredItem,
  onLoadDossierIntoPromiseGraph,
  onLoadItemIntoPromiseGraph,
  health,
  firebaseStatus,
  onOpenFirebaseConfig,
  vaultError,
}: EvidenceVaultProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'dossiers' | 'items'>('all');
  const [inspectedDossierId, setInspectedDossierId] = useState<string | null>(null);

  const hybridStatus = FirebaseAILogicAdapter.getIntegrationStatus();
  const firestoreBlueprint = getFirestoreCollectionBlueprint();

  const inspectedDossier =
    inspectedDossierId ? dossiers.find((d) => d.id === inspectedDossierId) ?? null : null;

  const filteredDossiers = dossiers.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.notes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredItems = storedItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportJsonDossier = (dossier: SavedVaultDossier) => {
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dossier.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (inspectedDossier) {
    const rep = inspectedDossier.report;
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setInspectedDossierId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 min-h-[36px] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Back to Evidence Vault
            </button>
            <h1 className="text-2xl font-bold text-white">{inspectedDossier.title}</h1>
            <p className="text-xs text-slate-400">
              Saved on {new Date(inspectedDossier.savedAt).toLocaleString()} ·{' '}
              {inspectedDossier.evidenceItems.length} source document(s) ·{' '}
              {inspectedDossier.cloudSynced
                ? 'Synced to Cloud Firestore'
                : firebaseStatus.firestoreConnected
                  ? 'Local cache · Firestore ready'
                  : 'Firebase Firestore not connected'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onLoadDossierIntoPromiseGraph(inspectedDossier)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <GitCompare className="w-4 h-4" aria-hidden="true" />
              Reopen in PromiseGraph
            </button>
            <button
              type="button"
              onClick={() => exportJsonDossier(inspectedDossier)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 bg-[#0B1221] hover:bg-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Preserved Source Documents */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">
            Preserved Source Documents ({inspectedDossier.evidenceItems.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {inspectedDossier.evidenceItems.map((doc) => (
              <div
                key={doc.id}
                className="rounded-2xl border border-slate-800 bg-[#0B1221] p-4 space-y-2"
              >
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{doc.type.replace('_', ' ')}</span>
                </div>
                <h3 className="text-sm font-semibold text-white">{doc.title}</h3>
                <p className="text-[11px] text-slate-400 truncate">{doc.sourceLabel}</p>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {doc.content}
                </p>
              </div>
            ))}
          </div>
        </section>

        {rep && (
          <div className="space-y-6">
            <PromiseGraphDiagram
              items={inspectedDossier.evidenceItems}
              claims={rep.extractedClaims}
              contradictions={rep.contradictions}
            />
            <AnalysisResultCards report={rep} />
          </div>
        )}

        <DisclaimerBanner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-blue-400 font-medium">Case Preservation & Storage</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Evidence Vault</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage saved cross-document snapshots, individual evidence items, and exportable verification dossiers.
        </p>
      </div>

      {/* Explicit Honest Storage Status Banner */}
      <div
        className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm ${
          firebaseStatus.firestoreConnected
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-amber-500/30 bg-amber-500/5'
        }`}
      >
        <div className="flex items-start gap-3">
          <Database
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              firebaseStatus.firestoreConnected ? 'text-emerald-400' : 'text-amber-400'
            }`}
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="font-semibold text-white">
              {firebaseStatus.firestoreConnected
                ? `Cloud Firestore Active (${firebaseStatus.projectId}) · Local Offline Cache Enabled`
                : firebaseStatus.configured
                  ? `Local Vault Active · Firestore Offline/Restricted (${firebaseStatus.projectId})`
                  : 'Local Vault Active · Firebase Firestore Not Connected'}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {firebaseStatus.firestoreConnected
                ? 'Snapshots and evidence items persist locally in browser storage and sync to Cloud Firestore.'
                : firebaseStatus.configured && firebaseStatus.firestoreError
                  ? `Snapshots persist locally in browser storage. Cloud Firestore returned: ${firebaseStatus.firestoreError}`
                  : 'Snapshots persist across browser refreshes in local browser storage (localStorage). Configure Firebase Web Config to sync dossiers to Cloud Firestore.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenFirebaseConfig}
          className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-700 bg-[#0B1221] hover:bg-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-center"
        >
          {firebaseStatus.configured ? 'Manage Firebase Config' : 'Connect Firebase'}
        </button>
      </div>

      {vaultError && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-2.5 text-xs sm:text-sm text-red-200"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{vaultError}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved dossiers or evidence..."
            className="w-full min-h-[44px] rounded-xl bg-[#0B1221] border border-slate-800 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#0B1221] border border-slate-800 self-start">
          {(
            [
              ['all', 'All Records'],
              ['dossiers', 'Snapshots'],
              ['items', 'Evidence Items'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setViewFilter(key)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewFilter === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved PromiseGraph Dossiers */}
      {(viewFilter === 'all' || viewFilter === 'dossiers') && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-white">Saved Verification Snapshots</h2>
            <span className="text-xs text-slate-400 tabular-nums">
              {filteredDossiers.length} record{filteredDossiers.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredDossiers.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0B1221] p-6 text-center space-y-2">
              <FolderLock className="w-6 h-6 text-slate-500 mx-auto" aria-hidden="true" />
              <p className="text-sm text-slate-300">No saved verification snapshots match your filter.</p>
              <p className="text-xs text-slate-500">
                Run an analysis in PromiseGraph, Smart Scam Scanner, or Payment Risk Analyzer and click &ldquo;Save to Evidence Vault&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDossiers.map((dossier) => {
                const rep = dossier.report;
                return (
                  <div
                    key={dossier.id}
                    className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="tabular-nums">
                          {new Date(dossier.savedAt).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                        {rep && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{rep.engineLabel}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            dossier.cloudSynced ? 'text-emerald-400' : 'text-slate-500'
                          }
                        >
                          {dossier.cloudSynced ? 'Cloud synced' : 'Local only'}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-white">{dossier.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {dossier.notes}
                      </p>

                      <div className="grid grid-cols-4 gap-2 pt-2 text-xs border-t border-slate-800/70">
                        <div>
                          <span className="text-slate-500 block">Docs</span>
                          <span className="font-semibold text-white tabular-nums">
                            {dossier.evidenceItems.length}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Claims</span>
                          <span className="font-semibold text-white tabular-nums">
                            {rep?.extractedClaims.length ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Conflicts</span>
                          <span className="font-semibold text-white tabular-nums">
                            {rep?.contradictions.length ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Signals</span>
                          <span className="font-semibold text-white tabular-nums">
                            {rep?.indicators.length ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onLoadDossierIntoPromiseGraph(dossier)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <GitCompare className="w-3.5 h-3.5" aria-hidden="true" />
                          Reopen in PromiseGraph
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectedDossierId(dossier.id)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          Inspect Report
                        </button>
                        <button
                          type="button"
                          onClick={() => exportJsonDossier(dossier)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                          JSON
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteDossier(dossier.id)}
                        aria-label={`Delete ${dossier.title}`}
                        className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Individual Stored Evidence Items */}
      {(viewFilter === 'all' || viewFilter === 'items') && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-white">Captured Evidence Items</h2>
            <span className="text-xs text-slate-400 tabular-nums">
              {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 text-xs text-slate-400">
              No individual evidence items archived yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-[#0B1221] overflow-hidden">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{item.type.replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{item.sourceLabel}</span>
                    </div>
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{item.content}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadItemIntoPromiseGraph(item)}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Add to PromiseGraph
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteStoredItem(item.id)}
                      aria-label={`Delete ${item.title}`}
                      className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Honest Firebase & Hybrid Inference Architecture Readiness Card */}
      <section className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Database className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
            <span>Storage & Hybrid Inference Architecture</span>
          </div>
          <button
            type="button"
            onClick={onOpenFirebaseConfig}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            {firebaseStatus.configured ? 'Edit Firebase Config' : 'Configure Firebase Hybrid'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-slate-800 bg-[#060911] p-3.5 space-y-1">
            <p className="font-medium text-white">Active Persistence</p>
            <p className="text-emerald-400">
              {firebaseStatus.firestoreConnected
                ? 'Cloud Firestore + Local Cache'
                : 'Browser Local Storage (Active)'}
            </p>
            <p className="text-slate-400">
              All evidence items and snapshots persist locally via <code className="font-mono">EvidenceVaultRepository</code>.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#060911] p-3.5 space-y-1">
            <p className="font-medium text-white">Cloud Firestore Adapter</p>
            <p className={firestoreBlueprint.connected ? 'text-emerald-400' : 'text-amber-300'}>
              {firestoreBlueprint.connected
                ? `Connected (${firebaseStatus.projectId})`
                : 'Not Connected'}
            </p>
            <p className="text-slate-400">{firestoreBlueprint.note}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#060911] p-3.5 space-y-1">
            <p className="font-medium text-white">Firebase AI Logic + App Check</p>
            <p className={hybridStatus.connected ? 'text-emerald-400' : 'text-amber-300'}>
              {hybridStatus.connected
                ? `AI Ready (${hybridStatus.projectId})`
                : 'Not Connected'}
            </p>
            <p className="text-slate-400">
              {hybridStatus.connected
                ? `${hybridStatus.statusNote} App Check: ${
                    firebaseStatus.appCheckActive ? firebaseStatus.appCheckMode : 'unconfigured'
                  }.`
                : health.serverGeminiConfigured
                  ? `Server Gemini API (${health.model}) is available. ${hybridStatus.statusNote}`
                  : hybridStatus.statusNote}
            </p>
          </div>
        </div>
      </section>

      <DisclaimerBanner />
    </div>
  );
}

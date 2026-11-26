import { useEffect, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ContractIntelligence } from './components/modules/ContractIntelligence';
import { DashboardOverview } from './components/modules/DashboardOverview';
import { DigitalRightsAssistant } from './components/modules/DigitalRightsAssistant';
import { EvidenceVault } from './components/modules/EvidenceVault';
import { PaymentRiskAnalyzer } from './components/modules/PaymentRiskAnalyzer';
import { PromiseGraphModule } from './components/modules/PromiseGraphModule';
import { SmartScamScanner } from './components/modules/SmartScamScanner';
import { FirebaseConfigModal } from './components/shared/FirebaseConfigModal';
import { FLAGSHIP_PROMISEGRAPH_ITEMS } from './data/presets';
import {
  getFirebaseRuntimeStatus,
  initializeFirebaseServices,
} from './services/firebase/firebaseConfig';
import {
  deleteDossierFromFirestore,
  deleteEvidenceFromFirestore,
  fetchFirestoreDossiersAndMerge,
  syncDossierToFirestore,
  vaultRepository,
} from './services/firebase/vaultRepository';
import { fetchBackendHealth, runVerificationAnalysis } from './services/inference/hybridInference';
import type {
  AnalysisReport,
  EvidenceItem,
  FirebaseRuntimeStatus,
  HealthStatus,
  InferenceEngineId,
  ModuleId,
  SavedVaultDossier,
  VaultSaveResult,
} from './types/lexi';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [selectedEngine, setSelectedEngine] = useState<InferenceEngineId>('local-deterministic');

  const [health, setHealth] = useState<HealthStatus>({
    ok: true,
    serverGeminiConfigured: false,
    model: 'gemini-4-hydrogen',
    firebaseAILogicConnected: false,
    firestoreConnected: false,
  });

  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseRuntimeStatus>(() =>
    getFirebaseRuntimeStatus()
  );
  const [firebaseModalOpen, setFirebaseModalOpen] = useState(false);

  // Active PromiseGraph working set initialized with the 3-document contradiction example
  const [promiseGraphItems, setPromiseGraphItems] = useState<EvidenceItem[]>(
    FLAGSHIP_PROMISEGRAPH_ITEMS
  );
  const [promiseGraphReport, setPromiseGraphReport] = useState<AnalysisReport | null>(null);
  const [latestReportForRights, setLatestReportForRights] = useState<AnalysisReport | null>(null);

  // Evidence Vault persisted records
  const [storedItems, setStoredItems] = useState<EvidenceItem[]>(() =>
    vaultRepository.listEvidence()
  );
  const [dossiers, setDossiers] = useState<SavedVaultDossier[]>(() =>
    vaultRepository.listDossiers()
  );
  const [savedReports, setSavedReports] = useState<AnalysisReport[]>(() =>
    vaultRepository.listReports()
  );
  const [vaultError, setVaultError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const fbStatus = await initializeFirebaseServices();
      if (!mounted) return;
      setFirebaseStatus(fbStatus);

      const serverStatus = await fetchBackendHealth();
      if (!mounted) return;
      setHealth(serverStatus);

      if (fbStatus.configured && fbStatus.aiReady) {
        setSelectedEngine('firebase-ai-logic-hybrid');
      } else if (serverStatus.serverGeminiConfigured) {
        setSelectedEngine('server-gemini');
      }

      if (fbStatus.firestoreConnected) {
        const merged = await fetchFirestoreDossiersAndMerge();
        if (!mounted) return;
        setDossiers(merged.dossiers);
        if (merged.error) {
          setVaultError(merged.error);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleFirebaseStatusUpdated = async (nextStatus: FirebaseRuntimeStatus) => {
    setFirebaseStatus(nextStatus);
    const updatedHealth = await fetchBackendHealth();
    setHealth(updatedHealth);

    if (nextStatus.configured && nextStatus.aiReady) {
      setSelectedEngine('firebase-ai-logic-hybrid');
    }

    if (nextStatus.firestoreConnected) {
      const merged = await fetchFirestoreDossiersAndMerge();
      setDossiers(merged.dossiers);
      setVaultError(merged.error ?? null);
    }
  };

  const handleLaunchFlagshipCase = async () => {
    setPromiseGraphItems(FLAGSHIP_PROMISEGRAPH_ITEMS);
    setActiveModule('promisegraph');

    try {
      const report = await runVerificationAnalysis({
        engine: selectedEngine,
        mode: 'promisegraph',
        items: FLAGSHIP_PROMISEGRAPH_ITEMS,
        focusPrompt:
          'Compare the job offer no-fee statement, the contract ₹4,999 training fee clause, and the recruiter personal UPI payment message.',
      });
      setPromiseGraphReport(report);
      setLatestReportForRights(report);
    } catch {
      const fallback = await runVerificationAnalysis({
        engine: 'local-deterministic',
        mode: 'promisegraph',
        items: FLAGSHIP_PROMISEGRAPH_ITEMS,
      });
      setPromiseGraphReport(fallback);
      setLatestReportForRights(fallback);
    }
  };

  const handleAddToPromiseGraph = (item: EvidenceItem) => {
    setPromiseGraphItems((prev) => {
      if (prev.some((existing) => existing.id === item.id)) {
        return prev;
      }
      return [...prev, { ...item, includedInGraph: true }];
    });
    try {
      setStoredItems(vaultRepository.saveEvidence(item));
      setVaultError(null);
    } catch (err: unknown) {
      setVaultError(err instanceof Error ? err.message : 'Unable to persist item locally.');
    }
    setActiveModule('promisegraph');
  };

  const handleSaveDossier = async (
    items: EvidenceItem[],
    report: AnalysisReport
  ): Promise<VaultSaveResult> => {
    const saved = vaultRepository.saveCompleteDossier(items, report);
    setDossiers(saved.dossiers);
    setSavedReports(saved.reports);
    setStoredItems(saved.evidence);

    if (!saved.result.ok || !saved.dossier) {
      setVaultError(saved.result.error ?? saved.result.message);
      return saved.result;
    }

    if (firebaseStatus.configured) {
      const synced = await syncDossierToFirestore(saved.dossier, saved.result);
      setDossiers(synced.dossiers);
      setVaultError(synced.result.cloudError ?? null);
      return synced.result;
    }

    setVaultError(null);
    return saved.result;
  };

  const handleSaveSingleReport = async (
    item: EvidenceItem,
    report: AnalysisReport
  ): Promise<VaultSaveResult> => {
    return handleSaveDossier([item], report);
  };

  const handleReopenDossier = (dossier: SavedVaultDossier) => {
    const restoredItems = dossier.evidenceItems.map((item) => ({
      ...item,
      includedInGraph: true,
    }));
    setPromiseGraphItems(restoredItems);
    if (dossier.report) {
      setPromiseGraphReport(dossier.report);
      setLatestReportForRights(dossier.report);
    }
    setActiveModule('promisegraph');
  };

  const handleSendToRightsAssistant = (report: AnalysisReport) => {
    setLatestReportForRights(report);
    setActiveModule('rights');
  };

  const handleDeleteDossier = async (id: string) => {
    try {
      setDossiers(vaultRepository.deleteDossier(id));
      setVaultError(null);
      if (firebaseStatus.configured) {
        const cloudErr = await deleteDossierFromFirestore(id);
        if (cloudErr) setVaultError(cloudErr);
      }
    } catch (err: unknown) {
      setVaultError(err instanceof Error ? err.message : 'Unable to delete dossier.');
    }
  };

  const handleDeleteStoredItem = async (id: string) => {
    try {
      setStoredItems(vaultRepository.deleteEvidence(id));
      setVaultError(null);
      if (firebaseStatus.configured) {
        const cloudErr = await deleteEvidenceFromFirestore(id);
        if (cloudErr) setVaultError(cloudErr);
      }
    } catch (err: unknown) {
      setVaultError(err instanceof Error ? err.message : 'Unable to delete item.');
    }
  };

  return (
    <>
      <AppShell
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        vaultCount={dossiers.length + storedItems.length}
        firebaseStatus={firebaseStatus}
        onOpenFirebaseConfig={() => setFirebaseModalOpen(true)}
      >
        {activeModule === 'dashboard' && (
          <DashboardOverview
            onNavigate={setActiveModule}
            onLaunchFlagshipCase={handleLaunchFlagshipCase}
            onReopenDossier={handleReopenDossier}
            evidenceItems={promiseGraphItems}
            savedReports={savedReports}
            savedDossiers={dossiers}
            health={health}
            firebaseStatus={firebaseStatus}
            onOpenFirebaseConfig={() => setFirebaseModalOpen(true)}
          />
        )}

        {activeModule === 'scanner' && (
          <SmartScamScanner
            selectedEngine={selectedEngine}
            onSelectEngine={setSelectedEngine}
            health={health}
            firebaseStatus={firebaseStatus}
            onOpenFirebaseConfig={() => setFirebaseModalOpen(true)}
            onAddToPromiseGraph={handleAddToPromiseGraph}
            onSaveReportToVault={handleSaveSingleReport}
            onSendToRightsAssistant={handleSendToRightsAssistant}
          />
        )}

        {activeModule === 'contracts' && (
          <ContractIntelligence
            selectedEngine={selectedEngine}
            onSelectEngine={setSelectedEngine}
            health={health}
            firebaseStatus={firebaseStatus}
            onOpenFirebaseConfig={() => setFirebaseModalOpen(true)}
            onAddToPromiseGraph={handleAddToPromiseGraph}
            onSaveReportToVault={handleSaveSingleReport}
            onSendToRightsAssistant={handleSendToRightsAssistant}
          />
        )}

        {activeModule === 'payments' && (
          <PaymentRiskAnalyzer
            selectedEngine={selectedEngine}
            onSelectEngine={setSelectedEngine}
            health={health}
            firebaseStatus={firebaseStatus}
            onOpenFirebaseConfig={() => setFirebaseModalOpen(true)}
            onAddToPromiseGraph={handleAddToPromiseGraph}
            onSaveReportToVault={handleSaveSingleReport}
            onSendToRightsAssistant={handleSendToRightsAssistant}
          />
        )}

        {activeModule === 'promisegraph' && (
          <PromiseGraphModule
            evidenceItems={promiseGraphItems}
            onUpdateEvidenceItems={setPromiseGraphItems}
            selectedEngine={selectedEngine}
            onSelectEngine={setSelectedEngine}
            health={health}
            firebaseStatus={firebaseStatus}
            onOpenFirebaseConfig={() => setFirebaseModalOpen(true)}
            activeReport={promiseGraphReport}
            onReportGenerated={(rep) => {
              setPromiseGraphReport(rep);
              setLatestReportForRights(rep);
            }}
            onSaveDossier={handleSaveDossier}
            onSendToRightsAssistant={handleSendToRightsAssistant}
          />
        )}

        {activeModule === 'rights' && (
          <DigitalRightsAssistant latestReport={latestReportForRights} />
        )}

        {activeModule === 'vault' && (
          <EvidenceVault
            dossiers={dossiers}
            storedItems={storedItems}
            onDeleteDossier={handleDeleteDossier}
            onDeleteStoredItem={handleDeleteStoredItem}
            onLoadDossierIntoPromiseGraph={handleReopenDossier}
            onLoadItemIntoPromiseGraph={handleAddToPromiseGraph}
            health={health}
            firebaseStatus={firebaseStatus}
            onOpenFirebaseConfig={() => setFirebaseModalOpen(true)}
            vaultError={vaultError}
          />
        )}
      </AppShell>

      <FirebaseConfigModal
        isOpen={firebaseModalOpen}
        onClose={() => setFirebaseModalOpen(false)}
        firebaseStatus={firebaseStatus}
        onStatusUpdated={handleFirebaseStatusUpdated}
      />
    </>
  );
}

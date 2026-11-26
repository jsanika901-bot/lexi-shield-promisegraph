import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import type {
  AnalysisReport,
  EvidenceItem,
  SavedVaultDossier,
  VaultSaveResult,
} from '../../types/lexi';
import {
  getFirebaseRuntimeInstances,
  getFirebaseRuntimeStatus,
} from './firebaseConfig';

/**
 * Repository contract designed for browser-local offline cache +
 * real Cloud Firestore sync when Firebase is configured.
 */
export interface EvidenceVaultRepository {
  readonly backendName: string;
  readonly isCloudSynced: boolean;
  listEvidence(): EvidenceItem[];
  saveEvidence(item: EvidenceItem): EvidenceItem[];
  deleteEvidence(id: string): EvidenceItem[];
  listDossiers(): SavedVaultDossier[];
  saveDossier(dossier: SavedVaultDossier): SavedVaultDossier[];
  saveCompleteDossier(items: EvidenceItem[], report: AnalysisReport): {
    dossiers: SavedVaultDossier[];
    reports: AnalysisReport[];
    evidence: EvidenceItem[];
    result: VaultSaveResult;
    dossier: SavedVaultDossier | null;
  };
  deleteDossier(id: string): SavedVaultDossier[];
  listReports(): AnalysisReport[];
  saveReport(report: AnalysisReport): AnalysisReport[];
}

const STORAGE_KEYS = {
  evidence: 'lexishield_vault_evidence_v1',
  dossiers: 'lexishield_vault_dossiers_v1',
  reports: 'lexishield_vault_reports_v1',
};

const FIRESTORE_COLLECTIONS = {
  dossiers: 'lexishield_dossiers',
  evidence: 'lexishield_evidence',
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stripUndefinedDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function strictWriteJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    throw new Error('Browser localStorage is unavailable in this runtime.');
  }
  const serialized = JSON.stringify(value);
  localStorage.setItem(key, serialized);
  const readBack = localStorage.getItem(key);
  if (readBack !== serialized) {
    throw new Error('Storage verification failed: persisted data did not match payload.');
  }
}

export class LocalStorageVaultRepository implements EvidenceVaultRepository {
  get backendName(): string {
    const fb = getFirebaseRuntimeStatus();
    return fb.firestoreConnected
      ? 'Cloud Firestore + Local Offline Cache'
      : 'Browser Local Storage (Offline Cache)';
  }

  get isCloudSynced(): boolean {
    return getFirebaseRuntimeStatus().firestoreConnected;
  }

  listEvidence(): EvidenceItem[] {
    return safeReadJson<EvidenceItem[]>(STORAGE_KEYS.evidence, []);
  }

  saveEvidence(item: EvidenceItem): EvidenceItem[] {
    const current = this.listEvidence();
    const cloned = deepClone(item);
    const existsIdx = current.findIndex((x) => x.id === cloned.id);
    const updated =
      existsIdx >= 0
        ? current.map((x, idx) => (idx === existsIdx ? cloned : x))
        : [cloned, ...current];
    strictWriteJson(STORAGE_KEYS.evidence, updated);
    return updated;
  }

  deleteEvidence(id: string): EvidenceItem[] {
    const updated = this.listEvidence().filter((x) => x.id !== id);
    strictWriteJson(STORAGE_KEYS.evidence, updated);
    return updated;
  }

  listDossiers(): SavedVaultDossier[] {
    return safeReadJson<SavedVaultDossier[]>(STORAGE_KEYS.dossiers, []);
  }

  saveDossier(dossier: SavedVaultDossier): SavedVaultDossier[] {
    const current = this.listDossiers();
    const cloned = deepClone(dossier);
    const updated = [
      cloned,
      ...current.filter(
        (d) =>
          d.id !== cloned.id &&
          !(cloned.sourceReportId && d.sourceReportId === cloned.sourceReportId)
      ),
    ];
    strictWriteJson(STORAGE_KEYS.dossiers, updated);
    return updated;
  }

  saveCompleteDossier(items: EvidenceItem[], report: AnalysisReport): {
    dossiers: SavedVaultDossier[];
    reports: AnalysisReport[];
    evidence: EvidenceItem[];
    result: VaultSaveResult;
    dossier: SavedVaultDossier | null;
  } {
    const clonedItems = deepClone(items);
    const clonedReport = deepClone(report);
    const fbStatus = getFirebaseRuntimeStatus();

    if (clonedItems.length === 0) {
      return {
        dossiers: this.listDossiers(),
        reports: this.listReports(),
        evidence: this.listEvidence(),
        dossier: null,
        result: {
          ok: false,
          storageBackend: 'local-storage',
          firestoreConnected: fbStatus.firestoreConnected,
          cloudSynced: false,
          message: 'Cannot save an empty evidence set.',
          error: 'At least one source document is required to save a verification snapshot.',
        },
      };
    }

    try {
      const existingByReport = this.listDossiers().find(
        (d) => d.sourceReportId === clonedReport.id || d.report?.id === clonedReport.id
      );

      const dossier: SavedVaultDossier = {
        id: existingByReport?.id ?? `dos_${Date.now()}`,
        sourceReportId: clonedReport.id,
        title: clonedReport.title,
        notes: clonedReport.executiveSummary,
        savedAt: new Date().toISOString(),
        cloudSynced: false,
        evidenceItems: clonedItems,
        report: clonedReport,
      };

      const dossiers = this.saveDossier(dossier);
      const reports = this.saveReport(clonedReport);

      let evidence = this.listEvidence();
      for (const item of clonedItems) {
        evidence = this.saveEvidence(item);
      }

      const persistedDossier = this.listDossiers().find((d) => d.id === dossier.id);
      if (!persistedDossier || !persistedDossier.report) {
        throw new Error('Verification read-back failed: saved report could not be reloaded.');
      }

      const counts = {
        documents: persistedDossier.evidenceItems.length,
        claims: persistedDossier.report.extractedClaims.length,
        conflicts: persistedDossier.report.contradictions.length,
        signals: persistedDossier.report.indicators.length,
        questions: persistedDossier.report.verificationQuestions.length,
      };

      return {
        dossiers,
        reports,
        evidence,
        dossier: persistedDossier,
        result: {
          ok: true,
          storageBackend: 'local-storage',
          firestoreConnected: fbStatus.firestoreConnected,
          cloudSynced: false,
          dossierId: dossier.id,
          counts,
          message: fbStatus.firestoreConnected
            ? `Saved locally (${counts.documents} documents · ${counts.claims} claims · ${counts.conflicts} conflicts · ${counts.signals} verification signals · ${counts.questions} questions). Syncing to Cloud Firestore...`
            : `Saved locally (${counts.documents} documents · ${counts.claims} claims · ${counts.conflicts} conflicts · ${counts.signals} verification signals · ${counts.questions} questions). Firebase Firestore is not connected — stored in browser localStorage only.`,
        },
      };
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Failed to persist verification snapshot to browser storage.';
      return {
        dossiers: this.listDossiers(),
        reports: this.listReports(),
        evidence: this.listEvidence(),
        dossier: null,
        result: {
          ok: false,
          storageBackend: 'local-storage',
          firestoreConnected: fbStatus.firestoreConnected,
          cloudSynced: false,
          message: 'Save to Evidence Vault failed.',
          error: errMsg,
        },
      };
    }
  }

  deleteDossier(id: string): SavedVaultDossier[] {
    const updated = this.listDossiers().filter((d) => d.id !== id);
    strictWriteJson(STORAGE_KEYS.dossiers, updated);
    return updated;
  }

  listReports(): AnalysisReport[] {
    return safeReadJson<AnalysisReport[]>(STORAGE_KEYS.reports, []);
  }

  saveReport(report: AnalysisReport): AnalysisReport[] {
    const current = this.listReports();
    const cloned = deepClone(report);
    const updated = [cloned, ...current.filter((r) => r.id !== cloned.id)].slice(0, 25);
    strictWriteJson(STORAGE_KEYS.reports, updated);
    return updated;
  }
}

export async function syncDossierToFirestore(
  dossier: SavedVaultDossier,
  baseResult: VaultSaveResult
): Promise<{
  dossier: SavedVaultDossier;
  dossiers: SavedVaultDossier[];
  result: VaultSaveResult;
}> {
  const { db } = getFirebaseRuntimeInstances();
  const status = getFirebaseRuntimeStatus();

  if (!db || !status.configured) {
    return {
      dossier,
      dossiers: vaultRepository.listDossiers(),
      result: {
        ...baseResult,
        firestoreConnected: false,
        cloudSynced: false,
      },
    };
  }

  try {
    const syncedAt = new Date().toISOString();
    const cloudDossier: SavedVaultDossier = stripUndefinedDeep({
      ...dossier,
      cloudSynced: true,
      cloudSyncedAt: syncedAt,
    });

    await setDoc(doc(db, FIRESTORE_COLLECTIONS.dossiers, cloudDossier.id), cloudDossier);

    for (const item of cloudDossier.evidenceItems) {
      await setDoc(
        doc(db, FIRESTORE_COLLECTIONS.evidence, item.id),
        stripUndefinedDeep(item)
      );
    }

    const updatedDossiers = vaultRepository.saveDossier(cloudDossier);
    const counts = baseResult.counts;

    return {
      dossier: cloudDossier,
      dossiers: updatedDossiers,
      result: {
        ...baseResult,
        storageBackend: 'firestore-and-local',
        firestoreConnected: true,
        cloudSynced: true,
        message: counts
          ? `Saved & synced to Cloud Firestore (${counts.documents} documents · ${counts.claims} claims · ${counts.conflicts} conflicts · ${counts.signals} verification signals · ${counts.questions} questions).`
          : 'Saved & synced to Cloud Firestore and local offline cache.',
      },
    };
  } catch (err: unknown) {
    const cloudError =
      err instanceof Error ? err.message : 'Cloud Firestore write failed.';
    return {
      dossier,
      dossiers: vaultRepository.listDossiers(),
      result: {
        ...baseResult,
        storageBackend: 'local-storage',
        firestoreConnected: status.firestoreConnected,
        cloudSynced: false,
        cloudError,
        message: `${baseResult.message.replace(/\s*Syncing to Cloud Firestore\.\.\.$/, '')} Cloud Firestore sync failed: ${cloudError}`,
      },
    };
  }
}

export async function fetchFirestoreDossiersAndMerge(): Promise<{
  dossiers: SavedVaultDossier[];
  evidence: EvidenceItem[];
  error?: string;
}> {
  const { db } = getFirebaseRuntimeInstances();
  const status = getFirebaseRuntimeStatus();

  if (!db || !status.configured) {
    return {
      dossiers: vaultRepository.listDossiers(),
      evidence: vaultRepository.listEvidence(),
    };
  }

  try {
    const snapshot = await getDocs(
      query(collection(db, FIRESTORE_COLLECTIONS.dossiers), orderBy('savedAt', 'desc'))
    );
    const cloudDossiers: SavedVaultDossier[] = [];
    snapshot.forEach((docSnap) => {
      cloudDossiers.push(docSnap.data() as SavedVaultDossier);
    });

    // Merge into local offline cache without discarding unsynced local drafts
    const localDossiers = vaultRepository.listDossiers();
    const mergedMap = new Map<string, SavedVaultDossier>();
    for (const d of cloudDossiers) {
      mergedMap.set(d.id, { ...d, cloudSynced: true });
    }
    for (const d of localDossiers) {
      if (!mergedMap.has(d.id)) {
        mergedMap.set(d.id, d);
      }
    }

    const merged = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
    strictWriteJson(STORAGE_KEYS.dossiers, merged);

    return {
      dossiers: merged,
      evidence: vaultRepository.listEvidence(),
    };
  } catch (err: unknown) {
    return {
      dossiers: vaultRepository.listDossiers(),
      evidence: vaultRepository.listEvidence(),
      error: err instanceof Error ? err.message : 'Unable to query Cloud Firestore.',
    };
  }
}

export async function deleteDossierFromFirestore(id: string): Promise<string | null> {
  const { db } = getFirebaseRuntimeInstances();
  const status = getFirebaseRuntimeStatus();
  if (!db || !status.configured) return null;
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.dossiers, id));
    return null;
  } catch (err: unknown) {
    return err instanceof Error ? err.message : 'Unable to delete dossier from Cloud Firestore.';
  }
}

export async function deleteEvidenceFromFirestore(id: string): Promise<string | null> {
  const { db } = getFirebaseRuntimeInstances();
  const status = getFirebaseRuntimeStatus();
  if (!db || !status.configured) return null;
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.evidence, id));
    return null;
  } catch (err: unknown) {
    return err instanceof Error ? err.message : 'Unable to delete evidence item from Cloud Firestore.';
  }
}

export function getFirestoreCollectionBlueprint() {
  const status = getFirebaseRuntimeStatus();
  return {
    connected: status.firestoreConnected,
    collections: [FIRESTORE_COLLECTIONS.dossiers, FIRESTORE_COLLECTIONS.evidence],
    note: status.firestoreConnected
      ? `Connected to Cloud Firestore (${status.projectId}). Snapshots sync to "${FIRESTORE_COLLECTIONS.dossiers}" with LocalStorage offline cache.`
      : status.configured && status.firestoreError
        ? `Firebase project "${status.projectId}" configured, but Firestore probe returned: ${status.firestoreError}`
        : 'Cloud Firestore is NOT connected in this build. Data is persisted locally in browser storage only.',
  };
}

export const vaultRepository = new LocalStorageVaultRepository();

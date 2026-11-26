import { AlertCircle, CheckCircle2, Database, KeyRound, Layers, ShieldCheck, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  clearFirebaseRuntimeSettings,
  getFirebaseRuntimeSettings,
  parseFirebaseConfigInput,
  saveFirebaseRuntimeSettings,
} from '../../services/firebase/firebaseConfig';
import type { FirebaseRuntimeStatus } from '../../types/lexi';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  firebaseStatus: FirebaseRuntimeStatus;
  onStatusUpdated: (status: FirebaseRuntimeStatus) => void;
}

const SAMPLE_JSON_PLACEHOLDER = `{
  "apiKey": "AIza...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.firebasestorage.app",
  "messagingSenderId": "1234567890",
  "appId": "1:1234567890:web:abcdef123456"
}`;

export function FirebaseConfigModal({
  isOpen,
  onClose,
  firebaseStatus,
  onStatusUpdated,
}: FirebaseConfigModalProps) {
  const [configJson, setConfigJson] = useState('');
  const [appCheckSiteKey, setAppCheckSiteKey] = useState('');
  const [appCheckDebugToken, setAppCheckDebugToken] = useState('');
  const [aiBackend, setAiBackend] = useState<'googleai' | 'vertexai'>('googleai');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const current = getFirebaseRuntimeSettings();
    setConfigJson(current.config ? JSON.stringify(current.config, null, 2) : '');
    setAppCheckSiteKey(current.appCheckSiteKey ?? '');
    setAppCheckDebugToken(current.appCheckDebugToken ?? '');
    setAiBackend(current.aiBackend);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      const parsedConfig = parseFirebaseConfigInput(configJson);
      const nextStatus = await saveFirebaseRuntimeSettings({
        config: parsedConfig,
        appCheckSiteKey,
        appCheckDebugToken,
        aiBackend,
      });
      onStatusUpdated(nextStatus);
      setSuccessMsg(
        nextStatus.firestoreConnected
          ? `Initialized Firebase project "${nextStatus.projectId}" with live AI Logic and Cloud Firestore.`
          : `Initialized Firebase project "${nextStatus.projectId}" for AI Logic. Firestore probe: ${
              nextStatus.firestoreError || 'offline or rules restricted'
            }.`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to initialize Firebase config.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);
    try {
      const nextStatus = await clearFirebaseRuntimeSettings();
      onStatusUpdated(nextStatus);
      setConfigJson('');
      setAppCheckSiteKey('');
      setAppCheckDebugToken('');
      setSuccessMsg(
        nextStatus.configured
          ? `Reverted to VITE_FIREBASE_* environment defaults (${nextStatus.projectId}).`
          : 'Cleared saved Firebase Web Config. Operating in local-only mode.'
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to clear config.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="firebase-config-title"
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-700 bg-[#0B1221] p-5 sm:p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-blue-400">
              Firebase AI Logic Hybrid + App Check + Firestore
            </p>
            <h2 id="firebase-config-title" className="text-lg sm:text-xl font-bold text-white mt-0.5">
              Firebase Hybrid Config
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Firebase configuration"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Live Initialization Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-[#060911] p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
              <span>Firebase AI Logic</span>
            </div>
            <p className={firebaseStatus.aiReady ? 'text-emerald-400 font-medium' : 'text-amber-300 font-medium'}>
              {firebaseStatus.aiReady
                ? `Ready (${firebaseStatus.projectId})`
                : 'Not Configured'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#060911] p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
              <span>App Check</span>
            </div>
            <p className={firebaseStatus.appCheckActive ? 'text-emerald-400 font-medium' : 'text-slate-400 font-medium'}>
              {firebaseStatus.appCheckActive
                ? firebaseStatus.appCheckMode === 'debug-token'
                  ? 'Active (Debug Token)'
                  : 'Active (reCAPTCHA v3)'
                : 'Not Configured'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#060911] p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
              <span>Cloud Firestore</span>
            </div>
            <p
              className={
                firebaseStatus.firestoreConnected
                  ? 'text-emerald-400 font-medium'
                  : 'text-amber-300 font-medium'
              }
            >
              {firebaseStatus.firestoreConnected ? 'Connected' : 'Not Connected'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">
              Firebase Web Config JSON (from Firebase Console → Project Settings)
            </span>
            <textarea
              rows={7}
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              placeholder={SAMPLE_JSON_PLACEHOLDER}
              className="w-full rounded-xl bg-[#060911] border border-slate-700 p-3.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Firebase AI Logic Backend</span>
              <select
                value={aiBackend}
                onChange={(e) =>
                  setAiBackend(e.target.value === 'vertexai' ? 'vertexai' : 'googleai')
                }
                className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="googleai">GoogleAIBackend (Gemini Developer API)</option>
                <option value="vertexai">AgentPlatform / Vertex AI Backend</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">
                App Check reCAPTCHA v3 Site Key (Optional)
              </span>
              <input
                type="text"
                value={appCheckSiteKey}
                onChange={(e) => setAppCheckSiteKey(e.target.value)}
                placeholder="6Lc..."
                className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300 inline-flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              App Check Debug Token (Optional — for local testing)
            </span>
            <input
              type="text"
              value={appCheckDebugToken}
              onChange={(e) => setAppCheckDebugToken(e.target.value)}
              placeholder='Paste debug UUID or "true" to generate in console'
              className="w-full min-h-[44px] rounded-xl bg-[#060911] border border-slate-700 px-3.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </label>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 flex items-start gap-2 text-xs text-red-200"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex items-start gap-2 text-xs text-emerald-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClear}
              disabled={isSaving}
              className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-300 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Clear Saved Config
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving || !configJson.trim()}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs sm:text-sm font-semibold text-white cursor-pointer"
              >
                {isSaving ? 'Initializing...' : 'Save & Initialize Firebase'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

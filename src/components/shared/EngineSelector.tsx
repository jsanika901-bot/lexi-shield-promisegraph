import { Cloud, Cpu, Layers, Settings2 } from 'lucide-react';
import type { FirebaseRuntimeStatus, HealthStatus, InferenceEngineId } from '../../types/lexi';

interface EngineSelectorProps {
  selectedEngine: InferenceEngineId;
  onSelectEngine: (engine: InferenceEngineId) => void;
  health: HealthStatus;
  firebaseStatus?: FirebaseRuntimeStatus;
  onOpenFirebaseConfig?: () => void;
}

export function EngineSelector({
  selectedEngine,
  onSelectEngine,
  health,
  firebaseStatus,
  onOpenFirebaseConfig,
}: EngineSelectorProps) {
  const fbReady = Boolean(firebaseStatus?.configured && firebaseStatus?.aiReady);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B1221] p-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">Verification Engine</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedEngine === 'server-gemini'
              ? health.serverGeminiConfigured
                ? `Server Gemini API ready (${health.model})`
                : 'Server Gemini key not detected — will report configuration status if run'
              : selectedEngine === 'firebase-ai-logic-hybrid'
                ? fbReady
                  ? `Firebase AI Logic active (${firebaseStatus?.projectId}) · PREFER_ON_DEVICE → gemini-2.5-flash`
                  : 'Firebase Web Config not set — runs Local Deterministic Fallback until configured'
                : 'Runs locally in-browser using transparent rule-based cross-checks'}
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#060911] border border-slate-800">
          <button
            type="button"
            onClick={() => onSelectEngine('local-deterministic')}
            className={`min-h-[40px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              selectedEngine === 'local-deterministic'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
            Local Rule Engine
          </button>

          <button
            type="button"
            onClick={() => onSelectEngine('server-gemini')}
            className={`min-h-[40px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              selectedEngine === 'server-gemini'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
            Server Gemini AI
          </button>

          <button
            type="button"
            onClick={() => onSelectEngine('firebase-ai-logic-hybrid')}
            className={`min-h-[40px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              selectedEngine === 'firebase-ai-logic-hybrid'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            {fbReady ? 'Firebase Hybrid (Live)' : 'Firebase Hybrid'}
          </button>
        </div>
      </div>

      {selectedEngine === 'firebase-ai-logic-hybrid' && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className={fbReady ? 'text-emerald-300/90' : 'text-amber-300/90'}>
            {fbReady
              ? `Hybrid path active: attempts On-Device Gemini Nano first, falls back to Firebase Cloud (gemini-2.5-flash), then Local Deterministic Fallback.`
              : 'No Firebase Web Config saved yet. Running analysis in this mode will safely fall back to Local Deterministic Fallback until configured.'}
          </span>
          {onOpenFirebaseConfig && (
            <button
              type="button"
              onClick={onOpenFirebaseConfig}
              className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
              {fbReady ? 'Edit Firebase Config' : 'Configure Firebase Hybrid'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

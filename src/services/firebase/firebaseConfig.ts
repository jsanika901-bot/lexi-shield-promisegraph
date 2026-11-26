import { deleteApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAI, GoogleAIBackend, AgentPlatformBackend, type AI } from 'firebase/ai';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';
import { doc, getDocFromServer, getFirestore, type Firestore } from 'firebase/firestore';
import type {
  FirebaseRuntimeSettings,
  FirebaseRuntimeStatus,
  FirebaseWebConfig,
} from '../../types/lexi';

const CONFIG_STORAGE_KEY = 'lexishield_firebase_config_v1';

interface StoredFirebasePayload {
  config: FirebaseWebConfig;
  appCheckSiteKey?: string;
  appCheckDebugToken?: string;
  aiBackend?: 'googleai' | 'vertexai';
}

interface FirebaseRuntimeInstances {
  app: FirebaseApp | null;
  ai: AI | null;
  db: Firestore | null;
  appCheck: AppCheck | null;
  status: FirebaseRuntimeStatus;
}

const runtime: FirebaseRuntimeInstances = {
  app: null,
  ai: null,
  db: null,
  appCheck: null,
  status: {
    configured: false,
    source: 'none',
    aiReady: false,
    aiBackend: 'googleai',
    appCheckActive: false,
    appCheckMode: 'unconfigured',
    firestoreReady: false,
    firestoreConnected: false,
  },
};

function readEnvSettings(): FirebaseRuntimeSettings {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim();
  const appId = env.VITE_FIREBASE_APP_ID?.trim();
  const aiBackend = env.VITE_FIREBASE_AI_BACKEND === 'vertexai' ? 'vertexai' : 'googleai';

  if (apiKey && projectId && appId) {
    return {
      config: {
        apiKey,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || undefined,
        projectId,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
        appId,
        measurementId: env.VITE_FIREBASE_MEASUREMENT_ID?.trim() || undefined,
      },
      appCheckSiteKey: env.VITE_FIREBASE_APP_CHECK_SITE_KEY?.trim() || undefined,
      appCheckDebugToken: env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN?.trim() || undefined,
      aiBackend,
      source: 'env',
    };
  }

  return {
    config: null,
    appCheckSiteKey: undefined,
    appCheckDebugToken: undefined,
    aiBackend,
    source: 'none',
  };
}

export function getFirebaseRuntimeSettings(): FirebaseRuntimeSettings {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredFirebasePayload;
        if (parsed?.config?.apiKey && parsed?.config?.projectId && parsed?.config?.appId) {
          return {
            config: parsed.config,
            appCheckSiteKey: parsed.appCheckSiteKey?.trim() || undefined,
            appCheckDebugToken: parsed.appCheckDebugToken?.trim() || undefined,
            aiBackend: parsed.aiBackend === 'vertexai' ? 'vertexai' : 'googleai',
            source: 'localStorage',
          };
        }
      }
    }
  } catch {
    // Fall back to env settings
  }

  return readEnvSettings();
}

export function parseFirebaseConfigInput(rawInput: string): FirebaseWebConfig {
  let trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Paste your Firebase Web Config JSON object.');
  }

  // Strip optional JS variable assignment like `const firebaseConfig = { ... };`
  trimmed = trimmed
    .replace(/^(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*/, '')
    .replace(/;+\s*$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Convert standard JS object literal keys (apiKey: "...") to strict JSON safely
    const normalized = trimmed
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
      .replace(/'([^']*)'/g, '"$1"')
      .replace(/,\s*([}\]])/g, '$1');
    try {
      parsed = JSON.parse(normalized);
    } catch {
      throw new Error(
        'Could not parse Firebase config. Paste valid JSON containing at least "apiKey", "projectId", and "appId".'
      );
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Firebase config must be a JSON object.');
  }

  const obj = parsed as Record<string, unknown>;
  const apiKey = typeof obj.apiKey === 'string' ? obj.apiKey.trim() : '';
  const projectId = typeof obj.projectId === 'string' ? obj.projectId.trim() : '';
  const appId = typeof obj.appId === 'string' ? obj.appId.trim() : '';

  if (!apiKey || !projectId || !appId) {
    throw new Error('Firebase config must include "apiKey", "projectId", and "appId".');
  }

  return {
    apiKey,
    projectId,
    appId,
    authDomain: typeof obj.authDomain === 'string' ? obj.authDomain.trim() : undefined,
    storageBucket: typeof obj.storageBucket === 'string' ? obj.storageBucket.trim() : undefined,
    messagingSenderId:
      typeof obj.messagingSenderId === 'string' ? obj.messagingSenderId.trim() : undefined,
    measurementId: typeof obj.measurementId === 'string' ? obj.measurementId.trim() : undefined,
  };
}

export async function initializeFirebaseServices(): Promise<FirebaseRuntimeStatus> {
  const settings = getFirebaseRuntimeSettings();

  // Tear down any existing app if re-initializing or cleared
  const existingApps = getApps();
  for (const app of existingApps) {
    try {
      await deleteApp(app);
    } catch {
      // Ignore cleanup errors
    }
  }

  runtime.app = null;
  runtime.ai = null;
  runtime.db = null;
  runtime.appCheck = null;

  if (!settings.config) {
    runtime.status = {
      configured: false,
      source: 'none',
      aiReady: false,
      aiBackend: settings.aiBackend,
      appCheckActive: false,
      appCheckMode: 'unconfigured',
      firestoreReady: false,
      firestoreConnected: false,
    };
    return runtime.status;
  }

  try {
    const app = initializeApp(settings.config);
    runtime.app = app;

    // 1. Initialize App Check if site key or debug token is provided
    let appCheckActive = false;
    let appCheckMode: FirebaseRuntimeStatus['appCheckMode'] = 'unconfigured';

    if (typeof window !== 'undefined') {
      if (settings.appCheckDebugToken) {
        (window as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
          settings.appCheckDebugToken === 'true' ? true : settings.appCheckDebugToken;
      }

      if (settings.appCheckSiteKey) {
        try {
          runtime.appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(settings.appCheckSiteKey),
            isTokenAutoRefreshEnabled: true,
          });
          appCheckActive = true;
          appCheckMode = settings.appCheckDebugToken ? 'debug-token' : 'recaptcha-v3';
        } catch (acErr) {
          runtime.status.lastError =
            acErr instanceof Error ? acErr.message : 'App Check initialization error';
        }
      } else if (settings.appCheckDebugToken) {
        appCheckMode = 'debug-token';
      }
    }

    // 2. Initialize Firebase AI Logic
    const backend =
      settings.aiBackend === 'vertexai' ? new AgentPlatformBackend() : new GoogleAIBackend();
    runtime.ai = getAI(app, { backend });

    // 3. Initialize Cloud Firestore and probe live connectivity
    const db = getFirestore(app);
    runtime.db = db;

    let firestoreConnected = false;
    let firestoreError: string | undefined;

    try {
      await getDocFromServer(doc(db, 'lexishield_health', 'connection'));
      firestoreConnected = true;
    } catch (fsErr: unknown) {
      const msg = fsErr instanceof Error ? fsErr.message : String(fsErr);
      const code = (fsErr as { code?: string })?.code ?? '';
      // `permission-denied` or `not-found` means the client genuinely reached Firestore servers,
      // whereas `unavailable` or `client is offline` means Firestore is offline/disabled.
      if (code === 'permission-denied' || msg.includes('permission-denied')) {
        firestoreConnected = true;
        firestoreError =
          'Connected to Firestore, but security rules denied read access. Update Firestore rules or enable open/auth access for your collection.';
      } else if (code === 'not-found') {
        firestoreConnected = true;
      } else {
        firestoreConnected = false;
        firestoreError = msg;
      }
    }

    runtime.status = {
      configured: true,
      source: settings.source,
      projectId: settings.config.projectId,
      aiReady: Boolean(runtime.ai),
      aiBackend: settings.aiBackend,
      appCheckActive,
      appCheckMode,
      firestoreReady: Boolean(runtime.db),
      firestoreConnected,
      firestoreError,
    };

    return runtime.status;
  } catch (err: unknown) {
    runtime.status = {
      configured: false,
      source: settings.source,
      projectId: settings.config.projectId,
      aiReady: false,
      aiBackend: settings.aiBackend,
      appCheckActive: false,
      appCheckMode: 'unconfigured',
      firestoreReady: false,
      firestoreConnected: false,
      lastError: err instanceof Error ? err.message : 'Firebase initialization failed.',
    };
    return runtime.status;
  }
}

export async function saveFirebaseRuntimeSettings(payload: {
  config: FirebaseWebConfig;
  appCheckSiteKey?: string;
  appCheckDebugToken?: string;
  aiBackend: 'googleai' | 'vertexai';
}): Promise<FirebaseRuntimeStatus> {
  if (typeof localStorage === 'undefined') {
    throw new Error('Browser localStorage is not available.');
  }
  const toSave: StoredFirebasePayload = {
    config: payload.config,
    appCheckSiteKey: payload.appCheckSiteKey?.trim() || undefined,
    appCheckDebugToken: payload.appCheckDebugToken?.trim() || undefined,
    aiBackend: payload.aiBackend,
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(toSave));
  return initializeFirebaseServices();
}

export async function clearFirebaseRuntimeSettings(): Promise<FirebaseRuntimeStatus> {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  }
  return initializeFirebaseServices();
}

export function getFirebaseRuntimeInstances(): FirebaseRuntimeInstances {
  return runtime;
}

export function getFirebaseRuntimeStatus(): FirebaseRuntimeStatus {
  return runtime.status;
}

import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection,
  getDocs,
  limit,
  query,
  type Firestore 
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// 1. Check local storage override first, then Vite env variables
export function getStoredFirebaseConfig(): FirebaseConfig | null {
  try {
    const customConfig = localStorage.getItem('curator_firebase_config');
    if (customConfig) {
      const parsed = JSON.parse(customConfig);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored Firebase config:', e);
  }

  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECY_ID || '';
  const envConfig: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (envProjectId ? `${envProjectId}.firebaseapp.com` : ''),
    projectId: envProjectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (envProjectId ? `${envProjectId}.firebasestorage.app` : ''),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseConfig | null) {
  if (!config) {
    localStorage.removeItem('curator_firebase_config');
  } else {
    localStorage.setItem('curator_firebase_config', JSON.stringify(config));
  }
  resetFirebaseInstance();
}

/**
 * Parses user input which can be:
 * 1. Raw JSON
 * 2. JS code snippet copied from Firebase Console (const firebaseConfig = { ... })
 * 3. .env format (VITE_FIREBASE_API_KEY=...)
 */
export function parseFirebaseSnippet(input: string): FirebaseConfig | null {
  if (!input || !input.trim()) return null;
  const str = input.trim();

  // Try direct JSON
  try {
    const parsed = JSON.parse(str);
    if (parsed.apiKey && parsed.projectId) {
      return {
        apiKey: String(parsed.apiKey).trim(),
        authDomain: String(parsed.authDomain || `${parsed.projectId}.firebaseapp.com`).trim(),
        projectId: String(parsed.projectId).trim(),
        storageBucket: String(parsed.storageBucket || `${parsed.projectId}.firebasestorage.app`).trim(),
        messagingSenderId: String(parsed.messagingSenderId || '').trim(),
        appId: String(parsed.appId || '').trim(),
      };
    }
  } catch {
    // Continue to regex parser
  }

  // Regex extract common JS / object properties
  const extractField = (key: string): string => {
    // matches key: "value", key: 'value', or VITE_FIREBASE_KEY=value
    const patterns = [
      new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`, 'i'),
      new RegExp(`VITE_FIREBASE_${key}\\s*=\\s*([^\\r\\n]+)`, 'i'),
      new RegExp(`${key}\\s*=\\s*["'\`]?([^"'\`\\s\\r\\n]+)["'\`]?`, 'i'),
    ];
    for (const p of patterns) {
      const m = str.match(p);
      if (m && m[1]) return m[1].trim();
    }
    return '';
  };

  const apiKey = extractField('apiKey');
  const projectId = extractField('projectId');
  const authDomain = extractField('authDomain') || (projectId ? `${projectId}.firebaseapp.com` : '');
  const storageBucket = extractField('storageBucket') || (projectId ? `${projectId}.firebasestorage.app` : '');
  const messagingSenderId = extractField('messagingSenderId');
  const appId = extractField('appId');

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    };
  }

  return null;
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function resetFirebaseInstance() {
  if (app) {
    try {
      deleteApp(app).catch(() => {});
    } catch {
      // ignore
    }
  }
  app = null;
  db = null;
  storage = null;
}

export function initFirebase() {
  const config = getStoredFirebaseConfig();
  if (!config) {
    return { app: null, db: null, storage: null, isConfigured: false };
  }

  if (app && db && storage) {
    return { app, db, storage, isConfigured: true };
  }

  try {
    const existingApps = getApps();
    if (!existingApps.length) {
      app = initializeApp(config);
    } else {
      app = existingApps[0];
    }
    
    // Initialize Firestore with robust multi-tab persistent cache and ignore undefined properties
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        ignoreUndefinedProperties: true
      });
    } catch {
      db = getFirestore(app);
    }

    storage = getStorage(app);
    return { app, db, storage, isConfigured: true };
  } catch (err) {
    console.error('Failed to initialize Firebase with provided credentials:', err);
    return { app: null, db: null, storage: null, isConfigured: false };
  }
}

/**
 * Deeply sanitizes an object or array for Cloud Firestore by stripping
 * undefined properties, preserving valid dates, strings, numbers, booleans, and nulls.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return undefined as any;
  }
  if (Array.isArray(data)) {
    return data
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined) as any;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        const cleanedValue = sanitizeForFirestore(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned as T;
  }
  return data;
}

export function isFirebaseConfigured(): boolean {
  return getStoredFirebaseConfig() !== null;
}

/**
 * Tests connection to Firebase Firestore using provided or stored config.
 */
export async function testFirebaseConnection(customConfig?: FirebaseConfig): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  const config = customConfig || getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return {
      success: false,
      message: 'No Firebase configuration provided. Please enter at least API Key and Project ID.',
    };
  }

  const startTime = Date.now();
  const testAppName = `test-connection-${Date.now()}`;
  let testApp: FirebaseApp | null = null;

  try {
    testApp = initializeApp(config, testAppName);
    const testDb = getFirestore(testApp);
    
    // Attempt lightweight ping query on items collection
    const q = query(collection(testDb, 'items'), limit(1));
    await getDocs(q);
    
    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      message: `Successfully connected to Firestore project "${config.projectId}" (${latencyMs}ms).`,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const msg = err?.message || String(err);
    const code = err?.code || '';

    if (code === 'permission-denied') {
      return {
        success: true,
        message: `Connected to Project "${config.projectId}", but Firestore security rules restricted direct read without authentication. Rules can be set to test mode or auth enabled.`,
        latencyMs,
      };
    }

    if (code.includes('invalid-api-key') || msg.includes('API key')) {
      return {
        success: false,
        message: 'Invalid Firebase API Key. Please verify the key from Firebase Project Settings.',
      };
    }

    if (code === 'unavailable' || msg.includes('offline')) {
      return {
        success: false,
        message: 'Firebase servers are currently unreachable. Check your internet connection.',
      };
    }

    return {
      success: false,
      message: `Connection failed: ${msg}`,
    };
  } finally {
    if (testApp) {
      deleteApp(testApp).catch(() => {});
    }
  }
}

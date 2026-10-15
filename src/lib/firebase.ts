import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId: string;
  appId: string;
}

export interface FirebaseStatus {
  isConfigured: boolean;
  missingKeys: string[];
  setupMessage: string | null;
}

const env = import.meta.env;

export const firebaseConfig: FirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY?.trim() || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID?.trim() || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
  appId: env.VITE_FIREBASE_APP_ID?.trim() || ''
};

export function getMissingFirebaseConfigKeys(): string[] {
  const missing: string[] = [];

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('Placeholder')) {
    missing.push('VITE_FIREBASE_API_KEY');
  }
  if (!firebaseConfig.authDomain || firebaseConfig.authDomain.includes('your-project-id')) {
    missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  }
  if (!firebaseConfig.projectId || firebaseConfig.projectId.includes('your-project-id')) {
    missing.push('VITE_FIREBASE_PROJECT_ID');
  }
  if (!firebaseConfig.messagingSenderId || firebaseConfig.messagingSenderId === '000000000000') {
    missing.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  }
  if (!firebaseConfig.appId || firebaseConfig.appId.includes('000000000000')) {
    missing.push('VITE_FIREBASE_APP_ID');
  }

  return missing;
}

export function getFirebaseSetupMessage(missingKeys: string[]): string {
  return [
    '==============================================================================',
    '🚨 CampusFind: Firebase Configuration Incomplete',
    '==============================================================================',
    'Firebase environment variables are required but have not been set in .env.local.',
    'Missing or empty keys:',
    ...missingKeys.map((k) => `  - ${k}`),
    '',
    'Instructions to complete setup:',
    '1. Open the Firebase Console (https://console.firebase.google.com/)',
    '2. Open your project > Project Settings > General > Your apps > Web app (</>)',
    '3. Copy the configuration values into your local `.env.local` file (see `.env.example`).',
    '4. Restart the Vite development server (`npm run dev`).',
    '=============================================================================='
  ].join('\n');
}

const missingKeys = getMissingFirebaseConfigKeys();
export const isFirebaseConfigured = missingKeys.length === 0;

export const firebaseStatus: FirebaseStatus = {
  isConfigured: isFirebaseConfigured,
  missingKeys,
  setupMessage: isFirebaseConfigured ? null : getFirebaseSetupMessage(missingKeys)
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // Emit warning message to developer console
  console.warn(firebaseStatus.setupMessage);

  // Return a proxy that provides clear setup guidance if a service is accessed before setup
  const createNotConfiguredProxy = <T extends object>(serviceName: string): T => {
    return new Proxy({} as T, {
      get(_target, prop) {
        throw new Error(
          `[Firebase Error] Cannot access '${serviceName}.${String(prop)}' because Firebase is not configured.\n\n` +
          firebaseStatus.setupMessage
        );
      }
    });
  };

  app = createNotConfiguredProxy<FirebaseApp>('app');
  auth = createNotConfiguredProxy<Auth>('auth');
  db = createNotConfiguredProxy<Firestore>('db');
}

export { app, auth, db };



import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// ═══════════════════════════════════════════════════════════════
// Firebase configuration — read from environment variables.
// Fallback values keep the app working out-of-the-box for the
// default demo project, but for production each school should set
// its own VITE_FIREBASE_* values in .env.local (see .env.example).
// NOTE: the Firebase web apiKey is NOT a secret — security is
// enforced by Firestore rules (firestore.rules), not by hiding it.
// ═══════════════════════════════════════════════════════════════
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Named Firestore database id (optional). When empty/unset we use the
// project's "(default)" database — the correct choice for a brand-new
// Firebase project. Only set this if you created a NAMED database.
const rawDbId = import.meta.env.VITE_FIREBASE_DATABASE_ID as string | undefined;
const databaseId = rawDbId && rawDbId.trim() ? rawDbId.trim() : undefined;

// Tenant key — each school gets its own isolated data subtree:
//   schools/{SCHOOL_ID}/collections/{key}
// For a single school per deployment, set VITE_SCHOOL_ID in .env.local.
export const SCHOOL_ID = (import.meta.env.VITE_SCHOOL_ID as string) || 'providence';

// Initialize Firebase app (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore WITH offline persistence enabled.
// This lets the app keep working with no internet connection and
// automatically syncs changes back to the cloud once online again.
const firestoreSettings = {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
};
export const db = databaseId
  ? initializeFirestore(app, firestoreSettings, databaseId)
  : initializeFirestore(app, firestoreSettings);

// Firebase Authentication
export const auth = getAuth(app);

// Firebase Storage — backs the file-heavy collections (homework
// attachments, timetable images, news/post images, certificate
// archives). These are stored as JSON blobs under
//   schools/{SCHOOL_ID}/blobs/{key}.json
// which sidesteps Firestore's 1 MB per-document limit while keeping
// base64 payloads intact (needed for in-browser PDF embedding).
export const storage = getStorage(app);

// ───────────────────────────────────────────────────────────────
// ensureAuth(): guarantees there is an authenticated Firebase user
// so Firestore security rules (which require request.auth != null)
// allow read/write. Uses anonymous auth as a zero-setup baseline.
// If Anonymous sign-in is disabled in the Firebase console, this
// fails gracefully and the app continues in local-only mode.
// ───────────────────────────────────────────────────────────────
let authReady: Promise<void> | null = null;
export function ensureAuth(): Promise<void> {
  if (auth.currentUser) return Promise.resolve();
  if (authReady) return authReady;
  // Never let a hanging sign-in block app startup: race against a short
  // timeout so the UI always loads (in local-only mode if auth stalls).
  const signIn = signInAnonymously(auth)
    .then(() => undefined)
    .catch((e) => {
      console.warn('[firebase] Anonymous auth unavailable — running in local-only mode.', e);
      authReady = null;
    });
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 4000));
  authReady = Promise.race([signIn, timeout]).then(() => undefined);
  return authReady;
}

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCpJPqiaHrpFhzKbFHnGtxipfoJBGGiinY",
  authDomain: "gen-lang-client-0796269511.firebaseapp.com",
  projectId: "gen-lang-client-0796269511",
  storageBucket: "gen-lang-client-0796269511.firebasestorage.app",
  messagingSenderId: "625249561095",
  appId: "1:625249561095:web:3af4249be20ebcee1358a2",
};

// Also export the discrete database ID to pass to getFirestore
const databaseId = "ai-studio-ef614327-c07d-45d6-8997-bc4e52c3d2b6";

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore specifying the databaseId and persistent cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, databaseId);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Storage
import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);

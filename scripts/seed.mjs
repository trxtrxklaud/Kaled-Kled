#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 * Seed the first real admin account + school profile.
 *
 * This bootstraps production authentication: it creates a genuine
 * Firebase Email/Password user and writes its users/{uid} role profile
 * (role: 'admin', schoolId), after which firestore.rules enforce real
 * per-school access.
 *
 * Prerequisites (one time, in the Firebase console — all free / Spark):
 *   • Authentication → Sign-in method → enable Email/Password
 *   • Firestore Database → create database (production mode)
 *
 * Usage:
 *   1. Put your project config + desired admin creds in .env.local
 *      (see .env.example). Then:
 *   2. node scripts/seed.mjs
 *
 * Re-running is safe: if the admin already exists it just signs in and
 * refreshes the profile.
 * ═══════════════════════════════════════════════════════════════════
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const env = process.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const SCHOOL_ID = env.VITE_SCHOOL_ID || 'providence';
const ADMIN_USERNAME = env.SEED_ADMIN_USERNAME || env.VITE_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = env.SEED_ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD;
const ADMIN_NAME = env.SEED_ADMIN_NAME || 'المدير العام';

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('✗ Missing VITE_FIREBASE_* config. Fill .env.local first.');
  process.exit(1);
}
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 6) {
  console.error('✗ Set SEED_ADMIN_PASSWORD (≥ 6 chars) in .env.local.');
  process.exit(1);
}

const email = ADMIN_USERNAME.includes('@')
  ? ADMIN_USERNAME.toLowerCase()
  : `${ADMIN_USERNAME.toLowerCase()}@${SCHOOL_ID}.providence.app`;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, ADMIN_PASSWORD);
    uid = cred.user.uid;
    console.log(`✓ Created admin auth user: ${email}`);
  } catch (e) {
    if (e?.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, email, ADMIN_PASSWORD);
      uid = cred.user.uid;
      console.log(`✓ Admin already exists, signed in: ${email}`);
    } else {
      throw e;
    }
  }

  const profile = {
    uid,
    email,
    role: 'admin',
    name: ADMIN_NAME,
    schoolId: SCHOOL_ID,
    assignedClasses: [],
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', uid), profile, { merge: true });
  console.log(`✓ Wrote role profile users/${uid} (role=admin, schoolId=${SCHOOL_ID})`);
  console.log('\nDone. Log in with:');
  console.log(`  username: ${ADMIN_USERNAME}`);
  console.log('  password: (the SEED_ADMIN_PASSWORD you set)');
  process.exit(0);
}

main().catch((e) => {
  console.error('✗ Seed failed:', e?.code || e?.message || e);
  process.exit(1);
});

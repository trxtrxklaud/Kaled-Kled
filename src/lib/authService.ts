import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  type User as FbUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';
import { auth, db, SCHOOL_ID, firebaseConfig } from './firebase';
import type { Role } from './types';

// ═══════════════════════════════════════════════════════════════════
// Real authentication service (Firebase Email/Password + role profiles)
//
// Staff / admin / teacher accounts are genuine Firebase Auth users.
// Each one has a profile document at  users/{uid}  holding the role,
// the school they belong to and (for teachers) their assigned classes.
// Security rules (firestore.rules) read this profile to enforce
// per-school, per-role access at the database level — exactly how a
// production multi-tenant SaaS works.
//
// Parents keep the lightweight in-app account model (phone + bcrypt
// password) because creating a Firebase user per parent would require
// the Admin SDK (paid Blaze plan); see src/lib/password.ts.
// ═══════════════════════════════════════════════════════════════════

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
  name: string;
  schoolId: string;
  assignedClasses?: string[];
  mustChangePassword?: boolean;
  createdAt?: string;
}

/** Deterministic email used for username-based staff/teacher logins. */
export function usernameToEmail(username: string): string {
  const u = username.trim();
  if (u.includes('@')) return u.toLowerCase();
  return `${u.toLowerCase()}@${SCHOOL_ID}.providence.app`;
}

/** Read a user's role profile document. */
export async function getProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (e) {
    console.warn('[auth] getProfile failed', e);
    return null;
  }
}

/** Create/update the caller's own profile (allowed by security rules). */
export async function upsertOwnProfile(profile: UserProfile): Promise<void> {
  await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
}

export interface SignInResult {
  ok: boolean;
  profile?: UserProfile;
  fbUser?: FbUser;
  error?: string;
}

/** Sign in a staff/admin/teacher with username (or email) + password.
 *  Returns the role profile so the app can apply permissions. */
export async function signInStaff(username: string, password: string): Promise<SignInResult> {
  try {
    const email = usernameToEmail(username);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getProfile(cred.user.uid);
    return { ok: true, fbUser: cred.user, profile: profile ?? undefined };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code ?? 'auth/error';
    return { ok: false, error: code };
  }
}

/** Change the currently signed-in Firebase user's password. */
export async function changeOwnPassword(newPassword: string): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    await updatePassword(auth.currentUser, newPassword);
    return true;
  } catch (e) {
    console.warn('[auth] changeOwnPassword failed', e);
    return false;
  }
}

/** Admin-only: create a real staff/teacher Firebase account WITHOUT
 *  disturbing the admin's own session. Uses a temporary secondary
 *  Firebase app so createUser... does not sign the admin out. */
export async function createStaffAccount(params: {
  username: string;
  password: string;
  role: Role;
  name: string;
  assignedClasses?: string[];
}): Promise<SignInResult> {
  const secondary = initializeApp(firebaseConfig, `admin-create-${Date.now()}`);
  try {
    const secAuth = getAuth(secondary);
    const email = usernameToEmail(params.username);
    const cred = await createUserWithEmailAndPassword(secAuth, email, params.password);
    const profile: UserProfile = {
      uid: cred.user.uid,
      email,
      role: params.role,
      name: params.name,
      schoolId: SCHOOL_ID,
      assignedClasses: params.assignedClasses ?? [],
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    };
    // The new user is signed in on the secondary app, so they may write
    // their own users/{uid} document under the security rules. We write
    // through the SECONDARY app's Firestore so the request is authed as
    // the new user (not the admin), satisfying `request.auth.uid == uid`.
    const secDb = getFirestore(secondary);
    await setDoc(doc(secDb, 'users', cred.user.uid), profile, { merge: true });
    return { ok: true, profile };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code ?? 'auth/error';
    return { ok: false, error: code };
  } finally {
    await deleteApp(secondary).catch(() => {});
  }
}

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect } from 'react';
import type { User } from '../lib/types';
import { useData } from './DataContext';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { signInStaff } from '../lib/authService';
import { verifyPassword, hashPassword, isHashed } from '../lib/password';

// ═══════════════════════════════════════════════════════════════════
// Authentication
//
// Priority order on login:
//   1. Parent accounts  — phone + bcrypt password (verified locally).
//   2. Staff/Admin/Teacher — REAL Firebase Email/Password auth, with the
//      role read from the users/{uid} profile document.
//   3. Bootstrap fallback — the legacy built-in accounts, used only to
//      start the app before real accounts are seeded. Disable in
//      production by setting VITE_ALLOW_LEGACY_LOGIN=false.
// ═══════════════════════════════════════════════════════════════════

// Bootstrap accounts (first-run / offline only). Override via .env.local.
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || '';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';
const STAFF_USERNAME = import.meta.env.VITE_STAFF_USERNAME || '';
const STAFF_PASSWORD = import.meta.env.VITE_STAFF_PASSWORD || '';
const TEACHER_PASSWORD = import.meta.env.VITE_TEACHER_PASSWORD || '';
const ARABIC_ADMIN_USER = import.meta.env.VITE_AR_ADMIN_USERNAME || '';
const ARABIC_ADMIN_PASS = import.meta.env.VITE_AR_ADMIN_PASSWORD || '';
const ALLOW_LEGACY =
  (import.meta.env.VITE_ALLOW_LEGACY_LOGIN as string | undefined) !== 'false';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isTeacher: boolean;
  isParent: boolean;
  canAccessFinance: boolean;
  canModifySystem: boolean;
  assignedClasses: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    authSessionUser: user,
    setAuthSessionUser,
    parentUsers,
    updateParentUser,
  } = useData();

  useEffect(() => {
    // Keep the local session aligned with Firebase Auth state. If the
    // Firebase user signs out elsewhere, clear a real (Firebase-backed)
    // session too. Bootstrap/parent sessions have no Firebase user.
    const unsubscribe = onAuthStateChanged(auth, () => {
      /* session is driven by login() below; listener kept for future use */
    });
    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const uname = username.trim();

    // ── 1) Parent accounts (phone + bcrypt password, verified locally) ──
    const parent = parentUsers.find((p) => p.phone === uname);
    if (parent && verifyPassword(password, parent.passwordHash)) {
      // Transparently upgrade any legacy plaintext password to bcrypt.
      if (!isHashed(parent.passwordHash)) {
        updateParentUser({ ...parent, passwordHash: hashPassword(password) });
      }
      setAuthSessionUser({
        id: parent.id,
        username: parent.phone,
        role: 'parent',
        name: parent.fullName,
        childrenIds: parent.childrenIds || [],
        phone: parent.phone,
        mustChangePassword: parent.mustChangePassword,
      });
      return true;
    }

    // ── 2) Real Firebase staff/admin/teacher authentication ──
    const res = await signInStaff(uname, password);
    if (res.ok && res.profile) {
      const p = res.profile;
      setAuthSessionUser({
        id: res.fbUser?.uid || p.uid,
        username: uname,
        role: p.role,
        name: p.name,
        assignedClasses: p.assignedClasses || [],
        mustChangePassword: p.mustChangePassword,
      });
      return true;
    }
    if (res.ok && !res.profile) {
      // Valid credentials but no role profile — refuse rather than guess a
      // role. An admin must (re)create the users/{uid} profile (seed script).
      console.warn('[auth] Signed in but no users/{uid} profile found — denying. Seed the profile.');
      await signOut(auth).catch(() => {});
    }

    // ── 3) Bootstrap fallback (disabled when VITE_ALLOW_LEGACY_LOGIN=false) ──
    if (ALLOW_LEGACY) {
      if (
        (uname === ARABIC_ADMIN_USER && password === ARABIC_ADMIN_PASS) ||
        (uname === ADMIN_USERNAME && password === ADMIN_PASSWORD)
      ) {
        setAuthSessionUser({ id: '1', username: 'محمد', role: 'admin', name: 'المدير العام', assignedClasses: [] });
        return true;
      }
      if (uname === STAFF_USERNAME && password === STAFF_PASSWORD) {
        setAuthSessionUser({ id: '2', username: 'staff', role: 'staff', name: 'الإدارة المشتركة', assignedClasses: [] });
        return true;
      }
      if (uname.startsWith('prof') && password === TEACHER_PASSWORD) {
        setAuthSessionUser({ id: uname, username: uname, role: 'teacher', name: `M. ${uname}`, assignedClasses: ['1A', '1B', '1C', '2A', '2B'] });
        return true;
      }
    }

    return false;
  };

  const logout = () => {
    setAuthSessionUser(null);
    signOut(auth).catch(console.error);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';
  const canAccessFinance = user?.role === 'admin';
  const canModifySystem = user?.role === 'admin';
  const assignedClasses = user?.assignedClasses || [];

  return (
    <AuthContext.Provider value={{
      user, login, logout, isAuthenticated, isAdmin, isStaff, isTeacher, isParent,
      canAccessFinance, canModifySystem, assignedClasses,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../lib/types';
import { useLocalStorage } from '../lib/useLocalStorage';

/**
 * Phase 2 — identity comes from Laravel (via same-origin server sessions).
 * Firebase Auth is no longer used for login. Firestore still backs DATA
 * (Phase 3+); role extras kept from the admin-maintained Firestore docs.
 */
interface AuthContextType {
  user: User | null;
  updateUser: (user: any) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; role?: string; message?: string }>;
  requestParentOtp: (phone: string) => Promise<{ success: boolean; message?: string }>;
  verifyParentOtp: (phone: string, code: string) => Promise<{ success: boolean; role?: string; message?: string }>;
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

async function postJson(path: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !(data && (data as { success?: boolean }).success)) {
    throw new Error((data as { message?: string })?.message || `Request failed (${res.status})`);
  }
  return data;
}

/** Admin-maintained links (same source the Parents page writes): phone → children. */
async function findChildrenByPhone(phone: string): Promise<string[]> {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    const digits = phone.replace(/\D+/g, '');
    const tail = digits.slice(-8);
    const snap = await getDocs(query(collection(db, 'parentUsers')));
    const match = snap.docs
      .map((d) => d.data() as { phone?: string; childrenIds?: string[] })
      .find((p) => (p.phone || '').replace(/\D+/g, '').slice(-8) === tail && tail !== '');
    return Array.isArray(match?.childrenIds) ? match.childrenIds : [];
  } catch {
    return [];
  }
}

/** Extra role data kept in the admin-maintained Firestore users doc (email match). */
async function findExtrasByEmail(email: string): Promise<{ assignedClasses: string[]; childrenIds: string[] }> {
  const empty = { assignedClasses: [], childrenIds: [] };
  if (!email) return empty;
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
    if (snap.empty) return empty;
    const d = snap.docs[0].data() as { assignedClasses?: string[]; childrenIds?: string[] };
    return {
      assignedClasses: Array.isArray(d.assignedClasses) ? d.assignedClasses : [],
      childrenIds: Array.isArray(d.childrenIds) ? d.childrenIds : [],
    };
  } catch {
    return empty;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useLocalStorage<any>('auth_user_session', null);
  const [loading, setLoading] = useState(true);

  // Restore session from the httpOnly cookie via /me; extras stay in localStorage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json().catch(() => null);
        if (!cancelled) {
          if (res.ok && data && data.success && data.user) {
            setUser((prev: any) => ({ ...(prev || {}), ...data.user }));
          } else {
            setUser(null);
          }
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const login = async (username: string, password: string): Promise<{ success: boolean; role?: string; message?: string }> => {
    try {
      const data = await postJson('/api/auth/login', { identifier: username, password });
      const u = data.user;
      const extras = await findExtrasByEmail(u.email || '');
      const newUser: User = {
        id: u.id,
        username: u.username || u.email || '',
        role: u.role,
        name: u.name || '',
        assignedClasses: extras.assignedClasses,
        childrenIds: extras.childrenIds,
        phone: u.phone || '',
      };
      setUser(newUser);
      return { success: true, role: u.role };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Invalid credentials' };
    }
  };

  const requestParentOtp = async (phone: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const data = await postJson('/api/auth/login/parent/request-otp', { phone });
      return { success: true, message: data.message || 'OTP sent' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'OTP request failed' };
    }
  };

  const verifyParentOtp = async (phone: string, code: string): Promise<{ success: boolean; role?: string; message?: string }> => {
    try {
      const data = await postJson('/api/auth/login/parent/verify-otp', { phone, code });
      const u = data.user;
      const childrenIds = await findChildrenByPhone(phone);
      const newUser: User = {
        id: u.id,
        username: u.username || u.email || '',
        role: 'parent',
        name: u.name || '',
        assignedClasses: [],
        childrenIds,
        phone: u.phone || phone,
      };
      setUser(newUser);
      return { success: true, role: 'parent' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Invalid code' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* best effort */
    }
    setUser(null);
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
      user, updateUser: setUser, login, requestParentOtp, verifyParentOtp, logout, isAuthenticated,
      isAdmin, isStaff, isTeacher, isParent, canAccessFinance, canModifySystem, assignedClasses,
    }}>
      {!loading && children}
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

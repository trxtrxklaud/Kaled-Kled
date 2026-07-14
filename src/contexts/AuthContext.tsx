import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../lib/types';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useLocalStorage } from '../lib/useLocalStorage';

interface AuthContextType {
  user: User | null;
  updateUser: (user: any) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; role?: string; message?: string }>;
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
  const [user, setUser] = useLocalStorage<any>('auth_user_session', null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const newUser = {
              id: firebaseUser.uid,
              username: firebaseUser.email || '',
              role: data.role || 'parent',
              name: data.name || '',
              assignedClasses: data.assignedClasses || [],
              childrenIds: data.childrenIds || [],
              phone: data.phone || '',
              mustChangePassword: data.mustChangePassword || false
            };
            setUser(newUser);
            syncBackendSession(newUser);
          }
        } catch (error) {
          console.error("Error fetching user data", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser]);

  const syncBackendSession = async (userObj: any) => {
    try {
      await fetch('/api/auth/sync-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userObj.id,
          email: userObj.username,
          role: userObj.role,
          name: userObj.name,
          uid: userObj.id
        })
      });
    } catch (e: any) {
      console.error('Failed to sync backend session', e?.message || e);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; role?: string; message?: string }> => {
    try {
      // For username or phone logic
      const email = username.includes('@') ? username : `${username}@providence.com`;
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user role
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      let role = 'parent';
      let name = '';
      let assignedClasses: string[] = [];
      let childrenIds: string[] = [];
      let phone = '';
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        role = data.role || 'parent';
        name = data.name || '';
        assignedClasses = data.assignedClasses || [];
        childrenIds = data.childrenIds || [];
        phone = data.phone || '';
      }

      const newUser: User = { 
        id: userCredential.user.uid, 
        username: email, 
        role: role as any, 
        name, 
        assignedClasses,
        childrenIds,
        phone
      };

      setUser(newUser);
      await syncBackendSession(newUser);
      
      return { success: true, role };
    } catch (error: any) {
      console.error('Login error', error?.message || error);
      return { success: false, message: error?.message || 'Invalid credentials' };
    }
  };

  const logout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch (e) {}
    setUser(null);
    await signOut(auth).catch((e) => console.error(e?.message || e));
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
       user, updateUser: setUser, login, logout, isAuthenticated, isAdmin, isStaff, isTeacher, isParent,
      canAccessFinance, canModifySystem, assignedClasses 
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

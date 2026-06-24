/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect } from 'react';
import type { User } from '../lib/types';
import { useData } from './DataContext';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

// Load credentials from environment (Vite .env with VITE_ prefix)
// Never hardcode secrets in source code. Use .env.example as template.
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'providence2024';
const STAFF_USERNAME = import.meta.env.VITE_STAFF_USERNAME || 'staff';
const STAFF_PASSWORD = import.meta.env.VITE_STAFF_PASSWORD || 'staff2024';
const TEACHER_PASSWORD = import.meta.env.VITE_TEACHER_PASSWORD || 'prof123';

// Arabic compatibility account loaded from env if provided
const ARABIC_ADMIN_USER = import.meta.env.VITE_AR_ADMIN_USERNAME || 'محمد';
const ARABIC_ADMIN_PASS = import.meta.env.VITE_AR_ADMIN_PASSWORD || 'ريمحمدوني';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; role?: string }>;
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
  const { authSessionUser: user, setAuthSessionUser, parentUsers } = useData();

  useEffect(() => {
    // Listen for Firebase Auth changes to silently keep sessions aligned if needed
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // If we have a Firebase user but no local user, we could sync here
        // For now, we prefer our local mock roles until full migration
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; role?: string }> => {
    // Tier 1 - School Administration/Owner (Full Access)
    if ((username === ARABIC_ADMIN_USER && password === ARABIC_ADMIN_PASS) || 
        (username === ADMIN_USERNAME && password === ADMIN_PASSWORD)) {
      const newUser: User = { id: '1', username: 'محمد', role: 'admin', name: 'المدير العام', assignedClasses: [] };
      setAuthSessionUser(newUser);
      
      // Try to sync with Firebase Auth invisibly if they created an account
      try {
        await signInWithEmailAndPassword(auth, `admin@providence.com`, password);
      } catch (e) {
        console.warn('Firebase sync login skipped');
      }
      return { success: true, role: 'admin' };
    } 
    // Tier 2 - School Staff/Administrators (Shared Account)
    else if (username === STAFF_USERNAME && password === STAFF_PASSWORD) {
      const newUser: User = { id: '2', username: 'staff', role: 'staff', name: 'الإدارة المشتركة', assignedClasses: [] };
      setAuthSessionUser(newUser);
      return { success: true, role: 'staff' };
    } 
    // Tier 3 - School Teachers (Unique Accounts)
    else if (username.startsWith('prof') && password === TEACHER_PASSWORD) {
      const assignedClasses = ['1A', '1B', '1C', '2A', '2B'];
      const newUser: User = { id: username, username, role: 'teacher', name: `M. ${username}`, assignedClasses };
      setAuthSessionUser(newUser);
      return { success: true, role: 'teacher' };
    }
    // Tier 4 - Parents (Dynamic from DataContext)
    else {
      // Find parent by phone (treating username as phone)
      const parent = parentUsers.find(p => p.phone === username);
      if (parent && parent.passwordHash === password) {
        const newUser: User = { 
          id: parent.id, 
          username: parent.phone, 
          role: 'parent', 
          name: parent.fullName,
          childrenIds: parent.childrenIds || [],
          phone: parent.phone,
          mustChangePassword: parent.mustChangePassword
        };
        // Try Firebase Auth for parents
        try {
          // If phone is "2xxxxxxx", format as email: 2xxxxxxx@parent.providence.com
          await signInWithEmailAndPassword(auth, `${username}@parent.providence.com`, password);
        } catch (e) {
          console.warn('Firebase parent auth skipped');
        }
        
        setAuthSessionUser(newUser);
        return { success: true, role: 'parent' };
      }
    }
    return { success: false };
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
      canAccessFinance, canModifySystem, assignedClasses 
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


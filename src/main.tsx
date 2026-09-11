import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Toaster } from 'sonner';
import SplashScreen from './components/SplashScreen';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <SplashScreen />
        <App />
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);

// تسجيل Service Worker للتثبيت على الهاتف — في الإنتاج فقط حتى لا يخزن ملفات التطوير.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* التطبيق يعمل من المتصفح حتى دون PWA */
    });
  });
}

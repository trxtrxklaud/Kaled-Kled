import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Branded launch splash: shows once on initial cold launch per session.
 * Does NOT delay logins or navigations.
 */
export default function SplashScreen() {
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem('splash_shown');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!show) return;
    try {
      sessionStorage.setItem('splash_shown', '1');
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setShow(false), 600);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-white pointer-events-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-20 h-20 rounded-[1.75rem] bg-primary/10 text-primary flex items-center justify-center shadow-lg shadow-primary/10"
          >
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
              <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.1" />
              <path d="M50 15L85 35V65L50 85L15 65V35L50 15Z" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
              <path d="M25 40L50 55L75 40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M50 55V85" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="50" cy="50" r="8" fill="currentColor" />
            </svg>
          </motion.div>
          <div className="text-center">
            <p className="font-black text-slate-900 text-lg leading-tight">المدرسة الابتدائية الخاصة العناية</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mt-1">Al Inaya School</p>
          </div>
          <div className="w-24 h-1 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
            <motion.div
              className="h-full w-1/2 rounded-full bg-primary"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

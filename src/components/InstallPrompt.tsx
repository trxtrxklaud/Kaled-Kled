import { useEffect, useState } from 'react';

/**
 * بانر تثبيت التطبيق على الهاتف (PWA).
 * - Android/Chrome: زر تثبيت مباشر عبر beforeinstallprompt.
 * - iOS: تعليمات يدوية (مشاركة ← إضافة للشاشة الرئيسية).
 * - لا يظهر إن كان التطبيق مثبتاً أصلاً أو إن صرفه المستخدم سابقاً.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa:install-dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return; // مثبت أصلاً
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* التخزين معطّل — نعرض البانر دون حفظ الرفض */
    }
    const ua = navigator.userAgent || '';
    const ios = /iphone|ipad|ipod/i.test(ua);
    setIsIos(ios);
    if (ios) {
      setVisible(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const installed = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* التخزين معطّل — يُغلق دون حفظ */
    }
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setVisible(false);
    } finally {
      setDeferred(null);
    }
  };

  return (
    <div
      className="fixed bottom-4 inset-x-4 z-[60] rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md"
      role="dialog"
      aria-label="تثبيت التطبيق"
    >
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900">تثبيت التطبيق</h3>
          <p className="text-sm text-slate-600">
            {isIos && !deferred
              ? 'على الآيفون: زر المشاركة ← إضافة إلى الشاشة الرئيسية'
              : 'ثبّت تطبيق العناية على هاتفك للوصول السريع'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={dismiss}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
          >
            لاحقاً
          </button>
          {!isIos && deferred && (
            <button
              type="button"
              onClick={install}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:opacity-90 font-bold shadow-sm"
            >
              تثبيت
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

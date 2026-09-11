import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardCheck, Bell, UserRound, BookOpen, MessageSquare, DollarSign, FileText, MessageCircle, RefreshCw, FileBadge, Files, School, Trophy, Database, MoreHorizontal, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface NavigationProps {
  isSidebar?: boolean;
}

interface NavEntry {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  label: string;
  path: string;
}

const Navigation: React.FC<NavigationProps> = ({ isSidebar = false }) => {
  const { t, isRTL } = useLanguage();
  const { canAccessFinance, canModifySystem } = useAuth();
  const auth = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems: NavEntry[] = [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/' },
    { icon: Users, label: t('students'), path: '/students' },
    { icon: UserRound, label: t('employees'), path: '/employees' },
    { icon: ClipboardCheck, label: isRTL ? 'مراقبة الحضور' : 'Suivi Présences', path: '/attendance-monitoring' },
    { icon: BookOpen, label: t('schedules'), path: '/schedules' },
    { icon: Trophy, label: isRTL ? 'النتائج' : 'Résultats', path: '/results' },
    { icon: FileText, label: t('homework'), path: '/homework' },
    { icon: MessageCircle, label: t('news_feed'), path: '/newsfeed' },
    { icon: RefreshCw, label: isRTL ? 'المنظومة (CNTE)' : 'Madrassati CNTE', path: '/eduserv' },
    { icon: MessageSquare, label: t('communication'), path: '/communication' },
    { icon: FileBadge, label: t('certificates'), path: '/certificates' },
    { icon: Files, label: t('certificate_registry'), path: '/certificate-registry' },
  ];

  // Add Finance item only for Admin (Tier 1)
  if (canModifySystem) {
    navItems.push({ icon: School, label: t('school_header'), path: '/school-header' });
    navItems.push({ icon: Database, label: isRTL ? 'قاعدة البيانات' : 'Base de données', path: '/settings' });
    }

  if (canAccessFinance) {
    navItems.push({ icon: DollarSign, label: t('finance'), path: '/finance' });
  }

  let filteredNavItems = navItems;
  if (auth.isParent) {
    filteredNavItems = [
      { icon: LayoutDashboard, label: t('dashboard'), path: '/' },
      { icon: Bell, label: isRTL ? 'الإشعارات' : 'Notifications', path: '/notifications' }
    ];
  }

  if (isSidebar) {
    return (
      <nav className="flex flex-col gap-2 mt-4">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative group",
              isActive 
                ? "bg-primary/10 text-primary shadow-sm" 
                : "text-muted-foreground hover:bg-secondary hover:text-card-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  className={cn(
                     "w-5 h-5 transition-transform duration-300",
                     isActive ? "scale-110" : "group-hover:scale-110"
                  )} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                <span className="font-semibold text-sm tracking-wide">
                  {item.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-nav-indicator" 
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full hidden" 
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    );
  }

  // ——— Mobile: max 4 labeled primaries + a "More" bottom sheet (no new routes).
  // Primary paths are curated from VERIFIED route guards in App.tsx so every
  // button always lands on an allowed page.
  const byPath = new Map(filteredNavItems.map((i) => [i.path, i]));
  const pick = (path: string): NavEntry | null => byPath.get(path) || null;
  let primary: NavEntry[] = [];
  if (auth.isParent) {
    primary = [
      byPath.get('/')!,
      { icon: Users, label: isRTL ? 'فضائي' : 'Enfants', path: '/parent' },
      byPath.get('/homework')!,
      byPath.get('/notifications')!,
    ];
  } else if (auth.isTeacher) {
    primary = [
      byPath.get('/')!,
      byPath.get('/students')!,
      byPath.get('/homework')!,
      byPath.get('/communication')!,
    ];
  } else {
    primary = [
      byPath.get('/')!,
      byPath.get('/students')!,
      ...(canAccessFinance
        ? [{ icon: DollarSign, label: t('finance'), path: '/finance' } as NavEntry]
        : [byPath.get('/communication')!]),
      ...(auth.isAdmin
        ? [{ icon: Bell, label: isRTL ? 'الإشعارات' : 'Notifications', path: '/notifications' } as NavEntry]
        : [byPath.get('/homework')!]),
    ];
  }
  const primaryPaths = new Set(primary.map((p) => p.path));
  const rest = filteredNavItems.filter((i) => !primaryPaths.has(i.path));

  const renderItem = (item: NavEntry, onNavigate?: () => void) => (
    <NavLink
      key={item.path}
      to={item.path}
      onClick={onNavigate}
      className="flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 rounded-2xl transition-transform active:scale-95"
      aria-label={item.label}
    >
      {({ isActive }) => (
        <>
          <span className={cn(
            "flex items-center justify-center w-11 h-8 rounded-full transition-colors",
            isActive ? "bg-primary text-white shadow-md shadow-primary/30" : "text-slate-500"
          )}>
            <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
          </span>
          <span className={cn(
            "text-[10px] mt-1 leading-none",
            isActive ? "font-black text-primary" : "font-semibold text-slate-500"
          )}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden print:hidden">
        <nav
          aria-label={isRTL ? 'التنقل الرئيسي' : 'Navigation principale'}
          className="mx-3 mb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-xl rounded-3xl px-2 py-2 shadow-xl border border-slate-200/80 flex justify-around items-stretch"
        >
          {primary.map((item) => renderItem(item))}
          {rest.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label={isRTL ? 'المزيد' : 'Plus'}
              className="flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 rounded-2xl transition-transform active:scale-95"
            >
              <span className="flex items-center justify-center w-11 h-8 rounded-full text-slate-500">
                <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
              </span>
              <span className="text-[10px] mt-1 leading-none font-semibold text-slate-500">
                {isRTL ? 'المزيد' : 'Plus'}
              </span>
            </button>
          )}
        </nav>
      </div>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-0 z-[70] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={isRTL ? 'المزيد' : 'Plus'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMoreOpen(false)} aria-hidden="true" />
            <motion.div
              className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <h2 className="font-black text-slate-900">
                  {isRTL ? 'كل الأقسام' : 'Toutes les rubriques'}
                </h2>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label={isRTL ? 'إغلاق' : 'Fermer'}
                  className="p-2.5 -m-1 rounded-full text-slate-500 hover:bg-slate-100 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-3 pb-6">
                {rest.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-2xl min-h-[56px] transition-colors",
                      isActive ? "bg-primary/10 text-primary font-black" : "text-slate-700 font-semibold hover:bg-slate-50"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                    <span className="text-sm flex-1">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;

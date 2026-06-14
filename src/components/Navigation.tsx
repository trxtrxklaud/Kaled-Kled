import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserRound, BookOpen, MessageSquare, DollarSign, FileText, MessageCircle, RefreshCw, FileBadge, Files, School, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

interface NavigationProps {
  isSidebar?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ isSidebar = false }) => {
  const { t, isRTL } = useLanguage();
  const { canAccessFinance, canModifySystem } = useAuth();
  
  const navItems = [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/' },
    { icon: Users, label: t('students'), path: '/students' },
    { icon: UserRound, label: t('employees'), path: '/employees' },
    { icon: BookOpen, label: t('schedules'), path: '/schedules' },
    { icon: Trophy, label: isRTL ? 'النتائج' : 'Résultats', path: '/results' },
    { icon: FileText, label: t('homework'), path: '/homework' },
    { icon: MessageCircle, label: t('news_feed'), path: '/newsfeed' },
    { icon: RefreshCw, label: t('eduserv'), path: '/eduserv' },
    { icon: MessageSquare, label: t('communication'), path: '/communication' },
    { icon: FileBadge, label: t('certificates'), path: '/certificates' },
    { icon: Files, label: t('certificate_registry'), path: '/certificate-registry' },
  ];

  // Add Finance item only for Admin (Tier 1)
  if (canModifySystem) {
    navItems.push({ icon: School, label: t('school_header'), path: '/school-header' });
  }

  if (canAccessFinance) {
    navItems.push({ icon: DollarSign, label: t('finance'), path: '/finance' });
  }

  if (isSidebar) {
    return (
      <nav className="flex flex-col gap-2 mt-4">
        {navItems.map((item) => (
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-slate-100 px-2 py-2 z-50 safe-area-bottom shadow-lg print:hidden">
      <div className="flex justify-around items-center overflow-x-auto no-scrollbar gap-1 custom-nav-scroll">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl min-w-[70px] relative transition-colors"
          >
            {({ isActive }) => (
              <div className={cn(
                "flex flex-col items-center justify-center transition-all duration-300 w-full rounded-2xl",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
              )}>
                <item.icon 
                  className={cn("w-5 h-5 mb-1.5", isActive ? "fill-primary/20" : "")} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest leading-none",
                  isActive ? "opacity-100" : "opacity-0 h-0 transition-all duration-300"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="nav-pill" 
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" 
                  />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserRound, BookOpen, MessageSquare, DollarSign, FileText, MessageCircle, RefreshCw, FileBadge, Files, School, Trophy, Database } from 'lucide-react';
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
  if (useAuth().isParent) {
    filteredNavItems = [
      { icon: LayoutDashboard, label: t('dashboard'), path: '/' }
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

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 safe-area-bottom w-[95%] max-w-md print:hidden lg:hidden">
      <nav className="bg-[#1e1b4b]/95 backdrop-blur-xl rounded-full px-4 py-3 shadow-[0_20px_40px_-5px_rgba(30,27,75,0.4)] flex justify-around items-center border border-white/10 no-scrollbar overflow-x-auto">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex flex-col items-center justify-center relative transition-transform active:scale-95"
          >
            {({ isActive }) => (
              <div className={cn(
                "flex items-center justify-center transition-all duration-300 rounded-full p-2.5",
                isActive ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
              )}>
                <item.icon 
                  className={cn("w-6 h-6", isActive ? "text-accent drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] fill-accent/20" : "")}
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                {isActive && (
                  <motion.div 
                    layoutId="nav-pill" 
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Navigation;
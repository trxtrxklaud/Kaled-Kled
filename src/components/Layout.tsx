import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, LogOut, Printer, School } from 'lucide-react';
import { Button } from './ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import ErrorBoundary from './ErrorBoundary';
import { triggerPrint, getAvatarUrl } from '../lib/utils';

const Layout: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const { language, setLanguage, isRTL } = useLanguage();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`flex h-screen bg-transparent overflow-hidden ${isRTL ? 'font-arabic flex-row-reverse' : ''}`}>
      {/* Desktop Sidebar (Hidden on mobile) */}
      <aside className="hidden lg:flex w-72 flex-col bg-card border-slate-100 z-50 print:hidden relative transition-layout border-r shadow-sm">
        <div className="p-6 flex items-center gap-4">
          <div className="bg-primary/10 p-2.5 rounded-2xl w-12 h-12 flex items-center justify-center shadow-sm text-primary">
            <School className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-card-foreground">La Providence</h1>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">Scolarité</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar">
          <Navigation isSidebar />
        </div>
        
        {/* User Card at Bottom of Sidebar */}
        <div className="p-4 border-t border-slate-50 bg-card">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors shadow-sm border border-secondary">
            <div className="w-10 h-10 flex-shrink-0 rounded-full border border-white bg-white flex items-center justify-center overflow-hidden shadow-sm">
                <img 
                 src={getAvatarUrl(user?.username || 'admin', 'employee')} 
                 onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://placehold.co/48?text=?"; }} 
                 alt="Profile" 
                 className="w-full h-full object-cover" 
               />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-semibold text-card-foreground truncate capitalize">{user?.username}</p>
               <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{user?.role === 'admin' ? 'Administrateur' : 'Personnel'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-red-500 hover:bg-red-50 flex-shrink-0 transition-colors rounded-full">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-slate-100 p-4 safe-area-top shadow-sm">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl w-10 h-10 flex items-center justify-center shadow-sm text-primary">
                 <School className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-base leading-none text-card-foreground tracking-tight">La Providence</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full text-muted-foreground hover:bg-secondary transition-colors"
                onClick={triggerPrint}
              >
                <Printer className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full text-muted-foreground hover:bg-secondary hover:text-red-500 transition-colors"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Global Toolbar (Desktop Top Right) */}
        <div className="hidden lg:flex absolute top-6 right-8 z-50 items-center justify-end gap-3 print:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full bg-card/80 backdrop-blur-md border-slate-200 text-muted-foreground hover:bg-card hover:text-card-foreground shadow-sm transition-all"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  <span className="text-xs font-semibold uppercase">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-slate-100 rounded-2xl shadow-xl p-2 min-w-[150px]">
                <DropdownMenuItem onClick={() => setLanguage('fr')} className={`rounded-xl px-4 py-2 cursor-pointer ${language === 'fr' ? 'bg-secondary font-semibold' : ''}`}>
                  🇫🇷 Français
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('ar')} className={`rounded-xl px-4 py-2 cursor-pointer ${language === 'ar' ? 'bg-secondary font-semibold' : ''}`}>
                  🇸🇦 العربية
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('en')} className={`rounded-xl px-4 py-2 cursor-pointer ${language === 'en' ? 'bg-secondary font-semibold' : ''}`}>
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              onClick={triggerPrint}
              variant="outline"
              size="sm"
              className="rounded-full bg-card/80 backdrop-blur-md border-slate-200 text-muted-foreground hover:bg-card hover:text-card-foreground shadow-sm transition-all"
            >
              <Printer className="w-4 h-4 mr-2" />
              <span className="text-xs font-semibold">Print</span>
            </Button>
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto overflow-y-auto no-scrollbar scroll-smooth">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="p-4 lg:p-10 pb-32 lg:pb-12"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
        
        {/* Mobile Navigation */}
        <div className="lg:hidden">
           <Navigation isSidebar={false} />
        </div>
      </div>
    </div>
  );
};

export default Layout;
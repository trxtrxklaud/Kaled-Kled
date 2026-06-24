import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, LogOut, Printer, School, BookOpen } from 'lucide-react';
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
          <div className="bg-primary/10 p-2.5 rounded-[1.2rem] w-12 h-12 flex items-center justify-center shadow-sm text-primary overflow-hidden">
             {/* Dynamic Administration Logo SVG */}
             <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-primary drop-shadow-md">
                <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.1" />
                <path d="M50 15L85 35V65L50 85L15 65V35L50 15Z" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
                <path d="M25 40L50 55L75 40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M50 55V85" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="50" cy="50" r="8" fill="currentColor" />
             </svg>
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight text-card-foreground">المدرسة الابتدائية الخاصة العناية</h1>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">{user?.role === 'parent' ? 'فضاء التلاميذ و الأولياء' : 'الإدارة المدرسية'}</p>
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
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-transparent">
        
        {/* Soft atmospheric background inside main pane */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden hidden lg:block">
           <div className="absolute top-[-10%] right-[-5%] w-[45rem] h-[45rem] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-[120px] opacity-80"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-gradient-to-t from-secondary/5 to-transparent rounded-full blur-[120px] opacity-70"></div>
           <div className="absolute top-[20%] left-[-5%] w-[30rem] h-[30rem] bg-gradient-to-r from-tertiary/5 to-transparent rounded-full blur-[100px] opacity-50"></div>
           
           {/* Decorative elegant academic shapes faintly in the background */}
           <School className="absolute top-[10%] right-[15%] w-64 h-64 text-primary/[0.03] drop-shadow-sm -rotate-12" strokeWidth={1} />
           <BookOpen className="absolute top-[40%] left-[5%] w-40 h-40 text-tertiary/[0.03] drop-shadow-sm rotate-12" strokeWidth={1} />
           <div className="absolute bottom-[20%] right-[20%] w-32 h-32 rounded-full border-[10px] border-accent/[0.02]"></div>
        </div>

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-slate-100 p-4 safe-area-top shadow-sm">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-[1rem] w-10 h-10 flex items-center justify-center shadow-sm text-primary">
                 <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-primary drop-shadow-md">
                    <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.1" />
                    <path d="M50 15L85 35V65L50 85L15 65V35L50 15Z" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
                    <path d="M25 40L50 55L75 40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M50 55V85" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="50" cy="50" r="8" fill="currentColor" />
                 </svg>
              </div>
              <div>
                <h1 className="font-bold text-sm leading-none text-card-foreground tracking-tight">المدرسة الابتدائية الخاصة العناية</h1>
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
        <main className="flex-1 w-full max-w-7xl mx-auto overflow-y-auto no-scrollbar scroll-smooth print:block print:overflow-visible print:w-full print:max-w-none print:m-0 print:p-0">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="p-4 lg:p-10 pb-32 lg:pb-12 print:p-0 print:m-0"
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
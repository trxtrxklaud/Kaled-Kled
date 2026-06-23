import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { LogIn, User, Lock, AlertCircle, Globe } from 'lucide-react';
import { toast } from 'sonner';

const LoginSchoolIllustration = () => (
  <div className="relative w-full h-full flex items-center justify-center p-12 overflow-hidden pointer-events-none">
    {/* Colorful Abstract Background Blobs */}
    <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] bg-secondary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s' }}></div>
    <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-primary/20 rounded-full blur-[120px]"></div>
    <div className="absolute top-1/3 right-1/4 w-[25rem] h-[25rem] bg-tertiary/15 rounded-full blur-[100px]"></div>
    <div className="absolute bottom-1/3 left-1/3 w-[20rem] h-[20rem] bg-accent/20 rounded-full blur-[80px]"></div>

    <div className="relative z-10 w-full h-full max-w-2xl mx-auto flex items-center justify-center">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-[140%] h-[140%] drop-shadow-2xl">
        {/* Background Decorative */}
        <circle cx="100" cy="100" r="80" fill="currentColor" className="text-secondary/10" opacity="0.6"/>
        <path d="M -20 160 Q 50 120 100 160 T 220 140" fill="none" stroke="currentColor" className="text-accent" strokeWidth="8" strokeLinecap="round" opacity="0.5"/>

        {/* Teacher (Female, friendly) */}
        <g transform="translate(45, 45)">
          {/* Body */}
          <path d="M 25 110 C 25 70, 75 70, 75 110" fill="currentColor" className="text-primary" />
          {/* Head */}
          <circle cx="50" cy="50" r="22" fill="#ffedd5" />
          {/* Hair */}
          <path d="M 28 50 C 28 20, 72 20, 72 50 C 72 75, 55 70, 55 50 C 55 35, 45 35, 45 50 C 45 75, 28 75, 28 50" fill="currentColor" className="text-slate-800" />
          <circle cx="50" cy="22" r="14" fill="currentColor" className="text-slate-800" />
          {/* Smile */}
          <path d="M 40 55 Q 50 63 60 55" fill="none" stroke="currentColor" className="text-tertiary" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 42 48 Q 45 50 48 48" fill="none" stroke="currentColor" className="text-slate-800" strokeWidth="2" strokeLinecap="round" />
          <path d="M 52 48 Q 55 50 58 48" fill="none" stroke="currentColor" className="text-slate-800" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Student 1 */}
        <g transform="translate(100, 95)">
          <path d="M 12 70 C 12 45, 58 45, 58 70" fill="currentColor" className="text-secondary" />
          <circle cx="35" cy="30" r="18" fill="#ffedd5" />
          <path d="M 17 30 C 17 5, 53 5, 53 30" fill="#92400e" />
        </g>

        {/* Student 2 */}
        <g transform="translate(145, 105)">
          <path d="M 5 60 C 5 35, 35 35, 35 60" fill="currentColor" className="text-accent2" />
          <circle cx="20" cy="25" r="15" fill="#ffedd5" />
          <path d="M 5 25 C 5 5, 35 5, 35 25 C 35 40, 25 40, 25 25" fill="#1e293b" />
        </g>

        {/* Floating shapes */}
        <rect x="15" y="50" width="18" height="18" rx="4" fill="currentColor" className="text-tertiary" transform="rotate(-15 25 50)" />
        <circle cx="185" cy="55" r="10" fill="currentColor" className="text-accent" />
        <path d="M 150 25 L 165 15 L 175 30 Z" fill="currentColor" className="text-secondary" />
      </svg>
    </div>
  </div>
);

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [loginType, setLoginType] = useState<'admin' | 'student'>('student');
  
  const { login, isAuthenticated } = useAuth();
  const { isDataLoaded } = useData();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const navigate = useNavigate();

  if (!isDataLoaded) {
    return <div className="h-screen flex items-center justify-center p-8 bg-slate-50 text-slate-500">Chargement...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      const success = await login(username, password);
      if (success) {
        toast.success(t('welcome'));
        navigate('/');
      } else {
        setError(true);
        toast.error('Identifiants invalides');
      }
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'ar' : 'fr');
  };

  return (
    <div className={`min-h-screen flex bg-slate-50 relative overflow-hidden ${isRTL ? 'font-arabic flex-row-reverse' : ''}`}>
      {/* Background elements for mobile */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl lg:hidden"></div>
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-3xl lg:hidden"></div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-30">
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm hover:bg-white"
          onClick={toggleLanguage}
        >
          <Globe className="w-4 h-4 mr-2" />
          {language === 'fr' ? 'العربية' : 'Français'}
        </Button>
      </div>

      {/* Left Side: Educational Illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-primary/5 via-accent/5 to-white border-r border-slate-100">
        <LoginSchoolIllustration />
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 lg:w-[45%] bg-white/80 backdrop-blur-sm lg:bg-transparent">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center shadow-lg shadow-primary/5 mb-6 border-4 border-white transition-all duration-500 text-primary">
              {loginType === 'admin' ? (
                // Administrator Premium SVG Logo
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 drop-shadow-md">
                   <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.1" />
                   <path d="M50 15L85 35V65L50 85L15 65V35L50 15Z" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
                   <path d="M25 40L50 55L75 40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                   <path d="M50 55V85" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                   <circle cx="50" cy="50" r="8" fill="currentColor" />
                </svg>
              ) : (
                // Student/Parent Premium SVG Logo
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 drop-shadow-md">
                   <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.1" />
                   <path d="M50 35C50 26.7157 56.7157 20 65 20C73.2843 20 80 26.7157 80 35C80 41.5235 75.8407 47.0722 69.9961 49.2064C79.8398 52.3392 87 61.464 87 72.5V80H43V72.5C43 61.464 50.1602 52.3392 60.0039 49.2064C54.1593 47.0722 50 41.5235 50 35Z" fill="currentColor" fillOpacity="0.4" />
                   <path d="M35 50C35 38.9543 43.9543 30 55 30C66.0457 30 75 38.9543 75 50C75 58.6974 69.454 66.0964 61.6616 68.9419C74.7865 73.1189 84.3333 85.2853 84.3333 100H25.6667C25.6667 85.2853 35.2135 73.1189 48.3384 68.9419C40.546 66.0964 35 58.6974 35 50Z" fill="currentColor" />
                </svg>
              )}
            </div>
            <h1 className="text-2xl font-black text-primary text-center tracking-tight">المدرسة الابتدائية الخاصة العناية</h1>
            <p className="text-slate-500 font-bold text-center mt-2 uppercase tracking-[0.2em] text-[10px]">{t('dashboard')}</p>
          </div>

          <div className="flex gap-2 mb-6 bg-slate-200/50 p-1.5 rounded-[1.5rem]">
            <button
              type="button"
              onClick={() => setLoginType('student')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1.2rem] text-sm font-bold transition-all duration-300 ${loginType === 'student' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {/* Student Logo SVG */}
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 21C20 18.2386 16.4183 16 12 16C7.58172 16 4 18.2386 4 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 12L15 15M12 12L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
              </svg>
              {isRTL ? 'التلاميذ والأولياء' : 'Élèves & Parents'}
            </button>
            <button
              type="button"
              onClick={() => setLoginType('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1.2rem] text-sm font-bold transition-all duration-300 ${loginType === 'admin' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {/* Admin Logo SVG */}
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                <path d="M12 14L20 10L12 6L4 10L12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 14L12 18L20 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 14L12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isRTL ? 'الإدارة' : 'Administration'}
            </button>
          </div>

          <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-lg rounded-[2.5rem] overflow-hidden border border-slate-100">
            <CardContent className="pt-8 pb-8 px-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                    {loginType === 'student' ? (isRTL ? 'رقم الهاتف' : 'N° Téléphone') : t('username')}
                  </Label>
                  <div className="relative">
                    <User className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                    <Input
                      id="username"
                      placeholder={loginType === 'student' ? '2xxxxxxx' : t('username')}
                      className={`${isRTL ? 'pr-12' : 'pl-12'} h-14 rounded-2xl border-slate-200 focus:ring-primary/20 bg-slate-50/50`}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">{t('password')}</Label>
                  <div className="relative">
                    <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className={`${isRTL ? 'pr-12' : 'pl-12'} h-14 rounded-2xl border-slate-200 focus:ring-primary/20 bg-slate-50/50`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-destructive text-xs font-medium bg-destructive/5 p-4 rounded-2xl border border-destructive/10"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{isRTL ? 'خطأ في اسم المستخدم أو كلمة المرور' : 'Identifiants invalides'}</span>
                  </motion.div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/95 rounded-2xl transition-all duration-300 shadow-xl shadow-primary/25 active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      {isRTL ? 'جاري الدخول...' : 'Connexion...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t('login_btn')} <LogIn className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-12 text-center px-4">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-loose">
              © {new Date().getFullYear()} المدرسة الابتدائية الخاصة العناية. {isRTL ? 'جميع الحقوق محفوظة' : 'Tous droits réservés'}.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { LogIn, User, Lock, AlertCircle, Globe } from 'lucide-react';
import { toast } from 'sonner';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const navigate = useNavigate();

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
    <div className={`min-h-screen flex flex-col bg-slate-50 relative overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
      {/* Background elements */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-3xl"></div>

      <div className="absolute top-6 right-6 z-20">
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full bg-white/50 backdrop-blur-sm border-slate-200"
          onClick={toggleLanguage}
        >
          <Globe className="w-4 h-4 mr-2" />
          {language === 'fr' ? 'العربية' : 'Français'}
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/20 mb-6 border-4 border-white rotate-3 hover:rotate-0 transition-transform duration-500">
              <img 
                src="https://storage.googleapis.com/dala-prod-public-storage/generated-images/036ab487-ddf1-4b0b-89af-6fde6e168a8e/app-logo-cp-02374410-1780286565274.webp" 
                alt="CP Logo" 
                className="w-20 h-20 rounded-[1.5rem] object-cover"
              />
            </div>
            <h1 className="text-3xl font-black text-primary text-center tracking-tight">Complexe la Providence</h1>
            <p className="text-slate-500 font-medium text-center mt-2 uppercase tracking-[0.2em] text-[10px]">{t('dashboard')}</p>
          </div>

          <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-lg rounded-[2.5rem] overflow-hidden">
            <CardContent className="pt-10 pb-10 px-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">{t('username')}</Label>
                  <div className="relative">
                    <User className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                    <Input
                      id="username"
                      placeholder={t('username')}
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
              © {new Date().getFullYear()} Complexe la Providence. {isRTL ? 'جميع الحقوق محفوظة' : 'Tous droits réservés'}.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
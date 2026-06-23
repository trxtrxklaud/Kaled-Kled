import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { hashPassword } from '../lib/password';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserRound, 
  Calendar, 
  PlusCircle, 
  MessageCircle, 
  ClipboardCheck,
  TrendingUp,
  ArrowRight,
  Activity,
  Bell,
  FileBadge,
  Files,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import NewsFeed from '../components/Dashboard/NewsFeed';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import NewsAdminTool from '../components/Dashboard/NewsAdminTool';
import type { NewsItem } from '../lib/types';

const SchoolIllustration = () => (
  <div className="relative w-full h-full min-h-[240px] flex items-center justify-center pointer-events-none">
    {/* Colorful Abstract Background Blobs */}
    <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-secondary/20 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '8s' }}></div>
    <div className="absolute bottom-0 right-10 w-64 h-64 bg-accent/20 rounded-full blur-[80px]"></div>
    <div className="absolute top-10 right-20 w-48 h-48 bg-tertiary/10 rounded-full blur-[60px]"></div>

    <div className="relative z-10 w-full h-full max-w-sm mx-auto flex items-center justify-center">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-[130%] h-[130%] drop-shadow-2xl">
        {/* Background Decorative */}
        <circle cx="100" cy="100" r="80" fill="currentColor" className="text-secondary/10" opacity="0.6"/>
        <path d="M 0 160 Q 50 130 100 160 T 200 140" fill="none" stroke="currentColor" className="text-accent" strokeWidth="6" strokeLinecap="round" opacity="0.4"/>

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
        <rect x="25" y="60" width="16" height="16" rx="4" fill="currentColor" className="text-tertiary" transform="rotate(-15 30 60)" />
        <circle cx="175" cy="65" r="8" fill="currentColor" className="text-accent" />
        <path d="M 150 35 L 160 25 L 170 40 Z" fill="currentColor" className="text-secondary" />
      </svg>
    </div>
  </div>
);

const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { students, parentUsers, updateParentUser, setAuthSessionUser, homeworks, posts } = useData();
  const { isRTL } = useLanguage();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const childId = user?.childrenIds?.[0] || '1';
  const child = students.find(s => s.id === childId) || students[0];

  const parentHomeworks = homeworks.filter(hw => hw.classes?.includes(child?.class) || hw.classes?.includes('Tous'));
  const latestHomework = parentHomeworks.length > 0 ? parentHomeworks[0] : null;

  const parentPosts = posts.filter(post => {
    if (post.audience === 'Tout le monde') return true;
    if (post.audience === 'Parents') return true;
    if (post.audience.startsWith('Classes: ') && child?.class) {
      return post.audience.includes(child.class);
    }
    return false;
  });
  const latestPost = parentPosts.length > 0 ? parentPosts[0] : null;

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert(isRTL ? "كلمتا المرور غير متطابقتين!" : "Les mots de passe ne correspondent pas !");
      return;
    }
    if (newPassword.length < 6) {
      alert(isRTL ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل." : "Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    const parentUser = parentUsers.find(p => p.id === user?.id);
    if (!parentUser || !user) return;

    updateParentUser({ ...parentUser, passwordHash: hashPassword(newPassword), mustChangePassword: false });
    setAuthSessionUser({ ...user, mustChangePassword: false });
  };

  if (user?.mustChangePassword) {
    return (
      <div className={`space-y-6 pb-32 sm:pb-24 px-1 max-w-sm mx-auto mt-20 ${isRTL ? 'text-right' : ''}`}>
        <Card className="rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center text-accent mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h2 className="text-xl font-black text-slate-800">{isRTL ? 'تحديث كلمة المرور' : 'Mise à jour du mot de passe'}</h2>
            <p className="text-xs text-slate-500 text-center mt-2 font-medium">
              {isRTL ? 'لدواعي أمنية، يرجى تغيير كلمة المرور المؤقتة الخاصة بك قبل المتابعة.' : 'Pour des raisons de sécurité, veuillez modifier votre mot de passe temporaire.'}
            </p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">{isRTL ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-12 text-sm focus:outline-none focus:border-primary/50"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">{isRTL ? 'تأكيد كلمة المرور' : 'Confirmer le mot de passe'}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-12 text-sm focus:outline-none focus:border-primary/50"
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary/90 h-12 font-bold mt-4 shadow-xl shadow-primary/20">
              {isRTL ? 'حفظ المتابعة' : 'Enregistrer et continuer'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 pb-32 sm:pb-24 px-1 max-w-2xl mx-auto ${isRTL ? 'text-right' : ''}`}>

      {/* Top Header */}
      <div className="flex justify-between items-center bg-white/70 backdrop-blur-xl rounded-[2rem] p-2 pr-6 shadow-sm border border-white/40 inline-flex w-full mt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black text-xl shadow-inner border border-primary/20">
            {user?.name?.charAt(0)}
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight">مرحباً، {user?.name}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold whitespace-nowrap">والد التلميذ {child?.fullName}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow-sm text-slate-700 w-10 h-10 rounded-full flex items-center justify-center border border-slate-100 relative cursor-pointer active:scale-95 transition-transform">
          <Bell className="w-5 h-5"/>
          <span className="absolute top-0 right-0 w-3 h-3 bg-tertiary rounded-full border-2 border-white"></span>
        </div>
      </div>

      {/* Hero Banner (Level 1 equivalent) */}
      <div className="bg-gradient-to-br from-[#7c3aed] via-[#8b5cf6] to-[#6d28d9] text-white rounded-[2.5rem] p-6 shadow-[0_20px_40px_-15px_rgba(124,58,237,0.5)] relative overflow-hidden border border-white/10">
        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-[-30px] left-[-30px] w-32 h-32 bg-accent/20 rounded-full blur-xl"></div>

        <div className="relative z-10 w-2/3 pr-2">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-none py-1 mb-3 rounded-xl shadow-sm backdrop-blur-md">
            الأسبوع الثاني
          </Badge>
          <h2 className="text-2xl font-black mb-2 drop-shadow-sm">تقدم ممتاز!</h2>
          <p className="text-white/80 text-xs font-medium mb-5 leading-relaxed max-w-[200px]">هذه فرصتك الأولى لمساعدة يوسف على التميز اليوم.</p>

          <div className="bg-black/20 backdrop-blur-sm rounded-full h-2 w-full max-w-[180px] overflow-hidden p-[1px]">
            <div className="bg-accent h-full w-[70%] rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)] relative">
              <div className="absolute inset-0 bg-white/30 truncate border-t-[1px]"></div>
            </div>
          </div>
        </div>

        <div className="absolute left-[-20px] bottom-[-15px] w-[140px] h-[140px] opacity-100">
           {/* Replace with a cute simple SVG illustration to fit the space */}
           <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl translate-y-2">
             <path d="M50 90C72.0914 90 90 72.0914 90 50C90 27.9086 72.0914 10 50 10C27.9086 10 10 27.9086 10 50C10 72.0914 27.9086 90 50 90Z" fill="#FBBF24" opacity="0.9"/>
             <path d="M40 50L55 35L70 50H60V70H50V50H40Z" fill="#FFF"/>
             <circle cx="35" cy="45" r="5" fill="#1E1B4B"/>
             <circle cx="65" cy="45" r="5" fill="#1E1B4B"/>
             <path d="M40 60Q50 70 60 60" stroke="#1E1B4B" strokeWidth="3" strokeLinecap="round"/>
           </svg>
        </div>
      </div>

      {/* Circular Navigation Hub */}
      <div className="flex justify-between items-start gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
        {[
          { icon: Files, label: 'الواجبات', color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200', shadow: 'shadow-indigo-200/50', path: '/homework' },
          { icon: UserRound, label: 'النتائج', color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200', shadow: 'shadow-emerald-200/50', path: '/results' },
          { icon: Mail, label: 'الإرساليات', color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-200', shadow: 'shadow-rose-200/50', path: '/communication' },
          { icon: Bell, label: 'البلاغات', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200', shadow: 'shadow-blue-200/50', path: '/newsfeed' },
        ].map((item, idx) => (
          <Link key={idx} to={item.path} className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group">
            <div className={`w-[66px] h-[66px] rounded-full ${item.bg} flex items-center justify-center shadow-lg ${item.shadow} border ${item.border} ${item.color} transition-transform group-hover:-translate-y-1 group-active:scale-95`}>
               <item.icon className="w-8 h-8 drop-shadow-sm" strokeWidth={2} />
            </div>
            <span className="text-[11px] font-extrabold text-slate-700">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Main Content Areas */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">قائمة المهام الجديدة</h3>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-600 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          </button>
        </div>

        {/* Task Card 1 (Homework) */}
        {latestHomework ? (
          <Link to="/homework">
            <Card className="rounded-[2rem] text-right border border-blue-50/50 shadow-[0_12px_24px_-10px_rgba(0,0,0,0.06)] overflow-hidden bg-white relative p-6 flex flex-row-reverse items-center justify-between gap-4 transition-all hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)]">
              <div className="flex-1 z-10 w-2/3 pr-2 border-r-2 border-indigo-100 rtl:border-l-2 rtl:border-r-0 rtl:pl-2 rtl:pr-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none rounded-xl px-3 py-1 font-bold text-[10px]">{latestHomework.subject}</Badge>
                  <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none rounded-xl px-2 py-1 font-bold text-[10px]">{latestHomework.session || 'جديد'}</Badge>
                </div>
                <h4 className="font-extrabold text-lg text-slate-800 mb-2 leading-tight">{latestHomework.title}</h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium line-clamp-2">{latestHomework.description}</p>
                <Button className="rounded-full bg-[#1e1b4b] hover:bg-[#2e2a6b] text-white shadow-xl shadow-indigo-900/20 text-xs px-6 h-9 font-bold w-full sm:w-auto">{isRTL ? 'عرض الواجب' : 'Voir le devoir'}</Button>
              </div>
              <div className="w-[100px] sm:w-[120px] relative h-full flex flex-col items-center justify-center">
                {/* Circular Progress & Illustration */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="8" strokeDasharray="283" strokeDashoffset="283" className="opacity-20" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-center">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">جديد</span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ) : (
          <p className="text-slate-400 text-sm text-center italic">{isRTL ? 'لا يوجد واجبات جديدة' : 'Pas de nouveaux devoirs'}</p>
        )}

        {/* Task Card 2 (Announcement) */}
        {latestPost ? (
          <Link to="/newsfeed">
            <Card className="rounded-[2rem] text-right border border-rose-50/50 shadow-[0_12px_24px_-10px_rgba(0,0,0,0.06)] overflow-hidden bg-[#fff5f5] relative p-6 flex flex-row-reverse items-center justify-between gap-4 transition-all hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)]">
              <div className="flex-1 z-10 w-2/3 pr-2 border-r-2 border-rose-200 rtl:border-l-2 rtl:border-r-0 rtl:pl-2 rtl:pr-0">
                 <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-rose-200 text-rose-800 hover:bg-rose-200 border-none rounded-xl px-3 py-1 font-bold text-[10px]">{latestPost.author || 'الإدارة'}</Badge>
                </div>
                <h4 className="font-extrabold text-lg text-slate-800 mb-2 leading-tight">إعلان جديد</h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium line-clamp-2">{latestPost.content}</p>
                <Button className="rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/20 text-xs px-6 h-9 font-bold w-full sm:w-auto">{isRTL ? 'قراءة الإعلان' : 'Lire'}</Button>
              </div>
              <div className="w-[100px] sm:w-[120px] relative h-full flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-200 rounded-full flex items-center justify-center text-rose-500">
                   <Bell className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
              </div>
            </Card>
          </Link>
        ) : null}
      </div>

    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user, isAdmin, isStaff, isParent } = useAuth();
  const { students, employees, announcements, exams, messages, emailDeliveryLogs, addNews } = useData();
  const { t, isRTL } = useLanguage();

  if (isParent) {
    return <ParentDashboard />;
  }

  // Create chart data: count students per standard class level
  const classDistribution = ['1A', '2A', '3A', '4A', '5A', '6A'].map(level => ({
    name: level,
    students: students.filter(s => s.class?.includes(level[0])).length || 0
  }));

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  const stats = [
    { label: t('total_students'), value: students.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { label: t('total_staff'), value: employees.length, icon: UserRound, color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
    { label: t('upcoming_exams'), value: exams.length, icon: Calendar, color: 'text-tertiary', bg: 'bg-tertiary/10', border: 'border-tertiary/20' },
    { label: t('unread_messages'), value: messages.filter(m => !m.read).length, icon: MessageCircle, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
  ];

  const quickActions = [
    { label: t('add_student'), icon: PlusCircle, path: '/students', roles: ['admin'], color: 'bg-primary text-primary-foreground hover:bg-primary/90' },
    { label: t('exam_schedule'), icon: ClipboardCheck, path: '/schedules', roles: ['admin', 'teacher'], color: 'bg-secondary/10 text-secondary hover:bg-secondary/20' },
    { label: t('announcements'), icon: Bell, path: '/communication', roles: ['admin'], color: 'bg-accent/10 text-accent-foreground hover:bg-accent/20' },
    { label: t('statistics'), icon: TrendingUp, path: '/statistics', roles: ['admin'], color: 'bg-tertiary/10 text-tertiary hover:bg-tertiary/20' },
    { label: t('certificates'), icon: FileBadge, path: '/certificates', roles: ['admin', 'staff'], color: 'bg-white border text-foreground hover:bg-slate-50' },
    { label: t('certificate_registry'), icon: Files, path: '/certificate-registry', roles: ['admin', 'staff'], color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
  ].filter(action => action.roles.includes(user?.role || ''));

  // Handler defined inside Dashboard as per instructions
  const handlePublishNews = (newsData: Omit<NewsItem, 'id' | 'date'>) => {
    addNews(newsData);
  };

  return (
    <div className={`space-y-10 ${isRTL ? 'text-right' : ''}`}>
      {/* Premium Educational Welcome Section */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-8 sm:p-12 border border-primary/10 shadow-sm flex items-center">
        
        {/* Abstract Illustration Container */}
        <div className="absolute right-0 bottom-0 top-0 hidden md:block w-1/2 opacity-70 pointer-events-none fade-in">
           <SchoolIllustration />
        </div>

        <div className="relative z-10 flex flex-col gap-2 w-full max-w-xl">
          <Badge className="w-fit bg-primary/20 text-primary border-transparent py-1 px-3 shadow-none">
             {isAdmin ? t('admin') : t('teacher')}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-1">{t('welcome')},</h2>
          <p className="text-lg sm:text-xl font-medium text-slate-600">{user?.name}</p>
          <div className="mt-8 flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-widest">
            <Calendar className="w-4 h-4 text-primary/70" />
            {new Date().toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6"
      >
        {stats.map((stat, idx) => (
          <motion.div key={idx} variants={item}>
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden group hover:shadow-md hover:border-slate-200 transition-all duration-300 bg-white">
              <CardContent className="p-5 sm:p-6 flex flex-col items-start gap-4">
                <div className={`${stat.bg} ${stat.color} p-3 rounded-xl transform group-hover:scale-105 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-3xl font-extrabold leading-none tracking-tight text-slate-900">{stat.value}</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-2">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-sm font-bold text-slate-900">{t('quick_actions')}</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
          {quickActions.map((action, idx) => (
            <Link key={idx} to={action.path} className="flex flex-col items-center gap-3 group">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 ${action.color} rounded-2xl flex items-center justify-center shadow-sm transform active:scale-95 transition-all duration-300 group-hover:-translate-y-1`}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-600 text-center leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Analytics Chart Row */}
      <section className="grid grid-cols-1 gap-6">
        <Card className="border border-slate-100 shadow-sm rounded-3xl bg-card overflow-hidden w-full">
          <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-3">
               <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                  <TrendingUp className="w-4 h-4" />
               </div>
               <CardTitle className="text-base font-bold text-card-foreground">
                 {isRTL ? 'إحصائيات الطلاب حسب المستوى' : 'Effectifs par niveau'}
               </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div style={{ width: '100%', height: 250, minHeight: 250 }} className="recharts-wrapper">
              <ResponsiveContainer width="99%" height={250}>
                <AreaChart data={classDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} minTickGap={10} />
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <Tooltip
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '0.25rem' }}
                  />
                  <Area type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* NEWS SECTION (FIXED) */}
      <section className="space-y-6">
        {(isAdmin || isStaff) && <NewsAdminTool onPublish={handlePublishNews} />}
        <NewsFeed />
      </section>

      {/* Recent Activity & Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-slate-100 shadow-sm rounded-3xl bg-card overflow-hidden">
          <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-3">
               <div className="bg-primary/10 p-2 rounded-xl text-primary">
                  <Activity className="w-4 h-4" />
               </div>
               <CardTitle className="text-base font-bold text-card-foreground">{t('recent_activity')}</CardTitle>
            </div>
            <Link to="/communication" className="text-xs text-muted-foreground font-semibold hover:text-primary flex items-center gap-1 group transition-colors">
              {isRTL ? 'عرض الكل' : 'Voir tout'} <ArrowRight className={`w-3 h-3 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
          </CardHeader>
          <CardContent className="p-6 pt-6 space-y-6">
            {announcements.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">{t('no_data')}</p>
              </div>
            ) : (
              announcements.slice(0, 3).map((ann, idx) => (
                <div key={idx} className="flex gap-4 group">
                  <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                    ann.priority === 'urgent' ? 'bg-red-500 shadow-sm shadow-red-500/50' : 
                    ann.priority === 'normal' ? 'bg-primary' : 'bg-slate-300'
                  }`} />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors">{ann.title}</h4>
                      {ann.priority === 'urgent' && (
                        <Badge variant="destructive" className="h-4 text-[9px] font-bold px-1.5 rounded-md">
                           {t('urgent')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{ann.content}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                       {new Date(ann.date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-sm rounded-3xl bg-card overflow-hidden">
          <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <Mail className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-bold text-card-foreground">{isRTL ? 'سجل إرسال التقارير' : 'Historique des envois'}</CardTitle>
            </div>
            <Badge className="bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80">
              {emailDeliveryLogs.length} logs
            </Badge>
          </CardHeader>
          <CardContent className="p-6 pt-6 space-y-4">
            {emailDeliveryLogs.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">{isRTL ? 'لا يوجد سجل إرسال بعد' : 'Aucun envoi enregistré pour le moment'}</p>
              </div>
            ) : (
              emailDeliveryLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-100 bg-secondary/50 p-4 flex flex-col gap-2 transition-all hover:bg-secondary">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-bold text-card-foreground truncate flex-1">{log.subject}</p>
                    <Badge className={log.status === 'success' ? 'bg-emerald-100 text-emerald-700 border-transparent' : 'bg-red-100 text-red-700 border-transparent'}>
                      {log.status === 'success' ? 'Envoyé' : 'Échoué'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{log.recipientEmail} • {log.attachmentCount} fichier(s)</p>
                  <div className="flex justify-between items-center mt-1">
                     <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString(isRTL ? 'ar-MA' : 'fr-FR', {
                       month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                     })}</p>
                     <span className="text-[10px] text-slate-400 font-semibold uppercase">{log.provider}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
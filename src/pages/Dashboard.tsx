import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
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
import { Link } from 'react-router-dom';
import NewsFeed from '../components/Dashboard/NewsFeed';
import NewsAdminTool from '../components/Dashboard/NewsAdminTool';
import type { NewsItem } from '../lib/types';

const Dashboard: React.FC = () => {
  const { user, isAdmin, isStaff } = useAuth();
  const { students, employees, announcements, exams, messages, emailDeliveryLogs, addNews } = useData();
  const { t, isRTL } = useLanguage();

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
    { label: t('total_students'), value: students.length, icon: Users, color: 'text-slate-900', bg: 'bg-slate-100', border: 'border-slate-100' },
    { label: t('total_staff'), value: employees.length, icon: UserRound, color: 'text-slate-900', bg: 'bg-slate-100', border: 'border-slate-100' },
    { label: t('upcoming_exams'), value: exams.length, icon: Calendar, color: 'text-slate-900', bg: 'bg-slate-100', border: 'border-slate-100' },
    { label: t('unread_messages'), value: messages.filter(m => !m.read).length, icon: MessageCircle, color: 'text-slate-900', bg: 'bg-slate-100', border: 'border-slate-100' },
  ];

  const quickActions = [
    { label: t('add_student'), icon: PlusCircle, path: '/students', roles: ['admin'], color: 'bg-slate-900 text-white' },
    { label: t('exam_schedule'), icon: ClipboardCheck, path: '/schedules', roles: ['admin', 'teacher'], color: 'bg-slate-100 text-slate-900' },
    { label: t('announcements'), icon: Bell, path: '/communication', roles: ['admin'], color: 'bg-white border hover:bg-slate-50 text-slate-900' },
    { label: t('statistics'), icon: TrendingUp, path: '/statistics', roles: ['admin'], color: 'bg-slate-100 text-slate-900' },
    { label: t('certificates'), icon: FileBadge, path: '/certificates', roles: ['admin', 'staff'], color: 'bg-white border hover:bg-slate-50 text-slate-900' },
    { label: t('certificate_registry'), icon: Files, path: '/certificate-registry', roles: ['admin', 'staff'], color: 'bg-slate-100 text-slate-900' },
  ].filter(action => action.roles.includes(user?.role || ''));

  // Handler defined inside Dashboard as per instructions
  const handlePublishNews = (newsData: Omit<NewsItem, 'id' | 'date'>) => {
    addNews(newsData);
  };

  return (
    <div className={`space-y-10 ${isRTL ? 'text-right' : ''}`}>
      {/* Premium Minimalist Welcome Section */}
      <section className="relative overflow-hidden rounded-[1.5rem] bg-slate-900 p-8 sm:p-10 text-white shadow-xl shadow-slate-900/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full -mr-24 -mt-24 blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-800 rounded-full -ml-12 -mb-12 blur-2xl opacity-50"></div>
        
        <div className="relative z-10 flex flex-col gap-2">
          <Badge className="w-fit bg-white/10 text-white border-white/10 backdrop-blur-md mb-2 py-1 px-3">
             {isAdmin ? t('admin') : t('teacher')}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-1">{t('welcome')},</h2>
          <p className="text-lg sm:text-xl font-medium text-slate-300">{user?.name}</p>
          <div className="mt-8 flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-widest">
            <Calendar className="w-4 h-4" />
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
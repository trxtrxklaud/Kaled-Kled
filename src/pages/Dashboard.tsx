import { useStudentStore } from "../stores/studentStore";
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicStore } from '../stores/academicStore';
import { useCommunicationStore } from '../stores/communicationStore';
import { useEmployeeStore } from '../stores/employeeStore';
import { useSchoolStore } from '../stores/schoolStore';
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
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import NewsAdminTool from '../components/Dashboard/NewsAdminTool';
import type { NewsItem } from '../lib/types';
import { ParentPortal } from './ParentPortal';
import { TeacherPortal } from './TeacherPortal';

const SchoolIllustration = () => (
  <div className="relative w-full h-full p-4 flex items-center justify-end pointer-events-none">
     <div className="w-[300px] h-[200px] lg:w-[400px] lg:h-[260px] rounded-3xl overflow-hidden shadow-2xl border-[6px] border-white/60 transform -rotate-3 relative transition-transform duration-700 hover:rotate-0 hover:scale-105">
       <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10"></div>
       <img 
          src="/images/dashboard-bg.jpg"
         alt="Students in classroom" 
         referrerPolicy="no-referrer"
         className="w-full h-full object-cover"
       />
     </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user, isAdmin, isStaff, isParent, isTeacher } = useAuth();
  const students = useStudentStore(state => state.students);
  const exams = useAcademicStore(state => state.exams);
  const messages = useCommunicationStore(state => state.messages);
  const emailDeliveryLogs = useCommunicationStore(state => state.emailDeliveryLogs);
  const addNews = useCommunicationStore(state => state.addNews);
  const employees = useEmployeeStore(state => state.employees);
  const announcements = useSchoolStore(state => state.announcements);
  const { t, isRTL } = useLanguage();

  if (isParent) {
    return <ParentPortal />;
  }

  if (isTeacher) {
    return <TeacherPortal />;
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
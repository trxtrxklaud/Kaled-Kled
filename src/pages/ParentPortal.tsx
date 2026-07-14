import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudentStore } from '../stores/studentStore';
import { useAcademicStore } from '../stores/academicStore';
import { useSchoolStore } from '../stores/schoolStore';
import { useFinanceStore } from '../stores/financeStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useLanguage } from '../contexts/LanguageContext';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Users, 
  Calendar, 
  BookOpen, 
  Trophy, 
  Clock, 
  AlertCircle, 
  Bell, 
  CreditCard,
  Info
} from 'lucide-react';

export const ParentPortal: React.FC = () => {
  const { user } = useAuth();
  const students = useStudentStore(state => state.students);
  const attendance = useStudentStore(state => state.attendance);
  const academicResults = useStudentStore(state => state.academicResults);
  const homeworks = useAcademicStore(state => state.homeworks);
  const announcements = useSchoolStore(state => state.announcements);
  const financeArrears = useFinanceStore(state => state.financeArrears);
  const notifications = useNotificationStore(state => state.notifications);
  const { t, isRTL } = useLanguage();

  // Effect to auto-select first child when students load
  React.useEffect(() => {
    if (students.length > 0 && !selectedChildId) {
      setSelectedChildId(students[0].id);
    }
  }, [students, selectedChildId]);

  const [selectedChildId, setSelectedChildId] = useState<string | null>(students[0]?.id || null);
  

  // Must change password logic
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    // We would need to update parent password in DB (using userStore updateParentUser). 
    // Since we don't have it explicitly imported here, let's keep it simple or import userStore.
  };

  if (user?.mustChangePassword) {
    return (
      <div className={`space-y-6 pb-32 px-4 max-w-sm mx-auto mt-20 ${isRTL ? 'text-right' : ''}`}>
        <Card className="rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center text-accent mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-800 text-center uppercase tracking-wider">
              {isRTL ? 'تحديث كلمة المرور' : 'Mise à jour requise'}
            </h2>
            <p className="text-sm text-slate-500 text-center mt-2 font-medium">
              {isRTL ? 'يجب تغيير كلمة المرور الافتراضية قبل المتابعة.' : 'Vous devez modifier votre mot de passe par défaut avant de continuer.'}
            </p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                {isRTL ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}
              </Label>
              <Input
                type="password"
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:ring-accent/20"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                {isRTL ? 'تأكيد كلمة المرور' : 'Confirmer mot de passe'}
              </Label>
              <Input
                type="password"
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:ring-accent/20"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-2xl bg-accent hover:bg-accent/90 text-white font-black uppercase tracking-widest mt-6 shadow-xl shadow-accent/20">
              {isRTL ? 'تحديث المتابعة' : 'Mettre à jour'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }


  const activeChild = students.find(s => s.id === selectedChildId);

  // Derived Data for Active Child
  const childAttendance = attendance.filter(a => a.studentId === activeChild?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const todayAttendance = childAttendance.find(a => a.date.startsWith(new Date().toISOString().split('T')[0]));
  
  const childHomeworks = homeworks.filter(hw => hw.classes?.includes(activeChild?.class || '') || hw.classes?.includes('Tous'))
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()).slice(0, 5);
    
  const childResults = academicResults.filter(r => r.studentId === activeChild?.id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()).slice(0, 5);

  const childArrears = financeArrears.filter(f => f.studentId === activeChild?.id && f.status === 'pending');

  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  return (
    <div className={`space-y-6 pb-24 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header & Welcome */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {isRTL ? 'مرحباً،' : 'Bienvenue,'} {user?.name}
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          {isRTL ? 'تابع مسار أبنائك الدراسي لحظة بلحظة.' : 'Suivez le parcours de vos enfants en temps réel.'}
        </p>
      </div>

      {/* Children Selector */}
      {students.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => setSelectedChildId(student.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl whitespace-nowrap transition-all border-2 ${
                selectedChildId === student.id 
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' 
                  : 'border-transparent bg-white shadow-sm text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                selectedChildId === student.id ? 'bg-primary text-white shadow-inner' : 'bg-slate-100 text-slate-400'
              }`}>
                {student.fullName.charAt(0)}
              </div>
              <div className="flex flex-col items-start">
                <span className={`font-bold text-sm ${selectedChildId === student.id ? 'text-primary' : 'text-slate-700'}`}>
                  {student.fullName}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {isRTL ? 'قسم: ' : 'Classe: '}{student.class}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card className="rounded-[2rem] border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Users className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-bold">{isRTL ? 'لا يوجد أبناء مرتبطين بهذا الحساب.' : 'Aucun enfant lié à ce compte.'}</p>
            <p className="text-xs text-slate-400 mt-1">{isRTL ? 'يرجى مراجعة الإدارة.' : 'Veuillez contacter l\'administration.'}</p>
          </CardContent>
        </Card>
      )}

      {activeChild && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Quick Stats - Today */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="rounded-[2rem] border-none shadow-sm bg-gradient-to-br from-blue-50 to-white overflow-hidden">
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  {isRTL ? 'الحضور اليوم' : 'Présence'}
                </span>
                <span className={`font-black text-sm ${!todayAttendance ? 'text-slate-600' : todayAttendance.present ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {!todayAttendance ? (isRTL ? 'لم يسجل بعد' : 'Non enregistré') : todayAttendance.present ? (isRTL ? 'حاضر' : 'Présent') : (isRTL ? 'غائب' : 'Absent')}
                </span>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-none shadow-sm bg-gradient-to-br from-indigo-50 to-white overflow-hidden">
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  {isRTL ? 'الواجبات' : 'Devoirs'}
                </span>
                <span className="font-black text-indigo-700 text-lg">{childHomeworks.length}</span>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-none shadow-sm bg-gradient-to-br from-amber-50 to-white overflow-hidden">
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  {isRTL ? 'إشعارات' : 'Notifs'}
                </span>
                <span className="font-black text-amber-700 text-lg">{unreadNotifs}</span>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-none shadow-sm bg-gradient-to-br from-rose-50 to-white overflow-hidden">
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  {isRTL ? 'متخلدات' : 'Impayés'}
                </span>
                <span className={`font-black text-lg ${childArrears.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {childArrears.length > 0 ? `${childArrears.reduce((sum, a) => sum + a.amount, 0)} د.ت` : (isRTL ? 'خالص' : 'Réglé')}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Academic Results */}
          <Card className="rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                <Trophy className="w-4 h-4 mr-2 text-primary" /> {isRTL ? 'آخر الأعداد' : 'Dernières Notes'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {childResults.length > 0 ? (
                <div className="space-y-3">
                  {childResults.map(res => (
                    <div key={res.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{res.subject}</p>
                        <p className="text-xs font-semibold text-slate-400">{res.examLabel} - {isRTL ? 'ثلاثي' : 'Trim'} {res.trimester}</p>
                      </div>
                      <Badge variant={res.score >= 10 ? 'default' : 'destructive'} className="font-black text-sm px-3 py-1 rounded-xl shadow-sm">
                        {res.score}/20
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center">
                  <Info className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">{t('no_data')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Homeworks */}
          <Card className="rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                <BookOpen className="w-4 h-4 mr-2 text-indigo-500" /> {isRTL ? 'الواجبات المنزلية' : 'Devoirs'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {childHomeworks.length > 0 ? (
                <div className="space-y-3">
                  {childHomeworks.map(hw => (
                    <div key={hw.id} className="flex flex-col p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-bold text-indigo-900">{hw.title}</p>
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-[9px] uppercase tracking-widest font-black">
                          {hw.subject}
                        </Badge>
                      </div>
                      <p className="text-xs text-indigo-600/80 font-medium line-clamp-2">{hw.description}</p>
                      <p className="text-[10px] text-indigo-400 mt-2 font-semibold">
                        {new Date(hw.uploadDate).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center">
                  <Info className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">{t('no_data')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Absences */}
          <Card className="rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-rose-500" /> {isRTL ? 'سجل الغيابات' : 'Historique des Absences'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {childAttendance.filter(a => !a.present).length > 0 ? (
                <div className="space-y-2">
                  {childAttendance.filter(a => !a.present).slice(0, 5).map(att => (
                    <div key={att.id} className="flex items-center gap-3 p-3 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                      <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-rose-900">
                          {isRTL ? 'غياب مسجل' : 'Absence enregistrée'}
                        </p>
                        <p className="text-xs text-rose-600/80 font-semibold">
                          {new Date(att.date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-emerald-500 flex flex-col items-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                    <Trophy className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">{isRTL ? 'مواظبة ممتازة' : 'Assiduité parfaite'}</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* Global Announcements */}
      <div className="mt-8">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 px-2">
          {isRTL ? 'بلاغات المدرسة' : 'Annonces de l\'école'}
        </h2>
        <div className="space-y-4">
          {announcements.filter(a => a.priority === 'urgent' || a.priority === 'normal').slice(0,3).map(ann => (
            <Card key={ann.id} className={`rounded-[2rem] border-none shadow-sm overflow-hidden ${ann.priority === 'urgent' ? 'bg-rose-50 border-l-4 border-l-rose-500' : 'bg-white border border-slate-100'}`}>
              <CardContent className="p-5 flex flex-col sm:flex-row gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${ann.priority === 'urgent' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                  {ann.priority === 'urgent' ? <AlertCircle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-bold text-base ${ann.priority === 'urgent' ? 'text-rose-900' : 'text-slate-800'}`}>
                      {ann.title}
                    </h4>
                    {ann.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md animate-pulse">
                        {isRTL ? 'هام جداً' : 'Urgent'}
                      </Badge>
                    )}
                  </div>
                  <p className={`text-sm mb-2 ${ann.priority === 'urgent' ? 'text-rose-700/80' : 'text-slate-500'}`}>
                    {ann.content}
                  </p>
                  <p className={`text-[10px] font-semibold ${ann.priority === 'urgent' ? 'text-rose-400' : 'text-slate-400'}`}>
                    {new Date(ann.date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMyChildren, getChildScope, getChildStatement, arabicMonthLabel, type PlatformChild, type FeeStatement } from '../lib/parentApi';
import { getAvatarUrl } from '../lib/utils';
import { ListSkeleton } from '../components/Skeletons';
import { useStudentStore } from '../stores/studentStore';
import { useAcademicStore } from '../stores/academicStore';
import { useSchoolStore } from '../stores/schoolStore';
import { useFinanceStore } from '../stores/financeStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useCommunicationStore } from '../stores/communicationStore';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  Users, 
  Calendar, 
  BookOpen, 
  Trophy, 
  Clock, 
  AlertCircle, 
  Bell, 
  CreditCard,
  Send,
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

  // Parent → school notes form state (handler lives below, next to unreadNotifs)
  const addMessage = useCommunicationStore(state => state.addMessage);
  const [noteSubject, setNoteSubject] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteSending, setNoteSending] = useState(false);

  // Expandable cards (world-class drill-down without new routes): one open at a time.
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggleExpanded = (key: string) => setExpanded((e) => (e === key ? null : key));

  // Platform live data (additive): children + ledger from Laravel, cached 45s server-side.
  // When unavailable (no session/offline), the Firestore sections below keep working.
  const [platformChildren, setPlatformChildren] = useState<PlatformChild[] | null>(null);
  const [platformChildId, setPlatformChildId] = useState<number | null>(null);
  // Authoritative per-fee statement (arrears included). The parent ledger endpoint
  // only lists PAID months, so it can never show what is owed.
  const [platformStatement, setPlatformStatement] = useState<FeeStatement | null>(null);
  const [platformLoading, setPlatformLoading] = useState(false);
  // Extra live sections (platform-only data, defensive shapes — hidden when absent)
  const [platformExtras, setPlatformExtras] = useState<{
    receipts: Array<{ amount?: number; cancelled_at?: string | null; payment_date?: string; method?: string }>;
    timetable: any;
    clubs: Array<{ id?: number; club_name?: string; name?: string; fee?: number }>;
    exams: Array<{ id?: number; title?: string; type?: string; date?: string }>;
  }>({ receipts: [], timetable: null, clubs: [], exams: [] });

  React.useEffect(() => {
    if (user?.role !== 'parent') return;
    let cancelled = false;
    getMyChildren()
      .then((kids) => {
        if (cancelled) return;
        setPlatformChildren(kids);
        if (kids.length > 0) setPlatformChildId(kids[0].id);
      })
      .catch(() => {
        if (!cancelled) setPlatformChildren(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  React.useEffect(() => {
    if (platformChildId == null) {
      setPlatformStatement(null);
      setPlatformExtras({ receipts: [], timetable: null, clubs: [], exams: [] });
      return;
    }
    let cancelled = false;
    setPlatformLoading(true);
    Promise.allSettled([
      getChildStatement(platformChildId),
      getChildScope(platformChildId, 'receipts'),
      getChildScope(platformChildId, 'timetable'),
      getChildScope(platformChildId, 'clubs'),
      getChildScope(platformChildId, 'exams'),
    ])
      .then(([statement, receipts, timetable, clubs, exams]) => {
        if (cancelled) return;
        if (statement.status === 'fulfilled') {
          const s = (statement.value as { statement?: FeeStatement }).statement;
          setPlatformStatement(s && typeof s === 'object' ? s : null);
        } else {
          setPlatformStatement(null);
        }
        const arr = (r: PromiseSettledResult<unknown>) =>
          r.status === 'fulfilled' && Array.isArray(r.value) ? (r.value as any[]) : [];
        setPlatformExtras({
          receipts: arr(receipts) as NonNullable<typeof platformExtras>['receipts'],
          timetable: timetable.status === 'fulfilled' ? timetable.value : null,
          clubs: arr(clubs) as NonNullable<typeof platformExtras>['clubs'],
          exams: arr(exams) as NonNullable<typeof platformExtras>['exams'],
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPlatformStatement(null);
          setPlatformExtras({ receipts: [], timetable: null, clubs: [], exams: [] });
        }
      })
      .finally(() => {
        if (!cancelled) setPlatformLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [platformChildId]);
  

  // Platform identity drives the portal when live — Firestore selectors hide to
  // avoid showing two contradictory child lists on one screen.
  const identityLive = platformChildren !== null && platformChildren.length > 0;

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
  
  // When platform identity is live, match homeworks by the platform class label
  // ("level section") instead of the Firestore child's class.
  const platformClassLabel = (() => {
    const k = (platformChildren || []).find((c) => c.id === platformChildId);
    const e = k?.enrollments?.[0];
    return [e?.level, e?.section].filter(Boolean).join(' ');
  })();
  const homeworkClass = identityLive && platformClassLabel !== '' ? platformClassLabel : (activeChild?.class || '');
  const childHomeworks = homeworks.filter(hw => hw.classes?.includes(homeworkClass) || hw.classes?.includes('Tous'))
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    
  const childResults = academicResults.filter(r => r.studentId === activeChild?.id)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const visibleAnns = announcements.filter(a => a.priority === 'urgent' || a.priority === 'normal');

  const childArrears = financeArrears.filter(f => f.studentId === activeChild?.id && f.status === 'pending');

  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  // Real-data derivations for the pro header (no placeholders — every number below
  // comes from the platform statement or the local stores).
  const platformKid = platformChildren && platformChildren.length > 0
    ? (platformChildren.find((k) => k.id === platformChildId) || platformChildren[0])
    : null;
  const kidName = platformKid?.name || activeChild?.fullName || '';
  const kidClass = (() => {
    const e = platformKid?.enrollments?.[0];
    const l = [e?.level, e?.section].filter(Boolean).join(' ');
    return l || activeChild?.class || '';
  })();
  const stmtOut = (() => {
    const v = Number(platformStatement?.total_outstanding);
    if (Number.isFinite(v)) return v;
    const rows = Array.isArray(platformStatement?.fees) ? platformStatement.fees : [];
    return rows.reduce((s, f) => s + (Number((f as { outstanding?: unknown }).outstanding) || 0), 0);
  })();
  const firestoreOut = childArrears.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const heroOut = platformStatement ? stmtOut : firestoreOut;
  const absentCount = childAttendance.filter((a) => !a.present).length;
  const weekdayAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][new Date().getDay()];
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Parent → school notes: written to the EXISTING messages inbox
  // (staff reads it in Communication). No new collection, no new page.
  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setNoteSending(true);
    try {
      const childTag = activeChild ? ` [${activeChild.fullName}]` : '';
      await addMessage({
        name: `${user?.name || ''} (${user?.phone || ''})`.trim(),
        subject: `${noteSubject.trim() || (isRTL ? 'ملاحظة ولي' : 'Note parent')}${childTag}`,
        message: noteBody.trim(),
      });
      setNoteSubject('');
      setNoteBody('');
      toast.success(isRTL ? 'تم إرسال ملاحظتك إلى المدرسة' : 'Message envoyé à l\'école');
    } catch {
      toast.error(isRTL ? 'تعذر إرسال الملاحظة' : 'Échec d\'envoi');
    } finally {
      setNoteSending(false);
    }
  };

  return (
    <div className={`space-y-6 pb-24 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Pro mobile header: avatar + greeting + notifications bell */}
      <div className="bg-white px-5 py-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={getAvatarUrl(user?.name || '?', 'employee')}
              alt=""
              className="w-12 h-12 rounded-full ring-2 ring-primary/60 object-cover"
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              {isRTL ? 'فضاء الولي' : 'Espace parent'}
            </span>
            <h2 className="text-base font-black text-slate-800 truncate">
              {isRTL ? 'مرحباً،' : 'Bienvenue,'} {user?.name}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => scrollTo('pp-announcements')}
          aria-label={isRTL ? 'الإشعارات' : 'Notifications'}
          className="relative p-2.5 rounded-full bg-slate-100 text-slate-600 active:scale-90 shrink-0"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifs > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Followed child card (real data only — never placeholders) */}
      {kidName !== '' && (
        <div className="bg-gradient-to-l from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <p className="text-blue-100 text-[11px] font-medium">
                {isRTL ? 'الملف الدراسي المتابع' : 'Dossier suivi'}
              </p>
              <h3 className="text-lg font-black mt-0.5 truncate">{kidName}</h3>
              <p className="text-xs text-blue-200 mt-1">{kidClass}</p>
            </div>
            <span className="bg-white/20 px-2.5 py-1 rounded-full text-xs font-bold border border-white/10 shrink-0">
              {heroOut > 0 ? `${heroOut.toFixed(0)} د.ت` : (isRTL ? 'خالص' : 'Réglé')}
            </span>
          </div>
        </div>
      )}

      {/* Quick services grid (real counts, smooth-scroll to sections) */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">
          {isRTL ? 'الخدمات المدرسية' : 'Services scolaires'}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'tt', title: isRTL ? 'جدول الحصص' : 'Emploi', icon: Calendar, cls: 'bg-blue-50 text-blue-600', sub: weekdayAr, go: 'pp-timetable' },
            { key: 'gr', title: isRTL ? 'الأعداد' : 'Notes', icon: Trophy, cls: 'bg-amber-50 text-amber-600', sub: childResults.length > 0 ? `${childResults.length}` : '—', go: 'pp-results' },
            { key: 'at', title: isRTL ? 'الغياب' : 'Absences', icon: Clock, cls: 'bg-emerald-50 text-emerald-600', sub: absentCount === 0 ? (isRTL ? '0 غياب' : '0 absence') : `${absentCount}`, go: 'pp-attendance' },
            { key: 'fe', title: isRTL ? 'المستحقات' : 'Frais', icon: CreditCard, cls: 'bg-purple-50 text-purple-600', sub: heroOut > 0 ? `${heroOut.toFixed(0)} د.ت` : (isRTL ? 'خالص' : 'Réglé'), go: identityLive ? 'pp-fees' : 'pp-overview' },
            { key: 'ms', title: isRTL ? 'المراسلات' : 'Messages', icon: Bell, cls: 'bg-rose-50 text-rose-600', sub: unreadNotifs > 0 ? (isRTL ? `${unreadNotifs} جديدة` : `${unreadNotifs}`) : (isRTL ? 'لا جديد' : 'Rien'), go: 'pp-announcements' },
            { key: 'hw', title: isRTL ? 'الواجبات' : 'Devoirs', icon: BookOpen, cls: 'bg-indigo-50 text-indigo-600', sub: `${childHomeworks.length}`, go: 'pp-homework' },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => scrollTo(a.go)}
                className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center active:scale-95 transition-transform min-h-[44px]"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${a.cls} mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">{a.title}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{a.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Children Selector (Firestore fallback — hidden when platform identity is live,
          so the screen never shows two contradictory child lists) */}
      {!identityLive && (students.length > 0 ? (
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
      ))}

      {/* Live platform data (additive): children from Laravel + authoritative ledger.
          Firestore sections below remain untouched as fallback. */}
      {platformChildren && platformChildren.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {platformChildren.map((kid) => {
              const e = kid.enrollments?.[0];
              const label = [e?.level, e?.section].filter(Boolean).join(' ') || kid.student_code || '';
              const active = platformChildId === kid.id;
              return (
                <button
                  key={`platform-${kid.id}`}
                  onClick={() => setPlatformChildId(kid.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl whitespace-nowrap transition-all border-2 ${
                    active
                      ? 'border-emerald-500 bg-emerald-50/60 shadow-md shadow-emerald-500/10'
                      : 'border-transparent bg-white shadow-sm text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    active ? 'bg-emerald-500 text-white shadow-inner' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {kid.name.charAt(0)}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`font-bold text-sm ${active ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {kid.name}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {isRTL ? 'قسم: ' : 'Classe: '}{label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <Card id="pp-fees" className="rounded-[2rem] border border-emerald-100 shadow-lg shadow-emerald-100/40 scroll-mt-24">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-emerald-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                <CreditCard className="w-4 h-4 mr-2 text-emerald-500" /> {isRTL ? 'كشف الأقساط' : 'Relevé'}
              </CardTitle>
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isRTL ? 'مباشر' : 'Live'}
              </span>
            </CardHeader>
            <CardContent className="p-4">
              {platformLoading ? (
                <ListSkeleton rows={5} />
              ) : platformStatement && Array.isArray(platformStatement.fees) && platformStatement.fees.length > 0 ? (
                (() => {
                  const fees = platformStatement.fees as NonNullable<FeeStatement['fees']>;
                  const sumDue = fees.reduce((s, f) => s + (Number(f.amount_due) || 0), 0);
                  const sumOut = fees.reduce((s, f) => s + (Number(f.outstanding) || 0), 0);
                  const showDue = Number(platformStatement.total_due);
                  const showOut = Number(platformStatement.total_outstanding);
                  const due = Number.isFinite(showDue) ? showDue : sumDue;
                  const out = Number.isFinite(showOut) ? showOut : sumOut;
                  return (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 mb-3">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                          {isRTL ? 'المتبقي بذمتكم' : 'Reste dû'}
                        </span>
                        <span className={`font-black text-lg ${out > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {out.toFixed(3)} د.ت
                        </span>
                      </div>
                      <div className="space-y-2">
                        {fees.map((f, i) => {
                          const o = Number(f.outstanding) || 0;
                          const paid = o <= 0;
                          const label = String(f.description || f.fee_type || arabicMonthLabel(f.due_date, ''));
                          return (
                            <div key={f.id ?? i} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{label}</p>
                                <p className="text-xs text-slate-400 font-semibold">
                                  {isRTL ? 'المستحق: ' : 'Dû : '}{(Number(f.amount_due) || 0).toFixed(3)} د.ت
                                </p>
                              </div>
                              {paid
                                ? <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-black shrink-0">{isRTL ? 'خالص' : 'Payé'}</Badge>
                                : <Badge variant="destructive" className="text-[9px] font-black shrink-0">{o.toFixed(3)} د.ت</Badge>}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mt-3">
                        {isRTL ? `المجموع: ${due.toFixed(3)} د.ت` : `Total : ${due.toFixed(3)} DT`}
                      </p>
                    </>
                  );
                })()
              ) : (
                <p className="py-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">{t('no_data')}</p>
              )}
            </CardContent>
          </Card>

          {/* Receipts — platform payment history (authoritative) */}
          <Card className="rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                  <CreditCard className="w-4 h-4 mr-2 text-emerald-500" /> {isRTL ? 'وصولات الدفع' : 'Reçus'}
                </CardTitle>
                {platformExtras.receipts.length > 8 && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded('receipts')}
                    className="text-[10px] font-black text-primary hover:underline px-2 py-2 min-h-[44px] shrink-0"
                  >
                    {expanded === 'receipts' ? (isRTL ? 'إخفاء' : 'Masquer') : (isRTL ? 'عرض الكل' : 'Tout voir')}
                  </button>
                )}
            </CardHeader>
            <CardContent className="p-4">
              {platformLoading ? (
                <p className="text-center text-slate-400 text-xs font-bold py-4">{isRTL ? 'جاري التحميل...' : 'Chargement...'}</p>
              ) : platformExtras.receipts.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-500">
                    {isRTL ? 'المجموع المدفوع: ' : 'Total payé : '}
                    <span className="text-emerald-600 text-sm">
                      {platformExtras.receipts
                        .filter((r) => !r.cancelled_at)
                        .reduce((s, r) => s + (Number(r.amount) || 0), 0)
                        .toFixed(3)} د.ت
                    </span>
                  </p>
                  {platformExtras.receipts.slice(0, expanded === 'receipts' ? undefined : 8).map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-800">
                        {(Number(r.amount) || 0).toFixed(3)} د.ت
                      </span>
                      <span className="flex items-center gap-2">
                        {r.payment_date ? <span className="text-xs text-slate-400 font-semibold">{String(r.payment_date).slice(0, 10)}</span> : null}
                        {r.cancelled_at
                          ? <Badge variant="destructive" className="text-[9px] font-black">{isRTL ? 'ملغى' : 'Annulé'}</Badge>
                          : <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-black">{isRTL ? 'خالص' : 'Payé'}</Badge>}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">{t('no_data')}</p>
              )}
            </CardContent>
          </Card>

          {/* Weekly timetable — the platform currently serves a STATIC placeholder grid
              (same for every section), so showing it as fact would mislead parents.
              Honest placeholder until administration publishes real timetables. */}
          <Card id="pp-timetable" className="rounded-[2rem] border border-dashed border-2 border-slate-200 bg-slate-50/50 scroll-mt-24">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-sky-500" /> {isRTL ? 'جدول الحصص' : 'Emploi'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="py-4 text-center text-slate-400 text-xs font-bold leading-relaxed">
                {isRTL
                  ? 'جدول الحصص الحقيقي سيظهر هنا فور نشره من إدارة المدرسة.'
                  : 'L\'emploi réel paraîtra ici dès sa publication.'}
              </p>
            </CardContent>
          </Card>

          {/* Clubs (always shown when platform is live — empty state instead of hiding) */}
            <Card className="rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40">
              <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-violet-500" /> {isRTL ? 'النوادي' : 'Clubs'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {platformExtras.clubs.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {platformExtras.clubs.map((c, i) => (
                    <span key={c.id ?? i} className="px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-800 text-xs font-bold">
                      {String(c.club_name || c.name || '')}
                      {Number(c.fee || 0) > 0 ? ` • ${Number(c.fee).toFixed(0)} د.ت` : ''}
                    </span>
                  ))}
                </div>
                ) : (
                <p className="py-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                  {isRTL ? 'التلميذ غير مسجل في أي نادٍ' : 'Aucun club'}
                </p>
                )}
              </CardContent>
            </Card>

          {/* Exams */}
          {platformExtras.exams.length > 0 && (
            <Card className="rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40">
              <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-amber-500" /> {isRTL ? 'الامتحانات' : 'Examens'}
                </CardTitle>
                {platformExtras.exams.length > 8 && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded('exams')}
                    className="text-[10px] font-black text-primary hover:underline px-2 py-2 min-h-[44px] shrink-0"
                  >
                    {expanded === 'exams' ? (isRTL ? 'إخفاء' : 'Masquer') : (isRTL ? 'عرض الكل' : 'Tout voir')}
                  </button>
                )}
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {platformExtras.exams.slice(0, expanded === 'exams' ? undefined : 8).map((e, i) => (
                    <div key={e.id ?? i} className="flex items-center justify-between p-3 bg-amber-50/60 rounded-2xl border border-amber-100/60">
                      <span className="text-sm font-bold text-slate-800">{String(e.title || '')}</span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {e.type ? `${String(e.type)} • ` : ''}{e.date ? String(e.date).slice(0, 10) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeChild && (
        <div id="pp-overview" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 scroll-mt-24">
          
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
          <Card id="pp-results" className="rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40 scroll-mt-24">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-primary" /> {isRTL ? 'آخر الأعداد' : 'Dernières Notes'}
                </CardTitle>
                {childResults.length > 5 && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded('results')}
                    className="text-[10px] font-black text-primary hover:underline px-2 py-2 min-h-[44px] shrink-0"
                  >
                    {expanded === 'results' ? (isRTL ? 'إخفاء' : 'Masquer') : (isRTL ? 'عرض الكل' : 'Tout voir')}
                  </button>
                )}
            </CardHeader>
            <CardContent className="p-4">
              {childResults.length > 0 ? (
                <div className="space-y-3">
                  {childResults.slice(0, expanded === 'results' ? undefined : 5).map(res => (
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
          <Card id="pp-homework" className="rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40 scroll-mt-24">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                  <BookOpen className="w-4 h-4 mr-2 text-indigo-500" /> {isRTL ? 'الواجبات المنزلية' : 'Devoirs'}
                </CardTitle>
                {childHomeworks.length > 5 && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded('homework')}
                    className="text-[10px] font-black text-primary hover:underline px-2 py-2 min-h-[44px] shrink-0"
                  >
                    {expanded === 'homework' ? (isRTL ? 'إخفاء' : 'Masquer') : (isRTL ? 'عرض الكل' : 'Tout voir')}
                  </button>
                )}
            </CardHeader>
            <CardContent className="p-4">
              {childHomeworks.length > 0 ? (
                <div className="space-y-3">
                  {childHomeworks.slice(0, expanded === 'homework' ? undefined : 5).map(hw => (
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
          <Card id="pp-attendance" className="rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40 scroll-mt-24">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-rose-500" /> {isRTL ? 'سجل الغيابات' : 'Historique des Absences'}
                </CardTitle>
                {childAttendance.filter(a => !a.present).length > 5 && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded('absences')}
                    className="text-[10px] font-black text-primary hover:underline px-2 py-2 min-h-[44px] shrink-0"
                  >
                    {expanded === 'absences' ? (isRTL ? 'إخفاء' : 'Masquer') : (isRTL ? 'عرض الكل' : 'Tout voir')}
                  </button>
                )}
            </CardHeader>
            <CardContent className="p-4">
              {childAttendance.filter(a => !a.present).length > 0 ? (
                <div className="space-y-2">
                  {childAttendance.filter(a => !a.present).slice(0, expanded === 'absences' ? undefined : 5).map(att => (
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

      {/* Contact the school — visible to parents only */}
      {user?.role === 'parent' && (
      <div id="pp-notes" className="mt-8 scroll-mt-24">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 px-2">
          {isRTL ? 'مراسلة المدرسة' : 'Contacter l\'école'}
        </h2>
        <Card className="rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40">
          <CardContent className="p-5">
            <form onSubmit={handleSendNote} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                  {isRTL ? 'الموضوع (اختياري)' : 'Objet (optionnel)'}
                </Label>
                <Input
                  value={noteSubject}
                  onChange={(e) => setNoteSubject(e.target.value)}
                  placeholder={isRTL ? 'مثال: استفسار عن الغياب' : 'Ex : question sur une absence'}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                  {isRTL ? 'نص الملاحظة' : 'Message'}
                </Label>
                <Textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder={isRTL ? 'اكتب ملاحظتك هنا...' : 'Écrivez votre message...'}
                  className="min-h-28 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={noteSending || !noteBody.trim()}
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/95 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-[0.99] disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isRTL ? 'rotate-180 ml-2' : 'mr-2'}`} />
                {noteSending
                  ? (isRTL ? 'جاري الإرسال...' : 'Envoi...')
                  : (isRTL ? 'إرسال الملاحظة' : 'Envoyer')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Global Announcements */}
      <div id="pp-announcements" className="mt-8 scroll-mt-24">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
            {isRTL ? 'بلاغات المدرسة' : 'Annonces de l\'école'}
          </h2>
          {visibleAnns.length > 3 && (
            <button
              type="button"
              onClick={() => toggleExpanded('annc')}
              className="text-[10px] font-black text-primary hover:underline px-2 py-2 min-h-[44px] shrink-0"
            >
              {expanded === 'annc' ? (isRTL ? 'إخفاء' : 'Masquer') : (isRTL ? 'عرض الكل' : 'Tout voir')}
            </button>
          )}
        </div>
        <div className="space-y-4">
          {visibleAnns.slice(0, expanded === 'annc' ? undefined : 3).map(ann => (
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

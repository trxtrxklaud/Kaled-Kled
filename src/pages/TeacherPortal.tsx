import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudentStore } from '../stores/studentStore';
import { useAcademicStore } from '../stores/academicStore';
import { useCommunicationStore } from '../stores/communicationStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useUserStore } from '../stores/userStore';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Users, BookOpen, Trophy,
  MessageCircle, CheckCircle2, XCircle, Clock, Send, Check, AlertCircle, Upload, FileText,
  CalendarCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { ListSkeleton } from '../components/Skeletons';
import { getTeacherSections, getTeacherRoster, getTeacherDayAttendance, postTeacherScope } from '../lib/parentApi';

export const TeacherPortal: React.FC = () => {
  const { user } = useAuth();
  const assignedClasses = user?.assignedClasses || [];
  const { isRTL } = useLanguage();
  
  const [selectedClass, setSelectedClass] = useState<string | null>(assignedClasses[0] || null);
  const [activeTab, setActiveTab] = useState<'attendance' | 'grades' | 'homework' | 'note' | 'platform'>('attendance');

  // Platform roll-call (additive): real sections + roster from Laravel, writes go to
  // the platform via the user-scoped proxy. Firestore flow above stays untouched.
  const [platSections, setPlatSections] = useState<Array<{ id: number; name: string; level?: string; students_count?: number }> | null>(null);
  const [platSectionId, setPlatSectionId] = useState<number | null>(null);
  const [platRoster, setPlatRoster] = useState<Array<{ enrollment_id: number; student_id: number; name: string; student_code?: string }>>([]);
  const [platMarks, setPlatMarks] = useState<Record<number, 'present' | 'absent' | 'late' | 'excused'>>({});
  const [platDate, setPlatDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [platLoading, setPlatLoading] = useState(false);
  const [platSaving, setPlatSaving] = useState(false);
  const [platError, setPlatError] = useState('');

  useEffect(() => {
    if (activeTab !== 'platform' || platSections !== null) return;
    let cancelled = false;
    setPlatLoading(true);
    setPlatError('');
    getTeacherSections()
      .then((s) => {
        if (cancelled) return;
        const arr = Array.isArray(s) ? s : [];
        setPlatSections(arr);
        if (arr.length > 0) setPlatSectionId(arr[0].id);
      })
      .catch((e) => {
        if (!cancelled) {
          setPlatSections([]);
          setPlatError((e as Error)?.message || 'تعذر تحميل أقسام المنصة');
        }
      })
      .finally(() => {
        if (!cancelled) setPlatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, platSections]);

  useEffect(() => {
    if (activeTab !== 'platform' || platSectionId == null) return;
    let cancelled = false;
    setPlatLoading(true);
    Promise.all([getTeacherRoster(platSectionId), getTeacherDayAttendance(platSectionId, platDate)])
      .then(([roster, day]) => {
        if (cancelled) return;
        const list = Array.isArray(roster) ? roster : [];
        setPlatRoster(list);
        const prefill: Record<number, 'present' | 'absent' | 'late' | 'excused'> = {};
        const recs = (day as { records?: Array<{ enrollment_id: number; status: string }> })?.records;
        if (Array.isArray(recs)) {
          for (const r of recs) {
            if (['present', 'absent', 'late', 'excused'].includes(r.status)) {
              prefill[r.enrollment_id] = r.status as 'present' | 'absent' | 'late' | 'excused';
            }
          }
        }
        setPlatMarks(prefill);
      })
      .catch(() => {
        if (!cancelled) setPlatRoster([]);
      })
      .finally(() => {
        if (!cancelled) setPlatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, platSectionId, platDate]);

  const handleSavePlatformAttendance = async () => {
    if (platSectionId == null) return;
    const entries = Object.entries(platMarks).map(([enrollment_id, status]) => ({
      enrollment_id: Number(enrollment_id),
      status,
    }));
    if (entries.length === 0) {
      toast.error(isRTL ? 'حدد حالة تلميذ واحد على الأقل' : 'Marquez au moins un élève');
      return;
    }
    setPlatSaving(true);
    try {
      await postTeacherScope(platSectionId, 'attendance', { date: platDate, entries });
      toast.success(isRTL ? `تم حفظ نداء المنصة (${entries.length})` : `Appel enregistré (${entries.length})`);
    } catch (e) {
      toast.error((e as Error)?.message || (isRTL ? 'تعذر الحفظ' : 'Échec'));
    } finally {
      setPlatSaving(false);
    }
  };

  const students = useStudentStore(state => state.students).filter(s => s.class === selectedClass);
  const recordAttendance = useStudentStore(state => state.recordAttendance);
  const addAcademicResult = useStudentStore(state => state.addAcademicResult);
  const homeworks = useAcademicStore(state => state.homeworks);
  const addHomework = useAcademicStore(state => state.addHomework);
  const addAcademicAsset = useAcademicStore(state => state.addAcademicAsset);
  const academicAssets = useAcademicStore(state => state.academicAssets);
  const addPost = useCommunicationStore(state => state.addPost);
  const createNotificationEvent = useNotificationStore(state => state.createNotificationEvent);
  const parentUsers = useUserStore(state => state.parentUsers);

  // --- ATTENDANCE STATE ---
  // status can be 'present', 'absent', 'late'
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  
  useEffect(() => {
    const defaultState: Record<string, 'present' | 'absent' | 'late'> = {};
    students.forEach(s => defaultState[s.id] = 'present');
    setAttendanceState(defaultState);
  }, [selectedClass, students.length]);

  const toggleAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceState(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass) return;
    const date = new Date().toISOString();
    
    let saved = 0;
    for (const student of students) {
      const status = attendanceState[student.id];
      const isPresent = status === 'present' || status === 'late';
      
      await recordAttendance({
        classId: selectedClass,
        date,
        studentId: student.id,
        present: isPresent,
        recordedBy: user?.name || 'Teacher'
      });
      
      if (status === 'absent' || status === 'late') {
        const parent = parentUsers.find(p => p.childrenIds.includes(student.id));
        if (parent) {
          await createNotificationEvent(
            'attendance_marked',
            user?.id || 'system',
            parent.id,
            isRTL ? 'تحديث الحضور' : 'Mise à jour de présence',
            isRTL 
              ? `تم تسجيل \${student.fullName} كـ \${status === 'absent' ? 'غائب' : 'متأخر'} اليوم.` 
              : `\${student.fullName} a été marqué \${status === 'absent' ? 'absent' : 'en retard'} aujourd'hui.`
          );
        }
      }
      saved++;
    }
    toast.success(isRTL ? 'تم حفظ الحضور بنجاح' : 'Appel enregistré avec succès');
  };

  // --- HOMEWORK STATE ---
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwSubject, setHwSubject] = useState('');
  const [hwFile, setHwFile] = useState<string | null>(null);
  const [hwFilePreview, setHwFilePreview] = useState<string | null>(null);

  const handleHwFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { compressImageFile, SUPPORTED_TYPES } = await import('../lib/imageCompressor');
      if (SUPPORTED_TYPES.includes(file.type) || file.type.startsWith('image/')) {
        const data = await compressImageFile(file);
        setHwFile(file.name);
        setHwFilePreview(data);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setHwFile(file.name);
          setHwFilePreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setHwFile(null);
      setHwFilePreview(null);
    } finally {
      (e.target as HTMLInputElement).value = '';
    }
  };

  const handleSaveHomework = async () => {
    if (!selectedClass || !hwTitle || !hwSubject) return;

    const homeworkData: any = {
      title: hwTitle,
      description: hwDesc,
      classes: [selectedClass],
      subject: hwSubject,
      session: 'Session 1',
      uploadDate: new Date().toISOString()
    };
    if (hwFile) homeworkData.fileName = hwFile;
    if (hwFilePreview) homeworkData.fileData = hwFilePreview;

    await addHomework(homeworkData);

    if (hwFile && hwFilePreview) {
      let mimeType = 'application/octet-stream';
      if (hwFilePreview.startsWith('data:')) {
        mimeType = hwFilePreview.substring(5, hwFilePreview.indexOf(';'));
      } else if (/\.(png|jpe?g|gif|webp|svg)$/i.test(hwFile)) {
        mimeType = 'image/jpeg';
      }
      await addAcademicAsset({
        fileName: `${hwTitle} - ${hwFile}`,
        mimeType,
        payload: hwFilePreview,
        subjectKey: hwSubject,
        classId: selectedClass
      });
    }


    // Notify parents of this class
    const parentsOfClass = parentUsers.filter(p => students.some(s => p.childrenIds.includes(s.id)));
    for (const parent of parentsOfClass) {
      await createNotificationEvent(
        'homework_assigned',
        user?.id || 'system',
        parent.id,
        isRTL ? 'واجب جديد' : 'Nouveau devoir',
        isRTL ? `تم إضافة واجب \${hwSubject} لقسم \${selectedClass}` : `Nouveau devoir de \${hwSubject} ajouté pour \${selectedClass}`
      );
    }
    
    setHwTitle('');
    setHwDesc('');
    setHwSubject('');
    setHwFile(null);
    setHwFilePreview(null);
    toast.success(isRTL ? 'تمت إضافة الواجب' : 'Devoir ajouté');
  };

  // --- GRADES STATE ---
  const [gradeSubject, setGradeSubject] = useState('');
  const [gradeExam, setGradeExam] = useState('');
  const [gradesState, setGradesState] = useState<Record<string, string>>({});

  const handleSaveGrades = async () => {
    if (!selectedClass || !gradeSubject || !gradeExam) return;
    
    for (const student of students) {
      const scoreStr = gradesState[student.id];
      if (scoreStr && scoreStr.trim() !== '') {
        const score = parseFloat(scoreStr);
        if (!isNaN(score)) {
          await addAcademicResult({
            studentId: student.id,
            classId: selectedClass,
            level: (student.class ? student.class[0] as any : '1'),
            subject: gradeSubject,
            examLabel: gradeExam,
            trimester: 1,
            score,
            recordedAt: new Date().toISOString()
          });

          const parent = parentUsers.find(p => p.childrenIds.includes(student.id));
          if (parent) {
            await createNotificationEvent(
              'grade_published',
              user?.id || 'system',
              parent.id,
              isRTL ? 'عدد جديد' : 'Nouvelle note',
              isRTL ? `تم نشر عدد \${gradeSubject} لـ \${student.fullName}` : `Nouvelle note de \${gradeSubject} pour \${student.fullName}`
            );
          }
        }
      }
    }
    setGradesState({});
    toast.success(isRTL ? 'تم حفظ الأعداد' : 'Notes enregistrées');
  };

  // --- QUICK NOTE STATE ---
  const [noteText, setNoteText] = useState('');

  const handleSendNote = async () => {
    if (!selectedClass || !noteText) return;
    
    await addPost({
      author: user?.name || 'Teacher',
      role: 'teacher',
      content: noteText,
      date: new Date().toISOString(),
      images: [],
      likedByCurrentUser: false,
      audience: `Classes: \${selectedClass}`
    });

    const parentsOfClass = parentUsers.filter(p => students.some(s => p.childrenIds.includes(s.id)));
    for (const parent of parentsOfClass) {
      await createNotificationEvent(
        'general',
        user?.id || 'system',
        parent.id,
        isRTL ? 'ملاحظة من المعلم' : 'Mot de l\'enseignant',
        isRTL ? `رسالة جديدة لقسم \${selectedClass}` : `Nouveau message pour \${selectedClass}`
      );
    }

    setNoteText('');
    toast.success(isRTL ? 'تم الإرسال' : 'Message envoyé');
  };

  const tabs = [
    { id: 'attendance', label: isRTL ? 'الحضور' : 'Appel', icon: <Users className="w-4 h-4"/> },
    { id: 'homework', label: isRTL ? 'الواجبات' : 'Devoirs', icon: <BookOpen className="w-4 h-4"/> },
    { id: 'grades', label: isRTL ? 'الأعداد' : 'Notes', icon: <Trophy className="w-4 h-4"/> },
    { id: 'note', label: isRTL ? 'ملاحظة' : 'Message', icon: <MessageCircle className="w-4 h-4"/> },
    { id: 'platform', label: isRTL ? 'نداء المنصة' : 'Appel plateforme', icon: <CalendarCheck className="w-4 h-4"/> },
  ] as const;

  if (assignedClasses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500 font-bold">{isRTL ? 'لا يوجد أقسام مسندة إليك.' : 'Aucune classe assignée.'}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 pb-24 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {isRTL ? 'مرحباً،' : 'Bonjour,'} {user?.name}
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          {isRTL ? 'إدارة أقسامك اليومية' : 'Gérez vos classes au quotidien'}
        </p>
      </div>

      {/* Class Selector */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {assignedClasses.map((cls) => (
          <button
            key={cls}
            onClick={() => setSelectedClass(cls)}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl whitespace-nowrap transition-all border-2 ${
              selectedClass === cls 
                ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100' 
                : 'border-transparent bg-white shadow-sm text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className={`font-black text-lg ${selectedClass === cls ? 'text-indigo-700' : 'text-slate-700'}`}>
              {cls}
            </span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all min-w-[100px] ${
              activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <Card className="rounded-[2rem] border-none shadow-lg bg-white overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          
          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
                  {isRTL ? 'تسجيل الحضور' : 'Faire l\'appel'}
                </h3>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  {students.length} {isRTL ? 'تلميذ' : 'élèves'}
                </Badge>
              </div>

              <div className="space-y-3">
                {students.map(student => {
                  const status = attendanceState[student.id] || 'present';
                  return (
                    <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="font-bold text-slate-800 text-sm">{student.fullName}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => toggleAttendance(student.id, 'present')}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            status === 'present' ? 'bg-emerald-100 text-emerald-700 shadow-inner' : 'bg-white text-slate-400 border border-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" /> {isRTL ? 'حاضر' : 'Pr'}
                        </button>
                        <button 
                          onClick={() => toggleAttendance(student.id, 'late')}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            status === 'late' ? 'bg-amber-100 text-amber-700 shadow-inner' : 'bg-white text-slate-400 border border-slate-200'
                          }`}
                        >
                          <Clock className="w-3 h-3" /> {isRTL ? 'متأخر' : 'Ret'}
                        </button>
                        <button 
                          onClick={() => toggleAttendance(student.id, 'absent')}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            status === 'absent' ? 'bg-rose-100 text-rose-700 shadow-inner' : 'bg-white text-slate-400 border border-slate-200'
                          }`}
                        >
                          <XCircle className="w-3 h-3" /> {isRTL ? 'غائب' : 'Abs'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button onClick={handleSaveAttendance} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest mt-6 shadow-lg shadow-indigo-600/20">
                <Check className="w-5 h-5 mr-2" /> {isRTL ? 'حفظ الحضور' : 'Enregistrer l\'appel'}
              </Button>
            </div>
          )}

          {/* HOMEWORK TAB */}
          {activeTab === 'homework' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4">
                {isRTL ? 'إضافة واجب منزلي' : 'Ajouter un devoir'}
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 ml-1">{isRTL ? 'المادة' : 'Matière'}</Label>
                  <Input 
                    placeholder={isRTL ? 'مثل: الرياضيات' : 'Ex: Mathématiques'} 
                    value={hwSubject} onChange={e => setHwSubject(e.target.value)}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 ml-1">{isRTL ? 'عنوان الواجب' : 'Titre'}</Label>
                  <Input 
                    placeholder={isRTL ? 'عنوان قصير' : 'Titre court'} 
                    value={hwTitle} onChange={e => setHwTitle(e.target.value)}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 ml-1">{isRTL ? 'التفاصيل' : 'Détails'}</Label>
                  <textarea 
                    placeholder={isRTL ? 'وصف الواجب المنزلي...' : 'Description du devoir...'} 
                    value={hwDesc} onChange={e => setHwDesc(e.target.value)}
                    className="w-full min-h-[100px] p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm resize-none"
                  ></textarea>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 ml-1">{isRTL ? 'صورة / ملف' : 'Image / Fichier'}</Label>
                  <div className="relative">
                    <input 
                      type="file" 
                      onChange={handleHwFileSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                    />
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        {hwFilePreview ? (
                           <img src={hwFilePreview} className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                           <Upload className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{hwFile || (isRTL ? 'اختر ملفاً' : 'Choisir un fichier')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveHomework} disabled={!hwTitle || !hwSubject} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest mt-6 shadow-lg shadow-indigo-600/20">
                <Check className="w-5 h-5 mr-2" /> {isRTL ? 'إضافة الواجب' : 'Ajouter le devoir'}
              </Button>

              <div className="mt-8">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">{isRTL ? 'الواجبات المسجلة' : 'Devoirs enregistrés'}</h4>
                <div className="space-y-3">
                  {homeworks.filter(hw => hw.classes?.includes(selectedClass!)).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4">{isRTL ? 'لا يوجد واجبات' : 'Aucun devoir'}</p>
                  ) : (
                    homeworks.filter(hw => hw.classes?.includes(selectedClass!)).map(hw => (
                      <div key={hw.id} className="flex flex-col p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-bold text-sm text-slate-900">{hw.title}</h5>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{hw.subject}</span>
                          </div>
                          {hw.fileName && (
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-1.5 rounded-lg">
                              <FileText className="w-3 h-3" />
                              <span className="max-w-[100px] truncate">{hw.fileName}</span>
                            </div>
                          )}
                        </div>
                        {hw.description && <p className="text-xs text-slate-500 line-clamp-2">{hw.description}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* GRADES TAB */}
          {activeTab === 'grades' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4">
                {isRTL ? 'إدخال الأعداد' : 'Saisie des notes'}
              </h3>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 ml-1">{isRTL ? 'المادة' : 'Matière'}</Label>
                  <Input 
                    placeholder={isRTL ? 'الرياضيات' : 'Maths'} 
                    value={gradeSubject} onChange={e => setGradeSubject(e.target.value)}
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 ml-1">{isRTL ? 'نوع الامتحان' : 'Examen'}</Label>
                  <Input 
                    placeholder={isRTL ? 'تقييم 1' : 'Contrôle 1'} 
                    value={gradeExam} onChange={e => setGradeExam(e.target.value)}
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {students.map(student => (
                  <div key={student.id} className="flex items-center justify-between gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-800 text-sm pl-2">{student.fullName}</span>
                    <Input 
                      type="number"
                      placeholder="/20"
                      min="0" max="20" step="0.25"
                      value={gradesState[student.id] || ''}
                      onChange={e => setGradesState(prev => ({...prev, [student.id]: e.target.value}))}
                      className="w-20 h-10 rounded-xl bg-white border-slate-200 font-black text-center text-indigo-700"
                    />
                  </div>
                ))}
              </div>

              <Button onClick={handleSaveGrades} disabled={!gradeSubject || !gradeExam} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest mt-6 shadow-lg shadow-indigo-600/20">
                <Check className="w-5 h-5 mr-2" /> {isRTL ? 'حفظ الأعداد' : 'Enregistrer les notes'}
              </Button>
            </div>
          )}

          {/* PLATFORM ROLL-CALL TAB (writes to Laravel, reads authoritative roster) */}
          {activeTab === 'platform' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
                  {isRTL ? 'نداء المنصة' : 'Appel plateforme'}
                </h3>
                <input
                  type="date"
                  value={platDate}
                  onChange={(e) => setPlatDate(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700"
                />
              </div>

              {platError !== '' && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold leading-relaxed">
                  {platError}
                  <span className="block mt-1 text-rose-500">
                    {isRTL ? 'سجل الدخول عبر المنصة (هاتف/هاتف) لا Firebase.' : 'Connectez-vous via la plateforme.'}
                  </span>
                </div>
              )}

              {platSections !== null && platSections.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {platSections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setPlatSectionId(s.id)}
                      className={`px-4 py-2.5 rounded-2xl whitespace-nowrap text-xs font-black border-2 transition-all ${
                        platSectionId === s.id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-100'
                          : 'border-transparent bg-white shadow-sm text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {s.level ? `${s.level} ${s.name}` : s.name}
                      {typeof s.students_count === 'number' ? ` (${s.students_count})` : ''}
                    </button>
                  ))}
                </div>
              )}

              {platLoading ? (
                <ListSkeleton rows={5} />
              ) : (
                <div className="space-y-3">
                  {platRoster.map((st) => {
                    const status = platMarks[st.enrollment_id] || 'present';
                    const btn = (key: 'present' | 'absent' | 'late' | 'excused', label: string, on: string) => (
                      <button
                        key={key}
                        onClick={() => setPlatMarks((prev) => ({ ...prev, [st.enrollment_id]: key }))}
                        className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          status === key ? on : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                    return (
                      <div key={st.enrollment_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="font-bold text-slate-800 text-sm">
                          {st.name}
                          {st.student_code ? <span className="text-xs text-slate-400 font-semibold"> • {st.student_code}</span> : null}
                        </span>
                        <div className="flex gap-2">
                          {btn('present', isRTL ? 'حاضر' : 'Pr', 'bg-emerald-100 text-emerald-700 shadow-inner')}
                          {btn('late', isRTL ? 'متأخر' : 'Ret', 'bg-amber-100 text-amber-700 shadow-inner')}
                          {btn('absent', isRTL ? 'غائب' : 'Abs', 'bg-rose-100 text-rose-700 shadow-inner')}
                          {btn('excused', isRTL ? 'بعذر' : 'Exc', 'bg-purple-100 text-purple-700 shadow-inner')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                onClick={handleSavePlatformAttendance}
                disabled={platSaving || platSectionId == null}
                className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest mt-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                <Check className="w-5 h-5 mr-2" />
                {platSaving
                  ? (isRTL ? 'جاري الحفظ...' : 'Enregistrement...')
                  : (isRTL ? 'حفظ نداء المنصة' : 'Enregistrer')}
              </Button>
            </div>
          )}

          {/* QUICK NOTE TAB */}
          {activeTab === 'note' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4">
                {isRTL ? 'ملاحظة سريعة للقسم' : 'Message rapide à la classe'}
              </h3>
              
              <textarea 
                placeholder={isRTL ? 'اكتب ملاحظة أو تنبيه لأولياء التلاميذ...' : 'Écrivez un message aux parents...'} 
                value={noteText} onChange={e => setNoteText(e.target.value)}
                className="w-full min-h-[150px] p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm resize-none"
              />

              <Button onClick={handleSendNote} disabled={!noteText} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest mt-6 shadow-lg shadow-indigo-600/20">
                <Send className="w-5 h-5 mr-2" /> {isRTL ? 'إرسال للأولياء' : 'Envoyer aux parents'}
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

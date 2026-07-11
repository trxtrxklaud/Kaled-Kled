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
  MessageCircle, CheckCircle2, XCircle, Clock, Send, Check, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const TeacherPortal: React.FC = () => {
  const { user } = useAuth();
  const assignedClasses = user?.assignedClasses || [];
  const { isRTL } = useLanguage();
  
  const [selectedClass, setSelectedClass] = useState<string | null>(assignedClasses[0] || null);
  const [activeTab, setActiveTab] = useState<'attendance' | 'grades' | 'homework' | 'note'>('attendance');

  const students = useStudentStore(state => state.students).filter(s => s.class === selectedClass);
  const recordAttendance = useStudentStore(state => state.recordAttendance);
  const addAcademicResult = useStudentStore(state => state.addAcademicResult);
  const addHomework = useAcademicStore(state => state.addHomework);
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

  const handleSaveHomework = async () => {
    if (!selectedClass || !hwTitle || !hwSubject) return;
    await addHomework({
      title: hwTitle,
      description: hwDesc,
      classes: [selectedClass],
      subject: hwSubject,
      session: 'Session 1',
      uploadDate: new Date().toISOString()
    });

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
                  />
                </div>
              </div>

              <Button onClick={handleSaveHomework} disabled={!hwTitle || !hwSubject} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest mt-6 shadow-lg shadow-indigo-600/20">
                <Check className="w-5 h-5 mr-2" /> {isRTL ? 'إضافة الواجب' : 'Ajouter le devoir'}
              </Button>
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

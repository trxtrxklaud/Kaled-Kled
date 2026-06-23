import React, { useRef, useState } from 'react';
import {
  RefreshCw,
  Upload,
  Download,
  Loader2,
  Terminal,
  CheckCircle,
  FileText,
  Globe,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import type { AttendanceRecord, Student, ImportAcademicResultData, ImportExamScheduleData, ImportStudentData } from '../lib/types';
import { useData } from '../contexts/DataContext';
import { toast } from 'sonner';
import * as XLSX from '../lib/xlsx';

const EduservIntegration: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const {
    students,
    attendance,
    academicResults,
    importStudents,
    importAcademicResults,
    importExams,
    eduservSyncLogs,
    addEduservSyncLog,
    clearEduservSyncLogs,
  } = useData();

  const syncEndpoint = import.meta.env.VITE_EDUSERV_SYNC_ENDPOINT as string | undefined;
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_EDUSERV_API_KEY || '');
  const [apiSecret, setApiSecret] = useState(import.meta.env.VITE_EDUSERV_API_SECRET || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (level: 'info' | 'success' | 'warning' | 'error', message: string) => {
    addEduservSyncLog({ level, message });
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleSyncWithEduserv = async () => {
    if (!apiKey.trim()) {
      toast.error(t('fill_all_fields') || 'Veuillez fournir une clé API');
      return;
    }
    if (!syncEndpoint) {
      toast.error('VITE_EDUSERV_SYNC_ENDPOINT is not configured');
      addLog('error', '[ERROR] Sync endpoint not configured');
      return;
    }

    setIsSyncing(true);
    addLog('info', '[INFO] Starting Eduserv backend synchronization');

    try {
      const response = await fetch(syncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-Eduserv-Api-Key': apiKey } : {}),
          ...(apiSecret ? { 'X-Eduserv-Api-Secret': apiSecret } : {}),
        },
        body: JSON.stringify({ apiKey, apiSecret }),
      });

      if (!response.ok) {
        throw new Error(`Eduserv sync failed with status ${response.status}`);
      }

      const payload = await response.json() as {
        students?: ImportStudentData[];
        academicResults?: ImportAcademicResultData[];
        grades?: ImportAcademicResultData[];
        exams?: ImportExamScheduleData[];
        schedules?: ImportExamScheduleData[];
        message?: string;
      };

      const incomingStudents = payload.students || [];
      const incomingResults = payload.academicResults || payload.grades || [];
      const incomingExams = payload.exams || payload.schedules || [];

      if (incomingStudents.length > 0) {
        importStudents(incomingStudents);
        addLog('success', `[OK] ${incomingStudents.length} students synchronized`);
      }

      if (incomingResults.length > 0) {
        importAcademicResults(incomingResults);
        addLog('success', `[OK] ${incomingResults.length} academic results synchronized`);
      }

      if (incomingExams.length > 0) {
        importExams(incomingExams);
        addLog('success', `[OK] ${incomingExams.length} exams synchronized`);
      }

      if (incomingStudents.length === 0 && incomingResults.length === 0 && incomingExams.length === 0) {
        addLog('warning', '[WARN] Sync completed but no importable records were returned');
      }

      if (payload.message) {
        addLog('info', `[INFO] ${payload.message}`);
      }

      toast.success('Synchronisation avec la plateforme CNTE réussie');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      addLog('error', `[ERROR] ${message}`);
      toast.error('Échec de la synchronisation CNTE');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileImport = async (file: File) => {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      toast.error('Format de fichier non supporté. Veuillez utiliser un fichier XLSX ou XLS.');
      addLog('error', '[ERROR] Uploaded file format not supported');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' }) as ImportStudentData[];

      if (rows.length > 0) {
        importStudents(rows);
        addLog('success', `[OK] ${rows.length} students imported from file`);
        toast.success(`${t('success_import')} (${rows.length} enregistrements)`);
      } else {
        toast.error(t('no_data') || 'Aucune donnée valide');
        addLog('error', '[ERROR] Uploaded file contains no importable records');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown import error';
      toast.error(t('error_import'));
      addLog('error', `[ERROR] ${message}`);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv') || file.name.endsWith('.xls'))) {
      void handleFileImport(file);
    } else {
      toast.error('Format non supporté. Utilisez .xlsx, .xls ou .csv du portail CNTE - مدرستي.');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFileImport(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };



  const handleExportAttendance = () => {
    if (attendance.length === 0) {
      toast.info('Aucune donnée de présence. Ajoutez des enregistrements via l\'appel.');
      addLog('warning', '[WARN] Attendance export cancelled: no attendance records');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const exportData = attendance.map((record: AttendanceRecord) => {
      const student = students.find((item: Student) => item.id === record.studentId);
      return {
        student_id: record.studentId || '',
        full_name: student?.fullName || 'Inconnu',
        class: record.classId || student?.class || '',
        date: record.date ? record.date.split('T')[0] : today,
        present: record.present ? '1' : '0',
        recorded_by: record.recordedBy || 'teacher',
        sync_date: today,
      };
    });

    try {
      const workbook = XLSX.utils.book_new();
      const classesInData = Array.from(new Set(exportData.map(d => d.class))).sort();

      if (classesInData.length > 1) {
        classesInData.forEach((cls, idx) => {
          const clsData = exportData.filter(d => d.class === cls).sort((a,b) => String(a.full_name).localeCompare(String(b.full_name)));
          const worksheet = XLSX.utils.json_to_sheet(clsData);
          const safeName = `C_${cls}`.replace(/[\\/?*[\]]/g, '_').substring(0, 27) + `_${idx}`;
          XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
        });
      } else {
        exportData.sort((a,b) => String(a.full_name).localeCompare(String(b.full_name)));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Presence");
      }

      XLSX.writeFile(workbook, `eduserv_attendance_report_${today}.xlsx`);
      addLog('success', `[OK] Export generated: eduserv_attendance_report_${today}.xlsx`);
      toast.success(t('print_export') || 'Fichier exporté');
    } catch (err) {
      console.error("Export error", err);
      toast.error("Erreur lors de l'export: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleExportGrades = () => {
    if (academicResults.length === 0) {
      toast.info('Aucune note enregistrée dans le contexte académique.');
      addLog('warning', '[WARN] Grades export cancelled: no academic results');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const studentDirectory = new Map<string, Student>(students.map((student) => [student.id, student]));

    const exportData = academicResults.map((result) => {
      const student = studentDirectory.get(result.studentId);
      return {
        full_name: student?.fullName || 'Inconnu',
        class: student?.class || result.classId,
        birth_date: student?.birthDate || '',
        parent_name: student?.parentName || '',
        parent_phone: student?.parentPhone || '',
        trimestre: String(result.trimester),
        subject: result.subject,
        grade: result.score,
        notes: result.examLabel,
        export_date: today,
      };
    });

    try {
      const workbook = XLSX.utils.book_new();
      const classesInData = Array.from(new Set(exportData.map(d => String(d.class)))).sort();

      if (classesInData.length > 1) {
        classesInData.forEach((cls, idx) => {
          const clsData = exportData.filter(d => String(d.class) === cls).sort((a,b) => String(a.full_name).localeCompare(String(b.full_name)));
          const worksheet = XLSX.utils.json_to_sheet(clsData);
          const safeName = `C_${cls}`.replace(/[\\/?*[\]]/g, '_').substring(0, 27) + `_${idx}`;
          XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
        });
      } else {
        exportData.sort((a,b) => String(a.full_name).localeCompare(String(b.full_name)));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Notes");
      }

      XLSX.writeFile(workbook, `eduserv_bulletins_template_${today}.xlsx`);
      addLog('success', `[OK] Export generated: eduserv_bulletins_template_${today}.xlsx`);
      toast.success(t('print_export') || 'Fichier exporté');
    } catch (err) {
      console.error("Export error", err);
      toast.error("Erreur lors de l'export: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">{isRTL ? 'المنظومة المعلوماتية (CNTE)' : 'Intégration CNTE / مدرستي'}</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[2px]">Ministère de l'Éducation • Backend Sync Workflow</p>
        </div>
        <Badge variant="outline" className="ml-auto text-[9px] font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">
          {syncEndpoint ? 'Endpoint configuré' : 'Endpoint requis'}
        </Badge>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black tracking-tight">{t('api_sync_section')}</h3>
          </div>

          <div className="bg-slate-50/60 p-6 rounded-2xl border border-slate-100 space-y-5">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">{isRTL ? 'بيانات ربط المنظومة' : 'Identifiants CNTE'}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500">{t('api_key')}</Label>
                  <Input value={apiKey} onChange={(event) => setApiKey(event.target.value)} className="h-11 rounded-2xl bg-white font-mono text-sm border-slate-200" placeholder="EDU-XXXX-XXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500">{t('api_secret')}</Label>
                  <Input type="password" value={apiSecret} onChange={(event) => setApiSecret(event.target.value)} className="h-11 rounded-2xl bg-white font-mono text-sm border-slate-200" placeholder="••••••••••••" />
                </div>
              </div>
            </div>

            <Button
              onClick={() => { void handleSyncWithEduserv(); }}
              disabled={isSyncing || !apiKey.trim()}
              className="w-full h-14 rounded-2xl bg-primary font-black text-base tracking-[1.5px] shadow-xl shadow-primary/25 active:scale-[0.985] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('syncing')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  {t('sync_now')}
                </>
              )}
            </Button>
            <p className="text-center text-[10px] text-slate-400 font-bold">Le bouton appelle désormais un endpoint backend réel via VITE_EDUSERV_SYNC_ENDPOINT.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white overflow-hidden">
          <CardContent className="p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black tracking-tight">{t('import_students')}</h3>
            </div>

            <p className="text-sm text-slate-600 font-medium leading-snug">{t('drag_drop_ministry')}</p>

            <div
              onClick={triggerFileInput}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative border-2 border-dashed ${isDragging ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/40'} rounded-[2rem] p-8 text-center cursor-pointer transition-all group bg-slate-50/30`}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white shadow flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="font-black text-sm text-slate-700 mb-1">Fichier de la plateforme مدرستي</p>
              <p className="text-[10px] font-bold text-slate-400">.xlsx • .xls • .csv • jusqu'à 5MB</p>
              <Badge variant="secondary" className="mt-3 text-[9px] font-black px-2.5 py-0.5 rounded-full">Local import engine</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white overflow-hidden">
          <CardContent className="p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black tracking-tight">{t('export_data')}</h3>
            </div>

            <p className="text-sm text-slate-600 font-medium">Générez des fichiers structurés au format officiel de l'Éducation pour soumission au CNTE.</p>

            <div className="space-y-3 pt-2">
              <Button onClick={handleExportAttendance} variant="outline" className="w-full h-12 rounded-2xl font-black text-sm tracking-widest border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 justify-start gap-3">
                <Download className="w-4 h-4" /> {t('export_attendance_report')}
              </Button>

              <Button onClick={handleExportGrades} variant="outline" className="w-full h-12 rounded-2xl font-black text-sm tracking-widest border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 justify-start gap-3">
                <Download className="w-4 h-4" /> {t('export_grades_template')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b">
            <div className="flex items-center gap-3">
              <div className="bg-zinc-900 p-2 rounded-xl text-emerald-400">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black tracking-tight">{t('status_logs')}</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={clearEduservSyncLogs} className="text-xs font-black uppercase tracking-widest rounded-xl h-8 px-4">
              Effacer
            </Button>
          </div>

          <div className="p-6">
            <div className="bg-zinc-950 text-emerald-400 font-mono text-[10px] leading-relaxed p-5 rounded-[1.75rem] h-64 overflow-auto border border-zinc-800 shadow-inner">
              {eduservSyncLogs.length === 0 ? (
                <div className="text-emerald-500/60 italic">{t('no_logs_yet')}</div>
              ) : (
                eduservSyncLogs.map((log) => (
                  <div key={log.id} className="mb-1.5 last:mb-0 break-all">
                    [{log.timestamp.replace('T', ' ').substring(0, 19)}] [{log.level.toUpperCase()}] {log.message}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
            <div className="flex items-center gap-2 mt-3 text-[9px] text-slate-400 font-bold px-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              Logs backend persistés dans le store global
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EduservIntegration;
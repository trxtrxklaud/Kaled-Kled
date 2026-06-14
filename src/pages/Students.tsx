import React, { useState } from 'react';
import type { ImportStudentData } from '../lib/types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  FileUp, 
  ChevronRight, 
  UserPlus, 
  Trash2, 
  Edit, 
  Users,
  Info,
  ChevronLeft,
  Printer,
  Phone,
  MessageCircle,
  FileText,
  Undo2,
  Save
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { printHtmlContent, getAvatarUrl } from '../lib/utils';
import type { AttendanceRecord, Student, Homework } from '../lib/types';
import * as XLSX from '../lib/xlsx';

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length).concat(c);
};

// Expanded to 5 sections per grade (A-E)
const CLASSES = [
  '1A', '1B', '1C', '1D', '1E',
  '2A', '2B', '2C', '2D', '2E',
  '3A', '3B', '3C', '3D', '3E',
  '4A', '4B', '4C', '4D', '4E',
  '5A', '5B', '5C', '5D', '5E',
  '6A', '6B', '6C', '6D', '6E'
];

const SERVER_BASE_URL = 'https://school.providence.ma/files/';

const Students: React.FC = () => {
  const { students, addStudent, updateStudent, deleteStudent, importStudents, attendance, markAttendance, homeworks } = useData();
  const { isAdmin, isStaff, isTeacher, assignedClasses } = useAuth();
  const { t, isRTL } = useLanguage();
  
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [deletedStack, setDeletedStack] = useState<Student[][]>([]);

  const handleUndo = () => {
    if (deletedStack.length === 0) return;
    const lastDeleted = deletedStack[deletedStack.length - 1];
    setDeletedStack(prev => prev.slice(0, -1));
    lastDeleted.forEach(student => {
      addStudent(student);
    });
    toast.success(isRTL ? 'تم التراجع بنجاح' : 'Annulation réussie');
  };

  const handleSaveData = async () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(filteredStudents.map(s => ({
        'Nom et Prénom': s.fullName,
        'Classe': s.class,
        'Date de Naissance': s.birthDate || '',
        'Parent': s.parentName || '',
        'Téléphone': s.parentPhone || ''
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Élèves");
      
      const defaultFilename = selectedClass ? `Liste_Eleves_${selectedClass}.xlsx` : "Liste_Eleves.xlsx";

      if ('showSaveFilePicker' in window) {
        const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // @ts-ignore
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [{
            description: 'Fichier Excel',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
          }],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success(isRTL ? 'تم تسجيل الملف بنجاح' : 'Fichier enregistré avec succès');
      } else {
        XLSX.writeFile(workbook, defaultFilename);
        toast.success(isRTL ? 'تم تسجيل الملف بنجاح' : 'Fichier enregistré avec succès');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(error);
        toast.error(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Erreur lors de l\'enregistrement');
      }
    }
  };

  const [formData, setFormData] = useState({
    fullName: '',
    class: '',
    birthDate: '',
    parentName: '',
    parentPhone: '',
    notes: ''
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter classes based on teacher's assigned classes
  const visibleClasses = isTeacher ? assignedClasses : CLASSES;

  const filteredStudents = students.filter(s => {
    const matchesClass = selectedClass ? s.class === selectedClass : true;
    const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.parentName ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);
    const toDelete = students.filter(s => idsToDelete.includes(s.id));
    setDeletedStack(prev => [...prev, toDelete]);
    idsToDelete.forEach(id => deleteStudent(id));
    setSelectedIds(new Set());
    toast.success(isRTL ? 'تم الحذف بنجاح' : 'Supprimé avec succès');
  };

  const getTodayAttendance = (studentId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const record = attendance.find((r: AttendanceRecord) => r.studentId === studentId && r.date.split('T')[0] === today);
    return record ? record.present : null;
  };

  const handleMarkAttendance = (studentId: string, present: boolean) => {
    markAttendance(studentId, present);
  };

  const handlePrintStudent = (student: Student) => {
    const html = `
        <html><head><title>Rapport - ${student.fullName}</title>
        <style>body { font-family: Arial, sans-serif; padding: 20px; } h1 { color: #1a237e; } .info { margin: 10px 0; } </style>
        </head><body>
        <h1>Rapport Élève</h1>
        <div class="info"><strong>Nom:</strong> ${student.fullName}</div>
        <div class="info"><strong>Classe:</strong> ${student.class}</div>
        <div class="info"><strong>Date de naissance:</strong> ${student.birthDate}</div>
        <div class="info"><strong>Parent:</strong> ${student.parentName}</div>
        <div class="info"><strong>Tél. Parent:</strong> ${student.parentPhone}</div>
        <div class="info"><strong>Notes:</strong> ${student.notes || 'Aucune'}</div>
        <p style="margin-top: 40px; font-size: 12px; color: #666;">Imprimé le ${new Date().toLocaleDateString()} - Complexe la Providence</p>
        </body></html>
      `;
    printHtmlContent(html, `Rapport_${student.fullName}`);
    toast.success(t('print_export') || 'Rapport imprimé');
  };

  const openStudentDetail = (student: Student) => {
    setSelectedStudentForDetail(student);
  };

  const normalizePhoneNumber = (phone: string): string => {
    let normalized = phone.replace(/[\s\-()]/g, '');
    if (normalized.startsWith('00')) {
      normalized = '+' + normalized.substring(2);
    }
    if (!normalized.startsWith('+') && normalized.length > 0) {
      normalized = '+216' + (normalized.startsWith('0') ? normalized.substring(1) : normalized);
    }
    return normalized;
  };

  const handleCall = (e: React.MouseEvent, phone?: string) => {
    e.stopPropagation();
    if (!phone) {
      toast.error('Aucun numéro de téléphone disponible');
      return;
    }
    const normalized = normalizePhoneNumber(phone);
    window.location.href = `tel:${normalized}`;
  };

  const handleWhatsApp = (e: React.MouseEvent, phone?: string, _parentName?: string, studentName?: string) => {
    e.stopPropagation();
    if (!phone) {
      toast.error('Aucun numéro de téléphone disponible');
      return;
    }
    let normalized = normalizePhoneNumber(phone);
    if (normalized.startsWith('+')) {
       normalized = normalized.substring(1);
    }
    const message = encodeURIComponent(`Bonjour, nous vous contactons concernant votre enfant ${studentName || ''}.`);
    window.open(`https://wa.me/${normalized}?text=${message}`, '_blank');
  };


  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      updateStudent({ ...formData, id: editingStudent.id });
    } else {
      addStudent(formData);
    }
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      fullName: student.fullName,
      class: student.class,
      birthDate: student.birthDate,
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      notes: student.notes || ''
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const toDelete = students.find(s => s.id === id);
    if (toDelete) setDeletedStack(prev => [...prev, [toDelete]]);
    deleteStudent(id);
    toast.success(isRTL ? 'تم الحذف بنجاح' : 'Supprimé avec succès');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv') && !fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
      toast.error('Format de fichier non supporté. Veuillez utiliser un fichier XLSX, XLS, CSV, HTML ou HTM.');
      e.target.value = '';
      return;
    }

    try {
      if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        const text = await file.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const rows: any[] = [];
        
        doc.querySelectorAll('tr').forEach((tr, index) => {
          if (index === 0) return; // skip header
          const tds = tr.querySelectorAll('td, th');
          if (tds.length >= 2) {
            rows.push({
              fullName: tds[0]?.textContent?.trim() || '',
              class: tds[1]?.textContent?.trim() || ''
            });
          }
        });
        
        if (rows.length > 0) {
          importStudents(rows as ImportStudentData[], selectedClass || undefined);
          toast.success(t('success_import'));
          setIsImportDialogOpen(false);
        } else {
          toast.error(t('no_data'));
        }
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            
            if (data.length > 0) {
              importStudents(data as ImportStudentData[], selectedClass || undefined);
              toast.success(t('success_import'));
              setIsImportDialogOpen(false);
            } else {
              toast.error(t('no_data'));
            }
          } catch {
            toast.error(t('error_import'));
          }
        };
        reader.readAsBinaryString(file);
      }
    } catch {
      toast.error(t('error_import'));
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handlePrint = () => {
    // Sort students by class, then by name
    const studentsToPrint = [...filteredStudents].sort((a, b) => {
      const classCompare = (a.class || '').localeCompare(b.class || '', undefined, { numeric: true, sensitivity: 'base' });
      if (classCompare !== 0) return classCompare;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

    const html = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>${selectedClass ? `Liste des élèves - ${selectedClass}` : 'Liste des élèves'}</title>
        <meta charset="utf-8" />
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: white; 
            color: #000; 
            direction: ${isRTL ? 'rtl' : 'ltr'};
          }
          h1 { color: #1a237e; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: ${isRTL ? 'right' : 'left'}; }
          th { background-color: #f8fafc; color: #334155; font-weight: bold; }
          tr:nth-child(even) { background-color: #f1f5f9; }
          .class-header { background-color: #e2e8f0 !important; font-weight: bold; text-align: center !important; font-size: 16px; }
          .footer { margin-top: 40px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <h1>${selectedClass ? (isRTL ? `قائمة التلاميذ - قسم ${selectedClass}` : `Liste des élèves - Classe ${selectedClass}`) : (isRTL ? 'القائمة العامة للتلاميذ' : 'Liste globale des élèves')}</h1>
        <table>
          <thead>
            <tr>
              <th>${isRTL ? 'الاسم واللقب' : 'Nom et Prénom'}</th>
              <th>${isRTL ? 'القسم' : 'Classe'}</th>
              <th>${isRTL ? 'تاريخ الولادة' : 'Date de naissance'}</th>
              <th>${isRTL ? 'اسم الولي' : 'Nom du parent'}</th>
              <th>${isRTL ? 'رقم الهاتف' : 'Téléphone'}</th>
            </tr>
          </thead>
          <tbody>
            ${studentsToPrint.map((student: Student, index: number) => {
              const prevStudent = index > 0 ? studentsToPrint[index - 1] : null;
              const showClassHeader = !selectedClass && (!prevStudent || prevStudent.class !== student.class);
              
              let rowHtml = '';
              if (showClassHeader) {
                rowHtml += `
                  <tr>
                    <td colspan="5" class="class-header">
                      ${isRTL ? 'قسم' : 'Classe'} ${student.class || (isRTL ? 'غير محدد' : 'Non assignée')}
                    </td>
                  </tr>
                `;
              }
              
              rowHtml += `
                <tr>
                  <td style="font-weight: bold;">${student.fullName}</td>
                  <td>${student.class}</td>
                  <td>${student.birthDate || '-'}</td>
                  <td>${student.parentName || '-'}</td>
                  <td style="direction: ltr; text-align: ${isRTL ? 'right' : 'left'};">${student.parentPhone || '-'}</td>
                </tr>
              `;
              return rowHtml;
            }).join('')}
          </tbody>
        </table>
        <div class="footer">
          ${isRTL ? 'طبع يوم' : 'Imprimé le'} ${new Date().toLocaleDateString('fr-FR')} - Complexe la Providence
        </div>
      </body>
      </html>
    `;
    printHtmlContent(html, selectedClass ? `Liste_Eleves_${selectedClass}` : 'Liste_Eleves');
  };

  const resetForm = () => {
    setEditingStudent(null);
    setFormData({
      fullName: '',
      class: selectedClass || '',
      birthDate: '',
      parentName: '',
      parentPhone: '',
      notes: ''
    });
  };

  // Admin and Staff can add/edit/delete, Teachers can only view
  const canModify = isAdmin || isStaff;

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : ''}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
           <div className="bg-slate-900 p-2.5 rounded-2xl text-white shadow-sm">
              <Users className="w-5 h-5" />
           </div>
           <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {selectedClass ? `${t('classes')} ${selectedClass}` : t('students')}
          </h2>
        </div>
        <div className="flex gap-2">
          {deletedStack.length > 0 && (
            <Button 
              variant="outline" 
              className="h-10 sm:h-11 px-4 rounded-full border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-semibold text-xs"
              onClick={handleUndo}
            >
              <Undo2 className="w-4 h-4 mr-2" /> {isRTL ? 'تراجع' : 'Annuler'}
            </Button>
          )}
          <Button 
            variant="outline" 
            className="h-10 sm:h-11 px-4 rounded-full border-green-200 text-green-700 hover:bg-green-50 shadow-sm font-semibold text-xs"
            onClick={handleSaveData}
          >
            <Save className="w-4 h-4 mr-2" /> {isRTL ? 'إسترجاع و تحديث المعطيات' : 'Enregistrer'}
          </Button>
          {canModify && selectedIds.size > 0 && (
            <Button 
              variant="destructive" 
              className="h-10 sm:h-11 px-4 rounded-full shadow-sm font-semibold text-xs"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" /> {selectedIds.size}
            </Button>
          )}
          {canModify && (
            <Button 
              variant={selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? "secondary" : "outline"} 
              className="h-10 sm:h-11 px-4 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm font-semibold text-xs"
              onClick={handleSelectAll}
            >
              {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? (isRTL ? 'إلغاء التحديد' : 'Désélectionner tout') : (isRTL ? 'تحديد الكل' : 'Sélectionner tout')}
            </Button>
          )}
          {/* Print Button - Visible to all */}
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            onClick={handlePrint}
          >
            <Printer className="w-5 h-5" />
          </Button>
          {canModify && (
            <>
              <Button 
                variant="outline" 
                className="h-10 sm:h-11 px-4 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm font-semibold text-xs"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <FileUp className="w-4 h-4 mr-2" /> Import Excel
              </Button>
              <Button 
                className="h-10 sm:h-11 px-5 rounded-full bg-slate-900 text-white shadow-sm hover:bg-slate-800 font-semibold text-xs transition-transform active:scale-95"
                onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-2" /> Nouveau
              </Button>
            </>
          )}
        </div>
      </div>

      {!selectedClass ? (
        <section className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 text-slate-700">
             <Info className="w-5 h-5 shrink-0 text-slate-400" />
             <p className="text-xs font-medium">{t('alphabetical_sort')}</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {visibleClasses.map((cls) => {
              const count = students.filter(s => s.class === cls).length;
              return (
                <motion.div
                  key={cls}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className="cursor-pointer border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all rounded-[1.5rem] group overflow-hidden bg-white"
                    onClick={() => setSelectedClass(cls)}
                  >
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 text-slate-900 flex items-center justify-center mb-4 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                        <span className="font-bold text-xl">{cls}</span>
                      </div>
                      <Badge variant="secondary" className="px-3 py-1 rounded-full font-semibold bg-slate-50 text-slate-600 border-transparent group-hover:bg-slate-100 transition-colors">
                        {count} {t('students')}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedClass(null)}
            className="text-primary hover:text-primary/80 hover:bg-primary/5 rounded-xl font-black uppercase tracking-widest text-[10px] -ml-2"
          >
            {isRTL ? <ChevronRight className="w-4 h-4 mr-2" /> : <ChevronLeft className="w-4 h-4 mr-2" />} 
            {isRTL ? 'العودة للأقسام' : 'Retour aux classes'}
          </Button>

          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
            <Input 
              placeholder={t('search')} 
              className={`${isRTL ? 'pr-12' : 'pl-12'} h-12 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-primary/10`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {filteredStudents.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">{t('no_data')}</p>
                  {canModify && (
                    <Button 
                      variant="link" 
                      className="text-primary mt-4 font-black text-[10px] uppercase tracking-wider"
                      onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
                    >
                      {t('add_student')}
                    </Button>
                  )}
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const todayPresent = getTodayAttendance(student.id);
                  let touchTimer: ReturnType<typeof setTimeout>;

                  const handlePointerDown = () => {
                    if (!canModify) return;
                    touchTimer = setTimeout(() => {
                      handleDelete(student.id);
                    }, 800);
                  };

                  const handlePointerUp = () => {
                    if (touchTimer) clearTimeout(touchTimer);
                  };

                  return (
                  <motion.div
                    key={student.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <Card 
                      className={`border shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all outline-none ${selectedIds.has(student.id) ? 'border-primary/40 bg-primary/5 ring-2 ring-primary/20' : 'border-slate-100 bg-white'}`}
                      onClick={() => openStudentDetail(student)}
                      onPointerDown={handlePointerDown}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      style={{ touchAction: 'pan-y' }}
                    >
                      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start sm:items-center gap-4">
                          {canModify && (
                            <div className="flex items-center justify-center">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.has(student.id)}
                                onChange={() => toggleSelection(student.id)}
                                className="w-5 h-5 rounded-md border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                              />
                            </div>
                          )}
                          <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl overflow-hidden flex-shrink-0">
                             <img src={getAvatarUrl(student.fullName, 'student')} alt="" className="w-full h-full object-cover pointer-events-none" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">{student.fullName}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                               <p className="text-xs font-medium text-slate-500">{t('parents')}: <span className="text-slate-700">{student.parentName}</span></p>
                               <Badge variant="outline" className="text-[10px] font-semibold h-5 px-1.5 rounded bg-slate-50 text-slate-600 border-slate-200">{student.class}</Badge>
                            </div>
                            {student.parentPhone && (
                              <div className="flex flex-wrap items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-10 px-4 rounded-xl text-green-700 bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 font-bold shadow-sm"
                                  onClick={(e) => handleWhatsApp(e, student.parentPhone, student.parentName, student.fullName)}
                                >
                                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-10 px-4 rounded-xl text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 font-bold shadow-sm"
                                  onClick={(e) => handleCall(e, student.parentPhone)}
                                >
                                  <Phone className="w-4 h-4 mr-2" /> Appeler
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:self-center self-end" onClick={(e) => e.stopPropagation()}>
                          {isTeacher ? (
                            <div className="flex gap-1">
                              <Button 
                                variant={todayPresent === true ? "default" : "ghost"} 
                                size="sm" 
                                className={`h-8 px-3 rounded-xl text-xs font-black ${todayPresent === true ? "bg-green-600 text-white" : "text-green-600 hover:bg-green-50 border border-green-200"}`}
                                onClick={() => handleMarkAttendance(student.id, true)}
                              >
                                ✓ {isRTL ? "حاضر" : "Présent"}
                              </Button>
                              <Button 
                                variant={todayPresent === false ? "destructive" : "ghost"} 
                                size="sm" 
                                className={`h-8 px-3 rounded-xl text-xs font-black ${todayPresent === false ? "bg-rose-600 text-white" : "text-rose-600 hover:bg-rose-50 border border-rose-200"}`}
                                onClick={() => handleMarkAttendance(student.id, false)}
                              >
                                ✗ {isRTL ? "غائب" : "Absent"}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-blue-500 hover:bg-blue-50" onClick={() => handlePrintStudent(student)}>
                                <Printer className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : canModify ? (
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-blue-500 hover:bg-blue-50" onClick={() => handleEdit(student)}>
                                <Edit className="w-5 h-5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(student.id)}>
                                <Trash2 className="w-5 h-5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-primary hover:bg-primary/10" onClick={() => handlePrintStudent(student)}>
                                <Printer className="w-5 h-5" />
                              </Button>
                            </div>
                          ) : (
                            <div className={`p-2 rounded-xl bg-slate-50 text-slate-300 group-hover:text-primary transition-colors ${isRTL ? "rotate-180" : ""}`}>
                               <ChevronRight className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )})
              )}
            </div>
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-900">
              <div className="bg-slate-100 p-2.5 rounded-full text-slate-900">
                 <UserPlus className="w-5 h-5" />
              </div>
              {editingStudent ? t('edit') : t('add_student')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-5 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold text-slate-600">{t('full_name')}</Label>
                <Input 
                  value={formData.fullName} 
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">{t('classes')}</Label>
                <select 
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white transition-all text-sm font-medium"
                  value={formData.class}
                  onChange={(e) => setFormData({...formData, class: e.target.value})}
                  required
                >
                  <option value="">{isRTL ? 'اختر' : 'Choisir'}</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">{t('birth_date')}</Label>
                <Input 
                  type="date" 
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">{t('parents')}</Label>
                <Input 
                  value={formData.parentName}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">{t('parent_phone')}</Label>
                <Input 
                  placeholder="06..." 
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-semibold text-slate-600">{isRTL ? 'ملاحظات' : 'Notes'}</Label>
                <Input 
                  value={formData.notes}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1 h-11 rounded-full font-semibold">{t('cancel')}</Button>
              <Button type="submit" className="flex-1 h-11 rounded-full bg-slate-900 text-white hover:bg-slate-800 font-semibold shadow-sm">{t('save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-900">
               <div className="bg-slate-100 p-2.5 rounded-full text-slate-900">
                  <FileUp className="w-5 h-5" />
               </div>
               {t('import_excel')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600">
              <p className="font-semibold mb-1">{isRTL ? 'شكل الملف المطلوبة:' : 'Format requis:'}</p>
              <p className="opacity-80">full_name, class, birth_date, parent_name, parent_phone, notes</p>
            </div>
            
            <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group">
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                 <FileUp className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-900">{isRTL ? 'اختر ملف Excel' : 'Choisir Excel'}</p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} className="w-full h-11 rounded-full font-semibold">{t('cancel')}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Detail Modal */}
      <Dialog open={!!selectedStudentForDetail} onOpenChange={() => setSelectedStudentForDetail(null)}>
        <DialogContent className="max-w-md rounded-3xl p-0 border-none shadow-2xl overflow-hidden bg-white">
          {selectedStudentForDetail && (
            <>
              <div className="bg-slate-50 p-6 sm:p-8 flex flex-col items-center text-center relative border-b border-slate-100">
                <Button 
                   variant="ghost" 
                   className="absolute top-4 right-4 h-8 w-8 p-0 rounded-full text-slate-400 hover:bg-slate-200"
                   onClick={() => setSelectedStudentForDetail(null)}
                >
                  <ChevronRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                </Button>
                <div className="w-20 h-20 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 font-bold text-3xl shadow-sm overflow-hidden mb-4 p-1.5">
                  <div style={{ backgroundColor: stringToColor(selectedStudentForDetail.fullName) }} className="w-full h-full rounded-full opacity-80" />
                </div>
                <h3 className="font-bold text-xl text-slate-900">{selectedStudentForDetail.fullName}</h3>
                <Badge variant="outline" className="mt-2 bg-white text-slate-600 border-slate-200 px-3">{selectedStudentForDetail.class}</Badge>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="font-medium text-slate-500">Date de naissance</span>
                    <span className="font-semibold text-slate-900">{selectedStudentForDetail.birthDate}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="font-medium text-slate-500">Parent</span>
                    <span className="font-semibold text-slate-900">{selectedStudentForDetail.parentName}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="font-medium text-slate-500">Téléphone</span>
                    <span className="font-semibold text-slate-900">{selectedStudentForDetail.parentPhone}</span>
                  </div>
                  {selectedStudentForDetail.notes && (
                    <div className="pt-2">
                       <span className="font-medium text-slate-500 block mb-1">Notes</span>
                       <p className="text-slate-800 bg-slate-50 p-3 rounded-xl">{selectedStudentForDetail.notes}</p>
                    </div>
                  )}
                </div>

                {/* Homework Assignments */}
                {(() => {
                  const studentHomeworks = homeworks.filter((h: Homework) => h.classes && h.classes.includes(selectedStudentForDetail.class));
                  if (studentHomeworks.length === 0) return null;
                  return (
                    <div className="pt-2">
                      <h4 className="font-bold text-slate-900 mb-3">{t('homework')}</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-nav-scroll">
                          {studentHomeworks.map((hw: Homework) => (
                            <div key={hw.id} className="p-3 bg-white border border-slate-200 rounded-xl">
                              <h5 className="font-semibold text-sm text-slate-900">{hw.title}</h5>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{hw.description}</p>
                              {hw.fileName && (
                                <a 
                                  href={`${SERVER_BASE_URL}${hw.fileName}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" /> Voir
                                </a>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <Button 
                    variant="outline" 
                    className="rounded-full bg-green-50 border-transparent text-green-700 hover:bg-green-100 font-medium" 
                    onClick={(e) => handleWhatsApp(e, selectedStudentForDetail.parentPhone, selectedStudentForDetail.parentName, selectedStudentForDetail.fullName)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-full bg-blue-50 border-transparent text-blue-700 hover:bg-blue-100 font-medium" 
                    onClick={(e) => handleCall(e, selectedStudentForDetail.parentPhone)}
                  >
                    <Phone className="w-4 h-4 mr-2" /> Appeler
                  </Button>
                </div>

                {canModify && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-full border-slate-200 font-medium text-slate-700" 
                      onClick={() => {
                        handleEdit(selectedStudentForDetail);
                        setSelectedStudentForDetail(null);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" /> {t("edit")}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-full border-slate-200 font-medium text-slate-700 hover:text-red-600 hover:bg-red-50 hover:border-red-200" 
                      onClick={() => {
                        handleDelete(selectedStudentForDetail.id);
                        setSelectedStudentForDetail(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> {t("delete")}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50" 
                      onClick={() => handlePrintStudent(selectedStudentForDetail)}
                      title="Imprimer"
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
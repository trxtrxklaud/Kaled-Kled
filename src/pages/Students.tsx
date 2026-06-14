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
  FileText
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
import { safeOpenExternalLink, triggerPrint } from '../lib/utils';
import type { AttendanceRecord, Student, Homework } from '../lib/types';
import * as XLSX from '../lib/xlsx';

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

  const [formData, setFormData] = useState({
    fullName: '',
    class: '',
    birthDate: '',
    parentName: '',
    parentPhone: '',
    notes: ''
  });

  // Filter classes based on teacher's assigned classes
  const visibleClasses = isTeacher ? assignedClasses : CLASSES;

  const filteredStudents = students.filter(s => {
    const matchesClass = selectedClass ? s.class === selectedClass : true;
    const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.parentName ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const getTodayAttendance = (studentId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const record = attendance.find((r: AttendanceRecord) => r.studentId === studentId && r.date.split('T')[0] === today);
    return record ? record.present : null;
  };

  const handleMarkAttendance = (studentId: string, present: boolean) => {
    markAttendance(studentId, present);
  };

  const handlePrintStudent = (student: Student) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`
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
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch {
          toast.error("Print blocked. Open app in new tab.");
        }
      }, 250);
    }
    toast.success(t('print_export') || 'Rapport imprimé');
  };

  const openStudentDetail = (student: Student) => {
    setSelectedStudentForDetail(student);
  };

  const handleCall = (phone?: string) => {
    if (phone) safeOpenExternalLink(`tel:${phone}`);
  };

  const handleWhatsApp = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('0') ? '212' + cleanPhone.substring(1) : cleanPhone;
    safeOpenExternalLink(`https://wa.me/${fullPhone}`);
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
    if (confirm(t('confirm_delete'))) {
      deleteStudent(id);
    }
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
          importStudents(rows as ImportStudentData[]);
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
              importStudents(data as ImportStudentData[]);
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
    } catch (err) {
      toast.error(t('error_import'));
    }
  };

  const handlePrint = () => {
    triggerPrint();
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
                  return (
                  <motion.div
                    key={student.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all bg-white cursor-pointer" onClick={() => openStudentDetail(student)}>
                      <CardContent className="p-4 sm:p-5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl overflow-hidden">
                             <img 
                               src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.fullName}`} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://placehold.co/48?text=?"; }} 
                               alt="" 
                               className="w-full h-full object-cover mix-blend-multiply opacity-80" 
                             />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">{student.fullName}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                               <p className="text-xs font-medium text-slate-500">{t('parents')}: <span className="text-slate-700">{student.parentName}</span></p>
                               <Badge variant="outline" className="text-[10px] font-semibold h-5 px-1.5 rounded bg-slate-50 text-slate-600 border-slate-200">{student.class}</Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                <div className="w-20 h-20 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 font-bold text-3xl shadow-sm overflow-hidden mb-4">
                  <img 
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedStudentForDetail.fullName}`} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://placehold.co/48?text=?"; }} 
                    alt="" 
                    className="w-full h-full object-cover mix-blend-multiply opacity-80" 
                  />
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
                    onClick={() => handleWhatsApp(selectedStudentForDetail.parentPhone)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-full bg-blue-50 border-transparent text-blue-700 hover:bg-blue-100 font-medium" 
                    onClick={() => handleCall(selectedStudentForDetail.parentPhone)}
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
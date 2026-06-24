import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import type { Employee } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  UserRound, 
  Phone, 
  MessageCircle, 
  MoreVertical, 
  Edit, 
  Trash2,
  Briefcase,
  FileUp,
  Printer,
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
import { safeOpenExternalLink, printHtmlContent, getAvatarUrl } from '../lib/utils';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import * as XLSX from '../lib/xlsx';

const EmployeeTypes = ['Tous', 'Teacher', 'Administration', 'Security', 'Other'];

const Employees: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, deleteEmployees } = useData();
  const { isAdmin } = useAuth();
  const { t, isRTL } = useLanguage();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('Tous');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletedStack, setDeletedStack] = useState<Employee[][]>([]);
  const { importEmployees } = useData();

  const handleUndo = () => {
    if (deletedStack.length === 0) return;
    const lastDeleted = deletedStack[deletedStack.length - 1];
    setDeletedStack(prev => prev.slice(0, -1));
    lastDeleted.forEach(emp => {
      addEmployee(emp);
    });
    toast.success(isRTL ? 'تم التراجع بنجاح' : 'Annulation réussie');
  };

  const handleSaveData = async () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(filteredEmployees.map(e => ({
        'Nom et Prénom': e.fullName,
        'Poste': e.role,
        'Type': e.type,
        'Téléphone': e.phone
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Employés");

      const defaultFilename = "Liste_Employes.xlsx";
      
      if ('showSaveFilePicker' in window) {
        const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // @ts-expect-error Typescript checking
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
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error(error);
        toast.error(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Erreur lors de l\'enregistrement');
      }
    }
  };

  const handlePrintEmployee = (employee: Employee) => {
    const html = `
        <html><head><title>Fiche Personnel - ${employee.fullName}</title>
        <style>body { font-family: Arial, sans-serif; padding: 20px; direction: ${isRTL ? 'rtl' : 'ltr'}; text-align: ${isRTL ? 'right' : 'left'}; } h1 { color: #1a237e; } .info { margin: 10px 0; } </style>
        </head><body>
        <h1>${isRTL ? 'بطاقة الموظف' : 'Fiche Personnel'}</h1>
        <div class="info"><strong>${isRTL ? 'الاسم واللقب' : 'Nom'}:</strong> ${employee.fullName}</div>
        <div class="info"><strong>${isRTL ? 'المنصب' : 'Poste'}:</strong> ${employee.role}</div>
        <div class="info"><strong>${isRTL ? 'الفئة' : 'Type'}:</strong> ${employee.type}</div>
        <div class="info"><strong>${isRTL ? 'الهاتف' : 'Téléphone'}:</strong> <span dir="ltr">${employee.phone}</span></div>
        </body></html>
    `;
    printHtmlContent(html, `Fiche_${employee.fullName}`);
  };

  const handlePrint = () => {
    // Sort by type, then by name
    const sortedEmployees = [...filteredEmployees].sort((a, b) => {
      const typeCompare = (a.type || '').localeCompare(b.type || '');
      if (typeCompare !== 0) return typeCompare;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

    const html = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>${isRTL ? 'قائمة الموظفين' : 'Liste du personnel'}</title>
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
          .type-header { background-color: #e2e8f0 !important; font-weight: bold; text-align: center !important; font-size: 16px; }
          .footer { margin-top: 40px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <h1>${isRTL ? 'قائمة الموظفين' : 'Liste du personnel'}</h1>
        <table>
          <thead>
            <tr>
              <th>${isRTL ? 'الاسم واللقب' : 'Nom et Prénom'}</th>
              <th>${isRTL ? 'المنصب' : 'Poste'}</th>
              <th>${isRTL ? 'الهاتف' : 'Téléphone'}</th>
            </tr>
          </thead>
          <tbody>
            ${sortedEmployees.map((emp, index) => {
              const prevEmp = index > 0 ? sortedEmployees[index - 1] : null;
              const showTypeHeader = !prevEmp || prevEmp.type !== emp.type;
              
              const translatedType = emp.type === 'Teacher' ? (isRTL ? 'أساتذة' : 'Professeurs') :
                                     emp.type === 'Administration' ? (isRTL ? 'إدارة' : 'Administration') :
                                     emp.type === 'Security' ? (isRTL ? 'أمن' : 'Sécurité') : (isRTL ? 'أخرى' : 'Autre');

              let rowHtml = '';
              if (showTypeHeader) {
                rowHtml += `
                  <tr>
                    <td colspan="3" class="type-header">
                      ${translatedType}
                    </td>
                  </tr>
                `;
              }
              
              rowHtml += `
                <tr>
                  <td style="font-weight: bold;">${emp.fullName}</td>
                  <td>${emp.role || '-'}</td>
                  <td style="direction: ltr; text-align: ${isRTL ? 'right' : 'left'};">${emp.phone || '-'}</td>
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
    printHtmlContent(html, 'Liste_Personnel');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      toast.error('Format de fichier non supporté. Veuillez utiliser un fichier XLSX, XLS ou CSV.');
      e.target.value = '';
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          if (data.length > 0) {
            importEmployees(data);
            toast.success(t('success_import') || 'Importation réussie');
            setIsImportDialogOpen(false);
          } else {
            toast.error(t('no_data') || 'Aucune donnée');
          }
        } catch {
          toast.error(t('error_import') || 'Erreur lors de l\'importation');
        }
      };
      reader.readAsBinaryString(file);
    } catch {
      toast.error(t('error_import') || 'Erreur lors de l\'importation');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const [formData, setFormData] = useState({
    fullName: '',
    role: '',
    type: 'Teacher' as 'Teacher' | 'Administration' | 'Security' | 'Other',
    phone: '',
  });

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'Tous' ? true : e.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map(e => e.id)));
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
    const toDelete = employees.filter(e => idsToDelete.includes(e.id));
    setDeletedStack(prev => [...prev, toDelete]);
    deleteEmployees(idsToDelete);
    setSelectedIds(new Set());
    toast.success(isRTL ? 'تم الحذف بنجاح' : 'Supprimé avec succès');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      updateEmployee({ ...formData, id: editingEmployee.id });
    } else {
      addEmployee(formData);
    }
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      fullName: employee.fullName,
      role: employee.role,
      type: employee.type,
      phone: employee.phone
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const toDelete = employees.find(e => e.id === id);
    if (toDelete) setDeletedStack(prev => [...prev, [toDelete]]);
    deleteEmployee(id);
    toast.success(isRTL ? 'تم الحذف بنجاح' : 'Supprimé avec succès');
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      fullName: '',
      role: '',
      type: 'Teacher',
      phone: ''
    });
  };

  const handleCall = (phone: string) => {
    safeOpenExternalLink(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    safeOpenExternalLink(`https://wa.me/${cleanPhone.startsWith('0') ? '212' + cleanPhone.substring(1) : cleanPhone}`);
  };

  const handleMessenger = (name: string) => {
    safeOpenExternalLink(`https://m.me/${name.replace(/\s+/g, '.').toLowerCase()}`);
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
             <UserRound className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('employees')}</h2>
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
          {isAdmin && selectedIds.size > 0 && (
            <Button 
              variant="destructive" 
              className="h-10 sm:h-11 px-4 rounded-full shadow-sm font-semibold text-xs"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" /> {selectedIds.size}
            </Button>
          )}
          {isAdmin && (
            <Button 
              variant={selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0 ? "secondary" : "outline"} 
              className="h-10 sm:h-11 px-4 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm font-semibold text-xs"
              onClick={handleSelectAll}
            >
              {selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0 ? (isRTL ? 'إلغاء التحديد' : 'Désélectionner tout') : (isRTL ? 'تحديد الكل' : 'Sélectionner tout')}
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            onClick={handlePrint}
          >
            <Printer className="w-5 h-5" />
          </Button>
          {isAdmin && (
            <>
              <Button 
                variant="outline" 
                className="h-10 sm:h-11 px-4 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm font-semibold text-xs"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <FileUp className="w-4 h-4 mr-2" /> {t('import_excel') || 'Import Excel'}
              </Button>
              <Button 
                className="h-10 sm:h-11 px-5 rounded-full bg-slate-900 text-white shadow-sm hover:bg-slate-800 font-semibold text-xs transition-transform active:scale-95"
                onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-2" /> {t('new') || 'Nouveau'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
          <Input 
            placeholder={t('search')} 
            className={`${isRTL ? 'pr-12' : 'pl-12'} h-12 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-primary/10`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {EmployeeTypes.map(type => (
            <Badge
              key={type}
              variant={filterType === type ? 'default' : 'secondary'}
              className="cursor-pointer px-5 py-2 whitespace-nowrap rounded-xl font-black uppercase tracking-widest text-[9px]"
              onClick={() => setFilterType(type)}
            >
              {type === 'Tous' ? t('all') : 
               type === 'Teacher' ? (isRTL ? 'أساتذة' : 'Profs') : 
               type === 'Administration' ? 'Admin' : 
               type === 'Security' ? (isRTL ? 'أمن' : 'Sécurité') : t('all')}
            </Badge>
          ))}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="space-y-4">
          {filteredEmployees.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">{t('no_data')}</p>
            </div>
          ) : (
            filteredEmployees.map((employee) => {
              let touchTimer: ReturnType<typeof setTimeout>;

              const handlePointerDown = () => {
                if (!isAdmin) return;
                touchTimer = setTimeout(() => {
                  handleDelete(employee.id);
                }, 800);
              };

              const handlePointerUp = () => {
                if (touchTimer) clearTimeout(touchTimer);
              };

              return (
              <motion.div
                key={employee.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card 
                  className={`border-none shadow-lg shadow-slate-200/40 rounded-[2rem] overflow-hidden group hover:ring-2 hover:ring-primary/5 transition-all outline-none ${selectedIds.has(employee.id) ? 'ring-2 ring-primary/40 bg-primary/5' : 'bg-white'}`}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  style={{ touchAction: 'pan-y' }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-5">
                        {isAdmin && (
                          <div className="flex items-center justify-center">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.has(employee.id)}
                              onChange={() => toggleSelection(employee.id)}
                              className="w-5 h-5 rounded-md border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                            />
                          </div>
                        )}
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                          <img src={getAvatarUrl(employee.fullName, 'employee')} alt="" className="w-full h-full object-cover pointer-events-none" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-base leading-tight tracking-tight">{employee.fullName}</h4>
                          <p className="text-[10px] font-black text-primary mt-1 uppercase tracking-wider">{employee.role}</p>
                          <div className="flex items-center gap-2 mt-2">
                             <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1 rounded-sm border-slate-100 bg-slate-50">{employee.type}</Badge>
                             <p className="text-[9px] font-bold text-slate-400 tracking-widest">{employee.phone}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 shadow-sm"
                          onClick={() => handleMessenger(employee.fullName)}
                        >
                          <MessageCircle className="w-5 h-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-green-600 bg-green-50 rounded-xl hover:bg-green-100 shadow-sm"
                          onClick={() => handleWhatsApp(employee.phone)}
                        >
                          <MessageCircle className="w-5 h-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-primary bg-primary/5 rounded-xl hover:bg-primary/10 shadow-sm"
                          onClick={() => handleCall(employee.phone)}
                        >
                          <Phone className="w-5 h-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 shadow-sm"
                          onClick={() => handlePrintEmployee(employee)}
                        >
                          <Printer className="w-5 h-5" />
                        </Button>
                        
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100">
                                <MoreVertical className="w-5 h-5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="rounded-2xl border-slate-100 shadow-2xl">
                              <DropdownMenuItem onClick={() => handleEdit(employee)} className="rounded-xl m-1 p-2 font-black text-[10px] uppercase tracking-widest">
                                <Edit className="w-4 h-4 mr-2" /> {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive rounded-xl m-1 p-2 font-black text-[10px] uppercase tracking-widest" onClick={() => handleDelete(employee.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              );
            })
          )}
        </div>
      </AnimatePresence>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                 <UserRound className="w-6 h-6" />
              </div>
              {editingEmployee ? t('edit') : t('add_employee')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('full_name')}</Label>
                <Input 
                  value={formData.fullName} 
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('role')}</Label>
                  <Input 
                    placeholder="ex: Professeur"
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    value={formData.role} 
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('type')}</Label>
                  <select 
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white transition-all text-sm font-bold"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as 'Teacher' | 'Administration' | 'Security' | 'Other'})}
                    required
                  >
                    {EmployeeTypes.filter(t => t !== 'Tous').map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('phone')}</Label>
                <Input 
                  placeholder="06..." 
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required 
                />
              </div>
            </div>
            <DialogFooter className="pt-6 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-xs">{t('cancel')}</Button>
              <Button type="submit" className="flex-1 h-12 rounded-2xl bg-primary font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">{t('save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem] p-6 border-none shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-900">
               <div className="bg-slate-100 p-2.5 rounded-full text-slate-900">
                  <FileUp className="w-5 h-5" />
               </div>
               {t('import_excel') || 'Import Excel'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600">
              <p className="font-semibold mb-1">{isRTL ? 'شكل الملف المطلوبة:' : 'Format requis:'}</p>
              <p className="opacity-80">fullName, role, type, phone</p>
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
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} className="w-full h-11 rounded-full font-semibold">{t('cancel') || 'Annuler'}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
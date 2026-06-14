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
import { safeOpenExternalLink } from '../lib/utils';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu';

const EmployeeTypes = ['Tous', 'Teacher', 'Administration', 'Security', 'Other'];

const Employees: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useData();
  const { isAdmin } = useAuth();
  const { t, isRTL } = useLanguage();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('Tous');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

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
    if (confirm(t('confirm_delete'))) {
      deleteEmployee(id);
    }
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
        {isAdmin && (
          <Button 
            size="icon" 
            className="h-11 w-11 rounded-2xl bg-primary shadow-xl shadow-primary/25 active:scale-95"
            onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
          >
            <Plus className="w-6 h-6" />
          </Button>
        )}
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
            filteredEmployees.map((employee) => (
              <motion.div
                key={employee.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] overflow-hidden group hover:ring-2 hover:ring-primary/5 transition-all bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${employee.fullName}`} alt="" className="w-full h-full object-cover" />
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
            ))
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
              {editingEmployee ? t('edit') : t('add_student')}
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
    </div>
  );
};

export default Employees;
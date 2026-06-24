import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Phone, 
  MessageCircle, 
  UserCheck,
  Smartphone,
  MessageSquare,
  Plus,
  X,
  Key
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { safeOpenExternalLink } from '../lib/utils';

const CLASSES = ['Tous', '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'];

const Parents: React.FC = () => {
  const { students, parentUsers, addParentUser } = useData();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('Tous');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [relation, setRelation] = useState<'father'|'mother'|'guardian'>('father');

  const filteredParents = students.filter(s => {
    const parentNameMatch = (s.parentName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const studentNameMatch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = studentNameMatch || parentNameMatch;
    const matchesClass = filterClass === 'Tous' ? true : s.class === filterClass;
    return matchesSearch && matchesClass;
  });

  const handleCall = (phone?: string) => {
    if (phone) safeOpenExternalLink(`tel:${phone}`);
  };

  const handleWhatsApp = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    safeOpenExternalLink(`https://wa.me/${cleanPhone.startsWith('0') ? '212' + cleanPhone.substring(1) : cleanPhone}`);
  };

  const handleMessenger = (name?: string) => {
    if (!name) return;
    safeOpenExternalLink(`https://m.me/${name.replace(/\s+/g, '.').toLowerCase()}`);
  };

  const handleBulkMessage = () => {
    if (filterClass === 'Tous') {
      toast.info(isRTL ? 'يرجى اختيار قسم لإرسال رسالة جماعية' : 'Veuillez sélectionner une classe pour envoyer un message groupé');
    } else {
      toast.success(isRTL ? `جاري تحضير الرسالة الجماعية لقسم ${filterClass}` : `Préparation de l'envoi groupé pour la classe ${filterClass}`);
    }
  };

  const handleCreateParentAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParentName || !newParentPhone || !selectedStudentId) {
      toast.error(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Veuillez remplir tous les champs');
      return;
    }

    // Check if phone already used
    if (parentUsers.find(p => p.phone === newParentPhone)) {
      toast.error(isRTL ? 'رقم الهاتف مستخدم مسبقاً' : 'Le numéro de téléphone est déjà utilisé');
      return;
    }

    const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
    addParentUser({
      fullName: newParentName,
      phone: newParentPhone,
      passwordHash: tempPassword,
      mustChangePassword: true,
      childrenIds: [selectedStudentId]
    });

    toast.success(isRTL ? `تم إنشاء الحساب بكلمة مرور: ${tempPassword}` : `Compte créé. Mot de passe: ${tempPassword}`, { duration: 10000 });
    
    setNewParentName('');
    setNewParentPhone('');
    setSelectedStudentId('');
    setIsCreateModalOpen(false);
  };

  const getParentAccountStatus = (studentId: string) => {
    const account = parentUsers.find(p => p.childrenIds.includes(studentId));
    return account ? (
      <Badge variant="outline" className={`h-4 text-[8px] font-black uppercase px-1.5 rounded-sm flex items-center gap-1 ${account.mustChangePassword ? 'border-amber-200 text-amber-600 bg-amber-50' : 'border-emerald-200 text-emerald-600 bg-emerald-50'}`}>
        <Key className="w-2 h-2" />
        {account.mustChangePassword ? (isRTL ? 'حساب جديد' : 'Nouveau') : (isRTL ? 'مفعل' : 'Actif')}
      </Badge>
    ) : (
      <Badge variant="outline" className="h-4 text-[8px] font-black uppercase px-1.5 rounded-sm border-slate-200 text-slate-400 bg-slate-50">
        {isRTL ? 'بدون حساب' : 'Aucun compte'}
      </Badge>
    );
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : ''}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
           <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
              <Smartphone className="w-5 h-5" />
           </div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('parents')}</h2>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase tracking-widest text-[9px] h-10 shadow-sm"
            onClick={handleBulkMessage}
          >
            <MessageSquare className="w-4 h-4 mr-2" /> {isRTL ? 'رسالة جماعية' : 'Message groupé'}
          </Button>
          <Button 
            size="sm" 
            className="rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[9px] h-10 shadow-sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> {isRTL ? 'إنشاء حساب ولي' : 'Créer un compte parent'}
          </Button>
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
          {CLASSES.map(cls => (
            <Badge
              key={cls}
              variant={filterClass === cls ? 'default' : 'secondary'}
              className="cursor-pointer px-5 py-2 whitespace-nowrap rounded-xl font-black uppercase tracking-widest text-[9px]"
              onClick={() => setFilterClass(cls)}
            >
              {cls === 'Tous' ? t('all') : cls}
            </Badge>
          ))}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="space-y-4">
          {filteredParents.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserCheck className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">{t('no_data')}</p>
            </div>
          ) : (
            filteredParents.map((student) => (
              <motion.div
                key={student.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] overflow-hidden group hover:ring-2 hover:ring-primary/5 transition-all bg-white border-l-8 border-l-primary">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-center gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-primary/5">
                             <UserCheck className="w-3 h-3 text-primary" />
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{t('students')}: <span className="text-slate-900">{student.fullName}</span></p>
                          <Badge variant="outline" className="h-4 text-[8px] font-black uppercase px-1.5 rounded-sm border-slate-100 bg-slate-50">{student.class}</Badge>
                          {getParentAccountStatus(student.id)}
                        </div>
                        <h4 className="text-lg font-black text-slate-900 leading-tight tracking-tight">{student.parentName}</h4>
                        <p className="text-[10px] font-black text-primary flex items-center gap-1 mt-2">
                          <Phone className="w-3 h-3" /> {student.parentPhone}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 shadow-sm"
                          onClick={() => handleMessenger(student.parentName)}
                        >
                          <MessageCircle className="w-5 h-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-green-600 bg-green-50 rounded-xl hover:bg-green-100 shadow-sm"
                          onClick={() => handleWhatsApp(student.parentPhone)}
                        >
                          <MessageCircle className="w-5 h-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-primary bg-primary/5 rounded-xl hover:bg-primary/10 shadow-sm"
                          onClick={() => handleCall(student.parentPhone)}
                        >
                          <Phone className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </AnimatePresence>

      {/* Create Account Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" dir={isRTL ? "rtl" : "ltr"}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-6 left-6 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-black text-slate-800 mb-6">{isRTL ? 'إنشاء حساب ولي' : 'Créer un compte parent'}</h2>

              <form onSubmit={handleCreateParentAccount} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">{isRTL ? 'اختر التلميذ' : 'Sélectionner l\'élève'}</label>
                  <select 
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-12 text-sm focus:outline-none focus:border-primary/50"
                    required
                  >
                    <option value="">{isRTL ? '-- التلميذ --' : '-- Élève --'}</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.fullName} ({s.class})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">{isRTL ? 'الاسم الكامل للولي' : 'Nom complet du parent'}</label>
                  <input 
                    type="text" 
                    value={newParentName}
                    onChange={(e) => setNewParentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-12 text-sm focus:outline-none focus:border-primary/50" 
                    required 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">{isRTL ? 'رقم الهاتف (معرّف الدخول)' : 'Téléphone (Identifiant)'}</label>
                  <input 
                    type="tel" 
                    value={newParentPhone}
                    onChange={(e) => setNewParentPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-12 text-sm focus:outline-none focus:border-primary/50" 
                    required 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">{isRTL ? 'صلة القرابة' : 'Relation'}</label>
                  <select 
                    value={relation}
                    onChange={(e) => setRelation(e.target.value as "father" | "mother" | "guardian")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-12 text-sm focus:outline-none focus:border-primary/50"
                    required
                  >
                    <option value="father">{isRTL ? 'أب' : 'Père'}</option>
                    <option value="mother">{isRTL ? 'أم' : 'Mère'}</option>
                    <option value="guardian">{isRTL ? 'وصي' : 'Tuteur'}</option>
                  </select>
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary/90 h-12 font-bold shadow-xl shadow-primary/20">
                    {isRTL ? 'توليد كلمة سر وحفظ' : 'Générer mot de passe et sauvegarder'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Parents;
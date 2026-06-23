import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Upload, 
  Send, 
  FileUp, 
  CheckCircle,
  AlertCircle,
  Printer
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import type { ImportFinanceData } from '../lib/types';
import * as XLSX from '../lib/xlsx';
import { triggerPrint } from '../lib/utils';

const Finance: React.FC = () => {
  const { financeArrears, addFinanceArrear, updateFinanceArrear, sendPaymentReminder } = useData();
  const { isAdmin } = useAuth();
  const { t, isRTL } = useLanguage();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handlePrint = () => {
    triggerPrint();
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

    setUploadedFile(file);

    try {
      if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        const text = await file.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const rows: unknown[] = [];
        
        doc.querySelectorAll('tr').forEach((tr, index) => {
          if (index === 0) return; // skip header
          const tds = tr.querySelectorAll('td, th');
          if (tds.length >= 4) {
            rows.push({
              student_id: tds[0]?.textContent?.trim() || '',
              student_name: tds[1]?.textContent?.trim() || '',
              parent_phone: tds[2]?.textContent?.trim() || '',
              amount: tds[3]?.textContent?.trim() || '0'
            });
          }
        });
        
        if (rows.length > 0) {
          (rows as ImportFinanceData[]).forEach((item) => {
            addFinanceArrear({
              studentId: item.student_id || '',
              studentName: item.student_name || item.fullName || '',
              parentPhone: item.parent_phone || item.parentPhone || '',
              amount: parseFloat(String(item.amount ?? '0')) || 0,
              month: item.month || new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
              status: 'pending'
            });
          });
          toast.success(t('success_import'));
          setIsImportOpen(false);
          setUploadedFile(null);
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
              (data as ImportFinanceData[]).forEach((item) => {
                addFinanceArrear({
                  studentId: item.student_id || '',
                  studentName: item.student_name || item.fullName || '',
                  parentPhone: item.parent_phone || item.parentPhone || '',
                  amount: parseFloat(String(item.amount ?? '0')) || 0,
                  month: item.month || new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                  status: 'pending'
                });
              });
              toast.success(t('success_import'));
              setIsImportOpen(false);
              setUploadedFile(null);
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
    }
  };

  const handleSendReminder = (id: string) => {
    sendPaymentReminder(id);
  };

  const handleMarkPaid = (id: string) => {
    const arrear = financeArrears.find(a => a.id === id);
    if (arrear) {
      updateFinanceArrear({ ...arrear, status: 'paid' });
      toast.success('Paiement enregistré');
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <p className="text-slate-400 font-black uppercase tracking-widest">Accès réservé à l'administration</p>
      </div>
    );
  }

  const totalPending = financeArrears.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.amount, 0);
  const totalReminded = financeArrears.filter(a => a.status === 'reminded').reduce((sum, a) => sum + a.amount, 0);
  const totalPaid = financeArrears.filter(a => a.status === 'paid').reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : ''}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
           <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
              <DollarSign className="w-5 h-5" />
           </div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('finance')}</h2>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-11 w-11 rounded-2xl border-slate-200 text-primary hover:bg-slate-50 shadow-sm"
            onClick={handlePrint}
          >
            <Printer className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-11 w-11 rounded-2xl border-slate-200 text-primary hover:bg-slate-50 shadow-sm"
            onClick={() => setIsImportOpen(true)}
          >
            <FileUp className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-white">
          <CardContent className="p-4 text-center">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">En attente</p>
            <p className="text-xl font-black text-rose-500 mt-1">{totalPending.toFixed(0)} DH</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-white">
          <CardContent className="p-4 text-center">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Rappelés</p>
            <p className="text-xl font-black text-orange-500 mt-1">{totalReminded.toFixed(0)} DH</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-white">
          <CardContent className="p-4 text-center">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payés</p>
            <p className="text-xl font-black text-green-500 mt-1">{totalPaid.toFixed(0)} DH</p>
          </CardContent>
        </Card>
      </div>

      {/* Arrears List */}
      <div className="space-y-4">
        {financeArrears.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <DollarSign className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-black text-xs uppercase tracking-widest">{t('no_data')}</p>
          </div>
        ) : (
          financeArrears.map((arrear) => (
            <motion.div key={arrear.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-black text-slate-900">{arrear.studentName}</h4>
                      <p className="text-[10px] text-slate-500 font-bold">{arrear.month}</p>
                    </div>
                    <Badge variant={arrear.status === 'paid' ? 'default' : arrear.status === 'reminded' ? 'secondary' : 'destructive'} className="font-black">
                      {arrear.status === 'paid' ? 'Payé' : arrear.status === 'reminded' ? 'Rappelé' : 'En attente'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-black text-primary">{arrear.amount.toFixed(0)} DH</p>
                    <div className="flex gap-2">
                      {arrear.status !== 'paid' && (
                        <Button 
                          size="sm" 
                          className="h-9 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-4"
                          onClick={() => handleMarkPaid(arrear.id)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Payer
                        </Button>
                      )}
                      {arrear.status === 'pending' && (
                        <Button 
                          size="sm" 
                          className="h-9 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-4"
                          onClick={() => handleSendReminder(arrear.id)}
                        >
                          <Send className="w-3 h-3 mr-1" /> Rappel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Import Dialog */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2.5rem] border-none shadow-3xl bg-white">
            <CardContent className="p-8">
              <h3 className="text-xl font-black text-slate-900 mb-6">{t('tuition_arrears')}</h3>
              <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-slate-50/30 hover:bg-slate-50 hover:border-primary/20 transition-all cursor-pointer group relative">
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <Upload className="w-10 h-10 text-slate-200 mb-4 group-hover:scale-110 group-hover:text-primary transition-all" />
                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{t('select_file')}</p>
                {uploadedFile && <p className="text-xs text-primary mt-2">{uploadedFile.name}</p>}
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setIsImportOpen(false)} 
                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs mt-6"
              >
                {t('cancel')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Finance;
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Download, Eye, FileSpreadsheet, FileStack, Mail, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from '../lib/xlsx';
import { buildCertificatePdfAttachment } from '../lib/pdfReports';
import { buildCertificateZipAttachment } from '../lib/certificateArchive';
import { sendEmailWithAttachments } from '../lib/emailDelivery';

const FILTER_ALL = 'all';

const CertificateRegistryPage: React.FC = () => {
  const {
    certificateRegistry,
    students,
    academicResults,
    schoolBranding,
    addEmailDeliveryLog,
    addCertificateRegistryEntries,
    revokeCertificateRegistryEntry,
  } = useData();
  const { isRTL } = useLanguage();
  const managerEmail = import.meta.env.VITE_MANAGER_EMAIL || '';
  const filteredSelectAllRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>(FILTER_ALL);
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return certificateRegistry.filter((entry) => {
      const matchesAction = actionFilter === FILTER_ALL || entry.action === actionFilter;
      const createdAtDate = entry.createdAt.split('T')[0];
      const matchesStartDate = startDateFilter === '' || createdAtDate >= startDateFilter;
      const matchesEndDate = endDateFilter === '' || createdAtDate <= endDateFilter;
      const matchesQuery = query === ''
        || entry.studentName.toLowerCase().includes(query)
        || entry.reference.toLowerCase().includes(query)
        || entry.classId.toLowerCase().includes(query)
        || entry.scopeLabel.toLowerCase().includes(query);
      return matchesAction && matchesStartDate && matchesEndDate && matchesQuery;
    });
  }, [actionFilter, certificateRegistry, endDateFilter, searchQuery, startDateFilter]);

  const filteredEntryIds = filteredEntries.map((entry) => entry.id);
  const selectedFilteredEntryIds = filteredEntryIds.filter((id) => selectedEntryIds.includes(id));
  const areAllFilteredEntriesSelected = filteredEntryIds.length > 0 && selectedFilteredEntryIds.length === filteredEntryIds.length;
  const hasPartialFilteredSelection = selectedFilteredEntryIds.length > 0 && !areAllFilteredEntriesSelected;

  useEffect(() => {
    if (filteredSelectAllRef.current) {
      filteredSelectAllRef.current.indeterminate = hasPartialFilteredSelection;
    }
  }, [hasPartialFilteredSelection]);

  const downloadBlob = (blob: Blob, fileName: string): void => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const buildEntryAttachment = (entry: typeof filteredEntries[number]) => {
    const student = students.find((item) => item.id === entry.studentId) ?? null;
    const results = academicResults.filter((result) => {
      const matchesStudent = result.studentId === entry.studentId;
      const matchesClass = entry.classFilter === FILTER_ALL || result.classId === entry.classFilter;
      const matchesTrimester = entry.trimesterFilter === FILTER_ALL || String(result.trimester) === entry.trimesterFilter;
      return matchesStudent && matchesClass && matchesTrimester;
    });

    return buildCertificatePdfAttachment({
      student,
      results,
      scopeLabel: entry.scopeLabel,
      generatedAt: new Date().toLocaleString('fr-FR'),
      branding: schoolBranding,
    });
  };

  const openPreview = (blob: Blob, title: string): void => {
    if (previewFileUrl) {
      URL.revokeObjectURL(previewFileUrl);
    }
    setPreviewFileUrl(URL.createObjectURL(blob));
    setPreviewTitle(title);
  };

  const toggleEntrySelection = (entryId: string): void => {
    setSelectedEntryIds((current) => current.includes(entryId)
      ? current.filter((id) => id !== entryId)
      : [...current, entryId]);
  };

  const toggleFilteredSelection = (): void => {
    if (areAllFilteredEntriesSelected) {
      setSelectedEntryIds((current) => current.filter((id) => !filteredEntryIds.includes(id)));
      return;
    }
    setSelectedEntryIds((current) => [...new Set([...current, ...filteredEntryIds])]);
  };

  const clearSelection = (): void => {
    setSelectedEntryIds([]);
  };

  const handleExportRegistryXlsx = (): void => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(filteredEntries.map((entry) => ({
      reference: entry.reference,
      status: entry.status,
      revoked_at: entry.revokedAt || '',
      revoked_reason: entry.revokedReason || '',
      student_name: entry.studentName,
      class: entry.classId,
      scope: entry.scopeLabel,
      average_score: entry.averageScore,
      evaluations_count: entry.evaluationsCount,
      action: entry.action,
      file_name: entry.fileName,
      created_at: entry.createdAt,
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'CertificateRegistry');
    XLSX.writeFile(workbook, 'certificate_registry.xlsx');
    toast.success(isRTL ? 'تم تصدير سجل الشهادات XLSX' : 'Registre exporté en XLSX');
  };

  const handleExportRegistryPdf = (): void => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFillColor(26, 35, 126);
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(schoolBranding.schoolNameFr, 14, 12);
    doc.setFontSize(12);
    doc.text('Certificate Registry', 14, 19);
    if (schoolBranding.logoDataUrl) {
      try {
        doc.addImage(schoolBranding.logoDataUrl, 'PNG', 265, 3, 18, 18, undefined, 'FAST');
      } catch {
        // ignore preview issues
      }
    }
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(new Date().toLocaleString(isRTL ? 'ar-MA' : 'fr-FR'), 14, 31);

    autoTable(doc, {
      startY: 36,
      head: [['Reference', 'Status', 'Student', 'Class', 'Scope', 'Average', 'Evaluations', 'Action', 'Created']],
      body: filteredEntries.map((entry) => [
        entry.reference,
        entry.status,
        entry.studentName,
        entry.classId,
        entry.scopeLabel,
        entry.averageScore.toFixed(2),
        String(entry.evaluationsCount),
        entry.action,
        new Date(entry.createdAt).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR'),
      ]),
      headStyles: { fillColor: [26, 35, 126] },
      styles: { fontSize: 8 },
    });

    const blob = doc.output('blob');
    downloadBlob(blob, 'certificate_registry.pdf');
    toast.success(isRTL ? 'تم تصدير سجل الشهادات PDF' : 'Registre exporté en PDF');
  };

  const handleBulkResendToManager = async (): Promise<void> => {
    const selectedEntries = filteredEntries.filter((entry) => selectedEntryIds.includes(entry.id) && entry.status === 'active');
    if (selectedEntries.length === 0) {
      toast.error(isRTL ? 'حدد شهادات نشطة أولاً' : 'Sélectionnez des certificats actifs avant réenvoi');
      return;
    }

    const attachments = selectedEntries.map((entry) => buildEntryAttachment(entry));
    const zipAttachment = await buildCertificateZipAttachment(attachments, 'registry_certificates_resend.zip');

    try {
      const provider = await sendEmailWithAttachments({
        recipientEmail: managerEmail,
        subject: `Registry certificates resend (${selectedEntries.length})`,
        message: `Veuillez trouver ci-joint l'archive des certificats re-générés depuis le registre officiel.`,
        attachments: [zipAttachment],
      });

      addEmailDeliveryLog({
        recipientEmail: managerEmail,
        subject: `Registry certificates resend (${selectedEntries.length})`,
        provider,
        status: 'success',
        attachmentCount: 1,
        attachmentNames: [zipAttachment.fileName],
        scopeLabel: 'Certificate Registry',
      });

      addCertificateRegistryEntries(selectedEntries.map((entry) => ({
        reference: entry.reference,
        studentId: entry.studentId,
        studentName: entry.studentName,
        classId: entry.classId,
        trimesterFilter: entry.trimesterFilter,
        classFilter: entry.classFilter,
        scopeLabel: entry.scopeLabel,
        averageScore: entry.averageScore,
        evaluationsCount: entry.evaluationsCount,
        fileName: zipAttachment.fileName,
        action: 'email',
      })));

      toast.success(isRTL ? `تمت إعادة الإرسال عبر ${provider}` : `Ré-envoi effectué via ${provider}`);
    } catch (error) {
      addEmailDeliveryLog({
        recipientEmail: managerEmail,
        subject: `Registry certificates resend (${selectedEntries.length})`,
        provider: import.meta.env.VITE_SMTP_API_ENDPOINT ? 'smtp' : 'emailjs',
        status: 'failed',
        attachmentCount: 1,
        attachmentNames: [zipAttachment.fileName],
        scopeLabel: 'Certificate Registry',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      toast.error(isRTL ? 'فشل إعادة إرسال الشهادات.' : 'Échec du ré-envoi des certificats.');
    }
  };

  return (
    <div className={`space-y-8 ${isRTL ? 'text-right font-arabic' : ''}`}>
      <section className="relative overflow-hidden rounded-[2.5rem] bg-[#1a237e] p-8 text-white shadow-2xl shadow-primary/30">
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 p-3 rounded-2xl backdrop-blur-md">
            <FileStack className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Certificate Serial Registry</p>
            <h2 className="text-3xl font-black tracking-tight">{isRTL ? 'سجل مراجع الشهادات' : 'Registre des certificats'}</h2>
          </div>
        </div>
      </section>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-2 xl:col-span-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'بحث' : 'Recherche'}</Label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200 pl-11" placeholder={isRTL ? 'ابحث بالمراجع أو التلميذ أو القسم' : 'Rechercher par référence, élève ou classe'} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'نوع العملية' : 'Type d’action'}</Label>
              <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold">
                <option value={FILTER_ALL}>{isRTL ? 'الكل' : 'Toutes'}</option>
                <option value="preview">Preview</option>
                <option value="download">Download</option>
                <option value="email">Email</option>
                <option value="zip_export">ZIP</option>
                <option value="bulk_download">Bulk</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'من تاريخ' : 'Date début'}</Label>
              <Input type="date" value={startDateFilter} onChange={(event) => setStartDateFilter(event.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'إلى تاريخ' : 'Date fin'}</Label>
              <Input type="date" value={endDateFilter} onChange={(event) => setEndDateFilter(event.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200" />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input ref={filteredSelectAllRef} type="checkbox" checked={areAllFilteredEntriesSelected} onChange={toggleFilteredSelection} className="h-4 w-4 rounded border-slate-300" />
                {isRTL ? 'تحديد كل السجلات المفلترة' : 'Sélectionner tous les certificats filtrés'}
              </label>
              <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[10px] font-black">
                {selectedFilteredEntryIds.length} / {filteredEntries.length} {isRTL ? 'محدد' : 'sélectionné(s)'}
              </Badge>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="rounded-2xl border-slate-200" onClick={handleExportRegistryXlsx}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> XLSX
              </Button>
              <Button variant="outline" className="rounded-2xl border-slate-200" onClick={handleExportRegistryPdf}>
                <Download className="w-4 h-4 mr-2" /> PDF
              </Button>
              <Button variant="outline" className="rounded-2xl border-slate-200" onClick={() => { void handleBulkResendToManager(); }} disabled={selectedFilteredEntryIds.length === 0}>
                <Mail className="w-4 h-4 mr-2" /> {isRTL ? 'إعادة إرسال المحدد' : 'Ré-envoyer sélection'}
              </Button>
              <Button variant="ghost" className="rounded-2xl" onClick={clearSelection} disabled={selectedFilteredEntryIds.length === 0}>
                <X className="w-4 h-4 mr-2" /> {isRTL ? 'مسح' : 'Effacer'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="p-8 pb-0">
          <CardTitle className="text-lg font-black text-slate-900">{isRTL ? 'السجل الرسمي' : 'Registre officiel'}</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-6 space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="rounded-[2rem] border-2 border-dashed border-slate-100 p-8 text-center bg-slate-50/50">
              <p className="text-sm font-bold text-slate-500">{isRTL ? 'لا يوجد أي سجل مطابق.' : 'Aucune entrée correspondante.'}</p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = selectedEntryIds.includes(entry.id);
              return (
                <div key={entry.id} className={`rounded-[1.5rem] border p-4 flex items-start justify-between gap-4 flex-wrap ${isSelected ? 'border-primary/30 bg-primary/5' : 'border-slate-100 bg-slate-50/70'}`}>
                  <div className="flex items-start gap-4">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleEntrySelection(entry.id)} className="mt-1 h-4 w-4 rounded border-slate-300" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-slate-900">{entry.studentName}</p>
                        <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[9px] font-black">{entry.classId}</Badge>
                        <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[9px] font-black">{entry.action}</Badge>
                        <Badge className={entry.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}>
                          {entry.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-primary mt-2">{entry.reference}</p>
                      <p className="text-xs text-slate-500 mt-1">{entry.scopeLabel}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(entry.createdAt).toLocaleString(isRTL ? 'ar-MA' : 'fr-FR')}</p>
                      {entry.revokedAt && <p className="text-xs text-rose-500 mt-1">{isRTL ? 'أُلغي في' : 'Révoqué le'} {new Date(entry.revokedAt).toLocaleString(isRTL ? 'ar-MA' : 'fr-FR')}</p>}
                      {entry.revokedReason && <p className="text-xs text-rose-500">{entry.revokedReason}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        const attachment = buildEntryAttachment(entry);
                        openPreview(attachment.blob, attachment.fileName);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" /> {isRTL ? 'معاينة' : 'Prévisualiser'}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        const attachment = buildEntryAttachment(entry);
                        downloadBlob(attachment.blob, attachment.fileName);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" /> PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50"
                      onClick={() => revokeCertificateRegistryEntry(entry.id, isRTL ? 'مرجع ملغى يدوياً' : 'Référence invalidée manuellement')}
                      disabled={entry.status === 'revoked'}
                    >
                      <X className="w-4 h-4 mr-2" /> {isRTL ? 'إلغاء المرجع' : 'Révoquer'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewFileUrl} onOpenChange={(open) => {
        if (!open && previewFileUrl) {
          URL.revokeObjectURL(previewFileUrl);
          setPreviewFileUrl(null);
          setPreviewTitle('');
        }
      }}>
        <DialogContent className="max-w-5xl rounded-[2.5rem] p-8 border-none shadow-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">{previewTitle || (isRTL ? 'معاينة الشهادة' : 'Prévisualisation du certificat')}</DialogTitle>
          </DialogHeader>
          {previewFileUrl && <iframe title={previewTitle} src={previewFileUrl} className="w-full h-[75vh] rounded-2xl border border-slate-200 bg-slate-50" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CertificateRegistryPage;

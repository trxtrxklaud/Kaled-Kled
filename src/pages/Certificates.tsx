import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Download, Eye, FileBadge, Mail, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { buildCertificatePdfAttachment, buildCertificateReference, buildCertificatesPdfAttachments } from '../lib/pdfReports';
import { buildCertificateZipAttachment } from '../lib/certificateArchive';
import { sendEmailWithAttachments } from '../lib/emailDelivery';
import type { AcademicResult, Student } from '../lib/types';

const FILTER_ALL = 'all';

const sanitizeFileName = (value: string): string => (
  value
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase() || 'certificate'
);

const CertificatesPage: React.FC = () => {
  const { students, academicResults, schoolBranding, addEmailDeliveryLog, addCertificateRegistryEntries } = useData();
  const { isAdmin } = useAuth();
  const { isRTL } = useLanguage();
  const managerEmail = import.meta.env.VITE_MANAGER_EMAIL || '';

  const [selectedClass, setSelectedClass] = useState<string>(FILTER_ALL);
  const [selectedTrimester, setSelectedTrimester] = useState<string>(FILTER_ALL);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const classOptions = useMemo(
    () => [...new Set(students.map((student) => student.class))].sort((left, right) => left.localeCompare(right, 'fr-FR')),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return students.filter((student) => {
      const matchesClass = selectedClass === FILTER_ALL || student.class === selectedClass;
      const matchesQuery = query === '' || student.fullName.toLowerCase().includes(query) || student.class.toLowerCase().includes(query);
      return matchesClass && matchesQuery;
    });
  }, [searchQuery, selectedClass, students]);

  const filteredResults = useMemo(
    () => academicResults.filter((result) => {
      const matchesTrimester = selectedTrimester === FILTER_ALL || String(result.trimester) === selectedTrimester;
      const matchesClass = selectedClass === FILTER_ALL || result.classId === selectedClass;
      const matchesStudent = filteredStudents.some((student) => student.id === result.studentId);
      return matchesTrimester && matchesClass && matchesStudent;
    }),
    [academicResults, filteredStudents, selectedClass, selectedTrimester],
  );

  const studentDirectory = useMemo(
    () => new Map<string, Student>(students.map((student) => [student.id, student])),
    [students],
  );

  const certificateRows = useMemo(() => {
    const groupedResults = new Map<string, AcademicResult[]>();

    for (const result of filteredResults) {
      const current = groupedResults.get(result.studentId) ?? [];
      current.push(result);
      groupedResults.set(result.studentId, current);
    }

    return filteredStudents
      .map((student) => {
        const results = groupedResults.get(student.id) ?? [];
        const totalWeight = results.reduce((sum, result) => sum + (result.coefficient ?? 1), 0);
        const average = totalWeight > 0
          ? results.reduce((sum, result) => sum + result.score * (result.coefficient ?? 1), 0) / totalWeight
          : 0;

        return {
          student,
          results,
          average: Number(average.toFixed(2)),
          evaluations: results.length,
        };
      })
      .filter((row) => row.results.length > 0)
      .sort((left, right) => right.average - left.average);
  }, [filteredResults, filteredStudents]);

  const scopeLabel = `${selectedClass === FILTER_ALL ? 'Toutes les classes' : selectedClass} • ${selectedTrimester === FILTER_ALL ? 'Tous les trimestres' : `Trimestre ${selectedTrimester}`}`;
  const generatedAt = new Date().toLocaleString('fr-FR');

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

  const openPreview = (blob: Blob, title: string): void => {
    if (previewFileUrl) {
      URL.revokeObjectURL(previewFileUrl);
    }
    setPreviewFileUrl(URL.createObjectURL(blob));
    setPreviewTitle(title);
  };

  const registerCertificateAction = (
    student: Student,
    results: AcademicResult[],
    fileName: string,
    action: 'preview' | 'download' | 'email' | 'zip_export' | 'bulk_download',
  ): void => {
    const totalWeight = results.reduce((sum, result) => sum + (result.coefficient ?? 1), 0);
    const average = totalWeight > 0
      ? results.reduce((sum, result) => sum + result.score * (result.coefficient ?? 1), 0) / totalWeight
      : 0;

    addCertificateRegistryEntries([
      {
        reference: buildCertificateReference(student, generatedAt),
        studentId: student.id,
        studentName: student.fullName,
        classId: student.class,
        trimesterFilter: selectedTrimester,
        classFilter: selectedClass,
        scopeLabel,
        averageScore: Number(average.toFixed(2)),
        evaluationsCount: results.length,
        fileName,
        action,
      },
    ]);
  };

  const handleDownloadCertificate = (student: Student, results: AcademicResult[]): void => {
    const attachment = buildCertificatePdfAttachment({
      student,
      results,
      scopeLabel,
      generatedAt,
      branding: schoolBranding,
    });
    downloadBlob(attachment.blob, attachment.fileName);
    registerCertificateAction(student, results, attachment.fileName, 'download');
    toast.success(isRTL ? 'تم تحميل شهادة PDF' : 'Certificat PDF téléchargé');
  };

  const handleDownloadAllCertificates = (): void => {
    if (certificateRows.length === 0) {
      toast.error(isRTL ? 'لا توجد شهادات في هذا النطاق' : 'Aucun certificat à générer dans ce périmètre');
      return;
    }

    const attachments = buildCertificatesPdfAttachments({
      results: certificateRows.flatMap((row) => row.results),
      studentDirectory,
      scopeLabel,
      generatedAt,
      branding: schoolBranding,
    });

    attachments.forEach((attachment, index) => {
      setTimeout(() => {
        downloadBlob(attachment.blob, attachment.fileName);
      }, index * 150);
    });

    addCertificateRegistryEntries(certificateRows.map((row, index) => ({
      reference: buildCertificateReference(row.student, generatedAt),
      studentId: row.student.id,
      studentName: row.student.fullName,
      classId: row.student.class,
      trimesterFilter: selectedTrimester,
      classFilter: selectedClass,
      scopeLabel,
      averageScore: row.average,
      evaluationsCount: row.evaluations,
      fileName: attachments[index]?.fileName || `certificat_${sanitizeFileName(row.student.fullName)}.pdf`,
      action: 'bulk_download',
    })));

    toast.success(isRTL ? 'تم إنشاء شهادة PDF لكل تلميذ' : 'Un certificat PDF a été généré pour chaque élève');
  };

  const handleDownloadCertificatesZip = async (): Promise<void> => {
    if (certificateRows.length === 0) {
      toast.error(isRTL ? 'لا توجد شهادات للضغط' : 'Aucun certificat à compresser');
      return;
    }

    const attachments = buildCertificatesPdfAttachments({
      results: certificateRows.flatMap((row) => row.results),
      studentDirectory,
      scopeLabel,
      generatedAt,
      branding: schoolBranding,
    });
    const zipAttachment = await buildCertificateZipAttachment(attachments, `certificats_${sanitizeFileName(scopeLabel)}.zip`);
    downloadBlob(zipAttachment.blob, zipAttachment.fileName);
    addCertificateRegistryEntries(certificateRows.map((row) => ({
      reference: buildCertificateReference(row.student, generatedAt),
      studentId: row.student.id,
      studentName: row.student.fullName,
      classId: row.student.class,
      trimesterFilter: selectedTrimester,
      classFilter: selectedClass,
      scopeLabel,
      averageScore: row.average,
      evaluationsCount: row.evaluations,
      fileName: zipAttachment.fileName,
      action: 'zip_export',
    })));
    toast.success(isRTL ? 'تم إنشاء ملف ZIP للشهادات' : 'Archive ZIP des certificats générée');
  };

  const handleEmailCertificatesToManager = async (): Promise<void> => {
    if (certificateRows.length === 0) {
      toast.error(isRTL ? 'لا توجد شهادات للإرسال' : 'Aucun certificat à envoyer');
      return;
    }

    const attachments = buildCertificatesPdfAttachments({
      results: certificateRows.flatMap((row) => row.results),
      studentDirectory,
      scopeLabel,
      generatedAt,
      branding: schoolBranding,
    });
    const zipAttachment = await buildCertificateZipAttachment(attachments, `certificats_${sanitizeFileName(scopeLabel)}.zip`);

    try {
      const provider = await sendEmailWithAttachments({
        recipientEmail: managerEmail,
        subject: `Certificates - ${scopeLabel}`,
        message: `Veuillez trouver ci-joint l'archive ZIP contenant les certificats PDF générés pour ${scopeLabel}.`,
        attachments: [zipAttachment],
      });
      addEmailDeliveryLog({
        recipientEmail: managerEmail,
        subject: `Certificates - ${scopeLabel}`,
        provider,
        status: 'success',
        attachmentCount: 1,
        attachmentNames: [zipAttachment.fileName],
        scopeLabel,
      });
      addCertificateRegistryEntries(certificateRows.map((row) => ({
        reference: buildCertificateReference(row.student, generatedAt),
        studentId: row.student.id,
        studentName: row.student.fullName,
        classId: row.student.class,
        trimesterFilter: selectedTrimester,
        classFilter: selectedClass,
        scopeLabel,
        averageScore: row.average,
        evaluationsCount: row.evaluations,
        fileName: zipAttachment.fileName,
        action: 'email',
      })));
      toast.success(isRTL ? `تم إرسال الشهادات عبر ${provider}` : `Certificats envoyés via ${provider}`);
    } catch (error) {
      addEmailDeliveryLog({
        recipientEmail: managerEmail,
        subject: `Certificates - ${scopeLabel}`,
        provider: import.meta.env.VITE_SMTP_API_ENDPOINT ? 'smtp' : 'emailjs',
        status: 'failed',
        attachmentCount: 1,
        attachmentNames: [zipAttachment.fileName],
        scopeLabel,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      toast.error(isRTL ? 'فشل إرسال الشهادات. تحقق من إعدادات الإرسال.' : 'Échec de l’envoi des certificats. Vérifiez la configuration.');
    }
  };

  return (
    <div className={`space-y-8 ${isRTL ? 'text-right font-arabic' : ''}`}>
      <section className="relative overflow-hidden rounded-[2.5rem] bg-[#1a237e] p-8 text-white shadow-2xl shadow-primary/30">
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-3 rounded-2xl backdrop-blur-md">
              <FileBadge className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Official Certificates Center</p>
              <h2 className="text-3xl font-black tracking-tight">{isRTL ? 'الشهادات' : 'Certificats'}</h2>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={handleDownloadAllCertificates}>
              <Download className="w-4 h-4 mr-2" /> {isRTL ? 'تنزيل الكل PDF' : 'Télécharger tout en PDF'}
            </Button>
            <Button variant="outline" className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => { void handleDownloadCertificatesZip(); }}>
              <Download className="w-4 h-4 mr-2" /> {isRTL ? 'تنزيل ZIP' : 'Télécharger ZIP'}
            </Button>
            <Button variant="outline" className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => { void handleEmailCertificatesToManager(); }} disabled={!isAdmin}>
              <Mail className="w-4 h-4 mr-2" /> {isRTL ? 'إرسال للمدير' : 'Envoyer au manager'}
            </Button>
          </div>
        </div>
      </section>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'القسم' : 'Classe'}</Label>
            <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold">
              <option value={FILTER_ALL}>{isRTL ? 'كل الأقسام' : 'Toutes les classes'}</option>
              {classOptions.map((classId) => <option key={classId} value={classId}>{classId}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'الفصل' : 'Trimestre'}</Label>
            <select value={selectedTrimester} onChange={(event) => setSelectedTrimester(event.target.value)} className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold">
              <option value={FILTER_ALL}>{isRTL ? 'كل الفصول' : 'Tous les trimestres'}</option>
              <option value="1">{isRTL ? 'الفصل 1' : 'Trimestre 1'}</option>
              <option value="2">{isRTL ? 'الفصل 2' : 'Trimestre 2'}</option>
              <option value="3">{isRTL ? 'الفصل 3' : 'Trimestre 3'}</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'بحث' : 'Recherche'}</Label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200 pl-11" placeholder={isRTL ? 'ابحث عن تلميذ أو قسم' : 'Rechercher un élève ou une classe'} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-blue-50 border border-blue-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{isRTL ? 'تلاميذ الشهادات' : 'Élèves certifiés'}</p>
              <p className="text-3xl font-black text-blue-900 mt-3">{certificateRows.length}</p>
            </div>
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </Card>
        <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-emerald-50 border border-emerald-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">{isRTL ? 'التقييمات المشمولة' : 'Évaluations incluses'}</p>
              <p className="text-3xl font-black text-emerald-900 mt-3">{filteredResults.length}</p>
            </div>
            <FileBadge className="w-6 h-6 text-emerald-600" />
          </div>
        </Card>
        <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-amber-50 border border-amber-100 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">{isRTL ? 'النطاق' : 'Périmètre'}</p>
              <p className="text-sm font-black text-amber-900 mt-3">{scopeLabel}</p>
            </div>
            <Users className="w-6 h-6 text-amber-600" />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {certificateRows.length === 0 ? (
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
            <CardContent className="p-10 text-center">
              <p className="text-sm font-bold text-slate-500">{isRTL ? 'لا توجد شهادات متاحة لهذا النطاق.' : 'Aucun certificat disponible dans ce périmètre.'}</p>
            </CardContent>
          </Card>
        ) : (
          certificateRows.map((row) => {
            const reference = buildCertificateReference(row.student, generatedAt);
            return (
              <Card key={row.student.id} className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-white overflow-hidden">
                <CardHeader className="p-6 pb-0">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-lg font-black text-slate-900">{row.student.fullName}</CardTitle>
                      <p className="text-sm font-bold text-slate-500 mt-2">{row.student.class} • {row.evaluations} {isRTL ? 'تقييماً' : 'évaluations'} • {row.average.toFixed(2)}/20</p>
                      <p className="text-[11px] font-black text-primary mt-2">{isRTL ? 'المرجع' : 'Référence'}: {reference}</p>
                    </div>
                    <Badge className="rounded-full bg-primary/10 text-primary border-primary/20 px-3 py-1">{row.student.class}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex justify-end gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => {
                      const attachment = buildCertificatePdfAttachment({
                        student: row.student,
                        results: row.results,
                        scopeLabel,
                        generatedAt,
                        branding: schoolBranding,
                      });
                      openPreview(attachment.blob, attachment.fileName);
                      registerCertificateAction(row.student, row.results, attachment.fileName, 'preview');
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" /> {isRTL ? 'معاينة' : 'Prévisualiser'}
                  </Button>
                  <Button variant="outline" className="rounded-2xl" onClick={() => handleDownloadCertificate(row.student, row.results)}>
                    <Download className="w-4 h-4 mr-2" /> {isRTL ? 'PDF فردي' : 'PDF individuel'}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={async () => {
                      try {
                        const attachment = buildCertificatePdfAttachment({ student: row.student, results: row.results, scopeLabel, generatedAt, branding: schoolBranding });
                        const provider = await sendEmailWithAttachments({
                          recipientEmail: managerEmail,
                          subject: `Certificate - ${row.student.fullName}`,
                          message: `Veuillez trouver le certificat de ${row.student.fullName}.`,
                          attachments: [attachment],
                        });
                        addEmailDeliveryLog({
                          recipientEmail: managerEmail,
                          subject: `Certificate - ${row.student.fullName}`,
                          provider,
                          status: 'success',
                          attachmentCount: 1,
                          attachmentNames: [attachment.fileName],
                          scopeLabel,
                        });
                        registerCertificateAction(row.student, row.results, attachment.fileName, 'email');
                        toast.success(isRTL ? `تم إرسال الشهادة عبر ${provider}` : `Certificat envoyé via ${provider}`);
                      } catch (error) {
                        addEmailDeliveryLog({
                          recipientEmail: managerEmail,
                          subject: `Certificate - ${row.student.fullName}`,
                          provider: import.meta.env.VITE_SMTP_API_ENDPOINT ? 'smtp' : 'emailjs',
                          status: 'failed',
                          attachmentCount: 1,
                          attachmentNames: [`certificat_${sanitizeFileName(row.student.fullName)}.pdf`],
                          scopeLabel,
                          errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        });
                        toast.error(isRTL ? 'فشل إرسال الشهادة.' : 'Échec de l’envoi du certificat.');
                      }
                    }}
                    disabled={!isAdmin}
                  >
                    <Mail className="w-4 h-4 mr-2" /> {isRTL ? 'إرسال للمدير' : 'Envoyer au manager'}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

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
          {previewFileUrl && (
            <iframe title={previewTitle} src={previewFileUrl} className="w-full h-[75vh] rounded-2xl border border-slate-200 bg-slate-50" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CertificatesPage;

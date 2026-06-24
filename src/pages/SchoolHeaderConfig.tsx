import React from 'react';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ImageUp, Stamp, School, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const SchoolHeaderConfig: React.FC = () => {
  const { schoolBranding, updateSchoolBranding } = useData();
  const { isRTL } = useLanguage();

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'logoDataUrl' | 'stampDataUrl',
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      if (file.type.startsWith('image/')) {
        const { compressImageFile } = await import('../lib/imageCompressor');
        const dataUrl = await compressImageFile(file);
        updateSchoolBranding({ [field]: dataUrl });
      } else {
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onload = () => {
            updateSchoolBranding({ [field]: String(reader.result) });
            resolve();
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      }
      toast.success(isRTL ? 'تم تحديث الملف البصري' : 'Fichier graphique mis à jour');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du traitement du fichier');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className={`space-y-8 ${isRTL ? 'text-right font-arabic' : ''}`}>
      <section className="relative overflow-hidden rounded-[2.5rem] bg-[#1a237e] p-8 text-white shadow-2xl shadow-primary/30">
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 p-3 rounded-2xl backdrop-blur-md">
            <School className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">School Header Configuration</p>
            <h2 className="text-3xl font-black tracking-tight">{isRTL ? 'إعداد هوية المؤسسة' : 'Configuration entête école'}</h2>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-lg font-black text-slate-900">{isRTL ? 'بيانات الهوية الرسمية' : 'Identité officielle'}</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nom école FR</Label>
              <Input
                value={schoolBranding.schoolNameFr}
                onChange={(event) => updateSchoolBranding({ schoolNameFr: event.target.value })}
                className="h-12 rounded-2xl bg-slate-50 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'اسم المؤسسة بالعربية' : 'Nom école AR'}</Label>
              <Input
                value={schoolBranding.schoolNameAr}
                onChange={(event) => updateSchoolBranding({ schoolNameAr: event.target.value })}
                className="h-12 rounded-2xl bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'شعار المؤسسة' : 'Logo officiel'}</Label>
              <label className="h-12 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 cursor-pointer text-sm font-bold text-slate-600">
                <ImageUp className="w-4 h-4" /> {isRTL ? 'رفع الشعار' : 'Uploader logo'}
                <input type="file" accept="image/*" className="hidden" onChange={(event) => { void handleFileUpload(event, 'logoDataUrl'); }} />
              </label>
              {schoolBranding.logoDataUrl && (
                <Button
                  variant="ghost"
                  className="rounded-xl text-rose-600 hover:bg-rose-50"
                  onClick={() => updateSchoolBranding({ logoDataUrl: undefined })}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> {isRTL ? 'حذف الشعار' : 'Supprimer logo'}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'الختم الرسمي' : 'Tampon officiel'}</Label>
              <label className="h-12 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 cursor-pointer text-sm font-bold text-slate-600">
                <Stamp className="w-4 h-4" /> {isRTL ? 'رفع الختم' : 'Uploader tampon'}
                <input type="file" accept="image/*" className="hidden" onChange={(event) => { void handleFileUpload(event, 'stampDataUrl'); }} />
              </label>
              {schoolBranding.stampDataUrl && (
                <Button
                  variant="ghost"
                  className="rounded-xl text-rose-600 hover:bg-rose-50"
                  onClick={() => updateSchoolBranding({ stampDataUrl: undefined })}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> {isRTL ? 'حذف الختم' : 'Supprimer tampon'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-lg font-black text-slate-900">{isRTL ? 'معاينة الهوية' : 'Aperçu branding'}</CardTitle>
              <Badge className="rounded-full bg-slate-50 text-slate-600 border-slate-200">
                {new Date(schoolBranding.updatedAt).toLocaleString(isRTL ? 'ar-MA' : 'fr-FR')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-6 space-y-5">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-black text-slate-900">{schoolBranding.schoolNameFr}</p>
                  <p className="text-lg font-bold text-slate-600 mt-2">{schoolBranding.schoolNameAr}</p>
                </div>
                {schoolBranding.logoDataUrl ? (
                  <img src={schoolBranding.logoDataUrl} alt="logo" className="w-20 h-20 object-contain rounded-2xl border border-slate-200 bg-white p-2" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl border border-dashed border-slate-200 bg-white flex items-center justify-center text-slate-300 text-xs font-black uppercase">
                    Logo
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">{isRTL ? 'منطقة الختم' : 'Zone tampon'}</p>
                <p className="text-sm font-bold text-slate-600 mt-2">{isRTL ? 'يستعمل هذا الختم داخل الشهادات الرسمية' : 'Ce tampon sera injecté dans les certificats officiels'}</p>
              </div>
              {schoolBranding.stampDataUrl ? (
                <img src={schoolBranding.stampDataUrl} alt="stamp" className="w-24 h-24 object-contain rounded-full border border-slate-200 bg-white p-2" />
              ) : (
                <div className="w-24 h-24 rounded-full border border-dashed border-slate-200 bg-white flex items-center justify-center text-slate-300 text-xs font-black uppercase">
                  Stamp
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SchoolHeaderConfig;

import React, { useRef, useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Database, Download, Upload, AlertTriangle, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { idbGetAll, idbSetAll } from '../lib/idb';
import { auth, db, SCHOOL_ID } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const Settings: React.FC = () => {
  const { isRTL } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setCloudItemsCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkCloudStatus = async () => {
      setCloudStatus('checking');
      if (!auth.currentUser) {
        setCloudStatus('disconnected');
        return;
      }

      try {
        // Vérifier si Firestore est accessible en essayant de lire un document bidon
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        setCloudStatus(userDoc ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('Cloud connection error:', error);
        setCloudStatus('disconnected');
      }
    };

    void checkCloudStatus();
  }, []);

  const handleCloudRestore = async () => {
    if (cloudStatus !== 'connected') {
      toast.error(isRTL ? 'الرجاء التأكد من تسجيل الدخول للاتصال السحابي' : 'Veuillez vous assurer que vous êtes connecté pour le cloud');
      return;
    }

    setIsSyncing(true);
    try {
      const snap = await getDocs(collection(db, 'schools', SCHOOL_ID, 'collections'));
      if (snap.empty) {
        toast.error(isRTL ? 'لا توجد بيانات سحابية' : 'Aucune donnée cloud trouvée');
        setIsSyncing(false);
        return;
      }

      const restoredKeys = [];
      for (const d of snap.docs) {
        const item = d.data();
        if (item && 'value' in item) {
          const json = JSON.stringify(item.value);
          localStorage.setItem(d.id, json);
          try {
            await idbSetAll({ [d.id]: item.value });
          } catch {
             // Pass
          }
          restoredKeys.push(d.id);
        }
      }
      toast.success(isRTL ? `تم استرجاع ${restoredKeys.length} جداول بنجاح. جاري إعادة التحميل...` : `${restoredKeys.length} collections restaurées. Rechargement...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      console.error(e);
      toast.error(isRTL ? 'فشل استرجاع السحابة' : 'La restauration cloud a échoué');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      // Get all from IDB
      const idbData = await idbGetAll();

      // Also grab localStorage just in case parts are not in IDB
      const localData: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('providence_')) {
          try {
            localData[key] = JSON.parse(localStorage.getItem(key) || '');
          } catch {
            localData[key] = localStorage.getItem(key);
          }
        }
      }

      const combinedData = { ...localData, ...idbData };
      const blob = new Blob([JSON.stringify(combinedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `sauvegarde_providence_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(isRTL ? 'تم حفظ النسخة الاحتياطية بنجاح' : 'Sauvegarde téléchargée avec succès');
    } catch (err) {
      console.error(err);
      toast.error(isRTL ? 'حدث خطأ أثناء تحميل النسخة الاحتياطية' : 'Erreur lors du téléchargement de la sauvegarde');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        // Save to LocalStorage
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
          } else {
            localStorage.setItem(key, String(value));
          }
        }

        // Save to IndexedDB
        await idbSetAll(data);

        toast.success(isRTL ? 'تم استرجاع البيانات بنجاح، جاري إعادة تحميل التطبيق...' : 'Données restaurées avec succès, rechargement en cours...');

        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } catch (err) {
        console.error(err);
        toast.error(isRTL ? 'ملف غير صالح أو حدث خطأ أثناء الاسترجاع' : 'Fichier invalide ou erreur lors de la restauration');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-6 max-w-4xl mx-auto ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 text-primary rounded-2xl">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {isRTL ? 'إعدادات قاعدة البيانات' : 'Paramètres de la base de données'}
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            {isRTL
              ? 'إدارة النسخ الاحتياطية لحماية بياناتك من الضياع.'
              : 'Gérer les sauvegardes pour protéger vos données contre la perte.'}
          </p>
        </div>
      </div>

      <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 border border-slate-100 p-5 rounded-2xl mb-8 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${cloudStatus === 'connected' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {cloudStatus === 'connected' ? <Cloud className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-800">
                  {isRTL ? 'الربط السحابي Firebase' : 'Synchronisation Cloud Firebase'}
                </h3>
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1">
                  {cloudStatus === 'checking' && (isRTL ? 'جاري التحقق...' : 'Vérification...')}
                  {cloudStatus === 'connected' && (isRTL ? `متصل • تم الاسترجاع: ${cloudItemsCount} مجموعة` : `Connecté • ${cloudItemsCount} collections`)}
                  {cloudStatus === 'disconnected' && (isRTL ? 'غير متصل (البيانات تحفظ محليا فقط)' : 'Déconnecté (Sauvegarde locale uniquement)')}
                </p>
              </div>
            </div>
            {cloudStatus === 'connected' && (
              <Button onClick={handleCloudRestore} disabled={isSyncing} className="rounded-xl shadow-sm gap-2 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white">
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isRTL ? 'استرجاع التغييرات السحابية' : 'Restaurer du Cloud'}
              </Button>
            )}
          </div>

          <div className="flex bg-blue-50 text-blue-800 p-4 rounded-2xl mb-8 items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
            <p className="text-sm font-semibold">
              {isRTL
                ? 'يتم حفظ جميع بياناتك محلياً بشكل آمن داخل متصفحك. لتحرير مساحة أو نقل البيانات إلى جهاز آخر، استخدم أدوات النسخ الاحتياطي أدناه.'
                : 'Toutes vos données sont enregistrées localement et en toute sécurité dans votre navigateur. Pour libérer de l\'espace ou transférer des données vers un autre appareil, utilisez les outils de sauvegarde ci-dessous.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-100 bg-slate-50 rounded-2xl p-6 text-center space-y-4 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
                <Download className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">
                {isRTL ? 'تحميل نسخة احتياطية' : 'Télécharger une sauvegarde'}
              </h3>
              <p className="text-sm font-semibold text-slate-500">
                {isRTL ? 'قم بتصدير جميع بياناتك في ملف واحد آمن.' : 'Exportez toutes vos données dans un seul fichier sécurisé.'}
              </p>
              <Button onClick={handleExport} className="w-full rounded-xl bg-primary text-white hover:bg-primary/90 shadow-sm">
                <Download className="w-4 h-4 mr-2" />
                {isRTL ? 'تصدير' : 'Exporter'}
              </Button>
            </div>

            <div className="border border-slate-100 bg-slate-50 rounded-2xl p-6 text-center space-y-4 shadow-sm relative overflow-hidden group hover:border-emerald-500/20 transition-all">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">
                {isRTL ? 'استرجاع نسخة احتياطية' : 'Restaurer une sauvegarde'}
              </h3>
              <p className="text-sm font-semibold text-slate-500">
                {isRTL ? 'قم باستيراد ملف نسخة احتياطية سابقة لاستعادة البيانات.' : 'Importez un fichier de sauvegarde précédent pour récupérer les données.'}
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 shadow-sm transition-colors">
                <Upload className="w-4 h-4 mr-2" />
                {isRTL ? 'استيراد' : 'Importer'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;

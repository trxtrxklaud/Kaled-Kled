import * as XLSX from '../../lib/xlsx';
import { toast } from 'sonner';
import { SUBJECTS_KEYS, getSubjectName } from './utils';

export const handleImportFile = async (
  e: React.ChangeEvent<HTMLInputElement>,
  selectedClass: string,
  selectedTrimester: number,
  isRTL: boolean,
  importAcademicResults: (data: any[]) => void
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv') && !fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
    toast.error('Format de fichier non supporté. Veuillez utiliser un fichier XLSX, XLS, CSV, HTML ou HTM.');
    e.target.value = '';
    return;
  }

  try {
    toast.info(isRTL ? 'جاري الاستيراد...' : 'Importation en cours...');

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data && data.length > 0) {
      const allResultsToImport: Record<string, string | number>[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.forEach((rawRow: any) => {
        const row: Record<string, string | number> = {};
        Object.keys(rawRow).forEach(k => {
          row[k.trim()] = rawRow[k];
        });

        const importRow: Record<string, string | number> = {
          'القسم': selectedClass, // force current class if not provided
          'trimester': selectedTrimester,
          ...row
        };

        // Try to map French/Arabic headers back to SUBJECTS_KEYS
        SUBJECTS_KEYS.forEach(key => {
          const arName = getSubjectName(key, true).trim();
          const frName = getSubjectName(key, false).trim();

          const rowKeys = Object.keys(row);
          const matchedKey = rowKeys.find(k => {
            const kNorm = k.toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[\u0621-\u0626]/g, "ا").replace(/ال/g, "");
            const arNorm = arName.toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[\u0621-\u0626]/g, "ا").replace(/ال/g, "");
            const frNorm = frName.toLowerCase().replace(/[\u0300-\u036f]/g, "");
            return kNorm === arNorm || kNorm === frNorm || kNorm.includes(arNorm) || arNorm.includes(kNorm) || kNorm.includes(frNorm) || frNorm.includes(kNorm);
          });

          if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
            importRow[key] = row[matchedKey];
            if (matchedKey !== key) {
              delete importRow[matchedKey];
            }
          }
        });

        allResultsToImport.push(importRow);
      });

      importAcademicResults(allResultsToImport);
    } else {
      toast.warning(isRTL ? 'الملف فارغ' : 'Le fichier est vide');
    }

  } catch (error) {
    console.error('Import error:', error);
    toast.error(isRTL ? 'حدث خطأ أثناء قراءة الملف' : 'Erreur lors de la lecture du fichier');
  }

  // Reset file input
  e.target.value = '';
};

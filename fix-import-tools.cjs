const fs = require('fs');
let content = fs.readFileSync('src/components/Results/ImportTools.ts', 'utf8');

const replacement = `export const handleImportFile = async (
  e: React.ChangeEvent<HTMLInputElement>,
  selectedClass: string,
  selectedTrimester: number,
  isRTL: boolean,
  importAcademicResults: (data: any[]) => void
) => {
  try {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv') && !fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
      toast.error('Format de fichier non supporté. Veuillez utiliser un fichier XLSX, XLS, CSV, HTML ou HTM.');
      if (e.target) e.target.value = '';
      return;
    }

    toast.info(isRTL ? 'جاري الاستيراد...' : 'Importation en cours...');
    
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data && data.length > 0) {
      const allResultsToImport: Record<string, string | number>[] = [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.forEach((rawRow: any, index: number) => {
        try {
          if (!rawRow || typeof rawRow !== 'object' || Object.keys(rawRow).length === 0) return;

          const row: Record<string, string | number> = {};
          Object.keys(rawRow).forEach(k => {
            row[k.trim()] = rawRow[k];
          });
          
          const importRow: Record<string, string | number> = {
            'القسم': selectedClass || 'قسم غير محدد', 
            'trimester': selectedTrimester,
            ...row
          };
          
          SUBJECTS_KEYS.forEach(key => {
            const arName = getSubjectName(key, true).trim();
            const frName = getSubjectName(key, false).trim();
            
            const rowKeys = Object.keys(row);
            const matchedKey = rowKeys.find(k => {
              const kNorm = k.toLowerCase().replace(/[\\u0300-\\u036f]/g, "").replace(/[\\u0621-\\u0626]/g, "ا").replace(/ال/g, "");
              const arNorm = arName.toLowerCase().replace(/[\\u0300-\\u036f]/g, "").replace(/[\\u0621-\\u0626]/g, "ا").replace(/ال/g, "");
              const frNorm = frName.toLowerCase().replace(/[\\u0300-\\u036f]/g, "");
              return kNorm === arNorm || kNorm === frNorm || kNorm.includes(arNorm) || arNorm.includes(kNorm) || kNorm.includes(frNorm) || frNorm.includes(kNorm) || kNorm.includes('moy') || kNorm.includes('result') || kNorm.includes('معدل') || kNorm.includes('نتيجة');
            });

            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
              importRow[key] = row[matchedKey];
              if (matchedKey !== key) {
                delete importRow[matchedKey];
              }
            } else {
              // Create default value if not found
              importRow[key] = 0;
            }
          });

          allResultsToImport.push(importRow);
        } catch (rowErr) {
          console.error("Error processing row", index, rowErr);
        }
      });
      
      importAcademicResults(allResultsToImport);
    } else {
      toast.warning(isRTL ? 'الملف فارغ' : 'Le fichier est vide');
    }
  } catch (error) {
    console.error('Import error:', error);
    toast.error(isRTL ? 'حدث خطأ أثناء قراءة الملف. الرجاء التأكد من صحة الملف' : 'Erreur lors de la lecture du fichier');
  } finally {
    if (e.target) e.target.value = '';
  }
};`;

content = content.replace(/export const handleImportFile = async \([\s\S]*?\n\s*if \(e\.target\) e\.target\.value = '';\n\};/m, replacement);
fs.writeFileSync('src/components/Results/ImportTools.ts', content);
console.log("ImportTools updated");

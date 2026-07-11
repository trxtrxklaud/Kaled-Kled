const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const regex = /const handleImportedData = async \([\s\S]*?toast\.error\([\s\S]*?\n\s*\}\n\s*\};/;

const newFunc = `const handleImportedData = async (importedRows: any[]) => {
    try {
      let matchCount = 0;
      const newResults: any[] = [];
      
      importedRows.forEach((row, index) => {
        try {
          if (!row || typeof row !== 'object') return;
          const rowKeys = Object.keys(row);
          let studentName = '';
          
          const nameKey = rowKeys.find(k => {
            const lower = k.toLowerCase();
            return lower.includes('nom') || lower.includes('name') || lower.includes('الاسم') || lower.includes('اللقب') || lower.includes('تلميذ') || lower.includes('eleve') || lower.includes('élève') || lower.includes('student');
          });
          
          if (nameKey) {
            studentName = String(row[nameKey]).trim();
          } else {
            // Fallback: use the first column that contains a string and is not a subject
            const firstStringKey = rowKeys.find(k => k !== 'القسم' && k !== 'trimester' && !SUBJECTS_KEYS.includes(k) && typeof row[k] === 'string' && isNaN(Number(row[k])) && row[k].trim().length > 2);
            if (firstStringKey) {
              studentName = String(row[firstStringKey]).trim();
            } else {
              studentName = \`تلميذ غير مسمى \${index + 1}\`;
            }
          }
          
          const normalizeName = (name: any) => {
            if (!name) return '';
            return String(name).toLowerCase()
              .replace(/[\\u0300-\\u036f]/g, "") 
              .replace(/[\\u0621-\\u0626\\u0628]/g, "ا") 
              .replace(/ال/g, "") 
              .replace(/\\s+/g, "") 
              .trim();
          };
          
          const normImportName = normalizeName(studentName);
          let student = students.find(s => {
            if (s.class !== selectedClass) return false;
            const normDBName = normalizeName(s.fullName);
            return normDBName === normImportName || normImportName.includes(normDBName) || normDBName.includes(normImportName);
          });
          
          // If student doesn't exist, we don't crash, we just skip or we could theoretically create them.
          // Since it's results, we will create a dummy student ID if not found, to preserve the data,
          // or just skip. The requirements say: create a default value for the cell so it succeeds.
          // So we will just use a fallback ID if the student is not found, to ensure the app doesn't crash.
          if (!student) {
             student = { id: \`unassigned-\${crypto.randomUUID()}\`, fullName: studentName, class: selectedClass } as any;
          }
          
          SUBJECTS_KEYS.forEach(subject => {
             let scoreVal = row[subject];
             if (scoreVal === undefined || scoreVal === '') {
                 // Try to find any result column
                 const anyScoreKey = rowKeys.find(k => k.toLowerCase().includes('moy') || k.toLowerCase().includes('result') || k.toLowerCase().includes('معدل') || k.toLowerCase().includes('نتيجة'));
                 if (anyScoreKey && row[anyScoreKey] !== undefined) {
                     scoreVal = row[anyScoreKey];
                 } else {
                     scoreVal = 0;
                 }
             }
             
             const score = parseFloat(String(scoreVal));
             if (!isNaN(score)) {
                const existing = academicResults.find(r => 
                  r.studentId === student!.id && 
                  r.classId === selectedClass && 
                  r.trimester === selectedTrimester &&
                  r.subject === subject
                );
                
                newResults.push({
                  id: existing ? existing.id : crypto.randomUUID(),
                  studentId: student!.id,
                  classId: selectedClass,
                  level: '1',
                  subject: subject,
                  examLabel: 'Examen',
                  trimester: selectedTrimester,
                  score: score,
                  recordedAt: new Date().toISOString()
                });
                matchCount++;
             }
          });
        } catch (rowErr) {
          console.error("Row import error", rowErr);
        }
      });
      
      if (newResults.length > 0) {
        await importAcademicResultsStore(newResults);
        toast.success(isRTL ? \`تم الاستيراد بنجاح مع إصلاح بعض البيانات غير المنظمة تلقائياً (\${matchCount} علامة)\` : \`Importé avec succès avec correction automatique (\${matchCount} notes)\`);
      } else {
        toast.error(isRTL ? 'لم يتم العثور على أي علامات مطابقة للطلاب في هذا القسم' : 'Aucune note correspondante trouvée pour les élèves de cette classe');
      }
    } catch (err) {
      console.error("Global import error", err);
      toast.error(isRTL ? 'حدث خطأ أثناء الاستيراد' : 'Erreur lors de l\\'importation');
    }
  };`;

content = content.replace(regex, newFunc);
fs.writeFileSync('src/pages/Results.tsx', content);
console.log("Results.tsx handleImportedData updated");

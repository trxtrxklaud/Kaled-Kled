import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { FileUp, Printer, Save, Calculator, ArrowUpCircle, ArrowDownCircle, Trophy } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import * as XLSX from '../lib/xlsx';

const SUBJECTS_KEYS = [
  'arabe', 'francais', 'anglais', 'maths', 'islamique', 
  'scientifique', 'histoire_geo', 'civique', 'sport', 'art'
];

const getSubjectName = (key: string, isRTL: boolean) => {
  const map: Record<string, { fr: string, ar: string }> = {
    'arabe': { fr: 'Arabe', ar: 'اللغة العربية' },
    'francais': { fr: 'Français', ar: 'اللغة الفرنسية' },
    'anglais': { fr: 'Anglais', ar: 'اللغة الإنجليزية' },
    'maths': { fr: 'Mathématiques', ar: 'الرياضيات' },
    'islamique': { fr: 'Éd. Islamique', ar: 'التربية الإسلامية' },
    'scientifique': { fr: 'Éd. Scientifique', ar: 'التربية العلمية' },
    'histoire_geo': { fr: 'Histoire & Géo', ar: 'التاريخ والجغرافيا' },
    'civique': { fr: 'Éd. Civique', ar: 'التربية المدنية' },
    'sport': { fr: 'Sport', ar: 'الرياضة' },
    'art': { fr: 'Dessin & Art', ar: 'الفنون' }
  };
  return isRTL ? map[key].ar : map[key].fr;
};

// Extracted from DataContext or hardcoded
const CLASSES = [
  '1A', '1B', '1C', '1D', '1E',
  '2A', '2B', '2C', '2D', '2E',
  '3A', '3B', '3C', '3D', '3E',
  '4A', '4B', '4C', '4D', '4E',
  '5A', '5B', '5C', '5D', '5E',
  '6A', '6B', '6C', '6D', '6E'
];

const Results: React.FC = () => {
  const { students, academicResults, addAcademicResult, updateAcademicResult, importAcademicResults } = useData();
  const { isRTL } = useLanguage();
  const { isTeacher, assignedClasses } = useAuth();

  const visibleClasses = isTeacher ? assignedClasses : CLASSES;

  const [selectedClass, setSelectedClass] = useState<string>(visibleClasses[0] || '1A');
  const [selectedTrimester, setSelectedTrimester] = useState<number>(1);

  // Filter students by class
  const classStudents = useMemo(() => {
    return students.filter(s => s.class === selectedClass).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }, [students, selectedClass]);

  // Results for this class and trimester
  // We'll map them as studentId -> { subjectKey -> score }
  const [localScores, setLocalScores] = useState<Record<string, Record<string, string>>>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        // Prepare array for importAcademicResults
        // The data should contain subject keys. The user might have Excel exported from this page.
        // Let's just pass it to the DataContext importer.
        
        let allResultsToImport: any[] = [];
        
        data.forEach((row: any) => {
          let importRow: any = {
            'القسم': selectedClass, // force current class if not provided
            'trimester': selectedTrimester,
            ...row
          };
          
          // Try to map French/Arabic headers back to SUBJECTS_KEYS
          SUBJECTS_KEYS.forEach(key => {
            const arName = getSubjectName(key, true);
            const frName = getSubjectName(key, false);
            if (row[arName] !== undefined && row[arName] !== '') {
              importRow[key] = row[arName];
              delete importRow[arName];
            } else if (row[frName] !== undefined && row[frName] !== '') {
              importRow[key] = row[frName];
              delete importRow[frName];
            }
          });
          
          allResultsToImport.push(importRow);
        });

        // Use the context import
        // The context import function expects an array of objects
        // and handles inserting into academicResults
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

  // Initialize local scores when class or trimester changes
  React.useEffect(() => {
    const scores: Record<string, Record<string, string>> = {};
    classStudents.forEach(student => {
      scores[student.id] = {};
    });

    academicResults.forEach(r => {
      if (r.classId === selectedClass && r.trimester === selectedTrimester) {
        if (scores[r.studentId]) {
          scores[r.studentId][r.subject] = r.score.toString();
        }
      }
    });

    setLocalScores(scores);
  }, [selectedClass, selectedTrimester, classStudents, academicResults]);

  const handleScoreChange = (studentId: string, subject: string, value: string) => {
    setLocalScores(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subject]: value
      }
    }));
  };

  const handleSaveAll = () => {
    let savedCount = 0;
    classStudents.forEach(student => {
      SUBJECTS_KEYS.forEach(subject => {
        const valStr = localScores[student.id]?.[subject];
        if (valStr !== undefined && valStr.trim() !== '') {
          const scoreNum = parseFloat(valStr);
          if (!isNaN(scoreNum)) {
            // Check if exists
            const existing = academicResults.find(r => 
              r.studentId === student.id && 
              r.classId === selectedClass && 
              r.trimester === selectedTrimester &&
              r.subject === subject
            );

            if (existing) {
              if (existing.score !== scoreNum) {
                updateAcademicResult({ ...existing, score: scoreNum });
                savedCount++;
              }
            } else {
              addAcademicResult({
                studentId: student.id,
                classId: selectedClass,
                subject: subject,
                examLabel: 'Examen', // Default
                trimester: selectedTrimester as any,
                score: scoreNum,
                recordedAt: new Date().toISOString()
              });
              savedCount++;
            }
          }
        }
      });
    });

    toast.success(isRTL ? `تم حفظ ${savedCount} علامة بنجاح` : `${savedCount} notes enregistrées avec succès`);
  };

  // Calculate stats
  const studentAverages = useMemo(() => {
    const avgs: Record<string, number> = {};
    classStudents.forEach(student => {
      let sum = 0;
      let count = 0;
      SUBJECTS_KEYS.forEach(subject => {
        const valStr = localScores[student.id]?.[subject];
        if (valStr && valStr.trim() !== '') {
          const num = parseFloat(valStr);
          if (!isNaN(num)) {
            sum += num;
            count++;
          }
        }
      });
      if (count > 0) {
        avgs[student.id] = parseFloat((sum / count).toFixed(2));
      }
    });
    return avgs;
  }, [classStudents, localScores]);

  const stats = useMemo(() => {
    const vals = Object.values(studentAverages);
    if (vals.length === 0) return { max: 0, min: 0, avg: 0 };
    return {
      max: Math.max(...vals),
      min: Math.min(...vals),
      avg: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
    };
  }, [studentAverages]);

  const handlePrintClass = () => {
    const html = `
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>Résultats - ${selectedClass}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
          th { background: #f8fafc; }
          .text-left { text-align: ${isRTL ? 'right' : 'left'}; }
          .header { text-align: center; margin-bottom: 20px; }
          .stats { display: flex; justify-content: space-around; margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${isRTL ? 'نتائج القسم' : 'Résultats de la classe'} ${selectedClass}</h2>
          <h3>${isRTL ? 'الثلاثي' : 'Trimester'} ${selectedTrimester === 4 ? (isRTL ? 'التجريبي' : 'Blanc') : selectedTrimester}</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th class="text-left">${isRTL ? 'التلميذ' : 'Élève'}</th>
              ${SUBJECTS_KEYS.map(k => `<th>${getSubjectName(k, isRTL)}</th>`).join('')}
              <th>${isRTL ? 'المعدل' : 'Moyenne'}</th>
            </tr>
          </thead>
          <tbody>
            ${classStudents.map(student => `
              <tr>
                <td class="text-left">${student.fullName}</td>
                ${SUBJECTS_KEYS.map(k => `<td>${localScores[student.id]?.[k] || '-'}</td>`).join('')}
                <td><strong>${studentAverages[student.id] || '-'}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="stats">
          <div>${isRTL ? 'أعلى معدل' : 'Plus haute moy'}: ${stats.max}</div>
          <div>${isRTL ? 'معدل القسم' : 'Moyenne de classe'}: ${stats.avg}</div>
          <div>${isRTL ? 'أدنى معدل' : 'Plus basse moy'}: ${stats.min}</div>
        </div>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  const handlePrintLevel = () => {
    const level = selectedClass.charAt(0);
    const levelStudents = students.filter(s => s.class.startsWith(level));
    
    // Compute averages for all students in this level
    const levelAvgs: Record<string, number> = {};
    levelStudents.forEach(student => {
      let sum = 0;
      let count = 0;
      SUBJECTS_KEYS.forEach(subject => {
        // Query academicResults for this student and trimester
        const result = academicResults.find(r => r.studentId === student.id && r.trimester === selectedTrimester && r.subject === subject);
        if (result && result.score !== undefined) {
          sum += result.score;
          count++;
        }
      });
      if (count > 0) {
        levelAvgs[student.id] = parseFloat((sum / count).toFixed(2));
      }
    });

    const levelClasses = Array.from(new Set(levelStudents.map(s => s.class))).sort();

    const html = `
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>Résultats Niveau - ${level}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
          th { background: #f8fafc; }
          .text-left { text-align: ${isRTL ? 'right' : 'left'}; }
          .header { text-align: center; margin-bottom: 20px; }
          h2 { margin:0; padding:10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${isRTL ? 'نتائج المستوى' : 'Résultats du Niveau'} ${level}</h2>
          <h3>${isRTL ? 'الثلاثي' : 'Trimester'} ${selectedTrimester === 4 ? (isRTL ? 'التجريبي' : 'Blanc') : selectedTrimester}</h3>
        </div>
        ${levelClasses.map(cls => {
          const cStudents = levelStudents.filter(s => s.class === cls).sort((a,b) => a.fullName.localeCompare(b.fullName));
          if (cStudents.length === 0) return '';
          return `
            <h4>${isRTL ? 'القسم' : 'Classe'}: ${cls}</h4>
            <table>
              <thead>
                <tr>
                  <th class="text-left">${isRTL ? 'التلميذ' : 'Élève'}</th>
                  ${SUBJECTS_KEYS.map(k => `<th>${getSubjectName(k, isRTL)}</th>`).join('')}
                  <th>${isRTL ? 'المعدل' : 'Moyenne'}</th>
                </tr>
              </thead>
              <tbody>
                ${cStudents.map(student => `
                  <tr>
                    <td class="text-left">${student.fullName}</td>
                    ${SUBJECTS_KEYS.map(k => {
                      const r = academicResults.find(x => x.studentId === student.id && x.trimester === selectedTrimester && x.subject === k);
                      return `<td>${r ? r.score : '-'}</td>`;
                    }).join('')}
                    <td><strong>${levelAvgs[student.id] || '-'}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }).join('')}
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
             <Trophy className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{isRTL ? 'نتائج التلاميذ' : 'Résultats des élèves'}</h2>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Button variant="outline" className="relative overflow-hidden rounded-full shadow-sm text-blue-600 border-blue-200 hover:bg-blue-50">
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
            />
            <FileUp className="w-4 h-4 mr-2" /> {isRTL ? 'استيراد' : 'Importer'}
          </Button>
          <Button variant="outline" onClick={handlePrintClass} className="rounded-full shadow-sm text-slate-700">
            <Printer className="w-4 h-4 mr-2" /> {isRTL ? 'طباعة القسم' : 'Imprimer la classe'}
          </Button>
          <Button variant="outline" onClick={handlePrintLevel} className="rounded-full shadow-sm text-slate-700">
            <Printer className="w-4 h-4 mr-2" /> {isRTL ? 'طباعة المستوى' : 'Imprimer le niveau'}
          </Button>
          <Button onClick={handleSaveAll} className="rounded-full shadow-sm bg-primary text-white hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" /> {isRTL ? 'حفظ النتائج' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end mb-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{isRTL ? 'القسم' : 'Classe'}</label>
              <select 
                className="h-11 w-full sm:w-40 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {visibleClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{isRTL ? 'الثلاثي / الامتحان' : 'Trimester / Examen'}</label>
              <select 
                className="h-11 w-full sm:w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                value={selectedTrimester}
                onChange={(e) => setSelectedTrimester(Number(e.target.value))}
              >
                <option value={1}>{isRTL ? 'الثلاثي الأول' : 'Premier Trimester'}</option>
                <option value={2}>{isRTL ? 'الثلاثي الثاني' : 'Deuxième Trimester'}</option>
                <option value={3}>{isRTL ? 'الثلاثي الثالث' : 'Troisième Trimester'}</option>
                <option value={4}>{isRTL ? 'الامتحان التجريبي' : 'Examen Blanc'}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
             <table className="w-full text-left min-w-[800px]">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-100">
                   <th className="p-4 font-black text-slate-700 w-48 sticky left-0 bg-slate-50 shadow-[1px_0_0_0_#f1f5f9] z-10">{isRTL ? 'التلميذ' : 'Élève'}</th>
                   {SUBJECTS_KEYS.map(sub => (
                     <th key={sub} className="p-4 font-semibold text-xs text-slate-500 whitespace-nowrap text-center">
                       {getSubjectName(sub, isRTL)}
                     </th>
                   ))}
                   <th className="p-4 font-black text-primary text-center bg-primary/5">{isRTL ? 'المعدل' : 'Moyenne'}</th>
                 </tr>
               </thead>
               <tbody>
                 {classStudents.map(student => (
                   <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                     <td className="p-2 sticky left-0 bg-white hover:bg-slate-50/50 shadow-[1px_0_0_0_#f1f5f9] z-10">
                       <span className="font-bold text-sm text-slate-800 px-2 block truncate w-44">{student.fullName}</span>
                     </td>
                     {SUBJECTS_KEYS.map(sub => (
                       <td key={sub} className="p-2">
                         <input 
                           type="number"
                           min="0"
                           max="20"
                           step="0.25"
                           className="w-16 h-10 mx-auto block text-center rounded-lg border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pb-0.5"
                           value={localScores[student.id]?.[sub] || ''}
                           onChange={(e) => handleScoreChange(student.id, sub, e.target.value)}
                         />
                       </td>
                     ))}
                     <td className="p-2 text-center bg-primary/5 font-black text-primary">
                       {studentAverages[student.id] || '-'}
                     </td>
                   </tr>
                 ))}
                 {classStudents.length === 0 && (
                   <tr>
                     <td colSpan={SUBJECTS_KEYS.length + 2} className="p-8 text-center text-slate-400 font-semibold">
                       {isRTL ? 'لا يوجد تلاميذ في هذا القسم' : 'Aucun élève dans cette classe'}
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-emerald-600 font-semibold text-xs uppercase mb-1">{isRTL ? 'أعلى معدل' : 'Plus haute moyenne'}</p>
                <div className="text-2xl font-black text-emerald-700">{stats.max || '-'}</div>
              </div>
              <ArrowUpCircle className="w-8 h-8 text-emerald-200" />
            </div>
            
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-primary font-semibold text-xs uppercase mb-1">{isRTL ? 'معدل القسم' : 'Moyenne de la classe'}</p>
                <div className="text-2xl font-black text-primary">{stats.avg || '-'}</div>
              </div>
              <Calculator className="w-8 h-8 text-primary/20" />
            </div>
            
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-rose-600 font-semibold text-xs uppercase mb-1">{isRTL ? 'أدنى معدل' : 'Plus basse moyenne'}</p>
                <div className="text-2xl font-black text-rose-700">{stats.min || '-'}</div>
              </div>
              <ArrowDownCircle className="w-8 h-8 text-rose-200" />
            </div>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
};

export default Results;

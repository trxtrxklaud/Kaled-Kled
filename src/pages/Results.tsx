import { useLocalStorage } from '../lib/useLocalStorage';
import { useStudentStore } from "../stores/studentStore";
import React, { useState, useMemo, useEffect } from 'react';

import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { FileUp, Printer, Save, Trophy } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';

import ResultsTable from '../components/Results/ResultsTable';
import ResultsStats from '../components/Results/ResultsStats';
import { handleImportFile } from '../components/Results/ImportTools';
import { handlePrintClassResults, handlePrintLevelResults } from '../components/Results/PrintTools';
import { SUBJECTS_KEYS, CLASSES, getSubjectName } from '../components/Results/utils';

const Results: React.FC = () => {
  

  const students = useStudentStore(state => state.students);
  const academicResults = useStudentStore(state => state.academicResults);
  const importAcademicResultsStore = useStudentStore(state => state.importAcademicResultsStore);
  const saveBatchAcademicResults = useStudentStore(state => state.saveBatchAcademicResults);
  const handleImportedData = async (importedRows: any[]) => {
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
              studentName = `تلميذ غير مسمى ${index + 1}`;
            }
          }
          
          const normalizeName = (name: any) => {
            if (!name) return '';
            return String(name).toLowerCase()
              .replace(/[\u0300-\u036f]/g, "") 
              .replace(/[\u0621-\u0626\u0628]/g, "ا") 
              .replace(/ال/g, "") 
              .replace(/\s+/g, "") 
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
             const newStudentId = crypto.randomUUID();
             student = { id: newStudentId, fullName: studentName, class: selectedClass } as any;
             // Add the student to the store immediately so they appear in the table
             useStudentStore.getState().addStudent({
               id: newStudentId,
               fullName: studentName,
               class: selectedClass,
               birthDate: '',
               parentName: '',
               parentPhone: '',
               notes: 'أضيف تلقائياً من استيراد النتائج'
             });
          }
          
          SUBJECTS_KEYS.forEach(subject => {
             let scoreVal = row[subject];
             // STRICT BINDING: DO NOT attempt to fill missing subjects with the average or 0.
             if (scoreVal === undefined || scoreVal === null || scoreVal === '') {
                 return; // Skip and leave missing subjects completely empty
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
        toast.success(isRTL ? `تم الاستيراد بنجاح مع إصلاح بعض البيانات غير المنظمة تلقائياً (${matchCount} علامة)` : `Importé avec succès avec correction automatique (${matchCount} notes)`);
      } else {
        toast.error(isRTL ? 'لم يتم العثور على أي علامات مطابقة للطلاب في هذا القسم' : 'Aucune note correspondante trouvée pour les élèves de cette classe');
      }
    } catch (err) {
      console.error("Global import error", err?.message || err);
      toast.error(isRTL ? 'حدث خطأ أثناء الاستيراد' : 'Erreur lors de l\'importation');
    }
  };
  const { isRTL } = useLanguage();
  const { isTeacher, assignedClasses, isParent, user } = useAuth();
  const childIdsStr = user?.childrenIds?.join(',') || '';

  const visibleClasses = isTeacher ? assignedClasses : CLASSES;

  const [selectedClass, setSelectedClass] = useState<string>(visibleClasses[0] || '1A');
  const [selectedTrimester, setSelectedTrimester] = useState<number>(1);

  // Filter students by class, and if parent, only their children
  const classStudents = useMemo(() => {
    let filtered = students.filter(s => s.class === selectedClass);
    if (isParent) {
      const childIds = childIdsStr ? childIdsStr.split(',') : [];
      filtered = filtered.filter(s => childIds.includes(s.id));
    }
    return filtered.sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || '')));
  }, [students, selectedClass, isParent, childIdsStr]);

  const [localScores, setLocalScores] = useLocalStorage<Record<string, Record<string, string>>>('draft_results_scores', {});

  // Initialize local scores when class or trimester changes
  useEffect(() => {
    const scores: Record<string, Record<string, string>> = {};
    classStudents.forEach(student => {
      scores[student.id] = {};
    });

    academicResults.forEach(r => {
      if (
        (r.classId === selectedClass || (classStudents.some(cs => cs.id === r.studentId))) 
        && r.trimester === parseInt(selectedTrimester.toString())
      ) {
        if (scores[r.studentId]) {
          let subjectKey = r.subject;
          
          if (!SUBJECTS_KEYS.includes(subjectKey)) {
            const mappedKey = SUBJECTS_KEYS.find(k => {
              const arName = getSubjectName(k, true).trim();
              const frName = getSubjectName(k, false).trim();
              const kNorm = String(subjectKey).toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[\u0621-\u0626]/g, "ا").replace(/ال/g, "");
              const arNorm = arName.toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[\u0621-\u0626]/g, "ا").replace(/ال/g, "");
              const frNorm = frName.toLowerCase().replace(/[\u0300-\u036f]/g, "");
              return kNorm === arNorm || kNorm === frNorm || kNorm.includes(arNorm) || arNorm.includes(kNorm) || kNorm.includes(frNorm) || frNorm.includes(kNorm);
            });
            if (mappedKey) subjectKey = mappedKey;
          }
          
          if (SUBJECTS_KEYS.includes(subjectKey)) {
            const scoreVal = r.score;
            if (scoreVal === undefined || scoreVal === null || String(scoreVal) === '') {
              scores[r.studentId][subjectKey] = '';
            } else {
              scores[r.studentId][subjectKey] = scoreVal.toString();
            }
          }
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

  const handleSaveAll = async () => {
    const toUpdate: any[] = [];
    const toAdd: any[] = [];
    
    classStudents.forEach(student => {
      SUBJECTS_KEYS.forEach(subject => {
        const valStr = localScores[student.id]?.[subject];
        
        const existing = academicResults.find(r => 
           r.studentId === student.id && 
           r.classId === selectedClass && 
           r.trimester === selectedTrimester &&
           r.subject === subject
        );

        if (valStr === undefined || valStr === null || String(valStr).trim() === '') {
           if (existing && String(existing.score) !== '') {
               toUpdate.push({ id: existing.id, updates: { score: '' as any } });
           }
        } else {
          let scoreNum = parseFloat(String(valStr).replace(',', '.'));
          if (!isNaN(scoreNum)) {
            scoreNum = Math.min(20, Math.max(0, scoreNum)); // strictly clamp to 0-20
            if (existing) {
              if (String(existing.score) !== String(scoreNum)) {
                toUpdate.push({ id: existing.id, updates: { score: scoreNum } });
              }
            } else {
              toAdd.push({
                studentId: student.id,
                classId: selectedClass,
                subject: subject,
                level: '1',
                examLabel: 'Examen', // Default
                trimester: selectedTrimester as 1 | 2 | 3 | 4,
                score: scoreNum,
                recordedAt: new Date().toISOString()
              });
            }
          }
        }
      });
    });
    
    if (toUpdate.length > 0 || toAdd.length > 0) {
      await saveBatchAcademicResults(toUpdate, toAdd);
    } else {
      toast.info(isRTL ? 'لا توجد تغييرات للحفظ' : 'Aucun changement à enregistrer');
    }
  };

  // Calculate stats
  const studentAverages = useMemo(() => {
    const avgs: Record<string, number> = {};
    classStudents.forEach(student => {
      let sum = 0;
      let subjectCount = 0;
      
      SUBJECTS_KEYS.forEach(subject => {
        const valStr = localScores[student.id]?.[subject];
        if (valStr !== undefined && valStr !== null && String(valStr).trim() !== '') {
          const parsed = parseFloat(String(valStr).replace(',', '.'));
          // Only add valid numbers between 0 and 20
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 20) {
            sum += parsed;
            subjectCount++;
          }
        }
      });
      
      if (subjectCount > 0) {
        let avg = sum / subjectCount;
        avg = Math.min(20, Math.max(0, avg)); // Double check safety
        avgs[student.id] = parseFloat(avg.toFixed(2));
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
          {!isParent && (
            <>
              <label className="relative inline-flex items-center justify-center h-10 px-4 text-sm font-medium transition-colors border rounded-full shadow-sm cursor-pointer whitespace-nowrap border-blue-200 text-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv,image/*,.png,.jpg,.jpeg" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleImportFile(e, selectedClass, selectedTrimester, isRTL, handleImportedData)}
                />
                <FileUp className="w-4 h-4 mr-2" /> {isRTL ? 'استيراد' : 'Importer'}
              </label>
              <Button variant="outline" onClick={() => handlePrintClassResults(selectedClass, selectedTrimester, isRTL, classStudents, localScores, studentAverages, stats)} className="rounded-full shadow-sm text-slate-700">
                <Printer className="w-4 h-4 mr-2" /> {isRTL ? 'طباعة القسم' : 'Imprimer la classe'}
              </Button>
              <Button variant="outline" onClick={() => handlePrintLevelResults(selectedClass, selectedTrimester, isRTL, students, academicResults)} className="rounded-full shadow-sm text-slate-700">
                <Printer className="w-4 h-4 mr-2" /> {isRTL ? 'طباعة المستوى' : 'Imprimer le niveau'}
              </Button>
              <Button onClick={handleSaveAll} className="rounded-full shadow-sm bg-primary text-white hover:bg-primary/90">
                <Save className="w-4 h-4 mr-2" /> {isRTL ? 'حفظ النتائج' : 'Enregistrer'}
              </Button>
            </>
          )}
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

          <ResultsTable 
            isRTL={isRTL}
            classStudents={classStudents}
            localScores={localScores}
            handleScoreChange={handleScoreChange}
            studentAverages={studentAverages}
            readOnly={isParent}
          />

          <ResultsStats isRTL={isRTL} stats={stats} />
          
        </CardContent>
      </Card>
    </div>
  );
};

export default Results;

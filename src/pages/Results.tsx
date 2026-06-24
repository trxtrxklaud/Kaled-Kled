import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
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
  const { students, academicResults, addAcademicResult, updateAcademicResult, importAcademicResults } = useData();
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

  const [localScores, setLocalScores] = useState<Record<string, Record<string, string>>>({});

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
            scores[r.studentId][subjectKey] = r.score.toString();
          }
        }
      }
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
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
                trimester: selectedTrimester as 1 | 2 | 3 | 4,
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
    const activeSubjects = SUBJECTS_KEYS.filter(subject => 
      classStudents.some(student => {
        const val = localScores[student.id]?.[subject];
        return val !== undefined && val.trim() !== '';
      })
    );
    const divisor = activeSubjects.length;

    classStudents.forEach(student => {
      if (divisor === 0) return;
      let sum = 0;
      let hasAnyScore = false;
      
      activeSubjects.forEach(subject => {
        const valStr = localScores[student.id]?.[subject];
        let num = 0;
        if (valStr && valStr.trim() !== '') {
          const parsed = parseFloat(valStr);
          if (!isNaN(parsed)) {
            num = parsed;
            hasAnyScore = true;
          }
        }
        sum += num;
      });
      
      if (hasAnyScore) {
        avgs[student.id] = parseFloat((sum / divisor).toFixed(2));
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
              <Button variant="outline" className="relative overflow-hidden rounded-full shadow-sm text-blue-600 border-blue-200 hover:bg-blue-50">
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleImportFile(e, selectedClass, selectedTrimester, isRTL, importAcademicResults)}
                />
                <FileUp className="w-4 h-4 mr-2" /> {isRTL ? 'استيراد' : 'Importer'}
              </Button>
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

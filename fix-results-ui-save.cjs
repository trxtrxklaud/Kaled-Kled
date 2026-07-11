const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

content = content.replace(/importAcademicResultsStore \} = useStudentStore\(\);/, 
`importAcademicResultsStore, saveBatchAcademicResults } = useStudentStore();`);

const newHandleSaveAll = `const handleSaveAll = async () => {
    const toUpdate: any[] = [];
    const toAdd: any[] = [];
    
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
  };`;

content = content.replace(/const handleSaveAll = \(\) => \{[\s\S]*?enregistrées avec succès\`\);\n\s*\};/, newHandleSaveAll);

fs.writeFileSync('src/pages/Results.tsx', content);

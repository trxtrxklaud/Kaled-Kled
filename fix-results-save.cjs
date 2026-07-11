const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const targetSave = `    classStudents.forEach(student => {
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
    });`;

const replacementSave = `    classStudents.forEach(student => {
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
    });`;

content = content.replace(targetSave, replacementSave);
fs.writeFileSync('src/pages/Results.tsx', content);
console.log('Results.tsx handleSaveAll fixed');

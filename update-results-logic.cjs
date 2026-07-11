const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

// 1. Update `handleImportedData` loop
const targetImportLoop = `          SUBJECTS_KEYS.forEach(subject => {
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
             }
          });`;

const replacementImportLoop = `          SUBJECTS_KEYS.forEach(subject => {
             let scoreVal = row[subject];
             
             const existing = academicResults.find(r => 
                  r.studentId === student!.id && 
                  r.classId === selectedClass && 
                  r.trimester === selectedTrimester &&
                  r.subject === subject
             );

             // STRICT BINDING: DO NOT attempt to fill missing subjects with the average or 0.
             if (scoreVal === undefined || scoreVal === null || scoreVal === '') {
                 // If the subject is missing in Excel but has a dummy score in DB, overwrite it with empty
                 if (existing && String(existing.score) !== '') {
                     newResults.push({
                       id: existing.id,
                       studentId: student!.id,
                       classId: selectedClass,
                       level: '1',
                       subject: subject,
                       examLabel: 'Examen',
                       trimester: selectedTrimester,
                       score: '' as any,
                       recordedAt: new Date().toISOString()
                     });
                 }
                 return; // Skip and leave missing subjects completely empty
             }
             
             let rawScore = parseFloat(String(scoreVal).replace(',', '.'));
             if (!isNaN(rawScore)) {
                // Clamp to ensure no impossible scores like 25.18
                let clampedScore = Math.min(20, Math.max(0, rawScore));
                
                newResults.push({
                  id: existing ? existing.id : crypto.randomUUID(),
                  studentId: student!.id,
                  classId: selectedClass,
                  level: '1',
                  subject: subject,
                  examLabel: 'Examen',
                  trimester: selectedTrimester,
                  score: clampedScore,
                  recordedAt: new Date().toISOString()
                });
             }
          });`;

content = content.replace(targetImportLoop, replacementImportLoop);

// 2. Update studentAverages calculation to be extremely strict
const targetAvg = `  const studentAverages = useMemo(() => {
    const avgs: Record<string, number> = {};
    classStudents.forEach(student => {
      let sum = 0;
      let subjectCount = 0;
      
      SUBJECTS_KEYS.forEach(subject => {
        const valStr = localScores[student.id]?.[subject];
        if (valStr && valStr.trim() !== '') {
          const parsed = parseFloat(valStr);
          if (!isNaN(parsed)) {
            sum += parsed;
            subjectCount++;
          }
        }
      });
      
      if (subjectCount > 0) {
        avgs[student.id] = parseFloat((sum / subjectCount).toFixed(2));
      }
    });
    return avgs;
  }, [classStudents, localScores]);`;

const replacementAvg = `  const studentAverages = useMemo(() => {
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
  }, [classStudents, localScores]);`;

content = content.replace(targetAvg, replacementAvg);

fs.writeFileSync('src/pages/Results.tsx', content);
console.log('Results.tsx strict logic applied');

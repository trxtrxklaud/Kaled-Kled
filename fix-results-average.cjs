const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const target = `  const studentAverages = useMemo(() => {
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
  }, [classStudents, localScores]);`;

const replacement = `  const studentAverages = useMemo(() => {
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

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/Results.tsx', content);
console.log('Results.tsx average calculation fixed');

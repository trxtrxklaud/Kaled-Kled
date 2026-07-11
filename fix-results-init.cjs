const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const target = `          if (SUBJECTS_KEYS.includes(subjectKey)) {
            scores[r.studentId][subjectKey] = r.score.toString();
          }`;

const replacement = `          if (SUBJECTS_KEYS.includes(subjectKey)) {
            const scoreVal = r.score;
            if (scoreVal === undefined || scoreVal === null || scoreVal === '') {
              scores[r.studentId][subjectKey] = '';
            } else {
              scores[r.studentId][subjectKey] = scoreVal.toString();
            }
          }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/Results.tsx', content);
console.log('Results.tsx init localScores fixed');

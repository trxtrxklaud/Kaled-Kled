const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const target = `          SUBJECTS_KEYS.forEach(subject => {
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
             
             const score = parseFloat(String(scoreVal));`;

const replacement = `          SUBJECTS_KEYS.forEach(subject => {
             let scoreVal = row[subject];
             // STRICT BINDING: DO NOT attempt to fill missing subjects with the average or 0.
             if (scoreVal === undefined || scoreVal === '') {
                 return; // Skip and leave missing subjects completely empty
             }
             
             const score = parseFloat(String(scoreVal));`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/Results.tsx', content);
console.log('Results.tsx strict update done');

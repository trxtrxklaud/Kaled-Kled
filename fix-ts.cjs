const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const target = `            const scoreVal = r.score;
            if (scoreVal === undefined || scoreVal === null || scoreVal === '') {`;

const replacement = `            const scoreVal = r.score;
            if (scoreVal === undefined || scoreVal === null || String(scoreVal) === '') {`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/Results.tsx', content);
console.log('Results.tsx TS error fixed');

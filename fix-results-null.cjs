const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const target = `             if (scoreVal === undefined || scoreVal === '') {`;
const replacement = `             if (scoreVal === undefined || scoreVal === null || scoreVal === '') {`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/Results.tsx', content);
console.log('Results.tsx null check added');

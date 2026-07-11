const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

// Fix 'any' type on name parameter
content = content.replace(/const normalizeName = \(name\) => \{/, 'const normalizeName = (name: any) => {');

// Remove unused addAcademicResult and updateAcademicResult
content = content.replace(/students, academicResults, addAcademicResult, updateAcademicResult, importAcademicResultsStore, saveBatchAcademicResults/, 
  'students, academicResults, importAcademicResultsStore, saveBatchAcademicResults');

fs.writeFileSync('src/pages/Results.tsx', content);

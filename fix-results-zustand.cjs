const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const target1 = `const { students, academicResults, importAcademicResultsStore, saveBatchAcademicResults } = useStudentStore();`;
const replacement1 = `const students = useStudentStore(state => state.students);
  const academicResults = useStudentStore(state => state.academicResults);
  const importAcademicResultsStore = useStudentStore(state => state.importAcademicResultsStore);
  const saveBatchAcademicResults = useStudentStore(state => state.saveBatchAcademicResults);`;

content = content.replace(target1, replacement1);
fs.writeFileSync('src/pages/Results.tsx', content);
console.log('Results.tsx Zustand selectors fixed');

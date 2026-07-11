const fs = require('fs');
let content = fs.readFileSync('src/pages/Students.tsx', 'utf8');

const target1 = `const { attendance } = useStudentStore();`;
const replacement1 = `const attendance = useStudentStore(state => state.attendance);`;

const target2 = `const { students, addStudent, updateStudent, deleteStudent, bulkDeleteStudents, importStudents } = useStudentStore();`;
const replacement2 = `const students = useStudentStore(state => state.students);
  const addStudent = useStudentStore(state => state.addStudent);
  const updateStudent = useStudentStore(state => state.updateStudent);
  const deleteStudent = useStudentStore(state => state.deleteStudent);
  const bulkDeleteStudents = useStudentStore(state => state.bulkDeleteStudents);
  const importStudents = useStudentStore(state => state.importStudents);`;

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);

fs.writeFileSync('src/pages/Students.tsx', content);
console.log('Students.tsx Zustand selectors fixed');

const fs = require('fs');
let content = fs.readFileSync('src/stores/studentStore.ts', 'utf8');

const target = `  addStudent: async (student) => {
    try {
      const id = student.id || crypto.randomUUID();
      await setDoc(doc(db, 'students', id), { ...student, id });`;

const replacement = `  addStudent: async (student) => {
    try {
      const id = student.id || crypto.randomUUID();
      const newStudent = { ...student, id };
      set(state => ({ students: [...state.students, newStudent as Student] }));
      await setDoc(doc(db, 'students', id), newStudent);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/stores/studentStore.ts', content);
console.log('addStudent updated to be optimistic');

const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const targetRegex = /if \(\!student\) \{\n\s*student = \{ id: \`unassigned-\$\{crypto\.randomUUID\(\)\}\`, fullName: studentName, class: selectedClass \} as any;\n\s*\}/g;

const replacement = `if (!student) {
             const newStudentId = crypto.randomUUID();
             student = { id: newStudentId, fullName: studentName, class: selectedClass } as any;
             // Add the student to the store immediately so they appear in the table
             useStudentStore.getState().addStudent({
               id: newStudentId,
               fullName: studentName,
               class: selectedClass,
               birthDate: '',
               parentName: '',
               parentPhone: '',
               notes: 'أضيف تلقائياً من استيراد النتائج'
             });
          }`;

content = content.replace(targetRegex, replacement);
fs.writeFileSync('src/pages/Results.tsx', content);
console.log('Results.tsx updated to create missing students');

const fs = require('fs');
let content = fs.readFileSync('src/pages/Students.tsx', 'utf8');

content = content.replace(/await importStudents\(rows as ImportStudentData\[\], selectedClass \|\| undefined\);\n\s*setSelectedClass\(null\);\n\s*setIsImportDialogOpen\(false\);/, "await importStudents(rows as ImportStudentData[], selectedClass || undefined);\n          setIsImportDialogOpen(false);");

content = content.replace(/await importStudents\(data, selectedClass \|\| undefined\);\n\s*setSelectedClass\(null\);\n\s*setIsImportDialogOpen\(false\);/, "await importStudents(data, selectedClass || undefined);\n          setIsImportDialogOpen(false);");

fs.writeFileSync('src/pages/Students.tsx', content);
console.log('Reverted setSelectedClass in Students.tsx');

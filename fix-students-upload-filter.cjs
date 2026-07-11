const fs = require('fs');
let content = fs.readFileSync('src/pages/Students.tsx', 'utf8');

content = content.replace(/await importStudents\(rows as ImportStudentData\[\], selectedClass \|\| undefined\);\n\s*setIsImportDialogOpen\(false\);/, "await importStudents(rows as ImportStudentData[], selectedClass || undefined);\n          setSelectedClass(null);\n          setIsImportDialogOpen(false);");

content = content.replace(/await importStudents\(data, selectedClass \|\| undefined\);\n\s*setIsImportDialogOpen\(false\);/, "await importStudents(data, selectedClass || undefined);\n          setSelectedClass(null);\n          setIsImportDialogOpen(false);");

fs.writeFileSync('src/pages/Students.tsx', content);
console.log('Students.tsx updated selected class to null');

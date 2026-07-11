const fs = require('fs');
let code = fs.readFileSync('src/pages/TeacherPortal.tsx', 'utf8');

code = code.replace(/\\`/g, "`");
code = code.replace(/\\'/g, "'");

fs.writeFileSync('src/pages/TeacherPortal.tsx', code);
console.log("Fixed quotes");

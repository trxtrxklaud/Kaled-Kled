const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const importTarget = "import { ParentPortal } from './ParentPortal';";
const importReplacement = "import { ParentPortal } from './ParentPortal';\nimport { TeacherPortal } from './TeacherPortal';";

code = code.replace(importTarget, importReplacement);

const parentCheck = `  if (isParent) {\n    return <ParentPortal />;\n  }`;
const teacherCheck = `  if (isParent) {\n    return <ParentPortal />;\n  }\n\n  if (isTeacher) {\n    return <TeacherPortal />;\n  }`;

code = code.replace(parentCheck, teacherCheck);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log("Patched Dashboard.tsx for TeacherPortal");

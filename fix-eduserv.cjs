const fs = require('fs');
let content = fs.readFileSync('src/pages/EduservIntegration.tsx', 'utf8');
content = `import { useStudentStore } from '../stores/studentStore';\nimport { useAcademicStore } from '../stores/academicStore';\n` + content;
content = content.replace(/const { eduservSyncLogs, addEduservSyncLog, triggerBackup } = useSettingsStore();/, 
`const { eduservSyncLogs, addEduservSyncLog, triggerBackup, clearEduservSyncLogs } = useSettingsStore();
  const { importStudents, importAcademicResultsStore: importAcademicResults, attendance, students, academicResults } = useStudentStore();
  const { importExams } = useAcademicStore();`);
fs.writeFileSync('src/pages/EduservIntegration.tsx', content);

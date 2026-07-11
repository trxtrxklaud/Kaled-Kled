const fs = require('fs');
let content = fs.readFileSync('src/stores/studentStore.ts', 'utf8');

content = content.replace(/toast\.error\('فشل في حفظ النتائج'\);\n\s*\}\n\s*recordAttendance:/, 
`toast.error('فشل في حفظ النتائج');
    }
  },
  recordAttendance:`);

fs.writeFileSync('src/stores/studentStore.ts', content);

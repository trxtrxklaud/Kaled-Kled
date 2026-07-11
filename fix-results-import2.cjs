const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

content = content.replace(/if \(nameKey\) \{\n\s*studentName = String\(row\[nameKey\]\)\.trim\(\);\n\s*\}/, 
`if (nameKey) {
        studentName = String(row[nameKey]).trim();
      } else {
        // Fallback: use the first column that contains a string and is not a subject
        const firstStringKey = rowKeys.find(k => k !== 'القسم' && k !== 'trimester' && !SUBJECTS_KEYS.includes(k) && typeof row[k] === 'string' && isNaN(Number(row[k])));
        if (firstStringKey) {
          studentName = String(row[firstStringKey]).trim();
        }
      }`);

fs.writeFileSync('src/pages/Results.tsx', content);

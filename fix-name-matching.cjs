const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const replacement = `const normalizeName = (name) => {
      if (!name) return '';
      return String(name).toLowerCase()
        .replace(/[\\u0300-\\u036f]/g, "") // remove accents
        .replace(/[\\u0621-\\u0626\\u0628]/g, "ا") // normalize some arabic letters
        .replace(/ال/g, "") // remove Al
        .replace(/\\s+/g, "") // remove all spaces
        .trim();
    };
    
    if (studentName) {
        const normImportName = normalizeName(studentName);
        const student = students.find(s => {
          if (s.class !== selectedClass) return false;
          const normDBName = normalizeName(s.fullName);
          return normDBName === normImportName || normImportName.includes(normDBName) || normDBName.includes(normImportName);
        });`;

content = content.replace(/if \(studentName\) \{\n\s*const student = students\.find\(s =>\s*\n\s*s\.class === selectedClass && \(\n\s*s\.fullName\.toLowerCase\(\)\.trim\(\) === studentName\.toLowerCase\(\) \|\|\n\s*studentName\.toLowerCase\(\)\.includes\(s\.fullName\.toLowerCase\(\)\.trim\(\)\) \|\|\n\s*s\.fullName\.toLowerCase\(\)\.trim\(\)\.includes\(studentName\.toLowerCase\(\)\)\n\s*\)\n\s*\);/, replacement);

fs.writeFileSync('src/pages/Results.tsx', content);

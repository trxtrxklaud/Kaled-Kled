const fs = require('fs');
let content = fs.readFileSync('src/components/Results/ImportTools.ts', 'utf8');

const target = `              // Only match if it's actually the subject name, no fallback to 'moy'
              return kNorm === arNorm || kNorm === frNorm || kNorm.includes(arNorm) || arNorm.includes(kNorm) || kNorm.includes(frNorm) || frNorm.includes(kNorm);
            });`;

const replacement = `              // Strict matching: only match if it's the subject name exactly or contains it clearly
              if (arNorm.length < 2 || frNorm.length < 2) return false;
              return kNorm === arNorm || kNorm === frNorm || kNorm.includes(arNorm) || kNorm.includes(frNorm);
            });`;

content = content.replace(target, replacement);

const target2 = `              importRow[key] = '';`;
const replacement2 = `              importRow[key] = ''; // Explicitly empty string`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/components/Results/ImportTools.ts', content);
console.log('ImportTools strict match fixed');

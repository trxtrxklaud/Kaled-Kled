const fs = require('fs');
let content = fs.readFileSync('src/components/Results/ImportTools.ts', 'utf8');

const target = `            const matchedKey = rowKeys.find(k => {
              const kNorm = k.toLowerCase().replace(/[\\u0300-\\u036f]/g, "").replace(/[\\u0621-\\u0626]/g, "ا").replace(/ال/g, "");
              const arNorm = arName.toLowerCase().replace(/[\\u0300-\\u036f]/g, "").replace(/[\\u0621-\\u0626]/g, "ا").replace(/ال/g, "");
              const frNorm = frName.toLowerCase().replace(/[\\u0300-\\u036f]/g, "");
              return kNorm === arNorm || kNorm === frNorm || kNorm.includes(arNorm) || arNorm.includes(kNorm) || kNorm.includes(frNorm) || frNorm.includes(kNorm) || kNorm.includes('moy') || kNorm.includes('result') || kNorm.includes('معدل') || kNorm.includes('نتيجة');
            });

            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
              importRow[key] = row[matchedKey];
              if (matchedKey !== key) {
                delete importRow[matchedKey];
              }
            } else {
              // Create default value if not found
              importRow[key] = 0;
            }`;

const replacement = `            const matchedKey = rowKeys.find(k => {
              const kNorm = k.toLowerCase().replace(/[\\u0300-\\u036f]/g, "").replace(/[\\u0621-\\u0626]/g, "ا").replace(/ال/g, "");
              const arNorm = arName.toLowerCase().replace(/[\\u0300-\\u036f]/g, "").replace(/[\\u0621-\\u0626]/g, "ا").replace(/ال/g, "");
              const frNorm = frName.toLowerCase().replace(/[\\u0300-\\u036f]/g, "");
              // Only match if it's actually the subject name, no fallback to 'moy'
              return kNorm === arNorm || kNorm === frNorm || kNorm.includes(arNorm) || arNorm.includes(kNorm) || kNorm.includes(frNorm) || frNorm.includes(kNorm);
            });

            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
              importRow[key] = row[matchedKey];
              if (matchedKey !== key) {
                delete importRow[matchedKey];
              }
            } else {
              // Strictly leave missing subjects empty, do NOT add a dummy value.
              importRow[key] = '';
            }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/Results/ImportTools.ts', content);
console.log('ImportTools.ts strict update done');

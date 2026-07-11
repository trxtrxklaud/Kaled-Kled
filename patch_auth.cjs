const fs = require('fs');
let code = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

const targetStr = "else if (username.startsWith('prof') && password === TEACHER_PASSWORD) {";
const replacementStr = "else if (username.toLowerCase().startsWith('prof') && password === TEACHER_PASSWORD) {";

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
} else {
  console.log("Could not find targetStr");
}

fs.writeFileSync('src/contexts/AuthContext.tsx', code);
console.log("Patched AuthContext.tsx successfully");

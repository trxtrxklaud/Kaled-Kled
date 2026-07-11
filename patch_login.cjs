const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

// Change label for Admin tab
const adminLabelTarget = "{isRTL ? 'الإدارة' : 'Administration'}";
const adminLabelReplacement = "{isRTL ? 'الإدارة والمعلمون' : 'Admin & Enseignants'}";

if (code.includes(adminLabelTarget)) {
  code = code.replace(adminLabelTarget, adminLabelReplacement);
} else {
  console.log("Could not find adminLabelTarget");
}

fs.writeFileSync('src/pages/Login.tsx', code);
console.log("Patched Login.tsx successfully");

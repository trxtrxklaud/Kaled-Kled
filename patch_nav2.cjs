const fs = require('fs');
let nav = fs.readFileSync('src/components/Navigation.tsx', 'utf8');
nav = nav.replace("Clock, ClipboardCheck", "ClipboardCheck");
fs.writeFileSync('src/components/Navigation.tsx', nav);
console.log("Patched nav");

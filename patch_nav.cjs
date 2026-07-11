const fs = require('fs');

let nav = fs.readFileSync('src/components/Navigation.tsx', 'utf8');

// remove old push
nav = nav.replace(/navItems\.push\(\{ icon: LayoutDashboard, label: isRTL \? 'مراقبة الحضور' : 'Suivi Présences', path: '\/attendance-monitoring' \}\);\n\s*/g, "");

// insert after employees
const target = `{ icon: UserRound, label: t('employees'), path: '/employees' },`;
const rep = target + `\n    { icon: LayoutDashboard, label: isRTL ? 'مراقبة الحضور' : 'Suivi Présences', path: '/attendance-monitoring' },`;
nav = nav.replace(target, rep);

// update icon to ClipboardCheck or Clock
nav = nav.replace("import { LayoutDashboard, Users", "import { LayoutDashboard, Users, Clock, ClipboardCheck");
nav = nav.replace("icon: LayoutDashboard, label: isRTL ? 'مراقبة الحضور'", "icon: ClipboardCheck, label: isRTL ? 'مراقبة الحضور'");

fs.writeFileSync('src/components/Navigation.tsx', nav);
console.log("Patched nav");

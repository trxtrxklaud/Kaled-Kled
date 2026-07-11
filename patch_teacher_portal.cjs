const fs = require('fs');
let code = fs.readFileSync('src/pages/TeacherPortal.tsx', 'utf8');

const match = `          await createNotificationEvent(
            'attendance_marked',
            user?.id || 'system',
            parent.id,
            isRTL ? 'تحديث الحضور' : 'Mise à jour de présence',
            isRTL 
              ? \`تم تسجيل \${student.fullName} كـ \${status === 'absent' ? 'غائب' : 'متأخر'} اليوم.\` 
              : \`\${student.fullName} a été marqué \${status === 'absent' ? 'absent' : 'en retard'} aujourd'hui.\`
          );`;

const replace = `          await createNotificationEvent(
            'attendance_marked',
            user?.id || 'system',
            parent.id,
            isRTL ? 'تحديث الحضور' : 'Mise à jour de présence',
            isRTL 
              ? \`تم تسجيل \${student.fullName} كـ \${status === 'absent' ? 'غائب' : 'متأخر'} اليوم.\` 
              : \`\${student.fullName} a été marqué \${status === 'absent' ? 'absent' : 'en retard'} aujourd'hui.\`,
            { studentId: student.id, date },
            \`attendance_\${student.id}_\${date.split('T')[0]}_\${status}\`
          );`;

code = code.replace(match, replace);

fs.writeFileSync('src/pages/TeacherPortal.tsx', code);
console.log("Patched TeacherPortal.tsx");

const fs = require('fs');
let code = fs.readFileSync('src/stores/studentStore.ts', 'utf8');

const targetStr = `      if (!record.present) {
        // We will trigger a school announcement
        const { useSchoolStore } = await import('./schoolStore');
        const student = get().students.find(s => s.id === record.studentId);
        if (student) {
          useSchoolStore.getState().addAnnouncement({
            title: \`Absence signalée : \${student.fullName}\`,
            content: \`L'élève \${student.fullName} (classe \${student.class}) a été marqué absent aujourd'hui.\`,
            date: new Date().toISOString(), priority: 'normal'
          });
        }
      }`;

const replacementStr = `      if (!record.present) {
        // We will trigger a school announcement
        const { useSchoolStore } = await import('./schoolStore');
        const student = get().students.find(s => s.id === record.studentId);
        if (student) {
          useSchoolStore.getState().addAnnouncement({
            title: \`Absence signalée : \${student.fullName}\`,
            content: \`L'élève \${student.fullName} (classe \${student.class}) a été marqué absent aujourd'hui.\`,
            date: new Date().toISOString(), priority: 'normal'
          });

          // Trigger In-App Notification for Parent
          const { useUserStore } = await import('./userStore');
          const { useNotificationStore } = await import('./notificationStore');
          const parents = useUserStore.getState().parentUsers || [];
          const parent = parents.find(p => p.childrenIds?.includes(student.id));
          
          if (parent) {
            await useNotificationStore.getState().createNotificationEvent(
              'attendance_marked',
              record.recordedBy || 'system',
              parent.id,
              'إشعار غياب/تأخير',
              \`تم تسجيل غياب أو تأخير للتلميذ \${student.fullName} بتاريخ \${record.date.split('T')[0]}.\`,
              { studentId: student.id, date: record.date }
            );
          }
        }
      }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('src/stores/studentStore.ts', code);
  console.log("Successfully patched studentStore.ts");
} else {
  console.log("Could not find target string in studentStore.ts. Showing what it contains:");
  const lines = code.split('\n');
  const startIdx = lines.findIndex(l => l.includes('recordAttendance:'));
  console.log(lines.slice(startIdx, startIdx + 30).join('\n'));
}

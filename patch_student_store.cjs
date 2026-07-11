const fs = require('fs');
let code = fs.readFileSync('src/stores/studentStore.ts', 'utf8');

const match = `          // Trigger In-App Notification for Parent
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
          }`;

code = code.replace(match, "// Auto-notification removed to prevent duplication with manual notification in UI");

const toastMatch = `      toast.success('تم تسجيل الحضور/الغياب');
    } catch (err) {
      toast.error('فشل تسجيل الحضور/الغياب');
    }`;

const toastReplace = `      // Removed toast to prevent spamming in loops
    } catch (err) {
      console.error('فشل تسجيل الحضور/الغياب', err);
    }`;

code = code.replace(toastMatch, toastReplace);

fs.writeFileSync('src/stores/studentStore.ts', code);
console.log("Patched studentStore.ts");

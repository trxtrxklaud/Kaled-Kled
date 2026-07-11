const fs = require('fs');
let content = fs.readFileSync('src/stores/studentStore.ts', 'utf8');

const target = `      if (filtered.length > 0) {
        const batch = writeBatch(db);
        filtered.forEach(s => batch.set(doc(db, 'students', s.id), s, { merge: true }));
        await batch.commit();`;

const replacement = `      if (filtered.length > 0) {
        set((state) => ({ students: [...state.students, ...filtered] }));
        const batch = writeBatch(db);
        filtered.forEach(s => batch.set(doc(db, 'students', s.id), s, { merge: true }));
        await batch.commit();`;

if(content.includes(target)){
  content = content.replace(target, replacement);
  fs.writeFileSync('src/stores/studentStore.ts', content);
  console.log('studentStore updated with optimistic set');
} else {
  console.log('target not found in studentStore');
}

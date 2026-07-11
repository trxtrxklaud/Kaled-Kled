const fs = require('fs');
let content = fs.readFileSync('src/stores/studentStore.ts', 'utf8');

// Add bulkDeleteStudents function signature
content = content.replace(/deleteStudent: \(id: string\) => Promise<void>;/, 
`deleteStudent: (id: string) => Promise<void>;
  bulkDeleteStudents: (ids: string[]) => Promise<void>;`);

// Add bulkDeleteStudents implementation
const implementation = `deleteStudent: async (id) => {
    try {
      await deleteDoc(doc(db, 'students', id));
      
      const resultsToDelete = get().academicResults.filter(r => r.studentId === id);
      if (resultsToDelete.length > 0) {
        const batch = writeBatch(db);
        resultsToDelete.forEach(r => batch.delete(doc(db, 'academicResults', r.id)));
        await batch.commit();
      }
      toast.success('تم حذف الطالب');
    } catch (err) {
      toast.error('فشل في الحذف');
    }
  },
  
  bulkDeleteStudents: async (ids) => {
    try {
      if (ids.length === 0) return;
      
      // Batch deletes in chunks of 500 (Firestore limit)
      const batches = [];
      let currentBatch = writeBatch(db);
      let opCount = 0;
      
      const resultsToDelete = get().academicResults.filter(r => ids.includes(r.studentId));
      
      // Delete students
      ids.forEach(id => {
        currentBatch.delete(doc(db, 'students', id));
        opCount++;
        if (opCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          opCount = 0;
        }
      });
      
      // Delete related results
      resultsToDelete.forEach(r => {
        currentBatch.delete(doc(db, 'academicResults', r.id));
        opCount++;
        if (opCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          opCount = 0;
        }
      });
      
      if (opCount > 0) {
        batches.push(currentBatch);
      }
      
      for (const b of batches) {
        await b.commit();
      }
      
      toast.success('تم حذف التلاميذ بنجاح');
    } catch (err) {
      toast.error('فشل في الحذف الجماعي');
      console.error(err);
    }
  },`;

content = content.replace(/deleteStudent: async \(id\) => \{[\s\S]*?\},/, implementation);

fs.writeFileSync('src/stores/studentStore.ts', content);

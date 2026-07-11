const fs = require('fs');
let content = fs.readFileSync('src/stores/studentStore.ts', 'utf8');

const replacement = `importAcademicResultsStore: async (results) => {
    try {
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;
      
      results.forEach(r => {
        const id = r.id || crypto.randomUUID();
        currentBatch.set(doc(db, 'academicResults', id), { ...r, id }, { merge: true });
        count++;
        if (count === 400) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          count = 0;
        }
      });
      if (count > 0) batches.push(currentBatch);
      
      for (const b of batches) {
        await b.commit();
      }
      toast.success('تم استيراد النتائج بنجاح');
    } catch (err) {
      toast.error('خطأ في استيراد النتائج');
    }
  },

  saveBatchAcademicResults: async (resultsToUpdate, resultsToAdd) => {
    try {
      if (resultsToUpdate.length === 0 && resultsToAdd.length === 0) return;
      
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;
      
      resultsToUpdate.forEach(r => {
        currentBatch.update(doc(db, 'academicResults', r.id), r.updates);
        count++;
        if (count === 400) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          count = 0;
        }
      });
      
      resultsToAdd.forEach(r => {
        const id = crypto.randomUUID();
        currentBatch.set(doc(db, 'academicResults', id), { ...r, id });
        count++;
        if (count === 400) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          count = 0;
        }
      });
      
      if (count > 0) batches.push(currentBatch);
      
      for (const b of batches) {
        await b.commit();
      }
      
      toast.success('تم حفظ النتائج بنجاح');
    } catch (err) {
      console.error('Save batch error', err);
      toast.error('فشل في حفظ النتائج');
    }`;

content = content.replace(/importAcademicResultsStore: async \(results\) => \{[\s\S]*?toast\.error\('فشل في حفظ النتائج'\);\n\s*\}/, replacement);

fs.writeFileSync('src/stores/studentStore.ts', content);

const fs = require('fs');
let content = fs.readFileSync('src/stores/studentStore.ts', 'utf8');

const target = `  importAcademicResultsStore: async (results) => {
    try {
      const batches = [];`;

const replacement = `  importAcademicResultsStore: async (results) => {
    try {
      if (results && results.length > 0) {
        set((state) => {
          const newResults = [...state.academicResults];
          results.forEach(r => {
            const index = newResults.findIndex(ex => ex.id === r.id);
            if (index >= 0) newResults[index] = { ...newResults[index], ...r };
            else newResults.push({ ...r, id: r.id || crypto.randomUUID() });
          });
          return { academicResults: newResults };
        });
      }
      
      const batches = [];`;

content = content.replace(target, replacement);

const saveBatchTarget = `  saveBatchAcademicResults: async (resultsToUpdate, resultsToAdd) => {
    try {
      if (resultsToUpdate.length === 0 && resultsToAdd.length === 0) return;
      
      const batches = [];`;

const saveBatchReplacement = `  saveBatchAcademicResults: async (resultsToUpdate, resultsToAdd) => {
    try {
      if (resultsToUpdate.length === 0 && resultsToAdd.length === 0) return;
      
      set((state) => {
        const newResults = [...state.academicResults];
        resultsToUpdate.forEach(r => {
          const index = newResults.findIndex(ex => ex.id === r.id);
          if (index >= 0) newResults[index] = { ...newResults[index], ...r.updates };
        });
        resultsToAdd.forEach(r => {
          newResults.push({ ...r, id: crypto.randomUUID() });
        });
        return { academicResults: newResults };
      });
      
      const batches = [];`;

content = content.replace(saveBatchTarget, saveBatchReplacement);

fs.writeFileSync('src/stores/studentStore.ts', content);
console.log('studentStore academic results updated');

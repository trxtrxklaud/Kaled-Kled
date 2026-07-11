const fs = require('fs');
let content = fs.readFileSync('src/stores/studentStore.ts', 'utf8');

const importStudentsRegex = /importStudents:\s*async\s*\(\s*data\s*,\s*defaultClass\s*\)\s*=>\s*\{[\s\S]*?(?=\s*addAcademicResult:\s*async)/;

const newImportStudents = `importStudents: async (data, defaultClass) => {
    try {
      if (!data || !Array.isArray(data)) {
        toast.error('بيانات الملف غير صالحة');
        return;
      }
      
      const findValue = (obj: any, keys: string[]) => {
        if (!obj || typeof obj !== 'object') return undefined;
        const found = Object.keys(obj).find(k => keys.some(key => k.toLowerCase().includes(key.toLowerCase())));
        return found ? obj[found] : undefined;
      };

      const newStudents = data.map((item, index) => {
        try {
          if (!item || typeof item !== 'object') return null;
          // Skip completely empty rows
          if (Object.keys(item).length === 0) return null;

          let fullName = item.full_name || item.fullName || findValue(item, ['اسم', 'nom', 'name', 'تلميذ', 'eleve', 'student']);
          let className = item.class || findValue(item, ['قسم', 'صف', 'classe', 'niveau', 'level']);
          
          if (!fullName) {
             // Try to find any string column that looks like a name
             const firstStringKey = Object.keys(item).find(k => typeof item[k] === 'string' && isNaN(Number(item[k])) && item[k].trim().length > 2);
             fullName = firstStringKey ? item[firstStringKey] : \`تلميذ غير مسمى \${index + 1}\`;
          }
          
          if (!className) {
             className = defaultClass || 'قسم غير محدد';
          }

          return {
            id: crypto.randomUUID(),
            fullName: String(fullName).trim(),
            class: String(className).trim(),
            birthDate: String(item.birth_date || findValue(item, ['تاريخ', 'date']) || '').trim(),
            parentName: String(item.parent_name || findValue(item, ['ولي', 'parent']) || '').trim(),
            parentPhone: String(item.parent_phone || findValue(item, ['هاتف', 'tel', 'phone']) || '').trim(),
            notes: String(item.notes || findValue(item, ['ملاحظة', 'note']) || '').trim(),
          };
        } catch (e) {
          console.error("Error parsing student row", e);
          return null; // Skip this row
        }
      }).filter(Boolean) as Student[];

      const existingNames = new Set(get().students.map(s => s.fullName.trim().toLowerCase()));
      const filtered = newStudents.filter(s => {
        const name = s.fullName.trim().toLowerCase();
        if (existingNames.has(name)) return false;
        existingNames.add(name);
        return true;
      });

      if (filtered.length > 0) {
        const batch = writeBatch(db);
        filtered.forEach(s => batch.set(doc(db, 'students', s.id), s, { merge: true }));
        await batch.commit();
        toast.success(\`تم الاستيراد بنجاح مع إصلاح بعض البيانات غير المنظمة تلقائياً (\${filtered.length} تلميذ)\`);
      } else {
         toast.warning('لم يتم العثور على تلاميذ جدد للاستيراد');
      }
    } catch (err) {
      console.error("Import students error:", err);
      toast.error('حدث خطأ أثناء استيراد البيانات. يرجى التحقق من الملف.');
    }
  },`;

content = content.replace(importStudentsRegex, newImportStudents + "\n");
fs.writeFileSync('src/stores/studentStore.ts', content);
console.log("studentStore updated");

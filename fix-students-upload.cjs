const fs = require('fs');
let content = fs.readFileSync('src/pages/Students.tsx', 'utf8');

const replacement = `const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv') && !fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
        toast.error('Format de fichier non supporté. Veuillez utiliser un fichier XLSX, XLS, CSV, HTML ou HTM.');
        if (e.target) e.target.value = '';
        return;
      }

      if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        const text = await file.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const rows: unknown[] = [];
        
        doc.querySelectorAll('tr').forEach((tr, index) => {
          if (index === 0) return; // skip header
          const tds = tr.querySelectorAll('td, th');
          if (tds.length >= 2) {
            rows.push({
              fullName: tds[0]?.textContent?.trim() || '',
              class: tds[1]?.textContent?.trim() || ''
            });
          }
        });
        
        if (rows.length > 0) {
          await importStudents(rows as ImportStudentData[], selectedClass || undefined);
          setIsImportDialogOpen(false);
        } else {
          toast.error(t('no_data'));
        }
      } else {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length > 0) {
          await importStudents(data, selectedClass || undefined);
          setIsImportDialogOpen(false);
        } else {
          toast.error(t('no_data'));
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(t('error_import'));
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };`;

content = content.replace(/const handleFileUpload = async \([\s\S]*?\n\s*\}\n\s*\};/, replacement);
fs.writeFileSync('src/pages/Students.tsx', content);
console.log("Students.tsx updated");

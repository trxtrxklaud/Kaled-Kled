const fs = require('fs');
let content = fs.readFileSync('src/pages/Students.tsx', 'utf8');

const replacement = `const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length > 0) {
          importStudents(data, selectedClass || undefined);
          toast.success(t('success_import'));
          setIsImportDialogOpen(false);
        } else {
          toast.error(t('no_data'));
        }
      }
    } catch {`;

content = content.replace(/const reader = new FileReader\(\);[\s\S]*?reader\.readAsBinaryString\(file\);\n\s*\}\n\s*\} catch \{/, replacement);

fs.writeFileSync('src/pages/Students.tsx', content);

const fs = require('fs');
let content = fs.readFileSync('src/pages/Students.tsx', 'utf8');

// Update useStudentStore destructuring
content = content.replace(/deleteStudent, importStudents \} = useStudentStore\(\);/, 
`deleteStudent, bulkDeleteStudents, importStudents } = useStudentStore();`);

// Update handleBulkDelete
const newBulkDelete = `const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);
    const toDelete = students.filter(s => idsToDelete.includes(s.id));
    setDeletedStack(prev => [...prev, toDelete]);
    await bulkDeleteStudents(idsToDelete);
    setSelectedIds(new Set());
  };
  
  const handleDeleteClass = async () => {
    const classStudentsIds = students.filter(s => s.class === selectedClass).map(s => s.id);
    if (classStudentsIds.length === 0) return;
    
    if (window.confirm(isRTL ? 'هل أنت متأكد من حذف جميع تلاميذ هذا القسم؟' : 'Êtes-vous sûr de vouloir supprimer tous les élèves de cette classe ?')) {
      const toDelete = students.filter(s => classStudentsIds.includes(s.id));
      setDeletedStack(prev => [...prev, toDelete]);
      await bulkDeleteStudents(classStudentsIds);
      setSelectedIds(new Set());
    }
  };`;

content = content.replace(/const handleBulkDelete = \(\) => \{[\s\S]*?toast\.success[^;]+;\n\s*\};/, newBulkDelete);

// Add Delete Class button
const deleteClassBtn = `{canModify && (
            <Button 
              variant="destructive" 
              className="h-10 sm:h-11 px-4 rounded-full shadow-sm font-semibold text-xs"
              onClick={handleDeleteClass}
            >
              <Trash2 className="w-4 h-4 mr-2" /> {isRTL ? 'حذف القسم' : 'Supprimer la classe'}
            </Button>
          )}
          {canModify && selectedIds.size > 0 && (`;

content = content.replace(/\{canModify && selectedIds\.size > 0 && \(/, deleteClassBtn);

fs.writeFileSync('src/pages/Students.tsx', content);

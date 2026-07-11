const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const target = `<Button variant="outline" className="relative overflow-hidden rounded-full shadow-sm text-blue-600 border-blue-200 hover:bg-blue-50">
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleImportFile(e, selectedClass, selectedTrimester, isRTL, handleImportedData)}
                />
                <FileUp className="w-4 h-4 mr-2" /> {isRTL ? 'استيراد' : 'Importer'}
              </Button>`;

const replacement = `<label className="relative inline-flex items-center justify-center h-10 px-4 text-sm font-medium transition-colors border rounded-full shadow-sm cursor-pointer whitespace-nowrap border-blue-200 text-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv,image/*,.png,.jpg,.jpeg" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleImportFile(e, selectedClass, selectedTrimester, isRTL, handleImportedData)}
                />
                <FileUp className="w-4 h-4 mr-2" /> {isRTL ? 'استيراد' : 'Importer'}
              </label>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/pages/Results.tsx', content);
  console.log("Success replacing Results.tsx");
} else {
  console.log("Target not found in Results.tsx");
}


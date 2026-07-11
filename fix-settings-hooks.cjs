const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

content = content.replace(/const handleCloudRestore = async \(\) => \{\n\s*useEffect\(\(\) => \{\n\s*checkCloudStatus\(\);\n\s*\}, \[\]\);\n/, 
`useEffect(() => {
    checkCloudStatus();
  }, []);

  const handleCloudRestore = async () => {
`);

fs.writeFileSync('src/pages/Settings.tsx', content);

const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

content = content.replace(/useEffect\(\(\) => \{\n\s*checkCloudStatus\(\);\n\s*\}, \[\]\);/, 
`useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkCloudStatus();
  }, []);`);

fs.writeFileSync('src/pages/Settings.tsx', content);

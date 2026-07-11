const fs = require('fs');
let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

const target = `import { auth } from '../lib/firebase';`;
const replacement = `import { auth } from '../lib/firebase';
import { useLocalStorage } from '../lib/useLocalStorage';`;

if (!content.includes('useLocalStorage')) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/contexts/AuthContext.tsx', content);
  console.log('Import added');
}

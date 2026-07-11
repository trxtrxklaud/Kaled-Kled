const fs = require('fs');
let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

const importTarget = `import { auth, db } from '../lib/firebase';`;
const importReplacement = `import { auth, db } from '../lib/firebase';
import { useLocalStorage } from '../lib/useLocalStorage';`;

if (!content.includes('useLocalStorage')) {
  content = content.replace(importTarget, importReplacement);
}

const stateTarget = `  const [user, setUser] = React.useState<any>(null);`;
const stateReplacement = `  const [user, setUser] = useLocalStorage<any>('auth_user_session', null);`;

content = content.replace(stateTarget, stateReplacement);

fs.writeFileSync('src/contexts/AuthContext.tsx', content);
console.log('AuthContext.tsx updated to use localStorage for user session');

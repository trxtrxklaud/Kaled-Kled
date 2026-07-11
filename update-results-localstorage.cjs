const fs = require('fs');
let content = fs.readFileSync('src/pages/Results.tsx', 'utf8');

const importTarget = `import { Trophy, FileUp, Save, Printer } from 'lucide-react';`;
const importReplacement = `import { Trophy, FileUp, Save, Printer } from 'lucide-react';
import { useLocalStorage } from '../lib/useLocalStorage';`;

if (content.includes("import { Trophy, FileUp, Save, Printer } from 'lucide-react';")) {
    content = content.replace(importTarget, importReplacement);
} else {
    content = `import { useLocalStorage } from '../lib/useLocalStorage';\n` + content;
}

const stateTarget = `  const [localScores, setLocalScores] = useState<Record<string, Record<string, string>>>({});`;
const stateReplacement = `  const [localScores, setLocalScores] = useLocalStorage<Record<string, Record<string, string>>>('draft_results_scores', {});`;

content = content.replace(stateTarget, stateReplacement);

fs.writeFileSync('src/pages/Results.tsx', content);
console.log('Results.tsx updated to use localStorage for draft scores');

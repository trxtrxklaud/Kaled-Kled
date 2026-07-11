const fs = require('fs');
let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
content = content.replace(/const syncFirebase = async \(email: string, userDoc: any\) => \{[\s\S]*?catch \(err\) \{[\s\S]*?\}[\s\S]*?\}[\s\S]*?\};/, 
`const syncFirebase = async (email: string, userDoc: any) => {
      console.log('Mock syncFirebase called for', email);
    };`);
fs.writeFileSync('src/contexts/AuthContext.tsx', content);

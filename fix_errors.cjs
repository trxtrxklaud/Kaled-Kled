const fs = require('fs');

// Fix Communication.tsx
let commCode = fs.readFileSync('src/pages/Communication.tsx', 'utf8');
const badLine = "  React.useEffect(() => { if (isAdmin) fetchAllEvents(); }, [isAdmin, fetchAllEvents]);";
commCode = commCode.replace(badLine, "");
commCode = commCode.replace("const { isAdmin } = useAuth();", "const { isAdmin } = useAuth();\n  React.useEffect(() => { if (isAdmin) fetchAllEvents(); }, [isAdmin, fetchAllEvents]);");
fs.writeFileSync('src/pages/Communication.tsx', commCode);

// Fix Notifications.tsx
let notifCode = fs.readFileSync('src/pages/Notifications.tsx', 'utf8');
notifCode = notifCode.replace("import { Card, CardContent, CardHeader, CardTitle, CardDescription }", "import { Card, CardContent }");
fs.writeFileSync('src/pages/Notifications.tsx', notifCode);

// Fix notificationStore.ts
let storeCode = fs.readFileSync('src/stores/notificationStore.ts', 'utf8');
storeCode = storeCode.replace("import { collection, query, where, onSnapshot, doc, setDoc, getDocs, orderBy }", "import { collection, query, where, onSnapshot, doc, setDoc, getDocs }");
storeCode = storeCode.replace("import { toast } from 'sonner';\n", "");
fs.writeFileSync('src/stores/notificationStore.ts', storeCode);

console.log("Fixed errors");

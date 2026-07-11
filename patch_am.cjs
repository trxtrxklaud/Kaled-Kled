const fs = require('fs');

let am = fs.readFileSync('src/pages/AttendanceMonitoring.tsx', 'utf8');

am = am.replace("import { useAuth } from '../contexts/AuthContext';", "");
am = am.replace("import { Calendar, Filter, Users, UserRound, Clock, AlertCircle } from 'lucide-react';", "import { Calendar, AlertCircle } from 'lucide-react';");

fs.writeFileSync('src/pages/AttendanceMonitoring.tsx', am);
console.log("Patched am");

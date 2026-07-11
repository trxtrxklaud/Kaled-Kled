const fs = require('fs');

// Fix ParentPortal.tsx
let pp = fs.readFileSync('src/pages/ParentPortal.tsx', 'utf8');
pp = pp.replace("import { motion, AnimatePresence } from 'framer-motion';", "");
pp = pp.replace("  ChevronDown,\n  ChevronUp,\n", "");
pp = pp.replace("  User,\n", "");
pp = pp.replace("const { user, updateUser } = useAuth();", "const { user } = useAuth();");
pp = pp.replace("const [expandedSection, setExpandedSection] = useState<string | null>('overview');", "");
fs.writeFileSync('src/pages/ParentPortal.tsx', pp);

// Fix Dashboard.tsx
let dash = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
dash = dash.replace("import React, { useState } from 'react';", "import React from 'react';");
dash = dash.replace("import { useUserStore } from '../stores/userStore';\n", "");
dash = dash.replace("import { Button } from '../components/ui/button';\n", "");
fs.writeFileSync('src/pages/Dashboard.tsx', dash);

console.log("Lint fixes applied.");

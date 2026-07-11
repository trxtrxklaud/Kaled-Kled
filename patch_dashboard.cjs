const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const importTarget = "import type { NewsItem } from '../lib/types';";
const importReplacement = "import type { NewsItem } from '../lib/types';\nimport { ParentPortal } from './ParentPortal';";

const parentDashboardTarget = `const ParentDashboard: React.FC = () => {`;
const parentDashboardEndTarget = `const Dashboard: React.FC = () => {`;

if (code.includes(parentDashboardTarget) && code.includes(parentDashboardEndTarget)) {
  const startIndex = code.indexOf(parentDashboardTarget);
  const endIndex = code.indexOf(parentDashboardEndTarget);
  code = code.slice(0, startIndex) + code.slice(endIndex);
  code = code.replace(importTarget, importReplacement);
  
  // Also we need to change `<ParentDashboard />` to `<ParentPortal />`
  code = code.replace("<ParentDashboard />", "<ParentPortal />");

  fs.writeFileSync('src/pages/Dashboard.tsx', code);
  console.log("Patched Dashboard.tsx successfully");
} else {
  console.log("Could not find ParentDashboard block");
}

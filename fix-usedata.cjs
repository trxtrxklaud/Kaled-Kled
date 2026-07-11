const fs = require('fs');
const path = require('path');

function getFiles(dir, files_) {
  files_ = files_ || [];
  const files = fs.readdirSync(dir);
  for (const i in files) {
    const name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else if (name.endsWith('.tsx') || name.endsWith('.ts')) {
      files_.push(name);
    }
  }
  return files_;
}

const files = getFiles('src');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (file.includes('CertificateRegistry.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const { certificateRegistry, addCertificateRegistryEntries, revokeCertificateRegistryEntry } = useAcademicStore();\n  const { appPreferences } = useSettingsStore();`);
    content = `import { useAcademicStore } from '../stores/academicStore';\nimport { useSettingsStore } from '../stores/settingsStore';\n` + content;
    changed = true;
  }
  
  if (file.includes('Certificates.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const { addCertificateRegistryEntries } = useAcademicStore();\n  const { schoolBranding } = useSettingsStore();\n  const { addEmailDeliveryLog } = useCommunicationStore();`);
    content = `import { useAcademicStore } from '../stores/academicStore';\nimport { useSettingsStore } from '../stores/settingsStore';\nimport { useCommunicationStore } from '../stores/communicationStore';\n` + content;
    changed = true;
  }

  if (file.includes('Communication.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const { messages, markMessageRead, addMessage } = useCommunicationStore();`);
    content = `import { useCommunicationStore } from '../stores/communicationStore';\n` + content;
    changed = true;
  }

  if (file.includes('Dashboard.tsx') && !file.includes('Dashboard/')) {
    content = content.replace(/const \{ students, exams, messages, emailDeliveryLogs, addNews \}\s*=\s*useData\(\);/, 
      `const { students } = useStudentStore();\n  const { exams } = useAcademicStore();\n  const { messages, emailDeliveryLogs, addNews } = useCommunicationStore();`);
    content = content.replace(/const \{ students, parentUsers, updateParentUser, setAuthSessionUser, homeworks, posts \}\s*=\s*useData\(\);/, 
      `const { students } = useStudentStore();\n  const { parentUsers, updateParentUser } = useUserStore();\n  const { homeworks } = useAcademicStore();\n  const { posts } = useCommunicationStore();`);
    content = `import { useUserStore } from '../stores/userStore';\nimport { useAcademicStore } from '../stores/academicStore';\nimport { useCommunicationStore } from '../stores/communicationStore';\n` + content;
    changed = true;
  }

  if (file.includes('EduservIntegration.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const { eduservSyncLogs, addEduservSyncLog, triggerBackup } = useSettingsStore();`);
    content = `import { useSettingsStore } from '../stores/settingsStore';\n` + content;
    changed = true;
  }

  if (file.includes('Finance.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const { financeArrears, addFinanceArrear, updateFinanceArrear, sendPaymentReminder } = useFinanceStore();`);
    content = `import { useFinanceStore } from '../stores/financeStore';\n` + content;
    changed = true;
  }

  if (file.includes('Homework.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const { homeworks, addHomework, updateHomework, deleteHomework, academicAssets, addAcademicAsset, removeAcademicAsset } = useAcademicStore();`);
    content = `import { useAcademicStore } from '../stores/academicStore';\n` + content;
    changed = true;
  }

  if (file.includes('Login.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const isDataLoaded = true;`);
    changed = true;
  }

  if (file.includes('NewsFeed.tsx') && !file.includes('Dashboard/')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const { posts, addPost, likePost, addComment, editPost, deletePost } = useCommunicationStore();\n  const { students } = useStudentStore();`);
    content = `import { useCommunicationStore } from '../stores/communicationStore';\nimport { useStudentStore } from '../stores/studentStore';\n` + content;
    changed = true;
  }

  if (file.includes('Parents.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const { parentUsers, addParentUser } = useUserStore();`);
    content = `import { useUserStore } from '../stores/userStore';\n` + content;
    changed = true;
  }

  if (file.includes('Results.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const { students, academicResults, addAcademicResult, updateAcademicResult, importAcademicResultsStore } = useStudentStore();\n  const importAcademicResults = importAcademicResultsStore;`);
    changed = true;
  }

  if (file.includes('Schedules.tsx')) {
    content = content.replace(/const \{\s*exams,\s*addExam,\s*deleteExam,\s*importExams,\s*examPlanningFiles,\s*addExamPlanningFile,\s*deleteExamPlanningFile,\s*schoolBranding,\s*\}\s*=\s*useData\(\);/, 
      `const { exams, addExam, deleteExam, importExams, examPlanningFiles, addExamPlanningFile, deleteExamPlanningFile } = useAcademicStore();\n  const { schoolBranding } = useSettingsStore();`);
    content = `import { useAcademicStore } from '../stores/academicStore';\nimport { useSettingsStore } from '../stores/settingsStore';\n` + content;
    changed = true;
  }

  if (file.includes('SchoolHeaderConfig.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const { schoolBranding, updateSchoolBranding } = useSettingsStore();`);
    content = `import { useSettingsStore } from '../stores/settingsStore';\n` + content;
    changed = true;
  }

  if (file.includes('Dashboard/NewsFeed.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const { news, deleteNews } = useCommunicationStore();`);
    content = `import { useCommunicationStore } from '../../stores/communicationStore';\n` + content;
    changed = true;
  }

  if (file.includes('PrivateRoute.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const isDataLoaded = true;`);
    changed = true;
  }

  if (file.includes('LanguageContext.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const appPreferences = { language: 'fr' };\n  const updateAppLanguage = (lang: string) => {\n    import('../stores/settingsStore').then(m => m.useSettingsStore.getState().updateAppPreferences({ language: lang }));\n  };`);
    changed = true;
  }

  if (file.includes('AuthContext.tsx')) {
    content = content.replace(/const \{[^}]+\}\s*=\s*useData\(\);/, 
      `const [user, setUser] = useState<any>(null);\n  const setAuthSessionUser = setUser;\n  const parentUsers: any[] = [];`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
}

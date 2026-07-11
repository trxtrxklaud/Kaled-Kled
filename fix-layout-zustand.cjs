const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.tsx', 'utf8');

const target = `  const { fetchData: fetchStudents, clearStore: clearStudents } = useStudentStore();
  const { fetchData: fetchEmployees, clearStore: clearEmployees } = useEmployeeStore();
  const { fetchData: fetchSchool, clearStore: clearSchool } = useSchoolStore();
  const { fetchData: fetchSettings, clearStore: clearSettings } = useSettingsStore();`;

const replacement = `  const fetchStudents = useStudentStore(state => state.fetchData);
  const clearStudents = useStudentStore(state => state.clearStore);
  const fetchEmployees = useEmployeeStore(state => state.fetchData);
  const clearEmployees = useEmployeeStore(state => state.clearStore);
  const fetchSchool = useSchoolStore(state => state.fetchData);
  const clearSchool = useSchoolStore(state => state.clearStore);
  const fetchSettings = useSettingsStore(state => state.fetchData);
  const clearSettings = useSettingsStore(state => state.clearStore);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/Layout.tsx', content);
console.log('Layout.tsx Zustand selectors fixed');

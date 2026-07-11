const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const t1 = `  const { students } = useStudentStore();
  const { parentUsers, updateParentUser } = useUserStore();
  const { homeworks } = useAcademicStore();
  const { posts } = useCommunicationStore();`;

const r1 = `  const students = useStudentStore(state => state.students);
  const parentUsers = useUserStore(state => state.parentUsers);
  const updateParentUser = useUserStore(state => state.updateParentUser);
  const homeworks = useAcademicStore(state => state.homeworks);
  const posts = useCommunicationStore(state => state.posts);`;

const t2 = `  const { students } = useStudentStore();
  const { exams } = useAcademicStore();
  const { messages, emailDeliveryLogs, addNews } = useCommunicationStore();
  const { employees } = useEmployeeStore();
  const { announcements } = useSchoolStore();`;

const r2 = `  const students = useStudentStore(state => state.students);
  const exams = useAcademicStore(state => state.exams);
  const messages = useCommunicationStore(state => state.messages);
  const emailDeliveryLogs = useCommunicationStore(state => state.emailDeliveryLogs);
  const addNews = useCommunicationStore(state => state.addNews);
  const employees = useEmployeeStore(state => state.employees);
  const announcements = useSchoolStore(state => state.announcements);`;

content = content.replace(t1, r1);
content = content.replace(t2, r2);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
console.log('Dashboard.tsx Zustand selectors fixed');

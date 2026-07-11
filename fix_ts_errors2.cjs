const fs = require('fs');
let code = fs.readFileSync('src/pages/TeacherPortal.tsx', 'utf8');

// Fix 't'
code = code.replace("const { isRTL, t } = useLanguage();", "const { isRTL } = useLanguage();");

// Fix 'SchoolLevel'
code = code.replace("level: '1ère', // fallback, should be from student", "level: (student.class ? student.class[0] as any : '1'),");

// Fix Post
const badPostObj = `    await addPost({
      author: user?.name || 'Teacher',
      authorRole: 'Teacher',
      content: noteText,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
      audience: \`Classes: \${selectedClass}\`
    });`;

const goodPostObj = `    await addPost({
      author: user?.name || 'Teacher',
      role: 'teacher',
      date: new Date().toISOString(),
      content: noteText,
      audience: \`Classes: \${selectedClass}\`,
      images: [],
      likedByCurrentUser: false
    });`;

code = code.replace(badPostObj, goodPostObj);

fs.writeFileSync('src/pages/TeacherPortal.tsx', code);
console.log("Fixed TS errors");

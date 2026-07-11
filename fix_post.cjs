const fs = require('fs');
let code = fs.readFileSync('src/pages/TeacherPortal.tsx', 'utf8');

code = code.replace("authorRole: 'Teacher',", "role: 'teacher',");
code = code.replace("timestamp: new Date().toISOString(),", "date: new Date().toISOString(),");
code = code.replace("likes: 0,", "images: [],");
code = code.replace("comments: 0,", "likedByCurrentUser: false,");

fs.writeFileSync('src/pages/TeacherPortal.tsx', code);
console.log("Fixed Post object");

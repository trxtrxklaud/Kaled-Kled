const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  "<Route path=\"/attendance-monitoring\" element={<PrivateRoute allowedRoles={['admin']}><AttendanceMonitoring /></PrivateRoute>} />",
  "<Route path=\"/attendance-monitoring\" element={<PrivateRoute allowedRoles={['admin', 'staff']}><AttendanceMonitoring /></PrivateRoute>} />"
);
fs.writeFileSync('src/App.tsx', app);
console.log("Patched app");

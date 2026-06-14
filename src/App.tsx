import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Employees from "./pages/Employees";
import Parents from "./pages/Parents";
import Schedules from "./pages/Schedules";
import HomeworkPage from "./pages/Homework";
import NewsFeed from "./pages/NewsFeed";
import EduservIntegration from "./pages/EduservIntegration";
import Communication from "./pages/Communication";
import Statistics from "./pages/Statistics";
import CertificatesPage from "./pages/Certificates";
import CertificateRegistryPage from "./pages/CertificateRegistry";
import SchoolHeaderConfig from "./pages/SchoolHeaderConfig";
import Finance from "./pages/Finance";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<Layout />}>
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/students" element={<PrivateRoute allowedRoles={['admin', 'staff', 'teacher']}><Students /></PrivateRoute>} />
          <Route path="/employees" element={<PrivateRoute allowedRoles={['admin', 'staff']}><Employees /></PrivateRoute>} />
          <Route path="/parents" element={<PrivateRoute allowedRoles={['admin', 'staff']}><Parents /></PrivateRoute>} />
          <Route path="/schedules" element={<PrivateRoute allowedRoles={['admin', 'staff', 'teacher']}><Schedules /></PrivateRoute>} />
          <Route path="/homework" element={<PrivateRoute allowedRoles={['admin', 'staff', 'teacher']}><HomeworkPage /></PrivateRoute>} />
          <Route path="/newsfeed" element={<PrivateRoute allowedRoles={['admin', 'staff', 'teacher']}><NewsFeed /></PrivateRoute>} />
          <Route path="/eduserv" element={<PrivateRoute allowedRoles={['admin', 'staff']}><EduservIntegration /></PrivateRoute>} />
          <Route path="/communication" element={<PrivateRoute allowedRoles={['admin', 'staff', 'teacher']}><Communication /></PrivateRoute>} />
          <Route path="/statistics" element={<PrivateRoute allowedRoles={['admin', 'staff']}><Statistics /></PrivateRoute>} />
          <Route path="/certificates" element={<PrivateRoute allowedRoles={['admin', 'staff']}><CertificatesPage /></PrivateRoute>} />
          <Route path="/certificate-registry" element={<PrivateRoute allowedRoles={['admin', 'staff']}><CertificateRegistryPage /></PrivateRoute>} />
          <Route path="/school-header" element={<PrivateRoute allowedRoles={['admin']}><SchoolHeaderConfig /></PrivateRoute>} />
          <Route path="/finance" element={<PrivateRoute allowedRoles={['admin']}><Finance /></PrivateRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
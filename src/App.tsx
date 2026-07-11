import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useWakeLock } from "./lib/useWakeLock";

function RoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isInitialLoad = !sessionStorage.getItem('app_initialized');
    const savedPath = localStorage.getItem('lastPath');
    
    if (isInitialLoad) {
      sessionStorage.setItem('app_initialized', 'true');
      if (savedPath && savedPath !== '/' && savedPath !== '/login' && location.pathname === '/') {
        navigate(savedPath, { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (location.pathname !== '/login') {
      localStorage.setItem('lastPath', location.pathname);
    }
  }, [location.pathname]);

  return null;
}
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
import Results from "./pages/Results";
import CertificatesPage from "./pages/Certificates";
import CertificateRegistryPage from "./pages/CertificateRegistry";
import SchoolHeaderConfig from "./pages/SchoolHeaderConfig";
import Finance from "./pages/Finance";
import PrivateRoute from "./components/PrivateRoute";
import { Notifications } from "./pages/Notifications";
import Settings from "./pages/Settings";
import { AttendanceMonitoring } from "./pages/AttendanceMonitoring";

function App() {
  useWakeLock();
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
          };
    
    // Prevent default drag and drop behavior on the window
    // to stop the browser from opening the file and leaving the app
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  return (
    <BrowserRouter>
      <RoutePersistence />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<Layout />}>
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute allowedRoles={['admin', 'staff']}><Dashboard /></PrivateRoute>} />
          <Route path="/teacher" element={<PrivateRoute allowedRoles={['teacher']}><Dashboard /></PrivateRoute>} />
          <Route path="/parent" element={<PrivateRoute allowedRoles={['parent']}><Dashboard /></PrivateRoute>} />
          <Route path="/students" element={<PrivateRoute allowedRoles={['admin', 'staff', 'teacher']}><Students /></PrivateRoute>} />
          <Route path="/employees" element={<PrivateRoute allowedRoles={['admin', 'staff']}><Employees /></PrivateRoute>} />
          <Route path="/parents" element={<PrivateRoute allowedRoles={['admin', 'staff']}><Parents /></PrivateRoute>} />
          <Route path="/schedules" element={<PrivateRoute allowedRoles={['admin', 'staff', 'teacher', 'parent']}><Schedules /></PrivateRoute>} />
          <Route path="/homework" element={<PrivateRoute allowedRoles={['admin', 'staff', 'teacher', 'parent']}><HomeworkPage /></PrivateRoute>} />
          <Route path="/newsfeed" element={<PrivateRoute allowedRoles={['admin', 'staff', 'teacher', 'parent']}><NewsFeed /></PrivateRoute>} />
          <Route path="/eduserv" element={<PrivateRoute allowedRoles={['admin', 'staff']}><EduservIntegration /></PrivateRoute>} />
          <Route path="/communication" element={<PrivateRoute allowedRoles={['admin', 'staff', 'teacher']}><Communication /></PrivateRoute>} />
          <Route path="/results" element={<PrivateRoute allowedRoles={['admin', 'staff', 'teacher', 'parent']}><Results /></PrivateRoute>} />
          <Route path="/certificates" element={<PrivateRoute allowedRoles={['admin', 'staff']}><CertificatesPage /></PrivateRoute>} />
          <Route path="/certificate-registry" element={<PrivateRoute allowedRoles={['admin', 'staff']}><CertificateRegistryPage /></PrivateRoute>} />
          <Route path="/school-header" element={<PrivateRoute allowedRoles={['admin']}><SchoolHeaderConfig /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute allowedRoles={['admin']}><Settings /></PrivateRoute>} />
          <Route path="/attendance-monitoring" element={<PrivateRoute allowedRoles={['admin', 'staff']}><AttendanceMonitoring /></PrivateRoute>} />
          <Route path="/finance" element={<PrivateRoute allowedRoles={['admin']}><Finance /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute allowedRoles={['admin', 'parent']}><Notifications /></PrivateRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
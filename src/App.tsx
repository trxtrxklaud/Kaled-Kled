import React, { useEffect, useRef, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useWakeLock } from "./lib/useWakeLock";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import PrivateRoute from "./components/PrivateRoute";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const Employees = lazy(() => import("./pages/Employees"));
const Parents = lazy(() => import("./pages/Parents"));
const Schedules = lazy(() => import("./pages/Schedules"));
const HomeworkPage = lazy(() => import("./pages/Homework"));
const NewsFeed = lazy(() => import("./pages/NewsFeed"));
const EduservIntegration = lazy(() => import("./pages/EduservIntegration"));
const Communication = lazy(() => import("./pages/Communication"));
const Results = lazy(() => import("./pages/Results"));
const CertificatesPage = lazy(() => import("./pages/Certificates"));
const CertificateRegistryPage = lazy(() => import("./pages/CertificateRegistry"));
const SchoolHeaderConfig = lazy(() => import("./pages/SchoolHeaderConfig"));
const Finance = lazy(() => import("./pages/Finance"));
const Notifications = lazy(() => import("./pages/Notifications").then(m => ({ default: m.Notifications })));
const Settings = lazy(() => import("./pages/Settings"));
const AttendanceMonitoring = lazy(() => import("./pages/AttendanceMonitoring").then(m => ({ default: m.AttendanceMonitoring })));

// Simple loading fallback
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
  </div>
);

function RoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasInitialized = useRef(false);

  // One-time restoration on first mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const savedPath = localStorage.getItem("lastPath");
    if (
      savedPath &&
      savedPath !== "/" &&
      savedPath !== "/login" &&
      location.pathname === "/"
    ) {
      navigate(savedPath, { replace: true });
    }
  }, [navigate, location.pathname]);

  // Save last path on each navigation (except /login)
  useEffect(() => {
    if (location.pathname !== "/login") {
      localStorage.setItem("lastPath", location.pathname);
    }
  }, [location.pathname]);

  // set initial flag so tests / logic elsewhere can rely on it (optional)
  useEffect(() => {
    if (!sessionStorage.getItem("app_initialized")) {
      sessionStorage.setItem("app_initialized", "true");
    }
  }, []);

  return null;
}

function App({
  RouterComponent = BrowserRouter,
  initialEntries,
}: {
  RouterComponent?: typeof BrowserRouter;
  initialEntries?: string[];
}) {
  useWakeLock();

  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  // Allow injecting a Router for tests; when initialEntries provided, use RouterComponent as wrapper
  const RouterWrapper: React.FC<{ children: React.ReactNode }> = initialEntries
    ? ({ children }) => (
        // @ts-ignore - some RouterComponents accept initialEntries (MemoryRouter)
        <RouterComponent initialEntries={initialEntries}>{children}</RouterComponent>
      )
    : ({ children }) => <RouterComponent>{children}</RouterComponent>;

  return (
    <ErrorBoundary>
      <RouterWrapper>
        <RoutePersistence />
        <Suspense fallback={<PageLoader />}>
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
              <Route path="/finance" element={<PrivateRoute allowedRoles={['admin']}><Finance /></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute allowedRoles={['admin', 'parent']}><Notifications /></PrivateRoute>} />
              <Route path="/attendance-monitoring" element={<PrivateRoute allowedRoles={['admin', 'staff']}><AttendanceMonitoring /></PrivateRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </RouterWrapper>
    </ErrorBoundary>
  );
}

export default App;

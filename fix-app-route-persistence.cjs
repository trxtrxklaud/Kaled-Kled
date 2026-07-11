const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const importsTarget = `import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";`;
const importsReplacement = `import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

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
}`;

content = content.replace(importsTarget, importsReplacement);

const routerTarget = `<BrowserRouter>
      <Routes>`;
const routerReplacement = `<BrowserRouter>
      <RoutePersistence />
      <Routes>`;

content = content.replace(routerTarget, routerReplacement);
fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx route persistence added');

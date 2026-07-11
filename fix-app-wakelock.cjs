const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('useWakeLock')) {
  const importsTarget = `import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";`;
  const importsReplacement = `import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useWakeLock } from "./lib/useWakeLock";`;
  
  content = content.replace(importsTarget, importsReplacement);
  
  const appTarget = `function App() {
  useEffect(() => {`;
  const appReplacement = `function App() {
  useWakeLock();
  useEffect(() => {`;
  
  content = content.replace(appTarget, appReplacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Wake lock added to App.tsx');
}

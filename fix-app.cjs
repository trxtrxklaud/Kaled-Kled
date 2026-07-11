const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const importContent = `import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";`;

const bodyContent = `function App() {
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
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

  return (`;

content = content.replace(/import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";/, importContent);
content = content.replace(/function App\(\) \{\n\s*return \(/, bodyContent);

fs.writeFileSync('src/App.tsx', content);

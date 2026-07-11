const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// Update sidebar
content = content.replace(
  '<aside className="hidden lg:flex w-72 flex-col bg-card border-slate-100 z-50 print:hidden relative transition-layout border-r shadow-sm">',
  '<aside className="sidebar hidden lg:flex flex-col z-50 print:hidden relative transition-layout">'
);

// Update main-content
content = content.replace(
  '<main className="flex-1 w-full max-w-7xl mx-auto overflow-y-auto no-scrollbar scroll-smooth print:block print:overflow-visible print:w-full print:max-w-none print:m-0 print:p-0">',
  '<main className="main-content overflow-y-auto no-scrollbar scroll-smooth print:block print:overflow-visible print:w-full print:max-w-none print:m-0 print:p-0">'
);

// Update topbar (mobile header)
content = content.replace(
  '<header className="lg:hidden sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-slate-100 p-4 safe-area-top shadow-sm">',
  '<header className="topbar lg:hidden sticky top-0 z-40 backdrop-blur-xl safe-area-top">'
);

fs.writeFileSync('src/components/Layout.tsx', content);
console.log('Layout classes updated');

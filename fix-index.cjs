const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const headEnd = `  </head>`;
const metaTags = `    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="mobile-web-app-capable" content="yes" />
    <link rel="manifest" href="/manifest.json" />
  </head>`;

content = content.replace(headEnd, metaTags);
fs.writeFileSync('index.html', content);
console.log('Added PWA meta tags to index.html');

const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('<html lang="en">', '<html lang="ar" dir="rtl">');
fs.writeFileSync('index.html', html);
console.log('index.html updated with RTL direction');

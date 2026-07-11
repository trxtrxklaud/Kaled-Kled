const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const target = `// Initialize Firestore specifying the databaseId
export const db = getFirestore(app, databaseId);`;

const replacement = `// Initialize Firestore specifying the databaseId
export const db = getFirestore(app, databaseId);

// Enable offline persistence to ensure data is immediately cached in IndexedDB
import { enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});`;

content = content.replace(target, replacement);
fs.writeFileSync('src/lib/firebase.ts', content);
console.log('Firebase offline persistence enabled');

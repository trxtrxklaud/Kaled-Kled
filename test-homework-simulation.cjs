// Simulation of Homework persistence logic from DataContext.tsx
// This mimics the addHomework, load from localStorage, and save.
// Run with: node test-homework-simulation.js

const fs = require('fs');
const path = require('path');

// Mock localStorage (since node has no browser localStorage)
let mockLocalStorage = {};
const LOCAL_STORAGE_KEY = 'providence_homeworks';

function mockGetItem(key) {
  return mockLocalStorage[key] || null;
}

function mockSetItem(key, value) {
  mockLocalStorage[key] = value;
  // Also write to a temp file for inspection
  fs.writeFileSync(path.join(__dirname, 'simulated-providence_homeworks.json'), value);
}

function mockClear() {
  mockLocalStorage = {};
}

// Simulate the DataContext homework logic
let homeworks = [];

// Simulate load (like in useEffect)
function loadHomeworks() {
  const stored = mockGetItem(LOCAL_STORAGE_KEY);
  if (stored) {
    homeworks = JSON.parse(stored);
    console.log(`[SIM] Loaded ${homeworks.length} homework(s) from storage`);
  } else {
    homeworks = [];
    console.log('[SIM] No existing homeworks, starting fresh');
  }
}

// Simulate addHomework (exactly as in DataContext)
function addHomework(homeworkData) {
  const newHomework = {
    ...homeworkData,
    id: Math.random().toString(36).substr(2, 9)
  };
  homeworks = [newHomework, ...homeworks];
  mockSetItem(LOCAL_STORAGE_KEY, JSON.stringify(homeworks));
  console.log(`[SIM] Added homework: "${newHomework.title}" with id ${newHomework.id}`);
  console.log(`[SIM] Assigned to classes: ${newHomework.classes.join(', ')}`);
  console.log(`[SIM] File attached: ${newHomework.fileName || 'none'}`);
}

// Simulate delete (for completeness, though not in this test)
function deleteHomework(id) {
  homeworks = homeworks.filter(h => h.id !== id);
  mockSetItem(LOCAL_STORAGE_KEY, JSON.stringify(homeworks));
  console.log(`[SIM] Deleted homework with id ${id}`);
}

// === END-TO-END TEST SIMULATION ===

console.log('=== Starting End-to-End "Travail à faire" Feature Simulation ===\n');

// Step 1: Initial load (simulates app start)
loadHomeworks();
console.log(`Initial homeworks count: ${homeworks.length}`);

// Step 2: Simulate wizard input - STEP 1 Content
const title = 'Exercices de mathématiques - Chapitre 5';
const description = 'Résoudre les problèmes 1 à 10 de la page 42. Rendre pour la prochaine séance.';

// Step 3: Simulate STEP 2 - Multi-select classes (e.g. 1A, 1B, 2C)
const selectedClasses = ['1A', '1B', '2C'];

// Step 4: Simulate STEP 3 - Subject & Session
const subject = 'Mathématiques';
const session = 'S1';

// Step 5: Simulate STEP 4 - File upload (image or doc)
const uploadedFile = '1708512381405.png';  // Example from prior data, simulates attached file

// Step 6: Simulate "Publish" - call addHomework with full data
const homeworkData = {
  title: title,
  description: description,
  classes: selectedClasses,
  subject: subject,
  session: session,
  fileName: uploadedFile,
  uploadDate: new Date().toISOString()
};

console.log('\n--- Simulating full wizard submission ---');
addHomework(homeworkData);

// Step 7: Verify persistence
console.log('\n--- Verification ---');
const storedAfterSave = mockGetItem(LOCAL_STORAGE_KEY);
if (storedAfterSave) {
  const parsed = JSON.parse(storedAfterSave);
  console.log(`Successfully stored in localStorage (key: ${LOCAL_STORAGE_KEY})`);
  console.log(`Total homeworks after save: ${parsed.length}`);
  const latest = parsed[0];
  console.log(`Latest entry title: "${latest.title}"`);
  console.log(`Classes: ${latest.classes.join(', ')}`);
  console.log(`Subject/Session: ${latest.subject} / ${latest.session}`);
  console.log(`File: ${latest.fileName}`);
  console.log(`Upload date: ${latest.uploadDate}`);
  console.log(`ID generated: ${latest.id}`);
  
  // Confirm no crash and data integrity
  if (latest.title === title && latest.classes.length === 3 && latest.fileName) {
    console.log('\n✅ TEST PASSED: Homework created, multi-class selected, file attached, saved to storage without errors.');
  } else {
    console.log('\n❌ TEST FAILED: Data mismatch.');
  }
} else {
  console.log('❌ TEST FAILED: No data in storage.');
}

// Step 8: Simulate reload (app restart)
console.log('\n--- Simulating app reload / re-mount ---');
homeworks = [];  // reset in-memory
loadHomeworks();
console.log(`After reload, homeworks count: ${homeworks.length}`);
if (homeworks.length > 0 && homeworks[0].title === title) {
  console.log('✅ Persistence verified across "reload" (data survived in storage).');
}

// Cleanup temp file
try {
  fs.unlinkSync(path.join(__dirname, 'simulated-providence_homeworks.json'));
} catch (e) {}

console.log('\n=== End-to-End Simulation Complete ===');
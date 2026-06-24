import { jsPDF } from 'jspdf';
const doc = new jsPDF();
const text = "Élève: احمد";
const processed = doc.processArabic(text);
console.log("Original: ", text);
console.log("Processed: ", processed);

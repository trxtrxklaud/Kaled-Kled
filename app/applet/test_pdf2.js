import { jsPDF } from 'jspdf';
const doc = new jsPDF();
const text = "شهادة";
const processed = doc.processArabic(text);
const chars = processed.split('').map(c => c.charCodeAt(0).toString(16));
console.log("CharsHex: ", chars);

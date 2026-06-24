import { jsPDF } from 'jspdf';

const doc = new jsPDF();
const text = "شهادة النتائج الدراسية";
const processed = doc.processArabic(text);
console.log("Original: ", text);
console.log("Processed: ", processed);

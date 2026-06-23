import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import notoNaskhArabicRegularBase64 from './notoNaskhArabicBase64';
import type { AcademicResult, SchoolBranding, Student } from './types';

export interface AttachmentPayload {
  fileName: string;
  blob: Blob;
}

interface SubjectStudentMetricRow {
  student: Student;
  averageScore: number;
  recordedGrades: number;
  bestScore: number;
}

interface SubjectAssessmentRow extends AcademicResult {
  student: Student | null;
}

const PRIMARY = [26, 35, 126] as const;
const ACCENT = [249, 168, 37] as const;
const SLATE = [71, 85, 105] as const;
const ARABIC_FONT_FILE = 'NotoNaskhArabic-Regular.ttf';
const ARABIC_FONT_NAME = 'NotoNaskhArabic';

const sanitizeFileName = (value: string): string => (
  value
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase() || 'report'
);

const finalizePdf = (doc: jsPDF): Blob => doc.output('blob');

const ensureArabicFont = (doc: jsPDF): void => {
  try {
    doc.addFileToVFS(ARABIC_FONT_FILE, notoNaskhArabicRegularBase64);
    doc.addFont(ARABIC_FONT_FILE, ARABIC_FONT_NAME, 'normal');
  } catch {
    // font may already be registered on this instance
  }
};

const safeArabic = (doc: jsPDF, text: string): string => {
  if (!text) return text;
  // processArabic shapes characters and usually reverses them so they draw RTL.
  return doc.processArabic(text);
};

const drawArabicText = (doc: jsPDF, text: string, x: number, y: number, fontSize = 11): void => {
  ensureArabicFont(doc);
  doc.setFont(ARABIC_FONT_NAME, 'normal');
  doc.setFontSize(fontSize);
  // Do not use setR2L to prevent double reversing
  doc.text(doc.processArabic(text), x, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
};

export const buildCertificateReference = (student: Student | null, generatedAt: string): string => {
  const year = new Date(generatedAt).getFullYear();
  const classId = student?.class || 'NA';
  const studentId = student?.id || '0000';
  return `CP-${year}-${classId}-${studentId.padStart(4, '0')}`;
};

const addSchoolStampAndSignatureArea = (doc: jsPDF, finalY: number, branding?: SchoolBranding): void => {
  const stampY = finalY + 18;

  if (branding?.stampDataUrl) {
    try {
      doc.addImage(branding.stampDataUrl, 'PNG', 147, stampY - 8, 34, 34, undefined, 'FAST');
    } catch {
      // fallback to vector stamp below
    }
  }

  if (!branding?.stampDataUrl) {
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.8);
    doc.circle(165, stampY + 4, 16);
    doc.circle(165, stampY + 4, 13);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('LA', 160, stampY + 2);
    doc.text('PROVIDENCE', 154, stampY + 7);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Tampon officiel', 149, stampY + 13);
  drawArabicText(doc, 'الختم الرسمي', 179, stampY + 13, 9);

  doc.setDrawColor(...SLATE);
  doc.line(14, stampY + 8, 80, stampY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Direction Générale', 14, stampY + 14);
  drawArabicText(doc, 'الإدارة العامة', 80, stampY + 14, 10);
};

const addOfficialHeader = (doc: jsPDF, title: string, subtitle: string, branding?: SchoolBranding): void => {
  const schoolNameFr = branding?.schoolNameFr || 'المدرسة الابتدائية الخاصة العناية';
  const schoolNameAr = branding?.schoolNameAr || 'المدرسة الابتدائية الخاصة العناية';

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setTextColor(255, 255, 255);

  if (branding?.logoDataUrl) {
    try {
      doc.addImage(branding.logoDataUrl, 'PNG', 172, 3, 18, 18, undefined, 'FAST');
    } catch {
      // ignore image failures and keep text header
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(schoolNameFr, 14, 12);
  drawArabicText(doc, schoolNameAr, branding?.logoDataUrl ? 166 : 196, 12, 13);
  doc.setFontSize(12);
  doc.text(title, 14, 19);
  doc.setTextColor(...SLATE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(subtitle, 14, 31);
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(14, 34, 196, 34);
};

export const buildAnalyticsPdfAttachment = (params: {
  scopeLabel: string;
  generatedAt: string;
  overview: {
    recordedGrades: number;
    evaluatedStudents: number;
    successRate: number;
    excellentStudents: number;
    averageScore: number;
  };
  levels: Array<{
    label: string;
    evaluatedStudents: number;
    successCount: number;
    successRate: number;
    excellenceCount: number;
    averageScore: number;
  }>;
  leaderboard: Array<{
    level: string;
    rank: number;
    studentName: string;
    classId: string;
    average: number;
    highestScore: number;
  }>;
  branding?: SchoolBranding;
}): AttachmentPayload => {
  const doc = new jsPDF();
  ensureArabicFont(doc);
  addOfficialHeader(doc, 'Academic Analytics Dashboard', `${params.scopeLabel} • ${params.generatedAt}`, params.branding);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Synthèse Générale', 14, 44);

  autoTable(doc, {
    startY: 48,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Évaluations scannées', String(params.overview.recordedGrades)],
      ['Élèves évalués', String(params.overview.evaluatedStudents)],
      ['Réussite globale', `${params.overview.successRate.toFixed(1)}%`],
      ['Excellence > 15/20', String(params.overview.excellentStudents)],
      ['Moyenne générale', `${params.overview.averageScore.toFixed(2)}/20`],
    ],
    headStyles: { fillColor: [...PRIMARY] },
    styles: { fontSize: 9, font: ARABIC_FONT_NAME },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 10 : 90,
    head: [['Niveau', 'Évalués', 'Réussites', 'Taux', 'Excellence', 'Moyenne']],
    body: params.levels.map((level) => [
      safeArabic(doc, level.label),
      String(level.evaluatedStudents),
      String(level.successCount),
      `${level.successRate.toFixed(1)}%`,
      String(level.excellenceCount),
      `${level.averageScore.toFixed(2)}/20`,
    ]),
    headStyles: { fillColor: [...PRIMARY] },
    styles: { fontSize: 8.5, font: ARABIC_FONT_NAME },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 10 : 150,
    head: [['Niveau', 'Rang', 'Élève', 'Classe', 'Moyenne', 'Meilleure note']],
    body: params.leaderboard.length > 0
      ? params.leaderboard.map((item) => [
          safeArabic(doc, item.level),
          String(item.rank),
          safeArabic(doc, item.studentName),
          safeArabic(doc, item.classId),
          `${item.average.toFixed(2)}/20`,
          `${item.highestScore.toFixed(2)}/20`,
        ])
      : [['—', '—', 'Aucune donnée', '—', '—', '—']],
    headStyles: { fillColor: [...PRIMARY] },
    styles: { fontSize: 8.5, font: ARABIC_FONT_NAME },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 220;
  addSchoolStampAndSignatureArea(doc, finalY, params.branding);

  return {
    fileName: `academic_analytics_${sanitizeFileName(params.scopeLabel)}.pdf`,
    blob: finalizePdf(doc),
  };
};

export const buildSelectedGradesPdfAttachment = (params: {
  results: AcademicResult[];
  studentDirectory: Map<string, Student>;
  scopeLabel: string;
  generatedAt: string;
  branding?: SchoolBranding;
}): AttachmentPayload => {
  const doc = new jsPDF({ orientation: 'landscape' });
  ensureArabicFont(doc);
  addOfficialHeader(doc, 'Selected Grades Report', `${params.scopeLabel} • ${params.generatedAt}`, params.branding);

  autoTable(doc, {
    startY: 42,
    head: [['Élève', 'Classe', 'Matière', 'Épreuve', 'Trim.', 'Score', 'Coef.', 'Date']],
    body: params.results.map((result) => [
      safeArabic(doc, params.studentDirectory.get(result.studentId)?.fullName || 'Élève inconnu'),
      safeArabic(doc, result.classId),
      safeArabic(doc, result.subject),
      safeArabic(doc, result.examLabel),
      `T${result.trimester}`,
      result.score.toFixed(2),
      (result.coefficient ?? 1).toFixed(2),
      result.recordedAt,
    ]),
    headStyles: { fillColor: [...PRIMARY] },
    styles: { fontSize: 8, font: ARABIC_FONT_NAME },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 160;
  addSchoolStampAndSignatureArea(doc, finalY, params.branding);

  return {
    fileName: `selected_grades_${sanitizeFileName(params.scopeLabel)}.pdf`,
    blob: finalizePdf(doc),
  };
};

export const buildCertificatePdfAttachment = (params: {
  student: Student | null;
  results: AcademicResult[];
  scopeLabel: string;
  generatedAt: string;
  branding?: SchoolBranding;
}): AttachmentPayload => {
  const doc = new jsPDF();
  ensureArabicFont(doc);

  const studentName = params.student?.fullName || 'Élève inconnu';
  const classId = params.student?.class || params.results[0]?.classId || '—';
  const totalWeight = params.results.reduce((sum, result) => sum + (result.coefficient ?? 1), 0);
  const average = totalWeight > 0
    ? params.results.reduce((sum, result) => sum + result.score * (result.coefficient ?? 1), 0) / totalWeight
    : 0;
  const reference = buildCertificateReference(params.student, params.generatedAt);

  addOfficialHeader(doc, 'Certificat Académique Officiel', `${params.scopeLabel} • ${params.generatedAt}`, params.branding);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Bulletin / Certificat de Résultats', 14, 46);
  drawArabicText(doc, 'شهادة النتائج الدراسية', 196, 46, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Référence officielle: ${reference}`, 14, 56);
  drawArabicText(doc, `المرجع الرسمي: ${reference}`, 196, 56, 11);

  doc.text(`Élève: `, 14, 64);
  doc.setFont(ARABIC_FONT_NAME, 'normal');
  doc.text(safeArabic(doc, studentName), 26, 64);
  doc.setFont('helvetica', 'normal');
  drawArabicText(doc, `التلميذ: ${studentName}`, 196, 64, 11);

  doc.text(`Classe: `, 14, 72);
  doc.setFont(ARABIC_FONT_NAME, 'normal');
  doc.text(safeArabic(doc, classId), 30, 72);
  doc.setFont('helvetica', 'normal');
  drawArabicText(doc, `القسم: ${classId}`, 196, 72, 11);

  doc.text(`Moyenne Générale: ${average.toFixed(2)}/20`, 14, 80);
  drawArabicText(doc, `المعدل العام: ${average.toFixed(2)}/20`, 196, 80, 11);

  autoTable(doc, {
    startY: 88,
    head: [['Matière', 'Épreuve', 'Trim.', 'Score', 'Coef.', 'Date']],
    body: params.results.map((result) => [
      safeArabic(doc, result.subject),
      safeArabic(doc, result.examLabel),
      `T${result.trimester}`,
      result.score.toFixed(2),
      (result.coefficient ?? 1).toFixed(2),
      result.recordedAt,
    ]),
    headStyles: { fillColor: [...PRIMARY] },
    styles: { fontSize: 9, font: ARABIC_FONT_NAME },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 180;
  addSchoolStampAndSignatureArea(doc, finalY, params.branding);

  return {
    fileName: `certificat_${sanitizeFileName(studentName)}_${reference}.pdf`,
    blob: finalizePdf(doc),
  };
};

export const buildCertificatesPdfAttachments = (params: {
  results: AcademicResult[];
  studentDirectory: Map<string, Student>;
  scopeLabel: string;
  generatedAt: string;
  branding?: SchoolBranding;
}): AttachmentPayload[] => {
  const groupedResults = new Map<string, AcademicResult[]>();

  for (const result of params.results) {
    const currentGroup = groupedResults.get(result.studentId) ?? [];
    currentGroup.push(result);
    groupedResults.set(result.studentId, currentGroup);
  }

  return [...groupedResults.entries()].map(([studentId, results]) => buildCertificatePdfAttachment({
    student: params.studentDirectory.get(studentId) ?? null,
    results,
    scopeLabel: params.scopeLabel,
    generatedAt: params.generatedAt,
    branding: params.branding,
  }));
};

export const buildSubjectReportPdfAttachment = (params: {
  subjectName: string;
  scopeLabel: string;
  generatedAt: string;
  studentLabel: string;
  trendScopeLabel: string;
  overview: {
    averageScore: number;
    recordedGrades: number;
    evaluatedStudents: number;
    successRate: number;
    excellenceCount: number;
  };
  studentRows: SubjectStudentMetricRow[];
  assessmentRows: SubjectAssessmentRow[];
  trendRows: Array<{
    trimester: string;
    averageScore: number;
    recordedGrades: number;
  }>;
  branding?: SchoolBranding;
}): AttachmentPayload => {
  const doc = new jsPDF();
  ensureArabicFont(doc);
  addOfficialHeader(doc, `Subject Report — ${params.subjectName}`, `${params.scopeLabel} • ${params.generatedAt}`, params.branding);

  autoTable(doc, {
    startY: 42,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Élève / portée', params.studentLabel],
      ['Comparaison', params.trendScopeLabel],
      ['Moyenne', `${params.overview.averageScore.toFixed(2)}/20`],
      ['Notes', String(params.overview.recordedGrades)],
      ['Élèves évalués', String(params.overview.evaluatedStudents)],
      ['Réussite', `${params.overview.successRate.toFixed(1)}%`],
      ['Excellence', String(params.overview.excellenceCount)],
    ],
    headStyles: { fillColor: [...PRIMARY] },
    styles: { fontSize: 8.5, font: ARABIC_FONT_NAME },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 8 : 90,
    head: [['#', 'Élève', 'Classe', 'Moyenne', 'Notes', 'Meilleure note']],
    body: params.studentRows.length > 0
      ? params.studentRows.map((row, index) => [
          String(index + 1),
          safeArabic(doc, row.student.fullName),
          safeArabic(doc, row.student.class),
          `${row.averageScore.toFixed(2)}/20`,
          String(row.recordedGrades),
          `${row.bestScore.toFixed(2)}/20`,
        ])
      : [['—', 'Aucune donnée', '—', '—', '—', '—']],
    headStyles: { fillColor: [...PRIMARY] },
    styles: { fontSize: 8.5, font: ARABIC_FONT_NAME },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 8 : 140,
    head: [['Trim.', 'Moyenne', 'Notes']],
    body: params.trendRows.map((row) => [row.trimester, `${row.averageScore.toFixed(2)}/20`, String(row.recordedGrades)]),
    headStyles: { fillColor: [...ACCENT] },
    styles: { fontSize: 8.5, font: ARABIC_FONT_NAME },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 8 : 180,
    head: [['Élève', 'Classe', 'Épreuve', 'Trim.', 'Score', 'Coef.', 'Date']],
    body: params.assessmentRows.length > 0
      ? params.assessmentRows.map((row) => [
          safeArabic(doc, row.student?.fullName || 'Élève inconnu'),
          safeArabic(doc, row.classId),
          safeArabic(doc, row.examLabel),
          `T${row.trimester}`,
          row.score.toFixed(2),
          (row.coefficient ?? 1).toFixed(2),
          row.recordedAt,
        ])
      : [['Aucune donnée', '—', '—', '—', '—', '—', '—']],
    headStyles: { fillColor: [...PRIMARY] },
    styles: { fontSize: 8, font: ARABIC_FONT_NAME },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 220;
  addSchoolStampAndSignatureArea(doc, finalY, params.branding);

  return {
    fileName: `subject_report_${sanitizeFileName(params.subjectName)}.pdf`,
    blob: finalizePdf(doc),
  };
};

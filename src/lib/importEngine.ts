/* eslint-disable no-useless-escape */
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { ImportAcademicResultData, ImportExamScheduleData } from './types';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const normalizeDate = (value: string): string => {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const slash = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (slash) {
    const [, day, month, year] = slash;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return trimmed;
};

const normalizeTimeRange = (value: string): string => value.replace(/\s+/g, '').replace(/h/gi, ':').replace(/–|—/g, '-');

export const extractPdfText = async (buffer: ArrayBuffer): Promise<string> => {
  const loadingTask = getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pageTexts.push(pageText);
  }

  return pageTexts.join('\n');
};

export const parseAcademicResultsFromPdfText = (text: string): ImportAcademicResultData[] => {
  const normalizedText = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map(normalizeWhitespace)
    .filter(Boolean);

  const results: ImportAcademicResultData[] = [];

  for (const line of normalizedText) {
    const match = line.match(/^(?<name>[A-Za-zÀ-ÿ'\-\s]+?)\s+(?<class>[1-6][A-E])\s+(?<subject>[A-Za-zÀ-ÿ'\-\s]+?)\s+(?<score>\d{1,2}(?:[.,]\d{1,2})?)\s+(?<coefficient>\d{1,2}(?:[.,]\d{1,2})?)\s+(?<trimester>[123])(?:\s+(?<date>\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}|\d{4}-\d{2}-\d{2}))?$/i);
    if (!match?.groups) continue;

    results.push({
      full_name: normalizeWhitespace(match.groups.name),
      class: match.groups.class,
      subject: normalizeWhitespace(match.groups.subject),
      score: match.groups.score.replace(',', '.'),
      coefficient: match.groups.coefficient.replace(',', '.'),
      trimester: match.groups.trimester,
      exam_label: 'Import PDF',
      recorded_at: match.groups.date ? normalizeDate(match.groups.date) : undefined,
    });
  }

  return results;
};

export const parseExamSchedulesFromPdfText = (text: string): ImportExamScheduleData[] => {
  const normalizedText = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map(normalizeWhitespace)
    .filter(Boolean);

  const results: ImportExamScheduleData[] = [];

  for (const line of normalizedText) {
    const match = line.match(/^(?<subject>[A-Za-zÀ-ÿ'\-\s]+?)\s+(?<date>\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}|\d{4}-\d{2}-\d{2})\s+(?<time>\d{1,2}[:h]\d{2}\s*[-–]\s*\d{1,2}[:h]\d{2})\s+(?<room>[A-Za-z0-9\-]+)(?:\s+(?<session>S1|S2|Rattrapage))?(?:\s+(?<trimester>[123]))?(?:\s+(?<supervisor>[A-Za-zÀ-ÿ'\-\s]+))?$/i);
    if (!match?.groups) continue;

    results.push({
      subject: normalizeWhitespace(match.groups.subject),
      date: normalizeDate(match.groups.date),
      time: normalizeTimeRange(match.groups.time),
      room: match.groups.room,
      session: (match.groups.session || 'S1') as ImportExamScheduleData['session'],
      trimester: match.groups.trimester || '1',
      supervisor: match.groups.supervisor ? normalizeWhitespace(match.groups.supervisor) : '',
    });
  }

  return results;
};

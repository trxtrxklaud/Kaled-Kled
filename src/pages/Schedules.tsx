import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import type { ScheduleCell } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Plus, Trash2, Upload,
  ChevronDown, BookOpen, FileImage, Printer,
  X, Save, ChevronRight, ArrowLeft, CheckCircle2, Eye, Lock, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { triggerPrint } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from '../lib/xlsx';
import { extractPdfText, parseExamSchedulesFromPdfText } from '../lib/importEngine';
import { compressImageFile } from '../lib/imageCompressor';
import { buildZipAttachment } from '../lib/certificateArchive';

// ─── Constants ────────────────────────────────────────────────
const ALL_CLASSES = [
  '1A','1B','1C','1D','1E',
  '2A','2B','2C','2D','2E',
  '3A','3B','3C','3D','3E',
  '4A','4B','4C','4D','4E',
  '5A','5B','5C','5D','5E',
  '6A','6B','6C','6D','6E',
];

const LEVELS  = ['1','2','3','4','5','6'] as const;
const SECTIONS = ['A','B','C','D','E']    as const;

const DAYS     = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const DAY_KEYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi'];

const TIME_SLOTS = [
  '08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
];

const SUBJECTS = [
  'Arabe','Français','Mathématiques','Éducation Islamique',
  'Éveil Scientifique','Activités Artistiques','EPS',
  'Histoire-Géo','Anglais','Informatique','Calcul','Lecture'
];

const COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-pink-100 text-pink-800 border-pink-200',
];

const TRIMESTER_LABELS: Record<1|2|3, string> = {
  1: 'Trimestre 1 — Sept → Déc',
  2: 'Trimestre 2 — Jan → Mars',
  3: 'Trimestre 3 — Avr → Juin',
};

const GRID_ROW_HEIGHT_PX = 64;

interface CellFormState {
  selectedSubject: string;
  manualSubject: string;
  teacher: string;
  room: string;
  colorIdx: number;
  startTime: string;
  endTime: string;
}

// ─── Component ────────────────────────────────────────────────
const Schedules: React.FC = () => {
  const {
    exams,
    addExam,
    importExams,
    deleteExam,
    examPlanningFiles,
    addExamPlanningFile,
    deleteExamPlanningFile,
    weeklySchedule,
    weeklyScheduleLocks,
    timetableActionLogs,
    schoolBranding,
    classTimetableImages,
    replaceWeeklySchedule,
    updateScheduleLock,
    addTimetableActionLog,
    replaceWeeklyScheduleLocks,
    setClassTimetableImage,
    removeClassTimetableImage,
  } = useData();
  const { isAdmin, isTeacher, assignedClasses } = useAuth();

  const visibleClasses = isTeacher ? assignedClasses : ALL_CLASSES;

  // ── Tab & class selector ──
  type Tab = 'timetable' | 'exams' | 'planning';
  const [activeTab, setActiveTab]       = useState<Tab>('timetable');
  const [selectedClass, setSelectedClass] = useState<string>(visibleClasses[0] || '1A');
  const [classDropOpen, setClassDropOpen] = useState(false);

  // ── Weekly interactive grid ──
  const [editCell, setEditCell] = useState<{ day: string; time: string } | null>(null);
  const [cellForm, setCellForm] = useState<CellFormState>({
    selectedSubject: '',
    manualSubject: '',
    teacher: '',
    room: '',
    colorIdx: 0,
    startTime: TIME_SLOTS[0],
    endTime: TIME_SLOTS[1] || TIME_SLOTS[0],
  });
  const [resizingCell, setResizingCell] = useState<{ day: string; time: string } | null>(null);
  const [resizePreviewEndTime, setResizePreviewEndTime] = useState<string | null>(null);
  const [draggingCell, setDraggingCell] = useState<{ day: string; time: string } | null>(null);
  const [dragHoverCell, setDragHoverCell] = useState<{ day: string; time: string; valid: boolean; reason?: string } | null>(null);
  const [copiedCell, setCopiedCell] = useState<ScheduleCell | null>(null);
  const [copiedDay, setCopiedDay] = useState<Record<string, ScheduleCell> | null>(null);
  const [copiedWeek, setCopiedWeek] = useState<typeof weeklySchedule[string] | null>(null);
  const [copyDaySource, setCopyDaySource] = useState<string>(DAY_KEYS[0]);
  const [copyDayTarget, setCopyDayTarget] = useState<string>(DAY_KEYS[1]);
  const [selectedLockDay, setSelectedLockDay] = useState<string>(DAY_KEYS[0]);
  const [showBatchExport, setShowBatchExport] = useState(false);
  const [batchSelectedClasses, setBatchSelectedClasses] = useState<string[]>([]);
  const [showBatchTransfer, setShowBatchTransfer] = useState(false);
  const [batchTransferMode, setBatchTransferMode] = useState<'copy' | 'move'>('copy');
  const [transferTargetClasses, setTransferTargetClasses] = useState<string[]>([]);
  const [selectedTeacherAvailability, setSelectedTeacherAvailability] = useState<string>('');
  const [historyActionFilter, setHistoryActionFilter] = useState<string>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');
  const historyPastRef = useRef<Array<typeof weeklySchedule>>([]);
  const historyFutureRef = useRef<Array<typeof weeklySchedule>>([]);
  const lastConflictSignatureRef = useRef<string>('');

  // ── Timetable image upload (per class) ──
  const [showTimetableUpload, setShowTimetableUpload] = useState(false);
  const [timetableUploadClass, setTimetableUploadClass] = useState<string>(selectedClass);
  const [pendingTimetableFile, setPendingTimetableFile] = useState<{ name: string; data: string } | null>(null);
  const [viewingClassImage, setViewingClassImage] = useState<string | null>(null); // classId being previewed
  const timetableFileRef = useRef<HTMLInputElement>(null);

  // ── Exam planning (trimester-level) ──
  const [detailTrimester, setDetailTrimester] = useState<1|2|3|null>(null);
  const [showPlanUpload, setShowPlanUpload]   = useState(false);
  const [uploadLevel, setUploadLevel]         = useState<string>('4');
  const [uploadTrimester, setUploadTrimester] = useState<1|2|3>(1);
  const [pendingPlanFile, setPendingPlanFile] = useState<{ name: string; data: string } | null>(null);
  const planFileRef = useRef<HTMLInputElement>(null);
  const importScheduleFileRef = useRef<HTMLInputElement>(null);
  const importExamFileRef = useRef<HTMLInputElement>(null);
  const gridBodyRef = useRef<HTMLTableSectionElement>(null);

  // ── Exam add ──
  const [showAddExam, setShowAddExam] = useState(false);
  const [examForm, setExamForm]       = useState({
    subject: '', date: '', time: '', room: '', supervisor: '',
    session: 'S1' as 'S1'|'S2'|'Rattrapage', trimester: 1 as 1|2|3,
  });

  // ────────────────────────────────────────────────────────────
  // Weekly grid helpers
  // ────────────────────────────────────────────────────────────
  const getDefaultEndTime = (time: string): string => {
    const currentIndex = TIME_SLOTS.indexOf(time);
    return TIME_SLOTS[currentIndex + 1] || time;
  };

  const cloneWeeklySchedule = (source: typeof weeklySchedule): typeof weeklySchedule => JSON.parse(JSON.stringify(source));

  const pushScheduleHistory = () => {
    historyPastRef.current.push(cloneWeeklySchedule(weeklySchedule));
    historyFutureRef.current = [];
  };

  const applyWeeklySchedule = (nextSchedule: typeof weeklySchedule) => {
    replaceWeeklySchedule(nextSchedule);
  };

  const buildShiftedCell = (cell: ScheduleCell, targetTime: string): ScheduleCell => {
    const durationMinutes = timeToMinutes(cell.endTime) - timeToMinutes(cell.startTime);
    const movedEndMinutes = timeToMinutes(targetTime) + durationMinutes;
    const endHours = Math.floor(movedEndMinutes / 60);
    const endMinutes = movedEndMinutes % 60;
    return {
      ...cell,
      startTime: targetTime,
      endTime: `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`,
    };
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + minutes;
  };

  const rangesOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => (
    timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA)
  );

  const getCell = (day: string, time: string, classId = selectedClass): ScheduleCell | null =>
    weeklySchedule[classId]?.[day]?.[time] || null;

  const getOwningCell = (day: string, time: string, classId = selectedClass): { anchorTime: string; cell: ScheduleCell } | null => {
    const daySchedule = weeklySchedule[classId]?.[day];
    if (!daySchedule) {
      return null;
    }

    for (const [anchorTime, cell] of Object.entries(daySchedule)) {
      if (timeToMinutes(time) >= timeToMinutes(cell.startTime) && timeToMinutes(time) < timeToMinutes(cell.endTime)) {
        return { anchorTime, cell };
      }
    }

    return null;
  };

  const isExamCell = (cell: ScheduleCell | null): boolean => {
    if (!cell) {
      return false;
    }
    const normalizedSubject = (cell.subject || '').trim().toLowerCase();
    return exams.some((exam) => exam.subject.trim().toLowerCase() === normalizedSubject) || normalizedSubject.includes('exam');
  };

  const isWeekLocked = (classId = selectedClass): boolean => Boolean(weeklyScheduleLocks[classId]?.weekLocked);

  const isDayLocked = (day: string, classId = selectedClass): boolean => Boolean(weeklyScheduleLocks[classId]?.lockedDays?.[day]);

  const isCellLocked = (day: string, classId = selectedClass): boolean => isWeekLocked(classId) || isDayLocked(day, classId);

  const logTimetableAction = (
    actionType: Parameters<typeof addTimetableActionLog>[0]['actionType'],
    description: string,
    options?: { day?: string; time?: string; targetClassIds?: string[] },
  ) => {
    addTimetableActionLog({
      classId: selectedClass,
      actionType,
      description,
      day: options?.day,
      time: options?.time,
      targetClassIds: options?.targetClassIds,
    });
  };

  const getCellVisualRowSpan = (cell: ScheduleCell, anchorTime: string): number => {
    const startIndex = TIME_SLOTS.indexOf(anchorTime);
    if (startIndex < 0) {
      return 1;
    }

    let span = 1;
    for (let index = startIndex + 1; index < TIME_SLOTS.length; index += 1) {
      if (timeToMinutes(TIME_SLOTS[index]) < timeToMinutes(cell.endTime)) {
        span += 1;
      }
    }

    return Math.max(1, span);
  };

  const findResourceConflict = (
    classId: string,
    day: string,
    anchorTime: string,
    candidateCell: ScheduleCell,
    resource: 'teacher' | 'room',
    scheduleState = weeklySchedule,
  ): { classId: string; startTime: string; endTime: string; subject: string } | null => {
    const normalizedValue = candidateCell[resource]?.trim().toLowerCase();
    if (!normalizedValue) {
      return null;
    }

    for (const [otherClassId, classSchedule] of Object.entries(scheduleState)) {
      const daySchedule = classSchedule?.[day];
      if (!daySchedule) {
        continue;
      }

      for (const [otherAnchorTime, otherCell] of Object.entries(daySchedule)) {
        const isSameAnchor = otherClassId === classId && otherAnchorTime === anchorTime;
        if (isSameAnchor) {
          continue;
        }

        const sameResource = (otherCell[resource] || '').trim().toLowerCase() === normalizedValue;
        if (sameResource && rangesOverlap(candidateCell.startTime, candidateCell.endTime, otherCell.startTime, otherCell.endTime)) {
          return {
            classId: otherClassId,
            startTime: otherCell.startTime,
            endTime: otherCell.endTime,
            subject: otherCell.subject || '',
          };
        }
      }
    }

    return null;
  };

  const openCell = (day: string, time: string) => {
    if (!isAdmin && !isTeacher) return;
    if (isCellLocked(day)) {
      toast.error('Cette journée / semaine est verrouillée');
      return;
    }
    const owningCell = getOwningCell(day, time);
    const anchorTime = owningCell?.anchorTime || time;
    const existingCell = getCell(day, anchorTime) || owningCell?.cell || null;
    if (isExamCell(existingCell)) {
      toast.error('Cellule d’examen verrouillée');
      return;
    }
    setCellForm(existingCell ? {
      selectedSubject: existingCell.subject && SUBJECTS.includes(existingCell.subject) ? existingCell.subject : '',
      manualSubject: existingCell.subject && SUBJECTS.includes(existingCell.subject) ? '' : (existingCell.subject || ''),
      teacher: existingCell.teacher || '',
      room: existingCell.room || '',
      colorIdx: existingCell.colorIdx,
      startTime: existingCell.startTime || anchorTime,
      endTime: existingCell.endTime || getDefaultEndTime(anchorTime),
    } : {
      selectedSubject: '',
      manualSubject: '',
      teacher: '',
      room: '',
      colorIdx: 0,
      startTime: time,
      endTime: getDefaultEndTime(time),
    });
    setEditCell({ day, time: anchorTime });
  };

  const validateScheduleCell = (
    day: string,
    time: string,
    cell: ScheduleCell,
    scheduleState = weeklySchedule,
  ): boolean => {
    const teacherConflict = findResourceConflict(selectedClass, day, time, cell, 'teacher', scheduleState);
    if (teacherConflict) {
      toast.error(`Conflit enseignant avec ${teacherConflict.classId} • ${teacherConflict.startTime} → ${teacherConflict.endTime}`);
      return false;
    }

    const roomConflict = findResourceConflict(selectedClass, day, time, cell, 'room', scheduleState);
    if (roomConflict) {
      toast.error(`Conflit de salle avec ${roomConflict.classId} • ${roomConflict.startTime} → ${roomConflict.endTime}`);
      return false;
    }

    return true;
  };

  const evaluateMoveTarget = (targetDay: string, targetTime: string): { valid: boolean; reason?: string } => {
    if (!draggingCell) {
      return { valid: false };
    }

    const sourceCell = getCell(draggingCell.day, draggingCell.time);
    if (!sourceCell) {
      return { valid: false, reason: 'Source manquante' };
    }
    if (isExamCell(sourceCell)) {
      return { valid: false, reason: 'EXAM LOCK' };
    }
    if (isCellLocked(draggingCell.day) || isCellLocked(targetDay)) {
      return { valid: false, reason: 'Verrouillé' };
    }

    const targetOwner = getOwningCell(targetDay, targetTime);
    const isSameTarget = draggingCell.day === targetDay && draggingCell.time === targetTime;
    if (isSameTarget) {
      return { valid: true };
    }

    if (targetOwner && !(targetOwner.anchorTime === draggingCell.time && targetDay === draggingCell.day)) {
      return { valid: false, reason: 'Case occupée' };
    }

    const durationMinutes = timeToMinutes(sourceCell.endTime) - timeToMinutes(sourceCell.startTime);
    const movedEndMinutes = timeToMinutes(targetTime) + durationMinutes;
    if (movedEndMinutes > (23 * 60) + 59) {
      return { valid: false, reason: 'Hors plage' };
    }

    const movedEndTime = `${String(Math.floor(movedEndMinutes / 60)).padStart(2, '0')}:${String(movedEndMinutes % 60).padStart(2, '0')}`;
    const movedCell: ScheduleCell = { ...sourceCell, startTime: targetTime, endTime: movedEndTime };
    const nextSchedule = cloneWeeklySchedule(weeklySchedule);
    if (nextSchedule[selectedClass]?.[draggingCell.day]?.[draggingCell.time]) {
      delete nextSchedule[selectedClass][draggingCell.day][draggingCell.time];
    }
    nextSchedule[selectedClass] = {
      ...(nextSchedule[selectedClass] || {}),
      [targetDay]: {
        ...(nextSchedule[selectedClass]?.[targetDay] || {}),
        [targetTime]: movedCell,
      },
    };

    const teacherConflict = findResourceConflict(selectedClass, targetDay, targetTime, movedCell, 'teacher', nextSchedule);
    if (teacherConflict) {
      return { valid: false, reason: `Prof ${teacherConflict.classId}` };
    }

    const roomConflict = findResourceConflict(selectedClass, targetDay, targetTime, movedCell, 'room', nextSchedule);
    if (roomConflict) {
      return { valid: false, reason: `Salle ${roomConflict.classId}` };
    }

    return { valid: true };
  };

  const teacherAvailabilityOptions = useMemo(
    () => [...new Set(
      Object.values(weeklySchedule)
        .flatMap((classSchedule) => Object.values(classSchedule || {}))
        .flatMap((daySchedule) => Object.values(daySchedule || {}))
        .map((cell) => (cell.teacher || '').trim())
        .filter(Boolean),
    )].sort((left, right) => left.localeCompare(right, 'fr-FR')),
    [weeklySchedule],
  );

  const teacherAvailabilitySummary = useMemo(() => {
    if (!selectedTeacherAvailability.trim()) {
      return [] as Array<{ day: string; classId: string; subject: string; startTime: string; endTime: string; room?: string }>;
    }

    const normalizedTeacher = selectedTeacherAvailability.trim().toLowerCase();
    const items: Array<{ day: string; classId: string; subject: string; startTime: string; endTime: string; room?: string }> = [];

    for (const [classId, classSchedule] of Object.entries(weeklySchedule)) {
      for (const [day, daySchedule] of Object.entries(classSchedule || {})) {
        for (const cell of Object.values(daySchedule || {})) {
          if ((cell.teacher || '').trim().toLowerCase() === normalizedTeacher) {
            items.push({
              day,
              classId,
              subject: cell.subject || '',
              startTime: cell.startTime,
              endTime: cell.endTime,
              room: cell.room,
            });
          }
        }
      }
    }

    return items.sort((left, right) => {
      const dayOrder = DAY_KEYS.indexOf(left.day) - DAY_KEYS.indexOf(right.day);
      if (dayOrder !== 0) return dayOrder;
      return timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
    });
  }, [selectedTeacherAvailability, weeklySchedule]);

  const filteredTimetableActionLogs = useMemo(() => {
    return timetableActionLogs
      .filter((log) => log.classId === selectedClass)
      .filter((log) => historyActionFilter === 'all' || log.actionType === historyActionFilter)
      .filter((log) => historyDateFilter === '' || log.createdAt.startsWith(historyDateFilter))
      .slice(0, 50);
  }, [historyActionFilter, historyDateFilter, selectedClass, timetableActionLogs]);

  const scheduleConflictSummary = useMemo(() => {
    const items: Array<{
      key: string;
      resource: 'teacher' | 'room';
      value: string;
      day: string;
      classes: string[];
      startTime: string;
      endTime: string;
      subjects: string[];
    }> = [];
    const seen = new Set<string>();
    const anchors: Array<{ classId: string; day: string; anchorTime: string; cell: ScheduleCell }> = [];

    for (const [classId, classSchedule] of Object.entries(weeklySchedule)) {
      for (const [day, daySchedule] of Object.entries(classSchedule || {})) {
        for (const [anchorTime, cell] of Object.entries(daySchedule || {})) {
          anchors.push({ classId, day, anchorTime, cell });
        }
      }
    }

    for (let index = 0; index < anchors.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < anchors.length; compareIndex += 1) {
        const left = anchors[index];
        const right = anchors[compareIndex];
        if (left.day !== right.day) {
          continue;
        }
        if (!rangesOverlap(left.cell.startTime, left.cell.endTime, right.cell.startTime, right.cell.endTime)) {
          continue;
        }

        for (const resource of ['teacher', 'room'] as const) {
          const leftValue = (left.cell[resource] || '').trim();
          const rightValue = (right.cell[resource] || '').trim();
          if (!leftValue || leftValue.toLowerCase() !== rightValue.toLowerCase()) {
            continue;
          }

          const key = `${resource}-${left.day}-${leftValue.toLowerCase()}-${[left.classId, right.classId].sort().join('-')}-${left.cell.startTime}-${right.cell.startTime}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          items.push({
            key,
            resource,
            value: leftValue,
            day: left.day,
            classes: [left.classId, right.classId],
            startTime: left.cell.startTime,
            endTime: right.cell.endTime,
            subjects: [left.cell.subject || '', right.cell.subject || ''],
          });
        }
      }
    }

    return items;
  }, [weeklySchedule]);

  useEffect(() => {
    const signature = scheduleConflictSummary.map((conflict) => conflict.key).join('|');
    if (signature && signature !== lastConflictSignatureRef.current) {
      toast.error(`${scheduleConflictSummary.length} conflit(s) détecté(s) prof/salle`);
    }
    lastConflictSignatureRef.current = signature;
  }, [scheduleConflictSummary]);

  const saveCell = () => {
    if (!editCell) return;

    const resolvedSubject = cellForm.manualSubject.trim() || cellForm.selectedSubject.trim();
    if (!resolvedSubject) {
      clearCell(editCell.day, editCell.time);
      setEditCell(null);
      return;
    }

    if (cellForm.endTime <= cellForm.startTime) {
      toast.error("L'heure de fin doit être postérieure à l'heure de début");
      return;
    }

    const normalizedCell: ScheduleCell = {
      subject: resolvedSubject,
      teacher: cellForm.teacher.trim(),
      room: cellForm.room.trim(),
      colorIdx: cellForm.colorIdx,
      startTime: cellForm.startTime,
      endTime: cellForm.endTime,
    };

    const nextSchedule = cloneWeeklySchedule(weeklySchedule);
    nextSchedule[selectedClass] = {
      ...(nextSchedule[selectedClass] || {}),
      [editCell.day]: {
        ...(nextSchedule[selectedClass]?.[editCell.day] || {}),
        [editCell.time]: normalizedCell,
      },
    };

    if (!validateScheduleCell(editCell.day, editCell.time, normalizedCell, nextSchedule)) {
      return;
    }

    pushScheduleHistory();
    applyWeeklySchedule(nextSchedule);
    logTimetableAction('cell_saved', `Case enregistrée pour ${selectedClass}`, { day: editCell.day, time: editCell.time });
    setEditCell(null);
    toast.success('Case enregistrée');
  };

  const clearCell = (day: string, time: string) => {
    if (isCellLocked(day)) {
      toast.error('Cette journée / semaine est verrouillée');
      return;
    }
    const nextSchedule = cloneWeeklySchedule(weeklySchedule);
    if (nextSchedule[selectedClass]?.[day]?.[time]) {
      delete nextSchedule[selectedClass][day][time];
      pushScheduleHistory();
      applyWeeklySchedule(nextSchedule);
      logTimetableAction('cell_deleted', `Case supprimée pour ${selectedClass}`, { day, time });
    }
  };

  const handleCopyCell = () => {
    if (!editCell) {
      return;
    }
    const currentCell = getCell(editCell.day, editCell.time);
    if (!currentCell) {
      toast.error('Aucune case à copier');
      return;
    }
    setCopiedCell(currentCell);
    logTimetableAction('cell_pasted', `Case copiée depuis ${selectedClass}`, { day: editCell.day, time: editCell.time });
    toast.success('Case copiée');
  };

  const handlePasteCell = () => {
    if (!editCell || !copiedCell) {
      toast.error('Aucune case copiée');
      return;
    }
    if (isCellLocked(editCell.day)) {
      toast.error('Cette journée / semaine est verrouillée');
      return;
    }

    const pastedCell = buildShiftedCell(copiedCell, editCell.time);
    if (timeToMinutes(pastedCell.endTime) <= timeToMinutes(pastedCell.startTime)) {
      toast.error('Durée de case invalide');
      return;
    }

    const nextSchedule = cloneWeeklySchedule(weeklySchedule);
    nextSchedule[selectedClass] = {
      ...(nextSchedule[selectedClass] || {}),
      [editCell.day]: {
        ...(nextSchedule[selectedClass]?.[editCell.day] || {}),
        [editCell.time]: pastedCell,
      },
    };

    if (!validateScheduleCell(editCell.day, editCell.time, pastedCell, nextSchedule)) {
      return;
    }

    pushScheduleHistory();
    applyWeeklySchedule(nextSchedule);
    logTimetableAction('cell_pasted', `Case collée sur ${selectedClass}`, { day: editCell.day, time: editCell.time });
    setCellForm({
      selectedSubject: pastedCell.subject && SUBJECTS.includes(pastedCell.subject) ? pastedCell.subject : '',
      manualSubject: pastedCell.subject && SUBJECTS.includes(pastedCell.subject) ? '' : (pastedCell.subject || ''),
      teacher: pastedCell.teacher || '',
      room: pastedCell.room || '',
      colorIdx: pastedCell.colorIdx,
      startTime: pastedCell.startTime,
      endTime: pastedCell.endTime,
    });
    toast.success('Case collée');
  };

  const handleCopyDay = () => {
    const daySchedule = weeklySchedule[selectedClass]?.[copyDaySource];
    if (!daySchedule || Object.keys(daySchedule).length === 0) {
      toast.error('Aucune journée à copier');
      return;
    }
    setCopiedDay(JSON.parse(JSON.stringify(daySchedule)));
    logTimetableAction('day_copied', `Journée ${DAYS[DAY_KEYS.indexOf(copyDaySource)]} copiée`, { day: copyDaySource });
    toast.success(`Journée ${DAYS[DAY_KEYS.indexOf(copyDaySource)]} copiée`);
  };

  const handleCopyWeek = () => {
    const classSchedule = weeklySchedule[selectedClass];
    if (!classSchedule || Object.keys(classSchedule).length === 0) {
      toast.error('Aucune semaine à copier');
      return;
    }
    setCopiedWeek(JSON.parse(JSON.stringify(classSchedule)));
    logTimetableAction('week_copied', `Semaine de ${selectedClass} copiée`);
    toast.success(`Semaine de ${selectedClass} copiée`);
  };

  const handlePasteDay = () => {
    if (!copiedDay) {
      toast.error('Aucune journée copiée');
      return;
    }
    if (isCellLocked(copyDayTarget)) {
      toast.error('Cette journée / semaine est verrouillée');
      return;
    }

    const nextSchedule = cloneWeeklySchedule(weeklySchedule);
    nextSchedule[selectedClass] = {
      ...(nextSchedule[selectedClass] || {}),
      [copyDayTarget]: JSON.parse(JSON.stringify(copiedDay)),
    };

    pushScheduleHistory();
    applyWeeklySchedule(nextSchedule);
    logTimetableAction('day_pasted', `Journée collée sur ${DAYS[DAY_KEYS.indexOf(copyDayTarget)]}`, { day: copyDayTarget });
    toast.success(`Journée collée sur ${DAYS[DAY_KEYS.indexOf(copyDayTarget)]}`);
  };

  const handlePasteWeek = () => {
    if (!copiedWeek) {
      toast.error('Aucune semaine copiée');
      return;
    }
    if (isWeekLocked()) {
      toast.error('La semaine est verrouillée');
      return;
    }

    const nextSchedule = cloneWeeklySchedule(weeklySchedule);
    nextSchedule[selectedClass] = JSON.parse(JSON.stringify(copiedWeek));
    pushScheduleHistory();
    applyWeeklySchedule(nextSchedule);
    logTimetableAction('week_pasted', `Semaine collée sur ${selectedClass}`);
    toast.success(`Semaine collée sur ${selectedClass}`);
  };

  const handleUndoSchedule = () => {
    if (historyPastRef.current.length === 0) {
      toast.error('Aucune action à annuler');
      return;
    }
    const previousSchedule = historyPastRef.current.pop();
    if (!previousSchedule) {
      return;
    }
    historyFutureRef.current.push(cloneWeeklySchedule(weeklySchedule));
    replaceWeeklySchedule(previousSchedule);
    logTimetableAction('cell_saved', 'Annulation effectuée');
    toast.success('Annulation effectuée');
  };

  const handleRedoSchedule = () => {
    if (historyFutureRef.current.length === 0) {
      toast.error('Aucune action à rétablir');
      return;
    }
    const nextSchedule = historyFutureRef.current.pop();
    if (!nextSchedule) {
      return;
    }
    historyPastRef.current.push(cloneWeeklySchedule(weeklySchedule));
    replaceWeeklySchedule(nextSchedule);
    logTimetableAction('cell_saved', 'Rétablissement effectué');
    toast.success('Rétablissement effectué');
  };

  useEffect(() => {
    if (!resizingCell) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!gridBodyRef.current) {
        return;
      }

      const bodyRect = gridBodyRef.current.getBoundingClientRect();
      const relativeY = event.clientY - bodyRect.top;
      const clampedIndex = Math.max(0, Math.min(TIME_SLOTS.length - 1, Math.floor(relativeY / GRID_ROW_HEIGHT_PX)));
      const startIndex = TIME_SLOTS.indexOf(resizingCell.time);
      const nextEndTime = getDefaultEndTime(TIME_SLOTS[Math.max(startIndex, clampedIndex)]);
      setResizePreviewEndTime(nextEndTime);
    };

    const handleMouseUp = () => {
      const currentCell = getCell(resizingCell.day, resizingCell.time);
      if (currentCell && resizePreviewEndTime && resizePreviewEndTime !== currentCell.endTime) {
        const resizedCell: ScheduleCell = {
          ...currentCell,
          endTime: resizePreviewEndTime,
        };
        if (timeToMinutes(resizedCell.endTime) > timeToMinutes(resizedCell.startTime)) {
          const nextSchedule = cloneWeeklySchedule(weeklySchedule);
          nextSchedule[selectedClass] = {
            ...(nextSchedule[selectedClass] || {}),
            [resizingCell.day]: {
              ...(nextSchedule[selectedClass]?.[resizingCell.day] || {}),
              [resizingCell.time]: resizedCell,
            },
          };
          if (validateScheduleCell(resizingCell.day, resizingCell.time, resizedCell, nextSchedule)) {
            pushScheduleHistory();
            applyWeeklySchedule(nextSchedule);
            logTimetableAction('cell_resized', `Durée mise à jour pour ${selectedClass}`, { day: resizingCell.day, time: resizingCell.time });
            toast.success('Durée mise à jour');
          }
        }
      }
      setResizingCell(null);
      setResizePreviewEndTime(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCell, resizePreviewEndTime, weeklySchedule, selectedClass]);

  const buildWeeklyTimetablePdfDoc = (classId: string, doc?: jsPDF) => {
    const pdf = doc || new jsPDF({ orientation: 'landscape' });
    const isNewDocument = !doc;

    if (!isNewDocument) {
      pdf.addPage('a4', 'landscape');
    }

    pdf.setFillColor(26, 35, 126);
    pdf.rect(0, 0, 297, 24, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(schoolBranding.schoolNameFr || 'المدرسة الابتدائية الخاصة العناية', 14, 12);
    pdf.setFontSize(12);
    pdf.text(`Emploi du temps hebdomadaire — ${classId}`, 14, 19);
    if (schoolBranding.logoDataUrl) {
      try {
        pdf.addImage(schoolBranding.logoDataUrl, 'PNG', 265, 3, 18, 18, undefined, 'FAST');
      } catch {
        // ignore invalid images
      }
    }
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(new Date().toLocaleString('fr-FR'), 14, 31);

    const body = TIME_SLOTS.map((time) => {
      const row = [time];
      for (const day of DAY_KEYS) {
        const exactCell = getCell(day, time, classId);
        if (exactCell) {
          row.push(`${exactCell.subject}\n${exactCell.startTime} → ${exactCell.endTime}${exactCell.teacher ? `\n${exactCell.teacher}` : ''}${exactCell.room ? `\nSalle ${exactCell.room}` : ''}`);
        } else {
          const owningCell = getOwningCell(day, time, classId);
          row.push(owningCell ? '↳' : '');
        }
      }
      return row;
    });

    autoTable(pdf, {
      startY: 38,
      head: [['Heure', ...DAYS]],
      body,
      headStyles: { fillColor: [26, 35, 126] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 22 } },
      didDrawPage: () => {
        if (schoolBranding.stampDataUrl) {
          try {
            pdf.addImage(schoolBranding.stampDataUrl, 'PNG', 250, 185, 24, 24, undefined, 'FAST');
          } catch {
            // ignore invalid stamp
          }
        }
      },
    });

    return pdf;
  };

  const buildWeeklyTimetablePdfAttachment = (classId: string) => {
    const pdf = buildWeeklyTimetablePdfDoc(classId);
    return {
      fileName: `emploi_du_temps_${classId}.pdf`,
      blob: pdf.output('blob'),
    };
  };

  const buildWeeklyTimetableWorkbook = (classIds: string[]) => {
    const workbook = XLSX.utils.book_new();

    classIds.forEach((classId) => {
      const rows = TIME_SLOTS.map((time) => {
        const row: Record<string, string> = { Heure: time };
        DAY_KEYS.forEach((day, index) => {
          const exactCell = getCell(day, time, classId);
          const dayLabel = DAYS[index];
          if (exactCell) {
            row[dayLabel] = `${exactCell.subject} | ${exactCell.startTime}→${exactCell.endTime}${exactCell.teacher ? ` | ${exactCell.teacher}` : ''}${exactCell.room ? ` | Salle ${exactCell.room}` : ''}`;
          } else {
            const owningCell = getOwningCell(day, time, classId);
            row[dayLabel] = owningCell ? '↳' : '';
          }
        });
        return row;
      });
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), classId);
    });

    return workbook;
  };

  const handleExportWeeklyTimetablePdf = () => {
    const pdf = buildWeeklyTimetablePdfDoc(selectedClass);
    pdf.save(`emploi_du_temps_${selectedClass}.pdf`);
    logTimetableAction('pdf_export', `Export PDF de ${selectedClass}`);
    toast.success('PDF emploi du temps généré');
  };

  const handleExportLevelPdf = () => {
    const levelClasses = visibleClasses.filter((classId) => classId.startsWith(selectedClass[0]));
    if (levelClasses.length === 0) {
      toast.error('Aucune classe dans ce niveau');
      return;
    }

    const [firstClass, ...restClasses] = levelClasses;
    const pdf = buildWeeklyTimetablePdfDoc(firstClass);
    restClasses.forEach((classId) => {
      buildWeeklyTimetablePdfDoc(classId, pdf);
    });
    pdf.save(`emplois_du_temps_niveau_${selectedClass[0]}.pdf`);
    logTimetableAction('pdf_export', `Export PDF niveau ${selectedClass[0]}`, { targetClassIds: levelClasses });
    toast.success('PDF niveau généré');
  };

  const handleExportLevelXlsx = () => {
    const levelClasses = visibleClasses.filter((classId) => classId.startsWith(selectedClass[0]));
    if (levelClasses.length === 0) {
      toast.error('Aucune classe dans ce niveau');
      return;
    }
    const workbook = buildWeeklyTimetableWorkbook(levelClasses);
    XLSX.writeFile(workbook, `emplois_du_temps_niveau_${selectedClass[0]}.xlsx`);
    logTimetableAction('xlsx_export', `Export XLSX niveau ${selectedClass[0]}`, { targetClassIds: levelClasses });
    toast.success('XLSX niveau généré');
  };

  const handleOpenBatchExport = () => {
    setBatchSelectedClasses((current) => current.length > 0 ? current : visibleClasses.filter((classId) => classId[0] === selectedClass[0]));
    setShowBatchExport(true);
  };

  const handleExportBatchPdf = () => {
    if (batchSelectedClasses.length === 0) {
      toast.error('Sélectionnez au moins une classe');
      return;
    }

    const [firstClass, ...restClasses] = batchSelectedClasses;
    const pdf = buildWeeklyTimetablePdfDoc(firstClass);
    restClasses.forEach((classId) => {
      buildWeeklyTimetablePdfDoc(classId, pdf);
    });

    pdf.save(`emplois_du_temps_${batchSelectedClasses.join('_')}.pdf`);
    logTimetableAction('pdf_export', `Export PDF multi-classes`, { targetClassIds: batchSelectedClasses });
    setShowBatchExport(false);
    toast.success('PDF multi-classes généré');
  };

  const handleExportBatchZip = async () => {
    if (batchSelectedClasses.length === 0) {
      toast.error('Sélectionnez au moins une classe');
      return;
    }

    const attachments = batchSelectedClasses.map((classId) => buildWeeklyTimetablePdfAttachment(classId));
    const zipAttachment = await buildZipAttachment(attachments, `emplois_du_temps_${batchSelectedClasses.join('_')}.zip`);
    const blobUrl = URL.createObjectURL(zipAttachment.blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = zipAttachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    logTimetableAction('pdf_export', `Export ZIP multi-classes`, { targetClassIds: batchSelectedClasses });
    setShowBatchExport(false);
    toast.success('ZIP multi-classes généré');
  };

  const handleToggleWeekLock = (locked: boolean) => {
    updateScheduleLock(selectedClass, null, locked);
    logTimetableAction(locked ? 'week_locked' : 'week_unlocked', `${locked ? 'Verrouillage' : 'Déverrouillage'} semaine ${selectedClass}`);
    toast.success(locked ? 'Semaine verrouillée' : 'Semaine déverrouillée');
  };

  const handleToggleDayLock = (locked: boolean) => {
    updateScheduleLock(selectedClass, selectedLockDay, locked);
    logTimetableAction(locked ? 'day_locked' : 'day_unlocked', `${locked ? 'Verrouillage' : 'Déverrouillage'} ${DAYS[DAY_KEYS.indexOf(selectedLockDay)]}`, { day: selectedLockDay });
    toast.success(locked ? 'Journée verrouillée' : 'Journée déverrouillée');
  };

  const buildScheduleRows = () => Object.entries(weeklySchedule).flatMap(([classId, classSchedule]) =>
    Object.entries(classSchedule || {}).flatMap(([day, daySchedule]) =>
      Object.entries(daySchedule || {}).map(([anchorTime, cell]) => ({
        class_id: classId,
        day,
        anchor_time: anchorTime,
        subject: cell.subject,
        teacher: cell.teacher || '',
        room: cell.room || '',
        color_idx: cell.colorIdx,
        start_time: cell.startTime,
        end_time: cell.endTime,
      })),
    ),
  );

  const handleExportScheduleWorkbook = () => {
    const workbook = XLSX.utils.book_new();
    const scheduleRows = buildScheduleRows();
    const lockRows = Object.entries(weeklyScheduleLocks).flatMap(([classId, lockState]) => ([
      { class_id: classId, scope: 'week', day: '', locked: lockState.weekLocked ? 1 : 0 },
      ...DAY_KEYS.map((day) => ({ class_id: classId, scope: 'day', day, locked: lockState.lockedDays?.[day] ? 1 : 0 })),
    ]));
    const historyRows = timetableActionLogs.map((log) => ({
      class_id: log.classId,
      action_type: log.actionType,
      day: log.day || '',
      time: log.time || '',
      target_classes: (log.targetClassIds || []).join('|'),
      description: log.description,
      created_at: log.createdAt,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(scheduleRows), 'WeeklySchedule');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(lockRows), 'Locks');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(historyRows), 'History');
    XLSX.writeFile(workbook, 'weekly_schedule_interactive.xlsx');
    logTimetableAction('xlsx_export', 'Export XLSX du planning interactif');
    toast.success('XLSX planning exporté');
  };

  const handleExportScheduleCsv = () => {
    const scheduleRows = buildScheduleRows();
    const headers = ['class_id', 'day', 'anchor_time', 'subject', 'teacher', 'room', 'color_idx', 'start_time', 'end_time'];
    const csvContent = [
      headers.join(','),
      ...scheduleRows.map((row) => headers.map((header) => JSON.stringify(String(row[header as keyof typeof row] ?? ''))).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'weekly_schedule_interactive.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    logTimetableAction('csv_export', 'Export CSV du planning interactif');
    toast.success('CSV planning exporté');
  };

  const handleImportScheduleWorkbook = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv') && !fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
      toast.error('Format de fichier non supporté. Veuillez utiliser un fichier XLSX, XLS, CSV, HTML ou HTM.');
      event.target.value = '';
      return;
    }

    try {
      if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        const text = await file.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        // Simple generic import for schedules from HTML: assume matching table
        const importedSchedule: typeof weeklySchedule = {};
        doc.querySelectorAll('tr').forEach((tr, index) => {
          if (index === 0) return;
          const tds = tr.querySelectorAll('td, th');
          if (tds.length >= 6) {
            const classId = tds[0]?.textContent?.trim() || '';
            const day = tds[1]?.textContent?.trim() || '';
            const anchorTime = tds[2]?.textContent?.trim() || '';
            if (classId && day && anchorTime) {
              importedSchedule[classId] = importedSchedule[classId] || {};
              importedSchedule[classId][day] = importedSchedule[classId][day] || {};
              importedSchedule[classId][day][anchorTime] = {
                subject: tds[3]?.textContent?.trim() || '',
                teacher: tds[4]?.textContent?.trim() || '',
                room: tds[5]?.textContent?.trim() || '',
                colorIdx: 0,
                startTime: anchorTime,
                endTime: getDefaultEndTime(anchorTime),
              };
            }
          }
        });
        if (Object.keys(importedSchedule).length > 0) {
          replaceWeeklySchedule(importedSchedule);
          logTimetableAction('xlsx_import', 'Importation HTML du planning des classes');
          toast.success('Emploi du temps HTML importé avec succès');
        } else {
          toast.error('Aucune donnée valide trouvée');
        }
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const scheduleSheetName = workbook.SheetNames.find((name) => name === 'WeeklySchedule') || workbook.SheetNames[0];
      const lockSheetName = workbook.SheetNames.find((name) => name === 'Locks');
      const scheduleRows = XLSX.utils.sheet_to_json(workbook.Sheets[scheduleSheetName], { defval: '' }) as Array<Record<string, string | number>>;
      const lockRows = lockSheetName ? XLSX.utils.sheet_to_json(workbook.Sheets[lockSheetName], { defval: '' }) as Array<Record<string, string | number>> : [];

      const importedSchedule: typeof weeklySchedule = {};
      for (const row of scheduleRows) {
        const classId = String(row.class_id || '');
        const day = String(row.day || '');
        const anchorTime = String(row.anchor_time || '');
        if (!classId || !day || !anchorTime) continue;
        importedSchedule[classId] = importedSchedule[classId] || {};
        importedSchedule[classId][day] = importedSchedule[classId][day] || {};
        importedSchedule[classId][day][anchorTime] = {
          subject: String(row.subject || ''),
          teacher: String(row.teacher || ''),
          room: String(row.room || ''),
          colorIdx: Number(row.color_idx || 0),
          startTime: String(row.start_time || anchorTime),
          endTime: String(row.end_time || getDefaultEndTime(anchorTime)),
        };
      }

      const importedLocks: typeof weeklyScheduleLocks = {};
      for (const row of lockRows) {
        const classId = String(row.class_id || '');
        if (!classId) continue;
        importedLocks[classId] = importedLocks[classId] || { weekLocked: false, lockedDays: {} };
        if (String(row.scope) === 'week') {
          importedLocks[classId].weekLocked = Number(row.locked || 0) === 1;
        }
        if (String(row.scope) === 'day') {
          importedLocks[classId].lockedDays[String(row.day || '')] = Number(row.locked || 0) === 1;
        }
      }

      pushScheduleHistory();
      applyWeeklySchedule(importedSchedule);
      replaceWeeklyScheduleLocks(importedLocks);
      logTimetableAction('xlsx_import', 'Import XLSX du planning interactif');
      toast.success('Planning interactif importé depuis XLSX');
    } catch {
      toast.error("Échec de l'import XLSX du planning");
    } finally {
      event.target.value = '';
    }
  };

  const handleOpenBatchTransfer = () => {
    setBatchTransferMode('copy');
    setTransferTargetClasses([]);
    setShowBatchTransfer(true);
  };

  const handleConfirmBatchTransfer = () => {
    const sourceSchedule = weeklySchedule[selectedClass] || {};
    if (isWeekLocked(selectedClass)) {
      toast.error('La semaine source est verrouillée');
      return;
    }
    if (transferTargetClasses.length === 0) {
      toast.error('Sélectionnez au moins une classe cible');
      return;
    }
    if (batchTransferMode === 'move' && transferTargetClasses.length > 1) {
      toast.error('Le déplacement ne peut cibler qu’une seule classe');
      return;
    }

    const nextSchedule = cloneWeeklySchedule(weeklySchedule);
    const clonedSchedule = JSON.parse(JSON.stringify(sourceSchedule)) as typeof sourceSchedule;
    for (const classId of transferTargetClasses) {
      if (isWeekLocked(classId)) {
        toast.error(`La semaine cible ${classId} est verrouillée`);
        return;
      }
      nextSchedule[classId] = JSON.parse(JSON.stringify(clonedSchedule));
    }

    if (batchTransferMode === 'move') {
      nextSchedule[selectedClass] = {};
      pushScheduleHistory();
      applyWeeklySchedule(nextSchedule);
      logTimetableAction('batch_moved', `Emploi du temps déplacé vers ${transferTargetClasses[0]}`, { targetClassIds: transferTargetClasses });
      toast.success(`Emploi du temps déplacé vers ${transferTargetClasses[0]}`);
    } else {
      pushScheduleHistory();
      applyWeeklySchedule(nextSchedule);
      logTimetableAction('batch_copied', `Emploi du temps copié vers ${transferTargetClasses.join(', ')}`, { targetClassIds: transferTargetClasses });
      toast.success(`Emploi du temps copié vers ${transferTargetClasses.join(', ')}`);
    }
    setShowBatchTransfer(false);
  };

  const handleMoveCell = (targetDay: string, targetTime: string) => {
    if (!draggingCell) {
      return;
    }

    const sourceCell = getCell(draggingCell.day, draggingCell.time);
    if (!sourceCell) {
      setDraggingCell(null);
      setDragHoverCell(null);
      return;
    }

    const evaluation = evaluateMoveTarget(targetDay, targetTime);
    if (!evaluation.valid) {
      toast.error(evaluation.reason || 'Déplacement impossible');
      setDraggingCell(null);
      setDragHoverCell(null);
      return;
    }

    const durationMinutes = timeToMinutes(sourceCell.endTime) - timeToMinutes(sourceCell.startTime);
    const movedEndMinutes = timeToMinutes(targetTime) + durationMinutes;
    const endHours = Math.floor(movedEndMinutes / 60);
    const endMinutes = movedEndMinutes % 60;
    const movedEndTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

    const movedCell: ScheduleCell = {
      ...sourceCell,
      startTime: targetTime,
      endTime: movedEndTime,
    };

    const nextSchedule = cloneWeeklySchedule(weeklySchedule);
    if (nextSchedule[selectedClass]?.[draggingCell.day]?.[draggingCell.time]) {
      delete nextSchedule[selectedClass][draggingCell.day][draggingCell.time];
    }
    nextSchedule[selectedClass] = {
      ...(nextSchedule[selectedClass] || {}),
      [targetDay]: {
        ...(nextSchedule[selectedClass]?.[targetDay] || {}),
        [targetTime]: movedCell,
      },
    };

    if (!validateScheduleCell(targetDay, targetTime, movedCell, nextSchedule)) {
      setDraggingCell(null);
      setDragHoverCell(null);
      return;
    }

    pushScheduleHistory();
    applyWeeklySchedule(nextSchedule);
    logTimetableAction('cell_moved', `Case déplacée dans ${selectedClass}`, { day: targetDay, time: targetTime });
    setDraggingCell(null);
    setDragHoverCell(null);
    toast.success('Case déplacée');
  };

  // ────────────────────────────────────────────────────────────
  // Timetable image helpers (BUG FIX: no form submission)
  // ────────────────────────────────────────────────────────────
  const handleTimetableFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();   // prevent any form bubble
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await compressImageFile(file);
      setPendingTimetableFile({ name: file.name, data });
    } catch (err) {
      console.error(err);
      toast.error("Failed to compress or read file.");
    }
    e.target.value = '';  // reset so same file can be re-picked
  };

  const resetTimetableUpload = () => {
    setPendingTimetableFile(null);
    setTimetableUploadClass(selectedClass);
    setShowTimetableUpload(false);
  };

  const confirmTimetableUpload = () => {
    if (!pendingTimetableFile) return;
    try {
      setClassTimetableImage(timetableUploadClass, pendingTimetableFile.data);
      toast.success(`Emploi du temps publié pour la classe ${timetableUploadClass}`);
      resetTimetableUpload();
    } catch {
      toast.error("Erreur de sauvegarde: L'image est trop volumineuse pour la mémoire locale.");
    }
  };

  const removeTimetableImage = (classId: string) => {
    try {
      removeClassTimetableImage(classId);
      if (viewingClassImage === classId) setViewingClassImage(null);
      toast.success('Image supprimée');
    } catch (err) {
      console.error(err);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Exam planning helpers (BUG FIX: no form submission)
  // ────────────────────────────────────────────────────────────
  const getExamPlanFile = (level: string, trimester: 1|2|3) =>
    examPlanningFiles.find(f => f.level === level && f.trimester === trimester) || null;

  const handlePlanFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await compressImageFile(file);
      setPendingPlanFile({ name: file.name, data });
    } catch (err) {
      console.error(err);
      toast.error("Failed to compress or read file.");
    }
    e.target.value = '';
  };

  const resetPlanUpload = () => {
    setPendingPlanFile(null);
    setUploadLevel('4');
    setUploadTrimester(1);
    setShowPlanUpload(false);
  };

  const confirmPlanUpload = () => {
    if (!pendingPlanFile) return;
    addExamPlanningFile({
      level: uploadLevel,
      trimester: uploadTrimester,
      fileName: pendingPlanFile.name,
      fileData: pendingPlanFile.data,
      uploadDate: new Date().toISOString(),
    });
    toast.success(`Planning T${uploadTrimester} publié pour toutes les classes de ${uploadLevel}ème`);
    resetPlanUpload();
  };

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    addExam(examForm);
    setShowAddExam(false);
    setExamForm({ subject: '', date: '', time: '', room: '', supervisor: '', session: 'S1', trimester: 1 });
    toast.success('Examen ajouté');
  };

  const handleImportExamsFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      toast.error("Format de fichier non supporté. Veuillez utiliser un fichier PDF, XLSX, XLS ou CSV.");
      event.target.value = '';
      return;
    }

    try {
      if (fileName.endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const rawText = await extractPdfText(buffer);
        const rows = parseExamSchedulesFromPdfText(rawText);
        importExams(rows);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' }) as Array<Record<string, string | number>>;
        importExams(rows.map((row) => ({
          subject: String(row.subject || row.matiere || row.matière || ''),
          date: String(row.date || ''),
          time: String(row.time || row.heure || ''),
          room: String(row.room || row.salle || ''),
          supervisor: String(row.supervisor || row.surveillant || ''),
          session: String(row.session || 'S1'),
          trimester: String(row.trimester || row.trimestre || '1'),
        })));
      }
      logTimetableAction('xlsx_import', 'Import des examens via fichier');
    } catch {
      toast.error("Échec de l'import des examens");
    } finally {
      event.target.value = '';
    }
  };

  // ────────────────────────────────────────────────────────────
  // Trimester detail view (exam planning)
  // ────────────────────────────────────────────────────────────
  if (activeTab === 'planning' && detailTrimester !== null) {
    const level = selectedClass[0];
    const file  = getExamPlanFile(level, detailTrimester);

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 print:hidden">
          <button onClick={() => setDetailTrimester(null)}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-black text-slate-900">{TRIMESTER_LABELS[detailTrimester]}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Classe {selectedClass} — Niveau {level}ème
            </p>
          </div>
        </div>

        {file ? (
          <div className="space-y-3 print:space-y-0 print:m-0 print:p-0">
            <div className="flex items-center justify-between print:hidden">
              <span className="flex items-center gap-2 font-black text-slate-700 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />{file.fileName}
              </span>
              {isAdmin && (
                <button onClick={() => deleteExamPlanningFile(file.id)}
                  className="p-1.5 rounded-xl hover:bg-rose-50 text-rose-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-bold print:hidden">
              Appliqué à {level}A · {level}B · {level}C · {level}D · {level}E &nbsp;·&nbsp;
              {new Date(file.uploadDate).toLocaleDateString('fr-FR')}
            </p>
            {file.fileData.startsWith('data:image') ? (
              <img src={file.fileData} alt="Planning" className="w-full rounded-2xl border-none md:border md:border-slate-100 md:shadow-sm object-contain md:max-h-[500px] print:block print:w-full print:h-[99vh] print:max-h-[99vh] print:object-contain print:shadow-none print:rounded-none print:m-0 print:p-0" />
            ) : (
              <div className="bg-slate-50 rounded-2xl border border-slate-100 py-14 flex flex-col items-center gap-3 print:border-none print:bg-white">
                <FileImage className="w-12 h-12 text-slate-300 print:hidden" />
                <p className="text-slate-500 font-bold text-sm">Fichier PDF — {file.fileName}</p>
              </div>
            )}
            {isAdmin && (
              <button onClick={() => { setUploadLevel(level); setUploadTrimester(detailTrimester); setShowPlanUpload(true); }}
                className="w-full py-3 border-2 border-dashed border-primary/30 rounded-2xl text-primary font-black text-sm hover:border-primary/60 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 print:hidden">
                <Upload className="w-4 h-4" /> Remplacer
              </button>
            )}
          </div>
        ) : (
          <Card className="border-none shadow-sm rounded-2xl">
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <FileImage className="w-14 h-14 text-slate-200" />
              <div>
                <p className="font-black text-slate-600">Aucun planning disponible</p>
                <p className="text-[11px] text-slate-400 mt-1">Trimestre {detailTrimester} — Niveau {level}ème</p>
              </div>
              {isAdmin && (
                <button onClick={() => { setUploadLevel(level); setUploadTrimester(detailTrimester); setShowPlanUpload(true); }}
                  className="px-5 py-2.5 bg-primary text-white font-black rounded-2xl text-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Publier le planning
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {showPlanUpload && renderPlanUploadModal()}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Class image preview view (timetable tab)
  // ────────────────────────────────────────────────────────────
  if (activeTab === 'timetable' && viewingClassImage !== null) {
    const imgData = classTimetableImages[viewingClassImage];
    return (
      <div className="space-y-5 print:space-y-0 print:m-0 print:p-0">
        <div className="flex items-center gap-3 print:hidden">
          <button onClick={() => setViewingClassImage(null)}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-black text-slate-900">Emploi du temps — {viewingClassImage}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Document affiché</p>
          </div>
        </div>

        {imgData ? (
          imgData.startsWith('data:image') ? (
            <img src={imgData} alt={`EDT ${viewingClassImage}`}
              className="w-full rounded-2xl border-none md:border md:border-slate-100 md:shadow-sm object-contain md:max-h-[600px] print:block print:w-full print:h-[99vh] print:max-h-[99vh] print:object-contain print:shadow-none print:rounded-none print:m-0 print:p-0" />
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-100 py-14 flex flex-col items-center gap-3 print:border-none print:bg-white">
              <FileImage className="w-12 h-12 text-slate-300 print:hidden" />
              <p className="text-slate-500 font-bold">Fichier PDF — {viewingClassImage}</p>
            </div>
          )
        ) : (
          <Card className="border-none shadow-sm rounded-2xl print:hidden">
            <CardContent className="py-14 text-center">
              <p className="text-slate-400 font-bold">Aucune image disponible pour {viewingClassImage}</p>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <div className="flex gap-3 print:hidden">
            <button onClick={() => { setTimetableUploadClass(viewingClassImage); setShowTimetableUpload(true); }}
              className="flex-1 py-3 border-2 border-dashed border-primary/30 rounded-2xl text-primary font-black text-sm hover:border-primary/60 hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" /> {imgData ? 'Remplacer' : 'Importer'}
            </button>
            {imgData && (
              <button onClick={() => removeTimetableImage(viewingClassImage)}
                className="px-5 py-3 border-2 border-rose-200 rounded-2xl text-rose-500 font-black text-sm hover:bg-rose-50 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {showTimetableUpload && renderTimetableUploadModal()}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Modals (rendered as functions — no <form> tags)
  // ────────────────────────────────────────────────────────────
  function renderTimetableUploadModal() {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 pb-28 sm:pb-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) resetTimetableUpload(); }}
        >
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} // animate y
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto mb-auto mt-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900">Publier Emploi du Temps</h3>
              <button type="button" onClick={resetTimetableUpload}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* BUG FIX 1: ALL classes rendered (1A → 6E) */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                Classe cible
              </label>
              <div className="space-y-2">
                {LEVELS.map(grade => (
                  <div key={grade}>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{grade}ème année</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {SECTIONS.map(sec => {
                        const cls = grade + sec;
                        const ok  = visibleClasses.includes(cls);
                        return (
                          <button key={cls} type="button" disabled={!ok}
                            onClick={() => ok && setTimetableUploadClass(cls)}
                            className={`py-2 rounded-xl font-black text-xs transition-all
                              ${timetableUploadClass === cls ? 'bg-primary text-white shadow-md' : ''}
                              ${ok && timetableUploadClass !== cls ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : ''}
                              ${!ok ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : ''}`}>
                            {cls}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* File picker — BUG FIX 2: no <form>, uses onClick/onChange only */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                Fichier (Image ou PDF)
              </label>
              <input ref={timetableFileRef} type="file" accept="image/*,application/pdf"
                className="hidden" onChange={handleTimetableFileSelect} />
              {pendingTimetableFile ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-green-800 text-sm truncate">{pendingTimetableFile.name}</p>
                    <p className="text-[10px] text-green-600">Prêt pour {timetableUploadClass}</p>
                  </div>
                  <button type="button" onClick={() => setPendingTimetableFile(null)}
                    className="text-green-500 hover:text-green-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => timetableFileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-8 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all">
                  <Upload className="w-7 h-7 text-slate-300" />
                  <p className="font-black text-slate-500 text-sm">Choisir un fichier</p>
                  <p className="text-[10px] text-slate-400">PNG / JPG / PDF</p>
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={resetTimetableUpload}
                className="py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-black text-sm hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button type="button" disabled={!pendingTimetableFile}
                onClick={confirmTimetableUpload}
                className="py-3 rounded-2xl bg-primary text-white font-black text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Publier
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  function renderPlanUploadModal() {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 pb-28 sm:pb-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) resetPlanUpload(); }}
        >
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto mb-auto mt-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900">Publier Planning Examens</h3>
              <button type="button" onClick={resetPlanUpload}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Level — BUG FIX 1: all 6 levels rendered */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                Niveau scolaire
              </label>
              <div className="grid grid-cols-6 gap-2">
                {LEVELS.map(lv => (
                  <button key={lv} type="button" onClick={() => setUploadLevel(lv)}
                    className={`py-2.5 rounded-xl font-black text-sm transition-all
                      ${uploadLevel === lv ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {lv}ème
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 font-bold">
                Sera appliqué à {uploadLevel}A · {uploadLevel}B · {uploadLevel}C · {uploadLevel}D · {uploadLevel}E
              </p>
            </div>

            {/* Trimester */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                Trimestre
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([1,2,3] as const).map(tr => (
                  <button key={tr} type="button" onClick={() => setUploadTrimester(tr)}
                    className={`py-2.5 rounded-xl font-black text-sm transition-all
                      ${uploadTrimester === tr ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    T{tr}
                  </button>
                ))}
              </div>
            </div>

            {/* File picker */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                Fichier (Image ou PDF)
              </label>
              <input ref={planFileRef} type="file" accept="image/*,application/pdf"
                className="hidden" onChange={handlePlanFileSelect} />
              {pendingPlanFile ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-green-800 text-sm truncate">{pendingPlanFile.name}</p>
                    <p className="text-[10px] text-green-600">Prêt à publier — T{uploadTrimester} — {uploadLevel}ème</p>
                  </div>
                  <button type="button" onClick={() => setPendingPlanFile(null)}
                    className="text-green-500 hover:text-green-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => planFileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-8 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all">
                  <Upload className="w-7 h-7 text-slate-300" />
                  <p className="font-black text-slate-500 text-sm">Choisir un fichier</p>
                  <p className="text-[10px] text-slate-400">PNG / JPG / PDF</p>
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={resetPlanUpload}
                className="py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-black text-sm hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button type="button" disabled={!pendingPlanFile}
                onClick={confirmPlanUpload}
                className="py-3 rounded-2xl bg-primary text-white font-black text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Publier
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  function renderBatchExportModal() {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 pb-28 sm:pb-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowBatchExport(false); }}
        >
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto mb-auto mt-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900">Export multi-classes</h3>
              <button type="button" onClick={() => setShowBatchExport(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => setBatchSelectedClasses(visibleClasses)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-xs">Tout sélectionner</button>
              <button type="button" onClick={() => setBatchSelectedClasses([])} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-xs">Tout vider</button>
              <button type="button" onClick={() => setBatchSelectedClasses(visibleClasses.filter((classId) => classId[0] === selectedClass[0]))} className="px-3 py-2 rounded-xl bg-primary/10 text-primary font-black text-xs">Niveau {selectedClass[0]} seulement</button>
            </div>

            <div className="max-h-72 overflow-auto space-y-3">
              {LEVELS.map((grade) => (
                <div key={grade} className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{grade}ème année</p>
                  <div className="grid grid-cols-5 gap-2">
                    {SECTIONS.map((section) => {
                      const classId = `${grade}${section}`;
                      const allowed = visibleClasses.includes(classId);
                      const selected = batchSelectedClasses.includes(classId);
                      return (
                        <button
                          key={classId}
                          type="button"
                          disabled={!allowed}
                          onClick={() => {
                            if (!allowed) return;
                            setBatchSelectedClasses((current) => current.includes(classId)
                              ? current.filter((value) => value !== classId)
                              : [...current, classId]);
                          }}
                          className={`py-2 rounded-xl font-black text-xs transition-all ${selected ? 'bg-primary text-white' : allowed ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-50 text-slate-200 cursor-not-allowed'}`}
                        >
                          {classId}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={handleExportBatchPdf} disabled={batchSelectedClasses.length === 0}
                className="py-3 rounded-2xl bg-primary text-white font-black text-sm hover:bg-primary/90 transition-colors disabled:opacity-40">
                Export PDF groupé
              </button>
              <button type="button" onClick={() => { void handleExportBatchZip(); }} disabled={batchSelectedClasses.length === 0}
                className="py-3 rounded-2xl border-2 border-primary/20 text-primary font-black text-sm hover:bg-primary/5 transition-colors disabled:opacity-40">
                Export ZIP PDF
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  function renderBatchTransferModal() {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 pb-28 sm:pb-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowBatchTransfer(false); }}
        >
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto mb-auto mt-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900">Déplacer / Copier l'emploi du temps</h3>
              <button type="button" onClick={() => setShowBatchTransfer(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setBatchTransferMode('copy')} className={`py-3 rounded-2xl font-black text-sm ${batchTransferMode === 'copy' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}>
                Copier depuis {selectedClass}
              </button>
              <button type="button" onClick={() => setBatchTransferMode('move')} className={`py-3 rounded-2xl font-black text-sm ${batchTransferMode === 'move' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}>
                Déplacer depuis {selectedClass}
              </button>
            </div>

            <div className="max-h-72 overflow-auto space-y-3">
              {LEVELS.map((grade) => (
                <div key={grade} className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{grade}ème année</p>
                  <div className="grid grid-cols-5 gap-2">
                    {SECTIONS.map((section) => {
                      const classId = `${grade}${section}`;
                      const allowed = visibleClasses.includes(classId) && classId !== selectedClass;
                      const selected = transferTargetClasses.includes(classId);
                      return (
                        <button
                          key={classId}
                          type="button"
                          disabled={!allowed}
                          onClick={() => {
                            if (!allowed) return;
                            setTransferTargetClasses((current) => current.includes(classId)
                              ? current.filter((value) => value !== classId)
                              : [...current, classId]);
                          }}
                          className={`py-2 rounded-xl font-black text-xs transition-all ${selected ? 'bg-primary text-white' : allowed ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-50 text-slate-200 cursor-not-allowed'}`}
                        >
                          {classId}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={handleConfirmBatchTransfer} disabled={transferTargetClasses.length === 0}
              className="w-full py-3 rounded-2xl bg-primary text-white font-black text-sm hover:bg-primary/90 transition-colors disabled:opacity-40">
              {batchTransferMode === 'copy' ? 'Copier vers la sélection' : 'Déplacer vers la sélection'}
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Main view
  // ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 print:space-y-0 print:m-0 print:p-0 print:block">

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-2xl">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Scolarité</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Emplois du temps & Examens</p>
          </div>
        </div>
        <button type="button" onClick={() => triggerPrint()}
          className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors print:hidden">
          <Printer className="w-4 h-4" />
        </button>
      </div>

      <input
        ref={importScheduleFileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(event) => { void handleImportScheduleWorkbook(event); }}
      />
      <input
        ref={importExamFileRef}
        type="file"
        accept=".xlsx,.xls,.pdf"
        className="hidden"
        onChange={(event) => { void handleImportExamsFile(event); }}
      />

      {/* Class selector */}
      <div className="relative print:hidden">
        <button type="button" onClick={() => setClassDropOpen(v => !v)}
          className="w-full flex items-center justify-between bg-white border-2 border-primary/20 rounded-2xl px-5 py-3.5 shadow-sm hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm">
              {selectedClass}
            </div>
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Classe sélectionnée</p>
              <p className="font-black text-slate-900">Année {selectedClass[0]} — Section {selectedClass[1]}</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${classDropOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {classDropOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
              {LEVELS.map(grade => (
                <div key={grade}>
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Année {grade}</span>
                  </div>
                  <div className="grid grid-cols-5">
                    {SECTIONS.map(sec => {
                      const cls = grade + sec;
                      const ok  = visibleClasses.includes(cls);
                      return (
                        <button key={cls} type="button" disabled={!ok}
                          onClick={() => { setSelectedClass(cls); setClassDropOpen(false); }}
                          className={`py-3 text-sm font-black transition-colors
                            ${!ok ? 'text-slate-200 cursor-not-allowed' : ''}
                            ${selectedClass === cls ? 'bg-primary text-white' : ok ? 'hover:bg-primary/10 text-slate-700' : ''}`}>
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-2xl p-1 gap-1 print:hidden">
        {([
          { key: 'timetable', label: 'Emploi du temps', icon: Clock },
          { key: 'exams',     label: 'Examens',          icon: BookOpen },
          { key: 'planning',  label: 'Planning',          icon: FileImage },
        ] as const).map(tab => (
          <button key={tab.key} type="button"
            onClick={() => { setActiveTab(tab.key); setDetailTrimester(null); setViewingClassImage(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
              ${activeTab === tab.key ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: TIMETABLE ═══ */}
      {activeTab === 'timetable' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

          {isAdmin && (
            <button type="button"
              onClick={() => { setTimetableUploadClass(selectedClass); setShowTimetableUpload(true); }}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors print:hidden">
              <Upload className="w-4 h-4" /> Publier un emploi du temps
            </button>
          )}

          {/* BUG FIX 3: All class rows clickable → opens preview */}
          <div className="space-y-2 print:hidden">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Appuyez sur une classe pour voir son emploi du temps
            </p>
            {LEVELS.map(grade => (
              <div key={grade} className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{grade}ème année</p>
                <div className="grid grid-cols-5 gap-2">
                  {SECTIONS.map(sec => {
                    const cls = grade + sec;
                    const ok  = visibleClasses.includes(cls);
                    const hasImg = Boolean(classTimetableImages[cls]);
                    return (
                      <button key={cls} type="button" disabled={!ok}
                        onClick={() => ok && setViewingClassImage(cls)}
                        className={`relative py-3 rounded-2xl font-black text-xs transition-all flex flex-col items-center gap-1
                          ${!ok ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : 'bg-white border border-slate-100 shadow-sm hover:border-primary/30 hover:shadow-md active:scale-95'}
                          ${selectedClass === cls && ok ? 'border-primary/40 ring-2 ring-primary/20' : ''}`}>
                        <span className={ok ? 'text-slate-700' : ''}>{cls}</span>
                        {hasImg && ok && (
                          <Eye className="w-3 h-3 text-green-500" />
                        )}
                        {!hasImg && ok && (
                          <span className="text-[8px] text-slate-300 font-bold">vide</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden print:hidden">
            <CardContent className="p-4 grid grid-cols-1 xl:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Verrouillage</p>
                <div className="flex gap-2 flex-wrap items-center">
                  <select value={selectedLockDay} onChange={(event) => setSelectedLockDay(event.target.value)} className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold">
                    {DAY_KEYS.map((dayKey, index) => <option key={dayKey} value={dayKey}>{DAYS[index]}</option>)}
                  </select>
                  <button type="button" onClick={() => handleToggleDayLock(true)} className="h-11 px-4 rounded-xl bg-rose-50 text-rose-700 font-black text-xs">Verrouiller jour</button>
                  <button type="button" onClick={() => handleToggleDayLock(false)} className="h-11 px-4 rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs">Déverrouiller jour</button>
                  <button type="button" onClick={() => handleToggleWeekLock(true)} className="h-11 px-4 rounded-xl bg-rose-50 text-rose-700 font-black text-xs">Verrouiller semaine</button>
                  <button type="button" onClick={() => handleToggleWeekLock(false)} className="h-11 px-4 rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs">Déverrouiller semaine</button>
                </div>
              </div>
              <button type="button" onClick={handleExportScheduleWorkbook} className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors">Export XLSX</button>
              <button type="button" onClick={handleExportScheduleCsv} className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors">Export CSV</button>
              <button type="button" onClick={() => importScheduleFileRef.current?.click()} className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors">Import XLSX</button>
              <div className="flex gap-2 flex-wrap justify-end">
                <Badge variant="outline" className={`text-[9px] font-black ${isWeekLocked() ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  {isWeekLocked() ? 'Semaine verrouillée' : 'Semaine ouverte'}
                </Badge>
                <Badge variant="outline" className={`text-[9px] font-black ${isDayLocked(selectedLockDay) ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  {DAYS[DAY_KEYS.indexOf(selectedLockDay)]}: {isDayLocked(selectedLockDay) ? 'verrouillé' : 'ouvert'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {scheduleConflictSummary.length > 0 && (
            <Card className="border border-rose-200 bg-rose-50 shadow-sm rounded-2xl overflow-hidden print:hidden">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-rose-800">Alerte automatique: conflit détecté</p>
                  <p className="text-sm text-rose-700 mt-1">{scheduleConflictSummary.length} conflit(s) prof/salle détecté(s). Consultez le résumé hebdomadaire ci-dessous.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interactive weekly grid for selected class */}
          <div className="space-y-2 print:space-y-0">
            <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Grille interactive — {selectedClass}
                {(isAdmin || isTeacher) ? ' (appuyez pour modifier / poignée pour redimensionner / glisser-déplacer pour déplacer)' : ''}
              </p>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={handleUndoSchedule}
                  className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors">
                  Undo
                </button>
                <button type="button" onClick={handleRedoSchedule}
                  className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors">
                  Redo
                </button>
                <button type="button" onClick={handleOpenBatchTransfer}
                  className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Move / Copy batch
                </button>
                <button type="button" onClick={handleOpenBatchExport}
                  className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Export batch
                </button>
                <button type="button" onClick={handleExportWeeklyTimetablePdf}
                  className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Exporter PDF classe
                </button>
                <button type="button" onClick={handleExportLevelPdf}
                  className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Exporter PDF niveau
                </button>
                <button type="button" onClick={handleExportLevelXlsx}
                  className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Exporter XLSX niveau
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end bg-white rounded-2xl border border-slate-100 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Copier une journée</p>
                <select value={copyDaySource} onChange={(event) => setCopyDaySource(event.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold">
                  {DAY_KEYS.map((dayKey, index) => <option key={dayKey} value={dayKey}>{DAYS[index]}</option>)}
                </select>
              </div>
              <button type="button" onClick={handleCopyDay} className="h-11 px-4 rounded-xl bg-slate-100 text-slate-700 font-black text-xs hover:bg-slate-200 transition-colors">Copier jour</button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Coller sur une journée</p>
                <select value={copyDayTarget} onChange={(event) => setCopyDayTarget(event.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold">
                  {DAY_KEYS.map((dayKey, index) => <option key={dayKey} value={dayKey}>{DAYS[index]}</option>)}
                </select>
              </div>
              <button type="button" onClick={handlePasteDay} disabled={!copiedDay} className="h-11 px-4 rounded-xl bg-primary text-white font-black text-xs hover:bg-primary/90 transition-colors disabled:opacity-40">Coller jour</button>
            </div>
            <div className="flex gap-3 flex-wrap bg-white rounded-2xl border border-slate-100 p-4">
              <button type="button" onClick={handleCopyWeek} className="h-11 px-4 rounded-xl bg-slate-100 text-slate-700 font-black text-xs hover:bg-slate-200 transition-colors">Copier semaine entière</button>
              <button type="button" onClick={handlePasteWeek} disabled={!copiedWeek} className="h-11 px-4 rounded-xl bg-primary text-white font-black text-xs hover:bg-primary/90 transition-colors disabled:opacity-40">Coller semaine entière</button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-white">
              <table className="min-w-[600px] w-full text-xs">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="py-3 px-3 text-left font-black text-[10px] uppercase tracking-widest w-16">Heure</th>
                    {DAYS.map(d => (
                      <th key={d} className="py-3 px-2 text-center font-black text-[10px] uppercase tracking-widest">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody ref={gridBodyRef}>
                  {TIME_SLOTS.map((time, ti) => (
                    <tr key={time} className={`${ti % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} h-16`}>
                      <td className="py-2 px-3 font-black text-[10px] text-slate-400 whitespace-nowrap border-r border-slate-100">{time}</td>
                      {DAY_KEYS.map(day => {
                        const exactCell = getCell(day, time);
                        const owningCell = getOwningCell(day, time);

                        if (!exactCell && owningCell && owningCell.anchorTime !== time) {
                          return null;
                        }

                        if (exactCell) {
                          const visualCell = resizingCell?.day === day && resizingCell.time === time && resizePreviewEndTime
                            ? { ...exactCell, endTime: resizePreviewEndTime }
                            : exactCell;
                          const rowSpan = getCellVisualRowSpan(visualCell, time);

                          return (
                            <td key={day} rowSpan={rowSpan} className="py-1 px-1 border-r border-slate-50 last:border-0 align-top">
                              <button
                                type="button"
                                draggable={isAdmin || isTeacher}
                                onDragStart={() => setDraggingCell({ day, time })}
                                onDragEnd={() => { setDraggingCell(null); setDragHoverCell(null); }}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  const evaluation = evaluateMoveTarget(day, time);
                                  setDragHoverCell({ day, time, valid: evaluation.valid, reason: evaluation.reason });
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  handleMoveCell(day, time);
                                }}
                                onClick={() => openCell(day, time)}
                                className={`relative w-full h-full min-h-[48px] rounded-xl border transition-all text-left px-2 py-2
                                  ${COLORS[exactCell.colorIdx % COLORS.length]} border font-bold
                                  ${isCellLocked(day) ? 'opacity-80 saturate-50 border-slate-400' : ''}
                                  ${draggingCell?.day === day && draggingCell.time === time ? 'opacity-50' : ''}
                                  ${dragHoverCell?.day === day && dragHoverCell.time === time ? (dragHoverCell.valid ? 'ring-2 ring-emerald-500/70' : 'ring-2 ring-rose-500/70') : ''}
                                  ${(!isAdmin && !isTeacher) ? 'cursor-default' : 'cursor-move'}`}>
                                <div>
                                  {isCellLocked(day) && (
                                    <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-800/70 text-white text-[8px] font-black">
                                      <Lock className="w-2.5 h-2.5" /> Lock
                                    </div>
                                  )}
                                  <p className="font-black text-[10px] leading-tight">{visualCell.subject}</p>
                                  <p className="text-[9px] opacity-70">{visualCell.startTime} → {visualCell.endTime}</p>
                                  {visualCell.teacher && <p className="text-[9px] opacity-70 truncate">{visualCell.teacher}</p>}
                                  {visualCell.room && <p className="text-[9px] opacity-60">Salle {visualCell.room}</p>}
                                </div>
                                {(isAdmin || isTeacher) && (
                                  <>
                                    {dragHoverCell?.day === day && dragHoverCell.time === time && (
                                      <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-md text-[8px] font-black ${dragHoverCell.valid ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                        {dragHoverCell.valid ? 'Déposer ici' : (dragHoverCell.reason || 'Impossible')}
                                      </div>
                                    )}
                                    <div
                                      onMouseDown={(event) => {
                                        event.stopPropagation();
                                        setResizingCell({ day, time });
                                        setResizePreviewEndTime(exactCell.endTime);
                                      }}
                                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1.5 rounded-full bg-slate-700/30 cursor-ns-resize"
                                      title="Glisser pour redimensionner"
                                    />
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        }

                        return (
                          <td key={day} className="py-1 px-1 border-r border-slate-50 last:border-0">
                            <button
                              type="button"
                              onDragOver={(event) => {
                                event.preventDefault();
                                const evaluation = evaluateMoveTarget(day, time);
                                setDragHoverCell({ day, time, valid: evaluation.valid, reason: evaluation.reason });
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                handleMoveCell(day, time);
                              }}
                              onClick={() => openCell(day, time)}
                              className={`relative w-full min-h-[48px] rounded-xl border transition-all text-left px-2 py-1.5
                                border-dashed border-slate-200 hover:border-primary/30 hover:bg-primary/5
                                ${isCellLocked(day) ? 'bg-slate-100 border-slate-300 text-slate-500' : ''}
                                ${dragHoverCell?.day === day && dragHoverCell.time === time ? (dragHoverCell.valid ? 'ring-2 ring-emerald-500/70 bg-emerald-50' : 'ring-2 ring-rose-500/70 bg-rose-50') : ''}
                                ${(!isAdmin && !isTeacher) ? 'cursor-default' : 'cursor-pointer'}`}>
                              {isCellLocked(day) ? (
                                <div className="flex items-center justify-center h-full opacity-70 text-slate-500 gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span className="text-[8px] font-black">Lock</span>
                                </div>
                              ) : (isAdmin || isTeacher) && (
                                <div className="flex items-center justify-center h-full opacity-20">
                                  <Plus className="w-3 h-3" />
                                </div>
                              )}
                              {dragHoverCell?.day === day && dragHoverCell.time === time && (
                                <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-md text-[8px] font-black ${dragHoverCell.valid ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                  {dragHoverCell.valid ? 'Déposer ici' : (dragHoverCell.reason || 'Impossible')}
                                </div>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 print:hidden">
              <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Résumé hebdomadaire des conflits (enseignants / salles)</p>
                    <Badge variant="outline" className="text-[9px] font-black">{scheduleConflictSummary.length} conflit(s)</Badge>
                  </div>
                  {scheduleConflictSummary.length === 0 ? (
                    <p className="text-sm text-slate-400 font-bold">Aucun conflit détecté sur la semaine.</p>
                  ) : (
                    <div className="space-y-2 max-h-44 overflow-auto">
                      {scheduleConflictSummary.map((conflict) => (
                        <div key={conflict.key} className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                          <p className="text-sm font-black text-rose-800">{conflict.resource === 'teacher' ? 'Conflit enseignant' : 'Conflit salle'} — {conflict.value}</p>
                          <p className="text-xs text-rose-700 font-bold mt-1">{conflict.day} • {conflict.classes.join(' / ')} • {conflict.startTime} → {conflict.endTime}</p>
                          <p className="text-xs text-rose-600 mt-1">{conflict.subjects.join(' ↔ ')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Disponibilité hebdomadaire des enseignants</p>
                    <Badge variant="outline" className="text-[9px] font-black">{teacherAvailabilitySummary.length} créneau(x)</Badge>
                  </div>
                  <select
                    value={selectedTeacherAvailability}
                    onChange={(event) => setSelectedTeacherAvailability(event.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold"
                  >
                    <option value="">Choisir un enseignant</option>
                    {teacherAvailabilityOptions.map((teacherName) => (
                      <option key={teacherName} value={teacherName}>{teacherName}</option>
                    ))}
                  </select>
                  {!selectedTeacherAvailability ? (
                    <p className="text-sm text-slate-400 font-bold">Sélectionnez un enseignant pour visualiser ses créneaux occupés.</p>
                  ) : teacherAvailabilitySummary.length === 0 ? (
                    <p className="text-sm text-slate-400 font-bold">Aucun créneau détecté pour cet enseignant.</p>
                  ) : (
                    <div className="space-y-2 max-h-44 overflow-auto">
                      {teacherAvailabilitySummary.map((slot, index) => (
                        <div key={`${slot.classId}-${slot.day}-${slot.startTime}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-sm font-black text-slate-800">{slot.classId} • {slot.subject}</p>
                          <p className="text-xs text-slate-600 font-bold mt-1">{slot.day} • {slot.startTime} → {slot.endTime}</p>
                          {slot.room && <p className="text-xs text-slate-500 mt-1">Salle {slot.room}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Historique visuel des actions</p>
                    <Badge variant="outline" className="text-[9px] font-black">{filteredTimetableActionLogs.length} action(s)</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select value={historyActionFilter} onChange={(event) => setHistoryActionFilter(event.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold">
                      <option value="all">Toutes les actions</option>
                      <option value="cell_saved">cell_saved</option>
                      <option value="cell_deleted">cell_deleted</option>
                      <option value="cell_moved">cell_moved</option>
                      <option value="cell_resized">cell_resized</option>
                      <option value="cell_pasted">cell_pasted</option>
                      <option value="day_copied">day_copied</option>
                      <option value="day_pasted">day_pasted</option>
                      <option value="week_copied">week_copied</option>
                      <option value="week_pasted">week_pasted</option>
                      <option value="batch_copied">batch_copied</option>
                      <option value="batch_moved">batch_moved</option>
                      <option value="week_locked">week_locked</option>
                      <option value="week_unlocked">week_unlocked</option>
                      <option value="day_locked">day_locked</option>
                      <option value="day_unlocked">day_unlocked</option>
                      <option value="xlsx_import">xlsx_import</option>
                      <option value="xlsx_export">xlsx_export</option>
                      <option value="csv_export">csv_export</option>
                      <option value="pdf_export">pdf_export</option>
                    </select>
                    <input type="date" value={historyDateFilter} onChange={(event) => setHistoryDateFilter(event.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold" />
                  </div>
                  {filteredTimetableActionLogs.length === 0 ? (
                    <p className="text-sm text-slate-400 font-bold">Aucune action enregistrée pour cette classe.</p>
                  ) : (
                    <div className="space-y-2 max-h-44 overflow-auto">
                      {filteredTimetableActionLogs.slice(0, 20).map((log) => (
                        <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-sm font-black text-slate-800">{log.description}</p>
                          <p className="text-xs text-slate-600 font-bold mt-1">{log.actionType} • {new Date(log.createdAt).toLocaleString('fr-FR')}</p>
                          {(log.day || log.time) && <p className="text-xs text-slate-500 mt-1">{log.day || '—'} {log.time ? `• ${log.time}` : ''}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ TAB: EXAMS ═══ */}
      {activeTab === 'exams' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {(isAdmin || isTeacher) && (
            <div className="flex gap-3 flex-wrap">
              <button type="button" onClick={() => setShowAddExam(true)}
                className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" /> Ajouter un examen
              </button>
              <button type="button" onClick={() => importExamFileRef.current?.click()}
                className="px-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" /> Import XLSX / PDF
              </button>
            </div>
          )}
          {exams.length === 0 ? (
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="py-16 text-center">
                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-bold text-sm">Aucun examen programmé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {exams.map(exam => (
                <Card key={exam.id} className="border-none shadow-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-primary/10 rounded-xl p-3 shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900">{exam.subject}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{exam.date}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />{exam.time}
                        </span>
                        {exam.room && <span className="text-[10px] text-slate-500 font-bold">Salle {exam.room}</span>}
                      </div>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[9px] font-black">{exam.session}</Badge>
                        {exam.trimester && <Badge variant="outline" className="text-[9px] font-black">T{exam.trimester}</Badge>}
                        {exam.supervisor && <Badge variant="outline" className="text-[9px]">{exam.supervisor}</Badge>}
                      </div>
                    </div>
                    {(isAdmin || isTeacher) && (
                      <button type="button" onClick={() => { deleteExam(exam.id); toast.success('Supprimé'); }}
                        className="p-2 rounded-xl hover:bg-rose-50 text-rose-400 hover:text-rose-600 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ═══ TAB: PLANNING ═══ */}
      {activeTab === 'planning' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {isAdmin && (
            <button type="button" onClick={() => setShowPlanUpload(true)}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
              <Upload className="w-4 h-4" /> Publier un planning d'examens
            </button>
          )}
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
            Appuyez sur un trimestre pour voir le planning
          </p>
          <div className="space-y-3">
            {([1,2,3] as const).map(tr => {
              const level = selectedClass[0];
              const file  = getExamPlanFile(level, tr);
              return (
                <button key={tr} type="button" onClick={() => setDetailTrimester(tr)}
                  className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover:border-primary/30 hover:shadow-md transition-all text-left active:scale-[0.98]">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0
                    ${file ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                    T{tr}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900">{TRIMESTER_LABELS[tr]}</p>
                    <p className="text-[11px] mt-0.5 font-bold">
                      {file
                        ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{file.fileName}</span>
                        : <span className="text-slate-400">Aucun planning publié</span>}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ MODAL: Timetable upload ═══ */}
      {showTimetableUpload && renderTimetableUploadModal()}

      {/* ═══ MODAL: Batch export ═══ */}
      {showBatchExport && renderBatchExportModal()}

      {/* ═══ MODAL: Batch transfer ═══ */}
      {showBatchTransfer && renderBatchTransferModal()}

      {/* ═══ MODAL: Plan upload ═══ */}
      {showPlanUpload && renderPlanUploadModal()}

      {/* ═══ MODAL: Edit cell ═══ */}
      <AnimatePresence>
        {editCell && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 pb-28 sm:pb-4 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setEditCell(null); }}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto mb-auto mt-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900">Modifier la case</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">
                    {DAYS[DAY_KEYS.indexOf(editCell.day)]} — {editCell.time}
                  </p>
                </div>
                <button type="button" onClick={() => setEditCell(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Heure début</label>
                  <input type="time" value={cellForm.startTime}
                    onChange={e => setCellForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Heure fin</label>
                  <input type="time" value={cellForm.endTime}
                    onChange={e => setCellForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Matière</label>
                <div className="grid grid-cols-2 gap-2">
                  {SUBJECTS.map((subjectName, idx) => (
                    <button key={subjectName} type="button"
                      onClick={() => setCellForm(f => ({ ...f, selectedSubject: subjectName, manualSubject: '', colorIdx: idx % COLORS.length }))}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-all text-left
                        ${(cellForm.manualSubject.trim() || cellForm.selectedSubject) === subjectName ? COLORS[idx % COLORS.length] + ' border-2' : 'border-slate-100 hover:border-primary/20 text-slate-600'}`}>
                      {subjectName}
                    </button>
                  ))}
                </div>
                <input type="text" placeholder="Ou saisir manuellement..."
                  value={cellForm.manualSubject}
                  onChange={e => setCellForm(f => ({ ...f, manualSubject: e.target.value }))}
                  className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary" />
                <p className="mt-1 text-[10px] text-slate-400 font-bold">La saisie manuelle remplace la matière présélectionnée lors de l'enregistrement.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Enseignant</label>
                  <input type="text" value={cellForm.teacher}
                    onChange={e => setCellForm(f => ({ ...f, teacher: e.target.value }))}
                    placeholder="M. Dupont"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Salle</label>
                  <input type="text" value={cellForm.room}
                    onChange={e => setCellForm(f => ({ ...f, room: e.target.value }))}
                    placeholder="ex: 12"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={handleCopyCell}
                  className="py-3 rounded-2xl border border-slate-200 text-slate-700 font-black text-sm hover:bg-slate-50 transition-colors">
                  Copier case
                </button>
                <button type="button" onClick={handlePasteCell} disabled={!copiedCell}
                  className="py-3 rounded-2xl border border-primary/20 text-primary font-black text-sm hover:bg-primary/5 transition-colors disabled:opacity-40">
                  Coller case
                </button>
              </div>
              <div className="flex gap-3 pt-1">
                {getCell(editCell.day, editCell.time) && (
                  <button type="button" onClick={() => { clearCell(editCell.day, editCell.time); setEditCell(null); }}
                    className="flex-1 py-3 rounded-2xl border-2 border-rose-200 text-rose-500 font-black text-sm hover:bg-rose-50 transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                )}
                <button type="button"
                  onClick={saveCell}
                  disabled={!(cellForm.manualSubject.trim() || cellForm.selectedSubject.trim()) || !cellForm.startTime || !cellForm.endTime}
                  className="flex-1 py-3 rounded-2xl bg-primary text-white font-black text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Save className="w-4 h-4" /> Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: Add exam ═══ */}
      <AnimatePresence>
        {showAddExam && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 pb-28 sm:pb-4 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddExam(false); }}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[85vh] overflow-y-auto mb-auto mt-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-slate-900">Programmer un examen</h3>
                <button type="button" onClick={() => setShowAddExam(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddExam} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Matière</label>
                  <input required value={examForm.subject}
                    onChange={e => setExamForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                    placeholder="Mathématiques..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Date</label>
                    <input required type="date" value={examForm.date}
                      onChange={e => setExamForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Heure</label>
                    <input required type="time" value={examForm.time}
                      onChange={e => setExamForm(f => ({ ...f, time: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Salle</label>
                    <input value={examForm.room}
                      onChange={e => setExamForm(f => ({ ...f, room: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                      placeholder="ex: 12" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Session</label>
                    <select value={examForm.session}
                      onChange={e => setExamForm(f => ({ ...f, session: e.target.value as 'S1'|'S2'|'Rattrapage' }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white">
                      <option>S1</option><option>S2</option><option>Rattrapage</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Trimestre</label>
                    <select value={examForm.trimester}
                      onChange={e => setExamForm(f => ({ ...f, trimester: Number(e.target.value) as 1|2|3 }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-white">
                      <option value={1}>Trimestre 1</option>
                      <option value={2}>Trimestre 2</option>
                      <option value={3}>Trimestre 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Surveillant</label>
                    <input value={examForm.supervisor}
                      onChange={e => setExamForm(f => ({ ...f, supervisor: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                      placeholder="M. ..." />
                  </div>
                </div>
                <button type="submit"
                  className="w-full py-3.5 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-colors mt-1">
                  Enregistrer
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Schedules;

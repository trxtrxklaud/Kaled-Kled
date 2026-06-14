import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Activity,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileUp,
  Filter,
  Mail,
  MessageCircle,
  Pencil,
  PieChart as PieIcon,
  Plus,
  Save,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from '../lib/xlsx';
import {
  extractPdfText,
  parseAcademicResultsFromPdfText,
} from '../lib/importEngine';
import {
  buildAcademicAnalytics,
  SCHOOL_LEVELS,
} from '../lib/academicAnalytics';
import {
  buildAnalyticsPdfAttachment,
  buildCertificatesPdfAttachments,
  buildSelectedGradesPdfAttachment,
  buildSubjectReportPdfAttachment,
} from '../lib/pdfReports';
import { buildCertificateZipAttachment } from '../lib/certificateArchive';
import { sendEmailWithAttachments } from '../lib/emailDelivery';
import { PRIMARY_CLASSES } from '../lib/constants';

import type {
  AcademicResult,
  ImportAcademicResultData,
  SchoolLevel,
  Student,
  StatisticsTableColumnSearchState,
  ResultsPerformanceFilter,
  ResultsSortField,
  ResultsSortDirection,
} from '../lib/types';

const CHART_COLORS = ['#1a237e', '#3949ab', '#5c6bc0', '#7986cb', '#f9a825', '#fb8c00'];
const FILTER_ALL = 'all';
const TODAY = new Date().toISOString().split('T')[0];
const DEFAULT_RESULTS_PAGE_SIZE = 12;
const RESULTS_PAGE_SIZE_OPTIONS = [10, 12, 25, 50, 100] as const;

interface GradeFormState {
  classId: string;
  studentId: string;
  subject: string;
  examLabel: string;
  trimester: '1' | '2' | '3';
  score: string;
  coefficient: string;
  recordedAt: string;
}

interface EditableGradeFormState {
  subject: string;
  examLabel: string;
  trimester: '1' | '2' | '3';
  score: string;
  coefficient: string;
  recordedAt: string;
}

interface BulkEditFormState {
  subject: string;
  examLabel: string;
  trimester: 'keep' | '1' | '2' | '3';
  score: string;
  coefficient: string;
  recordedAt: string;
}

interface SubjectMetric {
  subject: string;
  recordedGrades: number;
  evaluatedStudents: number;
  averageScore: number;
  successCount: number;
  successRate: number;
  excellenceCount: number;
}

interface SubjectStudentMetric {
  student: Student;
  averageScore: number;
  recordedGrades: number;
  bestScore: number;
}

const createInitialGradeForm = (): GradeFormState => ({
  classId: '',
  studentId: '',
  subject: '',
  examLabel: '',
  trimester: '1',
  score: '',
  coefficient: '1',
  recordedAt: TODAY,
});

const createEditableGradeForm = (result: AcademicResult): EditableGradeFormState => ({
  subject: result.subject,
  examLabel: result.examLabel,
  trimester: String(result.trimester) as '1' | '2' | '3',
  score: result.score.toString(),
  coefficient: String(result.coefficient ?? 1),
  recordedAt: result.recordedAt,
});

const createInitialBulkEditForm = (): BulkEditFormState => ({
  subject: '',
  examLabel: '',
  trimester: 'keep',
  score: '',
  coefficient: '',
  recordedAt: '',
});

const createInitialTableColumnSearches = (): StatisticsTableColumnSearchState => ({
  student: '',
  classId: '',
  subject: '',
  examLabel: '',
  trimester: '',
  score: '',
  coefficient: '',
  recordedAt: '',
});

const formatTrimesterLabel = (trimester: string, isRTL: boolean): string => {
  if (trimester === FILTER_ALL) {
    return isRTL ? 'كل الفصول' : 'Tous les trimestres';
  }

  return isRTL ? `الفصل ${trimester}` : `Trimestre ${trimester}`;
};

const formatScopeLabel = (selectedClass: string, selectedTrimester: string, isRTL: boolean): string => {
  const classLabel = selectedClass === FILTER_ALL
    ? (isRTL ? 'كل الأقسام' : 'Toutes les classes')
    : selectedClass;

  return `${classLabel} • ${formatTrimesterLabel(selectedTrimester, isRTL)}`;
};

const sanitizeFileName = (value: string): string => (
  value
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase() || 'report'
);

const getPerformanceFilterLabel = (filter: ResultsPerformanceFilter, isRTL: boolean): string => {
  if (filter === 'excellence') {
    return isRTL ? 'امتياز ≥ 12/20' : 'Excellence ≥ 12/20';
  }
  if (filter === 'failing') {
    return isRTL ? 'متعثر < 10/20' : 'Échec < 10/20';
  }
  return isRTL ? 'كل المستويات' : 'Tous niveaux de performance';
};

const getGeneratedAtLabel = (): string => new Date().toLocaleString('fr-FR');

const Statistics: React.FC = () => {
  const {
    students,
    academicResults,
    announcements,
    messages,
    exams,
    schoolBranding,
    addAcademicResult,
    updateAcademicResult,
    updateAcademicResults,
    importAcademicResults,
    deleteAcademicResult,
    deleteAcademicResults,
    addEmailDeliveryLog,
    statisticsFilterPresets,
    saveStatisticsFilterPreset,
    deleteStatisticsFilterPreset,
  } = useData();
  const { isAdmin } = useAuth();
  const { t, isRTL } = useLanguage();

  const canManageAcademicData = isAdmin;
  const managerEmail = import.meta.env.VITE_MANAGER_EMAIL || '';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const filteredSelectAllRef = useRef<HTMLInputElement | null>(null);

  const [selectedTrimester, setSelectedTrimester] = useState<string>(FILTER_ALL);
  const [selectedClass, setSelectedClass] = useState<string>(FILTER_ALL);
  const [selectedLevel, setSelectedLevel] = useState<SchoolLevel>('1');
  const [selectedSubject, setSelectedSubject] = useState<string>(FILTER_ALL);
  const [selectedSubjectStudent, setSelectedSubjectStudent] = useState<string>(FILTER_ALL);
  const [trendMode, setTrendMode] = useState<'class' | 'student'>('class');
  const [selectedTrendClass, setSelectedTrendClass] = useState<string>(FILTER_ALL);
  const [selectedTrendStudent, setSelectedTrendStudent] = useState<string>(FILTER_ALL);
  const [resultsPage, setResultsPage] = useState<number>(1);
  const [resultsPageSize, setResultsPageSize] = useState<number>(DEFAULT_RESULTS_PAGE_SIZE);
  const [scoreMinFilter, setScoreMinFilter] = useState<string>('');
  const [scoreMaxFilter, setScoreMaxFilter] = useState<string>('');
  const [performanceFilter, setPerformanceFilter] = useState<ResultsPerformanceFilter>('all');
  const [resultsSortField, setResultsSortField] = useState<ResultsSortField>('recordedAt');
  const [resultsSortDirection, setResultsSortDirection] = useState<ResultsSortDirection>('desc');
  const [tableColumnSearches, setTableColumnSearches] = useState<StatisticsTableColumnSearchState>(createInitialTableColumnSearches());
  const [presetName, setPresetName] = useState<string>('');
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState<GradeFormState>(createInitialGradeForm());
  const [bulkEditForm, setBulkEditForm] = useState<BulkEditFormState>(createInitialBulkEditForm());
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editingGradeForm, setEditingGradeForm] = useState<EditableGradeFormState | null>(null);
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);

  const studentDirectory = useMemo(
    () => new Map<string, Student>(students.map((student) => [student.id, student])),
    [students],
  );

  const classOptions = PRIMARY_CLASSES;

  const filteredAcademicResults = useMemo(
    () => {
      const minScore = scoreMinFilter.trim() === '' ? null : Number.parseFloat(scoreMinFilter);
      const maxScore = scoreMaxFilter.trim() === '' ? null : Number.parseFloat(scoreMaxFilter);

      return academicResults.filter((result) => {
        const matchesTrimester = selectedTrimester === FILTER_ALL || String(result.trimester) === selectedTrimester;
        const matchesClass = selectedClass === FILTER_ALL || result.classId === selectedClass;
        const matchesMinScore = minScore === null || (!Number.isNaN(minScore) && result.score >= minScore);
        const matchesMaxScore = maxScore === null || (!Number.isNaN(maxScore) && result.score <= maxScore);
        const matchesPerformance =
          performanceFilter === 'all' ||
          (performanceFilter === 'excellence' && result.score >= 12) ||
          (performanceFilter === 'failing' && result.score < 10);

        return matchesTrimester && matchesClass && matchesMinScore && matchesMaxScore && matchesPerformance;
      });
    },
    [academicResults, performanceFilter, scoreMaxFilter, scoreMinFilter, selectedClass, selectedTrimester],
  );

  const sortedFilteredAcademicResults = useMemo(
    () => [...filteredAcademicResults].sort((left, right) => {
      const leftStudentName = studentDirectory.get(left.studentId)?.fullName || '';
      const rightStudentName = studentDirectory.get(right.studentId)?.fullName || '';

      let comparison = 0;
      switch (resultsSortField) {
        case 'student':
          comparison = leftStudentName.localeCompare(rightStudentName, 'fr-FR');
          break;
        case 'class':
          comparison = left.classId.localeCompare(right.classId, 'fr-FR');
          break;
        case 'subject':
          comparison = left.subject.localeCompare(right.subject, 'fr-FR');
          break;
        case 'examLabel':
          comparison = left.examLabel.localeCompare(right.examLabel, 'fr-FR');
          break;
        case 'trimester':
          comparison = left.trimester - right.trimester;
          break;
        case 'score':
          comparison = left.score - right.score;
          break;
        case 'coefficient':
          comparison = (left.coefficient ?? 1) - (right.coefficient ?? 1);
          break;
        case 'recordedAt':
          comparison = new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime();
          break;
        default:
          comparison = 0;
      }

      if (comparison === 0) {
        comparison = new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime();
      }

      return resultsSortDirection === 'asc' ? comparison : -comparison;
    }),
    [filteredAcademicResults, resultsSortDirection, resultsSortField, studentDirectory],
  );

  const tableSearchedAcademicResults = useMemo(
    () => sortedFilteredAcademicResults.filter((result) => {
      const studentName = studentDirectory.get(result.studentId)?.fullName || '';
      const matchesStudent = studentName.toLowerCase().includes(tableColumnSearches.student.toLowerCase());
      const matchesClass = result.classId.toLowerCase().includes(tableColumnSearches.classId.toLowerCase());
      const matchesSubject = result.subject.toLowerCase().includes(tableColumnSearches.subject.toLowerCase());
      const matchesExam = result.examLabel.toLowerCase().includes(tableColumnSearches.examLabel.toLowerCase());
      const matchesTrimester = tableColumnSearches.trimester === '' || String(result.trimester) === tableColumnSearches.trimester;
      const matchesScore = result.score.toFixed(2).includes(tableColumnSearches.score.trim());
      const matchesCoefficient = (result.coefficient ?? 1).toFixed(2).includes(tableColumnSearches.coefficient.trim());
      const matchesDate = result.recordedAt.toLowerCase().includes(tableColumnSearches.recordedAt.toLowerCase());

      return matchesStudent && matchesClass && matchesSubject && matchesExam && matchesTrimester && matchesScore && matchesCoefficient && matchesDate;
    }),
    [sortedFilteredAcademicResults, studentDirectory, tableColumnSearches],
  );

  const analytics = useMemo(
    () => buildAcademicAnalytics(students, filteredAcademicResults),
    [filteredAcademicResults, students],
  );

  const firstActiveLevel = useMemo<SchoolLevel>(
    () => analytics.levelMetrics.find((levelMetric) => levelMetric.evaluatedStudents > 0)?.level ?? '1',
    [analytics.levelMetrics],
  );

  const effectiveSelectedLevel = useMemo<SchoolLevel>(() => {
    const hasDataOnSelectedLevel = analytics.levelMetrics.some(
      (levelMetric) => levelMetric.level === selectedLevel && levelMetric.evaluatedStudents > 0,
    );
    return hasDataOnSelectedLevel ? selectedLevel : firstActiveLevel;
  }, [analytics.levelMetrics, firstActiveLevel, selectedLevel]);

  const selectedLevelMetrics = analytics.levelMetrics.find(
    (levelMetric) => levelMetric.level === effectiveSelectedLevel,
  ) ?? null;

  const hasAcademicData = analytics.overview.recordedGrades > 0 && analytics.overview.evaluatedStudents > 0;
  const excellenceDistribution = analytics.excellenceChartData.length > 0
    ? analytics.excellenceChartData
    : [{ level: '1' as const, name: isRTL ? 'لا توجد معطيات' : 'Aucune excellence', value: 1 }];

  const filteredResultIds = useMemo(
    () => tableSearchedAcademicResults.map((result) => result.id),
    [tableSearchedAcademicResults],
  );

  const selectedFilteredResultIds = useMemo(
    () => filteredResultIds.filter((id) => selectedResultIds.includes(id)),
    [filteredResultIds, selectedResultIds],
  );

  const areAllFilteredResultsSelected = filteredResultIds.length > 0 && selectedFilteredResultIds.length === filteredResultIds.length;
  const hasPartialFilteredSelection = selectedFilteredResultIds.length > 0 && !areAllFilteredResultsSelected;

  useEffect(() => {
    if (filteredSelectAllRef.current) {
      filteredSelectAllRef.current.indeterminate = hasPartialFilteredSelection;
    }
  }, [hasPartialFilteredSelection]);

  const totalResultPages = Math.max(1, Math.ceil(tableSearchedAcademicResults.length / resultsPageSize));
  const effectiveResultsPage = Math.min(resultsPage, totalResultPages);
  const paginatedAcademicResults = useMemo(
    () => tableSearchedAcademicResults.slice(
      (effectiveResultsPage - 1) * resultsPageSize,
      effectiveResultsPage * resultsPageSize,
    ),
    [effectiveResultsPage, resultsPageSize, tableSearchedAcademicResults],
  );

  const resultsPageStart = tableSearchedAcademicResults.length === 0 ? 0 : ((effectiveResultsPage - 1) * resultsPageSize) + 1;
  const resultsPageEnd = Math.min(effectiveResultsPage * resultsPageSize, tableSearchedAcademicResults.length);

  const subjectMetrics = useMemo<SubjectMetric[]>(() => {
    type SubjectStudentAccumulator = {
      totalWeightedScore: number;
      totalWeight: number;
    };

    type SubjectAccumulator = {
      subject: string;
      recordedGrades: number;
      totalWeightedScore: number;
      totalWeight: number;
      studentAverages: Map<string, SubjectStudentAccumulator>;
    };

    const subjectMap = new Map<string, SubjectAccumulator>();

    for (const result of filteredAcademicResults) {
      const subjectKey = result.subject.trim() || 'Matière inconnue';
      const weight = result.coefficient && result.coefficient > 0 ? result.coefficient : 1;
      const subjectAccumulator = subjectMap.get(subjectKey) ?? {
        subject: subjectKey,
        recordedGrades: 0,
        totalWeightedScore: 0,
        totalWeight: 0,
        studentAverages: new Map<string, SubjectStudentAccumulator>(),
      };

      subjectAccumulator.recordedGrades += 1;
      subjectAccumulator.totalWeightedScore += result.score * weight;
      subjectAccumulator.totalWeight += weight;

      const studentAccumulator = subjectAccumulator.studentAverages.get(result.studentId) ?? {
        totalWeightedScore: 0,
        totalWeight: 0,
      };
      studentAccumulator.totalWeightedScore += result.score * weight;
      studentAccumulator.totalWeight += weight;
      subjectAccumulator.studentAverages.set(result.studentId, studentAccumulator);
      subjectMap.set(subjectKey, subjectAccumulator);
    }

    return [...subjectMap.values()]
      .map((subjectAccumulator) => {
        let successCount = 0;
        let excellenceCount = 0;

        for (const studentAccumulator of subjectAccumulator.studentAverages.values()) {
          if (studentAccumulator.totalWeight <= 0) {
            continue;
          }

          const studentAverage = studentAccumulator.totalWeightedScore / studentAccumulator.totalWeight;
          if (studentAverage >= 10) {
            successCount += 1;
          }
          if (studentAverage >= 12) {
            excellenceCount += 1;
          }
        }

        const evaluatedStudents = subjectAccumulator.studentAverages.size;
        const averageScore = subjectAccumulator.totalWeight > 0
          ? Number((subjectAccumulator.totalWeightedScore / subjectAccumulator.totalWeight).toFixed(2))
          : 0;

        return {
          subject: subjectAccumulator.subject,
          recordedGrades: subjectAccumulator.recordedGrades,
          evaluatedStudents,
          averageScore,
          successCount,
          successRate: evaluatedStudents > 0 ? Number(((successCount / evaluatedStudents) * 100).toFixed(1)) : 0,
          excellenceCount,
        };
      })
      .sort((left, right) => right.averageScore - left.averageScore);
  }, [filteredAcademicResults]);

  const topSubject = subjectMetrics[0] ?? null;
  const watchSubject = subjectMetrics.length > 0 ? subjectMetrics[subjectMetrics.length - 1] : null;
  const subjectChartData = subjectMetrics.slice(0, 8);
  const subjectOptions = subjectMetrics.map((subjectMetric) => subjectMetric.subject);
  const effectiveSelectedSubject = selectedSubject === FILTER_ALL
    ? FILTER_ALL
    : (subjectOptions.includes(selectedSubject) ? selectedSubject : (subjectOptions[0] ?? FILTER_ALL));

  const selectedSubjectMetrics = subjectMetrics.find(
    (subjectMetric) => subjectMetric.subject === effectiveSelectedSubject,
  ) ?? null;

  const subjectFilteredResults = useMemo(
    () => filteredAcademicResults.filter((result) => (
      effectiveSelectedSubject === FILTER_ALL || result.subject === effectiveSelectedSubject
    )),
    [effectiveSelectedSubject, filteredAcademicResults],
  );

  const subjectStudentOptions = useMemo(
    () => [...new Set(subjectFilteredResults.map((result) => result.studentId))]
      .map((studentId) => studentDirectory.get(studentId))
      .filter((student): student is Student => student !== undefined)
      .sort((left, right) => left.fullName.localeCompare(right.fullName, 'fr-FR')),
    [studentDirectory, subjectFilteredResults],
  );

  const effectiveSelectedSubjectStudent = subjectStudentOptions.some((student) => student.id === selectedSubjectStudent)
    ? selectedSubjectStudent
    : FILTER_ALL;

  const subjectStudentMetrics = useMemo<SubjectStudentMetric[]>(() => {
    const studentMetricsMap = new Map<string, {
      student: Student;
      totalWeightedScore: number;
      totalWeight: number;
      recordedGrades: number;
      bestScore: number;
    }>();

    for (const result of subjectFilteredResults) {
      const student = studentDirectory.get(result.studentId);
      if (!student) {
        continue;
      }

      const weight = result.coefficient && result.coefficient > 0 ? result.coefficient : 1;
      const studentMetric = studentMetricsMap.get(result.studentId) ?? {
        student,
        totalWeightedScore: 0,
        totalWeight: 0,
        recordedGrades: 0,
        bestScore: 0,
      };

      studentMetric.totalWeightedScore += result.score * weight;
      studentMetric.totalWeight += weight;
      studentMetric.recordedGrades += 1;
      studentMetric.bestScore = Math.max(studentMetric.bestScore, result.score);
      studentMetricsMap.set(result.studentId, studentMetric);
    }

    return [...studentMetricsMap.values()]
      .map((studentMetric) => ({
        student: studentMetric.student,
        averageScore: studentMetric.totalWeight > 0
          ? Number((studentMetric.totalWeightedScore / studentMetric.totalWeight).toFixed(2))
          : 0,
        recordedGrades: studentMetric.recordedGrades,
        bestScore: Number(studentMetric.bestScore.toFixed(2)),
      }))
      .sort((left, right) => right.averageScore - left.averageScore);
  }, [studentDirectory, subjectFilteredResults]);

  const subjectDrilldownRows = useMemo(
    () => subjectStudentMetrics.filter((studentMetric) => (
      effectiveSelectedSubjectStudent === FILTER_ALL || studentMetric.student.id === effectiveSelectedSubjectStudent
    )),
    [effectiveSelectedSubjectStudent, subjectStudentMetrics],
  );

  const subjectAssessmentRows = useMemo(
    () => subjectFilteredResults
      .filter((result) => effectiveSelectedSubjectStudent === FILTER_ALL || result.studentId === effectiveSelectedSubjectStudent)
      .map((result) => ({
        ...result,
        student: studentDirectory.get(result.studentId) ?? null,
      }))
      .sort((left, right) => new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime()),
    [effectiveSelectedSubjectStudent, studentDirectory, subjectFilteredResults],
  );

  const trendClassOptions = PRIMARY_CLASSES;

  const trendStudentOptions = subjectStudentOptions;

  const effectiveTrendClass = trendClassOptions.includes(selectedTrendClass)
    ? selectedTrendClass
    : FILTER_ALL;

  const effectiveTrendStudent = trendStudentOptions.some((student) => student.id === selectedTrendStudent)
    ? selectedTrendStudent
    : FILTER_ALL;

  const subjectTrendData = useMemo(
    () => [1, 2, 3].map((trimester) => {
      const trimesterResults = subjectFilteredResults.filter((result) => {
        if (result.trimester !== trimester) {
          return false;
        }
        if (trendMode === 'class' && effectiveTrendClass !== FILTER_ALL) {
          return result.classId === effectiveTrendClass;
        }
        if (trendMode === 'student' && effectiveTrendStudent !== FILTER_ALL) {
          return result.studentId === effectiveTrendStudent;
        }
        return true;
      });

      let totalWeightedScore = 0;
      let totalWeight = 0;
      for (const result of trimesterResults) {
        const weight = result.coefficient && result.coefficient > 0 ? result.coefficient : 1;
        totalWeightedScore += result.score * weight;
        totalWeight += weight;
      }

      return {
        trimester: `T${trimester}`,
        averageScore: totalWeight > 0 ? Number((totalWeightedScore / totalWeight).toFixed(2)) : 0,
        recordedGrades: trimesterResults.length,
      };
    }),
    [effectiveTrendClass, effectiveTrendStudent, subjectFilteredResults, trendMode],
  );

  const trendScopeLabel = trendMode === 'class'
    ? (effectiveTrendClass === FILTER_ALL ? (isRTL ? 'كل الأقسام' : 'Toutes les classes') : effectiveTrendClass)
    : (effectiveTrendStudent === FILTER_ALL
        ? (isRTL ? 'كل التلاميذ' : 'Tous les élèves')
        : (studentDirectory.get(effectiveTrendStudent)?.fullName || 'Élève'));

  const overviewCards = [
    {
      label: isRTL ? 'التقييمات المسجلة' : 'Évaluations scannées',
      value: analytics.overview.recordedGrades.toString(),
      helper: formatScopeLabel(selectedClass, selectedTrimester, isRTL),
      icon: Activity,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: isRTL ? 'التلاميذ المقيمون' : 'Élèves évalués',
      value: analytics.overview.evaluatedStudents.toString(),
      helper: `${analytics.overview.activeLevels} ${isRTL ? 'مستويات نشطة' : 'niveaux actifs'}`,
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    {
      label: isRTL ? 'نسبة النجاح العامة' : 'Réussite globale',
      value: `${analytics.overview.successRate.toFixed(1)}%`,
      helper: `${analytics.overview.successCount} ${isRTL ? 'تلميذًا ناجحًا' : 'élèves ≥ 10/20'}`,
      icon: Target,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: isRTL ? 'الامتياز (≥ 12/20)' : 'Excellence (≥ 12/20)',
      value: analytics.overview.excellentStudents.toString(),
      helper: `${analytics.overview.excellenceRate.toFixed(1)}% ${isRTL ? 'من التلاميذ' : 'des élèves'}`,
      icon: Star,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: isRTL ? 'المتوسطين (10-11.99)' : 'Moyens (10-11.99)',
      value: analytics.overview.averageStudents.toString(),
      helper: `${analytics.overview.averageStudentRate.toFixed(1)}% ${isRTL ? 'من التلاميذ' : 'des élèves'}`,
      icon: Users,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-100',
    },
    {
      label: isRTL ? 'الضعفاء (< 10/20)' : 'Faibles (< 10/20)',
      value: analytics.overview.failureStudents.toString(),
      helper: `${analytics.overview.failureRate.toFixed(1)}% ${isRTL ? 'من التلاميذ' : 'des élèves'}`,
      icon: Activity,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
    },
  ];

  const handleResultsSort = (field: ResultsSortField): void => {
    setResultsPage(1);
    if (resultsSortField === field) {
      setResultsSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setResultsSortField(field);
    setResultsSortDirection(field === 'recordedAt' ? 'desc' : 'asc');
  };

  const getSortIndicator = (field: ResultsSortField): string => {
    if (resultsSortField !== field) {
      return '↕';
    }
    return resultsSortDirection === 'asc' ? '↑' : '↓';
  };

  const updateTableColumnSearch = (field: keyof StatisticsTableColumnSearchState, value: string): void => {
    setTableColumnSearches((current) => ({ ...current, [field]: value }));
    setResultsPage(1);
  };

  const buildCurrentPresetFilters = () => ({
    selectedTrimester,
    selectedClass,
    scoreMinFilter,
    scoreMaxFilter,
    performanceFilter,
    resultsPageSize,
    resultsSortField,
    resultsSortDirection,
    tableColumnSearches,
    selectedSubject,
    selectedSubjectStudent,
    trendMode,
    selectedTrendClass,
    selectedTrendStudent,
  });

  const handleSaveFilterPreset = (): void => {
    const normalizedPresetName = presetName.trim();
    if (!normalizedPresetName) {
      toast.error(isRTL ? 'أدخل اسمًا للحفظ' : 'Saisissez un nom pour enregistrer le preset');
      return;
    }

    saveStatisticsFilterPreset({
      name: normalizedPresetName,
      filters: buildCurrentPresetFilters(),
    });
    setPresetName('');
    toast.success(isRTL ? 'تم حفظ إعدادات الفلاتر' : 'Preset de filtres enregistré');
  };

  const handleApplyFilterPreset = (preset: typeof statisticsFilterPresets[number]): void => {
    setSelectedTrimester(preset.filters.selectedTrimester);
    setSelectedClass(preset.filters.selectedClass);
    setScoreMinFilter(preset.filters.scoreMinFilter);
    setScoreMaxFilter(preset.filters.scoreMaxFilter);
    setPerformanceFilter(preset.filters.performanceFilter);
    setResultsPageSize(preset.filters.resultsPageSize);
    setResultsSortField(preset.filters.resultsSortField);
    setResultsSortDirection(preset.filters.resultsSortDirection);
    setTableColumnSearches(preset.filters.tableColumnSearches);
    setSelectedSubject(preset.filters.selectedSubject);
    setSelectedSubjectStudent(preset.filters.selectedSubjectStudent);
    setTrendMode(preset.filters.trendMode);
    setSelectedTrendClass(preset.filters.selectedTrendClass);
    setSelectedTrendStudent(preset.filters.selectedTrendStudent);
    setResultsPage(1);
    toast.success(isRTL ? 'تم تطبيق الإعداد المحفوظ' : 'Preset appliqué');
  };

  const handleDeleteFilterPreset = (presetId: string): void => {
    deleteStatisticsFilterPreset(presetId);
    toast.success(isRTL ? 'تم حذف الإعداد المحفوظ' : 'Preset supprimé');
  };

  const resetFilters = (): void => {
    setSelectedTrimester(FILTER_ALL);
    setSelectedClass(FILTER_ALL);
    setScoreMinFilter('');
    setScoreMaxFilter('');
    setPerformanceFilter('all');
    setTableColumnSearches(createInitialTableColumnSearches());
    setResultsPage(1);
  };

  const resetGradeForm = (): void => {
    setGradeForm(createInitialGradeForm());
  };

  const resetBulkEditForm = (): void => {
    setBulkEditForm(createInitialBulkEditForm());
  };

  const clearSelection = (): void => {
    setSelectedResultIds([]);
  };

  const toggleResultSelection = (resultId: string): void => {
    setSelectedResultIds((current) => current.includes(resultId)
      ? current.filter((id) => id !== resultId)
      : [...current, resultId]);
  };

  const toggleFilteredResultsSelection = (): void => {
    if (areAllFilteredResultsSelected) {
      setSelectedResultIds((current) => current.filter((id) => !filteredResultIds.includes(id)));
      return;
    }

    setSelectedResultIds((current) => [...new Set([...current, ...filteredResultIds])]);
  };

  const startEditingResult = (result: AcademicResult): void => {
    setEditingResultId(result.id);
    setEditingGradeForm(createEditableGradeForm(result));
  };

  const cancelEditingResult = (): void => {
    setEditingResultId(null);
    setEditingGradeForm(null);
  };

  const handleGradeSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const linkedStudent = studentDirectory.get(gradeForm.studentId);
    const score = Number.parseFloat(gradeForm.score);
    const coefficient = Number.parseFloat(gradeForm.coefficient);

    if (!linkedStudent || !Number.isFinite(score) || score < 0 || score > 20) {
      toast.error(isRTL ? 'تحقق من بيانات التلميذ والنقطة' : 'Vérifiez l’élève sélectionné et la note saisie');
      return;
    }

    addAcademicResult({
      studentId: linkedStudent.id,
      classId: linkedStudent.class,
      subject: gradeForm.subject.trim(),
      examLabel: gradeForm.examLabel.trim(),
      trimester: Number.parseInt(gradeForm.trimester, 10) as 1 | 2 | 3,
      score,
      coefficient: Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1,
      recordedAt: gradeForm.recordedAt || TODAY,
    });

    setIsGradeDialogOpen(false);
    resetGradeForm();
  };

  const handleSaveEditedResult = (result: AcademicResult): void => {
    if (!editingGradeForm) {
      return;
    }

    const score = Number.parseFloat(editingGradeForm.score);
    const coefficient = Number.parseFloat(editingGradeForm.coefficient);

    if (!Number.isFinite(score) || score < 0 || score > 20) {
      toast.error(isRTL ? 'أدخل نقطة صحيحة بين 0 و20' : 'Saisissez une note valide entre 0 et 20');
      return;
    }

    updateAcademicResult({
      ...result,
      subject: editingGradeForm.subject.trim(),
      examLabel: editingGradeForm.examLabel.trim(),
      trimester: Number.parseInt(editingGradeForm.trimester, 10) as 1 | 2 | 3,
      score,
      coefficient: Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1,
      recordedAt: editingGradeForm.recordedAt || TODAY,
    });

    cancelEditingResult();
  };

  const handleOpenBulkEditDialog = (): void => {
    if (selectedFilteredResultIds.length === 0) {
      toast.error(isRTL ? 'حدد نتيجة واحدة على الأقل' : 'Sélectionnez au moins un résultat');
      return;
    }

    setIsBulkEditDialogOpen(true);
  };

  const handleBulkDelete = (): void => {
    if (selectedFilteredResultIds.length === 0) {
      return;
    }

    if (!window.confirm(isRTL ? 'حذف جميع النتائج المحددة؟' : 'Supprimer tous les résultats sélectionnés ?')) {
      return;
    }

    deleteAcademicResults(selectedFilteredResultIds);
    clearSelection();
    cancelEditingResult();
  };

  const handleBulkEditSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (selectedFilteredResultIds.length === 0) {
      toast.error(isRTL ? 'حدد نتائج أولاً' : 'Sélectionnez des résultats avant modification');
      return;
    }

    const nextScore = bulkEditForm.score.trim() === '' ? null : Number.parseFloat(bulkEditForm.score);
    const nextCoefficient = bulkEditForm.coefficient.trim() === '' ? null : Number.parseFloat(bulkEditForm.coefficient);

    if (nextScore !== null && (!Number.isFinite(nextScore) || nextScore < 0 || nextScore > 20)) {
      toast.error(isRTL ? 'النقطة الجماعية غير صالحة' : 'La note groupée est invalide');
      return;
    }

    if (nextCoefficient !== null && (!Number.isFinite(nextCoefficient) || nextCoefficient <= 0)) {
      toast.error(isRTL ? 'المعامل الجماعي غير صالح' : 'Le coefficient groupé est invalide');
      return;
    }

    const selectedResults = academicResults.filter((result) => selectedFilteredResultIds.includes(result.id));
    const updatedResults = selectedResults.map((result) => ({
      ...result,
      subject: bulkEditForm.subject.trim() || result.subject,
      examLabel: bulkEditForm.examLabel.trim() || result.examLabel,
      trimester: bulkEditForm.trimester === 'keep' ? result.trimester : Number.parseInt(bulkEditForm.trimester, 10) as 1 | 2 | 3,
      score: nextScore ?? result.score,
      coefficient: nextCoefficient ?? result.coefficient,
      recordedAt: bulkEditForm.recordedAt || result.recordedAt,
    }));

    updateAcademicResults(updatedResults);
    setIsBulkEditDialogOpen(false);
    resetBulkEditForm();
    clearSelection();
  };

  const handleExportImportTemplate = (): void => {
    const workbook = XLSX.utils.book_new();
    const templateRows = [
      {
        student_id: students[0]?.id || 'student-id',
        full_name: students[0]?.fullName || 'Nom complet',
        class: students[0]?.class || '1A',
        subject: 'Mathématiques',
        exam_label: 'Contrôle continu 1',
        trimester: 1,
        score: 15.5,
        coefficient: 1,
        recorded_at: TODAY,
      },
      {
        student_id: students[1]?.id || 'student-id-2',
        full_name: students[1]?.fullName || 'Nom complet 2',
        class: students[1]?.class || '1A',
        subject: 'Français',
        exam_label: 'Composition 1',
        trimester: 2,
        score: 13.75,
        coefficient: 1,
        recorded_at: TODAY,
      },
    ];
    const instructionsRows = [
      ['Champ', 'Description'],
      ['student_id', 'Identifiant élève interne (prioritaire si fourni)'],
      ['full_name', 'Nom complet utilisé comme correspondance secondaire'],
      ['class', 'Classe active de l’élève (ex: 1A, 4C)'],
      ['subject', 'Matière'],
      ['exam_label', 'Libellé de l’évaluation'],
      ['trimester', 'Valeur 1, 2 ou 3'],
      ['score', 'Note sur 20'],
      ['coefficient', 'Coefficient > 0'],
      ['recorded_at', 'Date ISO YYYY-MM-DD'],
    ];

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(templateRows), 'GradesTemplate');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instructionsRows), 'Instructions');
    XLSX.writeFile(workbook, 'academic_grades_import_template.xlsx');
    toast.success(isRTL ? 'تم توليد قالب الاستيراد XLSX' : 'Template XLSX d’import généré');
  };

  const handleExportSelectedGradesXlsx = (): void => {
    if (selectedFilteredResultIds.length === 0) {
      toast.error(isRTL ? 'حدد نتائج أولاً للتصدير' : 'Sélectionnez des résultats avant export');
      return;
    }

    const selectedResults = academicResults.filter((result) => selectedFilteredResultIds.includes(result.id));
    const workbook = XLSX.utils.book_new();
    const selectedSheet = XLSX.utils.json_to_sheet(
      selectedResults.map((result) => ({
        student_id: result.studentId,
        full_name: studentDirectory.get(result.studentId)?.fullName || '',
        class: result.classId,
        subject: result.subject,
        exam_label: result.examLabel,
        trimester: result.trimester,
        score: result.score,
        coefficient: result.coefficient ?? 1,
        recorded_at: result.recordedAt,
      })),
    );
    XLSX.utils.book_append_sheet(workbook, selectedSheet, 'SelectedGrades');
    XLSX.writeFile(workbook, `selected_grades_${selectedResults.length}_${TODAY}.xlsx`);
    toast.success(isRTL ? 'تم تصدير النتائج المحددة بصيغة XLSX' : 'Notes sélectionnées exportées en XLSX');
  };

  const handleImportClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const rawText = await extractPdfText(buffer);
        const rows = parseAcademicResultsFromPdfText(rawText);
        if (rows.length === 0) {
          toast.error(isRTL ? 'تعذر استخراج نقاط من ملف PDF' : 'Impossible d’extraire des notes depuis le PDF');
        } else {
          importAcademicResults(rows);
        }
      } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        const text = await file.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const rows: ImportAcademicResultData[] = [];
        
        doc.querySelectorAll('tr').forEach((tr, index) => {
          if (index === 0) return; // skip header
          const tds = tr.querySelectorAll('td, th');
          if (tds.length >= 4) {
             rows.push({
               fullName: tds[0]?.textContent?.trim() || '',
               classId: tds[1]?.textContent?.trim() || '',
               subject: tds[2]?.textContent?.trim() || '',
               score: Number(tds[3]?.textContent?.trim() || '0')
             });
          }
        });

        if (rows.length === 0) {
          toast.error(isRTL ? 'الملف لا يحتوي على بيانات قابلة للاستيراد' : 'Le fichier ne contient aucune donnée exploitable');
        } else {
          importAcademicResults(rows);
        }
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' }) as ImportAcademicResultData[];

        if (rows.length === 0) {
          toast.error(isRTL ? 'الملف لا يحتوي على بيانات قابلة للاستيراد' : 'Le fichier ne contient aucune donnée exploitable');
        } else {
          importAcademicResults(rows);
        }
      }
    } catch {
      toast.error(isRTL ? 'فشل استيراد ملف النقط' : 'Échec de l’import des notes académiques');
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const buildWorkbookBlob = (workbook: XLSX.WorkBook): Blob => {
    const workbookArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([workbookArray], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  const buildAnalyticsWorkbook = (): XLSX.WorkBook => {
    const generatedAt = getGeneratedAtLabel();
    const workbook = XLSX.utils.book_new();

    const overviewSheet = XLSX.utils.aoa_to_sheet([
      ['Academic Analytics Dashboard'],
      ['Classe filter', selectedClass === FILTER_ALL ? 'Toutes les classes' : selectedClass],
      ['Trimester filter', selectedTrimester === FILTER_ALL ? 'Tous les trimestres' : `Trimestre ${selectedTrimester}`],
      ['Generated at', generatedAt],
      [],
      ['Recorded grades', analytics.overview.recordedGrades],
      ['Evaluated students', analytics.overview.evaluatedStudents],
      ['Success rate', analytics.overview.successRate],
      ['Excellent students', analytics.overview.excellentStudents],
      ['Average score', analytics.overview.averageScore],
    ]);

    const levelsSheet = XLSX.utils.json_to_sheet(
      analytics.levelMetrics.map((metric) => ({
        level: metric.level,
        label: metric.label,
        evaluated_students: metric.evaluatedStudents,
        success_count: metric.successCount,
        success_rate: metric.successRate,
        excellence_count: metric.excellenceCount,
        excellence_rate: metric.excellenceRate,
        average_score: metric.averageScore,
        active_classes: metric.activeClasses,
      })),
    );

    const leaderboardSheet = XLSX.utils.json_to_sheet(
      SCHOOL_LEVELS.flatMap((level) => (
        (analytics.leaderboardByLevel[level] ?? []).map((performer, index) => ({
          level,
          rank: index + 1,
          student_name: performer.fullName,
          class: performer.classId,
          average: performer.average,
          highest_score: performer.highestScore,
          grade_count: performer.gradeCount,
        }))
      )),
    );

    const gradesSheet = XLSX.utils.json_to_sheet(
      filteredAcademicResults.map((result) => ({
        student_id: result.studentId,
        full_name: studentDirectory.get(result.studentId)?.fullName || '',
        class: result.classId,
        subject: result.subject,
        exam_label: result.examLabel,
        trimester: result.trimester,
        score: result.score,
        coefficient: result.coefficient ?? 1,
        recorded_at: result.recordedAt,
      })),
    );

    const subjectsSheet = XLSX.utils.json_to_sheet(
      subjectMetrics.map((subjectMetric) => ({
        subject: subjectMetric.subject,
        recorded_grades: subjectMetric.recordedGrades,
        evaluated_students: subjectMetric.evaluatedStudents,
        average_score: subjectMetric.averageScore,
        success_count: subjectMetric.successCount,
        success_rate: subjectMetric.successRate,
        excellence_count: subjectMetric.excellenceCount,
      })),
    );

    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
    XLSX.utils.book_append_sheet(workbook, levelsSheet, 'Levels');
    XLSX.utils.book_append_sheet(workbook, leaderboardSheet, 'Leaderboard');
    XLSX.utils.book_append_sheet(workbook, gradesSheet, 'Grades');
    XLSX.utils.book_append_sheet(workbook, subjectsSheet, 'Subjects');

    return workbook;
  };

  const buildSelectedGradesWorkbook = (results: AcademicResult[]): XLSX.WorkBook => {
    const workbook = XLSX.utils.book_new();
    const selectedSheet = XLSX.utils.json_to_sheet(
      results.map((result) => ({
        student_id: result.studentId,
        full_name: studentDirectory.get(result.studentId)?.fullName || '',
        class: result.classId,
        subject: result.subject,
        exam_label: result.examLabel,
        trimester: result.trimester,
        score: result.score,
        coefficient: result.coefficient ?? 1,
        recorded_at: result.recordedAt,
      })),
    );
    XLSX.utils.book_append_sheet(workbook, selectedSheet, 'SelectedGrades');
    return workbook;
  };

  const buildSubjectWorkbook = (): XLSX.WorkBook | null => {
    if (!selectedSubjectMetrics || effectiveSelectedSubject === FILTER_ALL) {
      return null;
    }

    const workbook = XLSX.utils.book_new();
    const overviewSheet = XLSX.utils.aoa_to_sheet([
      ['Subject report card'],
      ['Subject', selectedSubjectMetrics.subject],
      ['Scope', formatScopeLabel(selectedClass, selectedTrimester, false)],
      ['Student filter', effectiveSelectedSubjectStudent === FILTER_ALL ? 'Tous les élèves' : (studentDirectory.get(effectiveSelectedSubjectStudent)?.fullName || '')],
      ['Trend scope', `${trendMode === 'class' ? 'Class' : 'Student'} • ${trendScopeLabel}`],
      ['Generated at', getGeneratedAtLabel()],
      [],
      ['Average score', selectedSubjectMetrics.averageScore],
      ['Recorded grades', selectedSubjectMetrics.recordedGrades],
      ['Evaluated students', selectedSubjectMetrics.evaluatedStudents],
      ['Success rate', selectedSubjectMetrics.successRate],
      ['Excellence count', selectedSubjectMetrics.excellenceCount],
    ]);

    const studentsSheet = XLSX.utils.json_to_sheet(
      subjectDrilldownRows.map((row) => ({
        student_name: row.student.fullName,
        class: row.student.class,
        average_score: row.averageScore,
        recorded_grades: row.recordedGrades,
        best_score: row.bestScore,
      })),
    );

    const assessmentsSheet = XLSX.utils.json_to_sheet(
      subjectAssessmentRows.map((row) => ({
        student_name: row.student?.fullName || '',
        class: row.classId,
        exam_label: row.examLabel,
        trimester: row.trimester,
        score: row.score,
        coefficient: row.coefficient ?? 1,
        recorded_at: row.recordedAt,
      })),
    );

    const trendsSheet = XLSX.utils.json_to_sheet(subjectTrendData);

    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
    XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Students');
    XLSX.utils.book_append_sheet(workbook, assessmentsSheet, 'Assessments');
    XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Trends');
    return workbook;
  };

  const buildSelectedGradesPdf = (results: AcademicResult[]) => buildSelectedGradesPdfAttachment({
    results,
    studentDirectory,
    scopeLabel: formatScopeLabel(selectedClass, selectedTrimester, false),
    generatedAt: getGeneratedAtLabel(),
    branding: schoolBranding,
  });

  const buildCertificatesPdf = (results: AcademicResult[]) => buildCertificatesPdfAttachments({
    results,
    studentDirectory,
    scopeLabel: formatScopeLabel(selectedClass, selectedTrimester, false),
    generatedAt: getGeneratedAtLabel(),
    branding: schoolBranding,
  });

  const buildAnalyticsPdf = () => buildAnalyticsPdfAttachment({
    scopeLabel: formatScopeLabel(selectedClass, selectedTrimester, false),
    generatedAt: getGeneratedAtLabel(),
    branding: schoolBranding,
    overview: {
      recordedGrades: analytics.overview.recordedGrades,
      evaluatedStudents: analytics.overview.evaluatedStudents,
      successRate: analytics.overview.successRate,
      excellentStudents: analytics.overview.excellentStudents,
      averageScore: analytics.overview.averageScore,
    },
    levels: analytics.levelMetrics.map((level) => ({
      label: level.label,
      evaluatedStudents: level.evaluatedStudents,
      successCount: level.successCount,
      successRate: level.successRate,
      excellenceCount: level.excellenceCount,
      averageScore: level.averageScore,
    })),
    leaderboard: SCHOOL_LEVELS.flatMap((level) => (
      (analytics.leaderboardByLevel[level] ?? []).map((performer, index) => ({
        level,
        rank: index + 1,
        studentName: performer.fullName,
        classId: performer.classId,
        average: performer.average,
        highestScore: performer.highestScore,
      }))
    )),
  });

  const buildSubjectPdf = () => {
    if (!selectedSubjectMetrics || effectiveSelectedSubject === FILTER_ALL) {
      return null;
    }

    return buildSubjectReportPdfAttachment({
      subjectName: selectedSubjectMetrics.subject,
      scopeLabel: formatScopeLabel(selectedClass, selectedTrimester, false),
      generatedAt: getGeneratedAtLabel(),
      studentLabel: effectiveSelectedSubjectStudent === FILTER_ALL ? 'Tous les élèves' : (studentDirectory.get(effectiveSelectedSubjectStudent)?.fullName || ''),
      trendScopeLabel: trendScopeLabel,
      overview: {
        averageScore: selectedSubjectMetrics.averageScore,
        recordedGrades: selectedSubjectMetrics.recordedGrades,
        evaluatedStudents: selectedSubjectMetrics.evaluatedStudents,
        successRate: selectedSubjectMetrics.successRate,
        excellenceCount: selectedSubjectMetrics.excellenceCount,
      },
      studentRows: subjectDrilldownRows,
      assessmentRows: subjectAssessmentRows,
      trendRows: subjectTrendData,
      branding: schoolBranding,
    });
  };

  const handleExportAnalytics = (): void => {
    const workbook = buildAnalyticsWorkbook();
    XLSX.writeFile(
      workbook,
      `academic_analytics_${selectedClass === FILTER_ALL ? 'all-classes' : selectedClass}_${selectedTrimester === FILTER_ALL ? 'all-trimesters' : `t${selectedTrimester}`}.xlsx`,
    );
    toast.success(isRTL ? 'تم تصدير التحليلات بصيغة XLSX' : 'Export analytique XLSX généré');
  };

  const handleExportSelectedGradesPdf = (): void => {
    if (selectedFilteredResultIds.length === 0) {
      toast.error(isRTL ? 'حدد نتائج أولاً للتصدير PDF' : 'Sélectionnez des résultats avant export PDF');
      return;
    }

    const selectedResults = academicResults.filter((result) => selectedFilteredResultIds.includes(result.id));
    const pdfAttachment = buildSelectedGradesPdf(selectedResults);
    const pdfUrl = URL.createObjectURL(pdfAttachment.blob);
    window.open(pdfUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
    toast.success(isRTL ? 'تم توليد PDF للنتائج المحددة' : 'PDF des notes sélectionnées généré');
  };

  const handleGenerateCertificatesPdf = (): void => {
    const certificateSource = selectedFilteredResultIds.length > 0
      ? academicResults.filter((result) => selectedFilteredResultIds.includes(result.id))
      : filteredAcademicResults;

    if (certificateSource.length === 0) {
      toast.error(isRTL ? 'لا توجد بيانات كافية لتوليد الشهادات' : 'Aucune donnée suffisante pour générer les certificats');
      return;
    }

    const certificateAttachments = buildCertificatesPdf(certificateSource);
    certificateAttachments.forEach((attachment, index) => {
      const certificateUrl = URL.createObjectURL(attachment.blob);
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = certificateUrl;
        link.download = attachment.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(certificateUrl);
      }, index * 150);
    });
    toast.success(isRTL ? 'تم توليد شهادة PDF لكل تلميذ' : 'Un PDF de certificat a été généré pour chaque élève');
  };

  const handleExportSubjectReportXlsx = (): void => {
    const workbook = buildSubjectWorkbook();
    if (!workbook || !selectedSubjectMetrics || effectiveSelectedSubject === FILTER_ALL) {
      toast.error(isRTL ? 'اختر مادة أولاً' : 'Sélectionnez une matière avant export');
      return;
    }

    XLSX.writeFile(workbook, `subject_report_${sanitizeFileName(selectedSubjectMetrics.subject)}.xlsx`);
    toast.success(isRTL ? 'تم تصدير تقرير المادة بصيغة XLSX' : 'Rapport matière XLSX généré');
  };

  const handleSendAnalyticsToManager = async (): Promise<void> => {
    const scopeLabel = formatScopeLabel(selectedClass, selectedTrimester, false);
    try {
      const analyticsWorkbook = buildAnalyticsWorkbook();
      const analyticsPdf = buildAnalyticsPdf();
      const attachments = [
        {
          fileName: `academic_analytics_${sanitizeFileName(scopeLabel)}.xlsx`,
          blob: buildWorkbookBlob(analyticsWorkbook),
        },
        analyticsPdf,
      ];
      const provider = await sendEmailWithAttachments({
        recipientEmail: managerEmail,
        subject: 'Academic analytics report',
        message: `Rapport académique généré pour ${scopeLabel}.`,
        attachments,
      });
      addEmailDeliveryLog({
        recipientEmail: managerEmail,
        subject: 'Academic analytics report',
        provider,
        status: 'success',
        attachmentCount: attachments.length,
        attachmentNames: attachments.map((attachment) => attachment.fileName),
        scopeLabel,
      });
      toast.success(isRTL ? `تم إرسال التقرير للمدير عبر ${provider}` : `Rapport envoyé au manager via ${provider}`);
    } catch (error) {
      addEmailDeliveryLog({
        recipientEmail: managerEmail,
        subject: 'Academic analytics report',
        provider: import.meta.env.VITE_SMTP_API_ENDPOINT ? 'smtp' : 'emailjs',
        status: 'failed',
        attachmentCount: 2,
        attachmentNames: ['analytics.xlsx', 'analytics.pdf'],
        scopeLabel,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      toast.error(isRTL ? 'فشل إرسال التقرير. تحقق من إعدادات EmailJS/SMTP.' : 'Échec de l’envoi. Vérifiez la configuration EmailJS/SMTP.');
    }
  };

  const handleSendSelectedReportsToManager = async (): Promise<void> => {
    const selectedResults = selectedFilteredResultIds.length > 0
      ? academicResults.filter((result) => selectedFilteredResultIds.includes(result.id))
      : [];

    if (selectedResults.length === 0) {
      toast.error(isRTL ? 'حدد نتائج أولاً لإرسالها للمدير' : 'Sélectionnez des résultats avant envoi au manager');
      return;
    }

    const scopeLabel = formatScopeLabel(selectedClass, selectedTrimester, false);
    try {
      const selectedWorkbook = buildSelectedGradesWorkbook(selectedResults);
      const selectedPdf = buildSelectedGradesPdf(selectedResults);
      const certificateAttachments = buildCertificatesPdf(selectedResults);
      const certificatesZip = await buildCertificateZipAttachment(
        certificateAttachments,
        `certificats_selection_${sanitizeFileName(scopeLabel)}.zip`,
      );
      const attachments = [
        {
          fileName: `selected_grades_${selectedResults.length}_${TODAY}.xlsx`,
          blob: buildWorkbookBlob(selectedWorkbook),
        },
        selectedPdf,
        certificatesZip,
      ];
      const provider = await sendEmailWithAttachments({
        recipientEmail: managerEmail,
        subject: 'Selected grades and certificates',
        message: 'Veuillez trouver ci-joint les notes sélectionnées et les certificats PDF générés depuis le dashboard.',
        attachments,
      });
      addEmailDeliveryLog({
        recipientEmail: managerEmail,
        subject: 'Selected grades and certificates',
        provider,
        status: 'success',
        attachmentCount: attachments.length,
        attachmentNames: attachments.map((attachment) => attachment.fileName),
        scopeLabel,
      });
      toast.success(isRTL ? `تم إرسال الشهادات والتقارير عبر ${provider}` : `Certificats et rapports envoyés via ${provider}`);
    } catch (error) {
      addEmailDeliveryLog({
        recipientEmail: managerEmail,
        subject: 'Selected grades and certificates',
        provider: import.meta.env.VITE_SMTP_API_ENDPOINT ? 'smtp' : 'emailjs',
        status: 'failed',
        attachmentCount: 3,
        attachmentNames: ['selected_grades.xlsx', 'selected_grades.pdf', `certificats_selection_${sanitizeFileName(scopeLabel)}.zip`],
        scopeLabel,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      toast.error(isRTL ? 'فشل إرسال الشهادات/التقارير. تحقق من الإعدادات.' : 'Échec de l’envoi des certificats/rapports. Vérifiez la configuration.');
    }
  };

  const handleSendSubjectReportToManager = async (): Promise<void> => {
    const workbook = buildSubjectWorkbook();
    const subjectPdf = buildSubjectPdf();

    if (!workbook || !subjectPdf || !selectedSubjectMetrics || effectiveSelectedSubject === FILTER_ALL) {
      toast.error(isRTL ? 'اختر مادة أولاً' : 'Sélectionnez une matière avant envoi');
      return;
    }

    const scopeLabel = formatScopeLabel(selectedClass, selectedTrimester, false);
    try {
      const attachments = [
        {
          fileName: `subject_report_${sanitizeFileName(selectedSubjectMetrics.subject)}.xlsx`,
          blob: buildWorkbookBlob(workbook),
        },
        subjectPdf,
      ];
      const provider = await sendEmailWithAttachments({
        recipientEmail: managerEmail,
        subject: `Subject report - ${selectedSubjectMetrics.subject}`,
        message: `Rapport matière généré pour ${selectedSubjectMetrics.subject} dans le périmètre ${scopeLabel}.`,
        attachments,
      });
      addEmailDeliveryLog({
        recipientEmail: managerEmail,
        subject: `Subject report - ${selectedSubjectMetrics.subject}`,
        provider,
        status: 'success',
        attachmentCount: attachments.length,
        attachmentNames: attachments.map((attachment) => attachment.fileName),
        scopeLabel,
      });
      toast.success(isRTL ? `تم إرسال تقرير المادة عبر ${provider}` : `Rapport matière envoyé via ${provider}`);
    } catch (error) {
      addEmailDeliveryLog({
        recipientEmail: managerEmail,
        subject: `Subject report - ${selectedSubjectMetrics.subject}`,
        provider: import.meta.env.VITE_SMTP_API_ENDPOINT ? 'smtp' : 'emailjs',
        status: 'failed',
        attachmentCount: 2,
        attachmentNames: [`subject_report_${sanitizeFileName(selectedSubjectMetrics.subject)}.xlsx`, `subject_report_${sanitizeFileName(selectedSubjectMetrics.subject)}.pdf`],
        scopeLabel,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      toast.error(isRTL ? 'فشل إرسال تقرير المادة. تحقق من الإعدادات.' : 'Échec de l’envoi du rapport matière. Vérifiez la configuration.');
    }
  };

  const handlePrintAnalytics = (): void => {
    const printWindow = window.open('', '', 'width=1100,height=900');
    if (!printWindow) {
      toast.error(isRTL ? 'تعذر فتح نافذة الطباعة' : 'Impossible d’ouvrir la fenêtre d’impression');
      return;
    }

    const levelRows = analytics.levelMetrics.map((metric) => `
      <tr>
        <td>${metric.label}</td>
        <td>${metric.evaluatedStudents}</td>
        <td>${metric.successCount}</td>
        <td>${metric.successRate.toFixed(1)}%</td>
        <td>${metric.excellenceCount}</td>
        <td>${metric.averageScore.toFixed(2)}/20</td>
      </tr>
    `).join('');

    const leaderboardSections = SCHOOL_LEVELS.map((level) => {
      const performers = analytics.leaderboardByLevel[level] ?? [];
      const label = analytics.levelMetrics.find((metric) => metric.level === level)?.label ?? level;

      if (performers.length === 0) {
        return `
          <section class="leaderboard-block">
            <h3>${label}</h3>
            <p>Aucun élève classé dans ce périmètre.</p>
          </section>
        `;
      }

      const rows = performers.map((performer, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${performer.fullName}</td>
          <td>${performer.classId}</td>
          <td>${performer.average.toFixed(2)}/20</td>
          <td>${performer.highestScore.toFixed(2)}/20</td>
        </tr>
      `).join('');

      return `
        <section class="leaderboard-block">
          <h3>${label}</h3>
          <table>
            <thead>
              <tr>
                <th>Rang</th>
                <th>Élève</th>
                <th>Classe</th>
                <th>Moyenne</th>
                <th>Meilleure note</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Academic Analytics Dashboard</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1 { color: #1a237e; margin-bottom: 8px; }
            h2 { margin-top: 32px; color: #1e293b; }
            .meta { color: #475569; font-size: 14px; margin-bottom: 24px; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
            .kpi { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; background: #f8fafc; }
            .kpi strong { display: block; font-size: 24px; color: #0f172a; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #eff6ff; color: #1e3a8a; }
            .leaderboard-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .leaderboard-block { break-inside: avoid; }
            @media print {
              body { margin: 16px; }
              .kpis { grid-template-columns: repeat(2, 1fr); }
            }
          </style>
        </head>
        <body>
          <h1>Academic Analytics Dashboard</h1>
          <div class="meta">${formatScopeLabel(selectedClass, selectedTrimester, false)} • ${new Date().toLocaleDateString('fr-FR')}</div>
          <div class="kpis">
            <div class="kpi"><span>Évaluations scannées</span><strong>${analytics.overview.recordedGrades}</strong></div>
            <div class="kpi"><span>Élèves évalués</span><strong>${analytics.overview.evaluatedStudents}</strong></div>
            <div class="kpi"><span>Réussite globale</span><strong>${analytics.overview.successRate.toFixed(1)}%</strong></div>
            <div class="kpi"><span>Excellence &gt;= 12/20</span><strong>${analytics.overview.excellentStudents}</strong></div>
          </div>
          <h2>Indicateurs par niveau</h2>
          <table>
            <thead>
              <tr>
                <th>Niveau</th>
                <th>Élèves évalués</th>
                <th>Réussites</th>
                <th>Taux de réussite</th>
                <th>Excellence</th>
                <th>Moyenne</th>
              </tr>
            </thead>
            <tbody>${levelRows}</tbody>
          </table>
          <h2>Tableau d’honneur</h2>
          <div class="leaderboard-grid">${leaderboardSections}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch {
        toast.error(isRTL ? "تم حظر الطباعة. يرجى فتح التطبيق في نافذة جديدة." : "Print blocked. Open app in new tab.");
      }
    }, 250);
  };

  const handlePrintSubjectReport = (): void => {
    if (!selectedSubjectMetrics || effectiveSelectedSubject === FILTER_ALL) {
      toast.error(isRTL ? 'اختر مادة أولاً' : 'Sélectionnez une matière avant impression');
      return;
    }

    const printWindow = window.open('', '', 'width=1000,height=900');
    if (!printWindow) {
      toast.error(isRTL ? 'تعذر فتح نافذة الطباعة' : 'Impossible d’ouvrir la fenêtre d’impression');
      return;
    }

    const studentRows = subjectDrilldownRows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${row.student.fullName}</td>
        <td>${row.student.class}</td>
        <td>${row.averageScore.toFixed(2)}/20</td>
        <td>${row.recordedGrades}</td>
        <td>${row.bestScore.toFixed(2)}/20</td>
      </tr>
    `).join('');

    const assessmentRows = subjectAssessmentRows.map((row) => `
      <tr>
        <td>${row.student?.fullName || ''}</td>
        <td>${row.classId}</td>
        <td>${row.examLabel}</td>
        <td>T${row.trimester}</td>
        <td>${row.score.toFixed(2)}</td>
        <td>${(row.coefficient ?? 1).toFixed(2)}</td>
        <td>${row.recordedAt}</td>
      </tr>
    `).join('');

    const trendRows = subjectTrendData.map((row) => `
      <tr>
        <td>${row.trimester}</td>
        <td>${row.averageScore.toFixed(2)}/20</td>
        <td>${row.recordedGrades}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Subject Report Card</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1 { color: #1a237e; margin-bottom: 8px; }
            h2 { margin-top: 28px; color: #1e293b; }
            .meta { color: #475569; font-size: 14px; margin-bottom: 20px; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
            .kpi { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; background: #f8fafc; }
            .kpi strong { display: block; margin-top: 8px; font-size: 22px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; font-size: 13px; text-align: left; }
            th { background: #eff6ff; color: #1e3a8a; }
          </style>
        </head>
        <body>
          <h1>Subject Report Card — ${selectedSubjectMetrics.subject}</h1>
          <div class="meta">${formatScopeLabel(selectedClass, selectedTrimester, false)} • ${effectiveSelectedSubjectStudent === FILTER_ALL ? 'Tous les élèves' : (studentDirectory.get(effectiveSelectedSubjectStudent)?.fullName || '')} • ${trendMode === 'class' ? 'Classe' : 'Élève'}: ${trendScopeLabel}</div>
          <div class="kpis">
            <div class="kpi"><span>Moyenne</span><strong>${selectedSubjectMetrics.averageScore.toFixed(2)}/20</strong></div>
            <div class="kpi"><span>Notes</span><strong>${selectedSubjectMetrics.recordedGrades}</strong></div>
            <div class="kpi"><span>Élèves évalués</span><strong>${selectedSubjectMetrics.evaluatedStudents}</strong></div>
            <div class="kpi"><span>Réussite</span><strong>${selectedSubjectMetrics.successRate.toFixed(1)}%</strong></div>
          </div>
          <h2>Classement élèves</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Élève</th>
                <th>Classe</th>
                <th>Moyenne</th>
                <th>Notes</th>
                <th>Meilleure note</th>
              </tr>
            </thead>
            <tbody>${studentRows}</tbody>
          </table>
          <h2>Tendance par trimestre</h2>
          <table>
            <thead>
              <tr>
                <th>Trimestre</th>
                <th>Moyenne</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>${trendRows}</tbody>
          </table>
          <h2>Détail des évaluations</h2>
          <table>
            <thead>
              <tr>
                <th>Élève</th>
                <th>Classe</th>
                <th>Épreuve</th>
                <th>Trimestre</th>
                <th>Score</th>
                <th>Coef.</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>${assessmentRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch {
        toast.error(isRTL ? "تم حظر الطباعة. يرجى فتح التطبيق في نافذة جديدة." : "Print blocked. Open app in new tab.");
      }
    }, 250);
  };

  return (
    <div className={`space-y-8 ${isRTL ? 'text-right font-arabic' : ''}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.tsv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*"
        className="hidden"
        onChange={(event) => {
          void handleImportFile(event);
        }}
      />

      <section className="relative overflow-hidden rounded-[2.5rem] bg-[#1a237e] p-8 text-white shadow-2xl shadow-primary/30">
        <div className="absolute inset-y-0 right-0 w-48 bg-gradient-to-l from-accent/20 to-transparent" />
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 p-3 rounded-2xl backdrop-blur-md">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">
                  {isRTL ? 'لوحة التحليلات الأكاديمية' : 'Academic Analytics Dashboard'}
                </p>
                <h2 className="text-3xl font-black tracking-tight">{t('statistics')}</h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={handleExportAnalytics}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export XLSX
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={handlePrintAnalytics}
              >
                <Download className="w-4 h-4 mr-2" /> {t('print_export')}
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => { void handleSendAnalyticsToManager(); }}
              >
                <Mail className="w-4 h-4 mr-2" /> {isRTL ? 'إيميل المدير' : 'Email manager'}
              </Button>
            </div>
          </div>

          <p className="max-w-3xl text-sm text-white/80 leading-relaxed">
            {isRTL
              ? 'تُحتسب مؤشرات النجاح والتفوق مباشرة من نتائج الامتحانات المسجلة، مع فلاتر حسب الفصل والقسم، جداول كاملة للنقط، وتحليلات مواد قابلة للتصدير.'
              : 'Les indicateurs sont pilotés directement depuis les notes d’examens enregistrées, avec filtres par trimestre/classe, table paginée complète des notes et analyses matières exportables.'}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge className="rounded-full bg-white/10 text-white border-white/20 px-3 py-1">
              {analytics.overview.averageScore.toFixed(2)}/20 {isRTL ? 'معدل عام' : 'moyenne générale'}
            </Badge>
            <Badge className="rounded-full bg-white/10 text-white border-white/20 px-3 py-1">
              {formatScopeLabel(selectedClass, selectedTrimester, isRTL)}
            </Badge>
            <Badge className="rounded-full bg-white/10 text-white border-white/20 px-3 py-1">
              {analytics.overview.evaluatedStudents} {isRTL ? 'تلاميذ مسجلون في التحليل' : 'élèves enregistrés'}
            </Badge>
          </div>
        </div>
      </section>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-xl">
                <Filter className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {isRTL ? 'فلاتر التحليل والتصدير' : 'Filtres analytiques et export'}
                </h3>
                <p className="text-sm text-slate-500">
                  {isRTL
                    ? 'خصص النتائج حسب القسم والفصل الدراسي ثم صدّر الملخص أو اطبعه بصيغة PDF.'
                    : 'Affinez l’analyse par classe et trimestre, puis exportez le résumé en .xlsx ou imprimez-le en PDF.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canManageAcademicData && (
                <>
                  <Button
                    variant="outline"
                    className="rounded-2xl border-slate-200"
                    onClick={handleExportImportTemplate}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> {isRTL ? 'تصدير قالب الاستيراد XLSX' : 'Export import template.xlsx'}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl border-slate-200"
                    onClick={handleImportClick}
                  >
                    <Upload className="w-4 h-4 mr-2" /> Import XLSX / PDF
                  </Button>
                  <Button
                    className="rounded-2xl bg-primary shadow-xl shadow-primary/20"
                    onClick={() => setIsGradeDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" /> {isRTL ? 'إضافة نقطة' : 'Saisie note'}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                className="rounded-2xl"
                onClick={resetFilters}
              >
                {isRTL ? 'إعادة الضبط' : 'Réinitialiser'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                {isRTL ? 'القسم' : 'Classe'}
              </Label>
              <select
                value={selectedClass}
                onChange={(event) => {
                  setSelectedClass(event.target.value);
                  setResultsPage(1);
                }}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white transition-all text-sm font-bold"
              >
                <option value={FILTER_ALL}>{isRTL ? 'كل الأقسام' : 'Toutes les classes'}</option>
                {classOptions.map((classId) => (
                  <option key={classId} value={classId}>{classId}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                {t('trimester')}
              </Label>
              <select
                value={selectedTrimester}
                onChange={(event) => {
                  setSelectedTrimester(event.target.value);
                  setResultsPage(1);
                }}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white transition-all text-sm font-bold"
              >
                <option value={FILTER_ALL}>{isRTL ? 'كل الفصول' : 'Tous les trimestres'}</option>
                <option value="1">{isRTL ? 'الفصل 1' : 'Trimestre 1'}</option>
                <option value="2">{isRTL ? 'الفصل 2' : 'Trimestre 2'}</option>
                <option value="3">{isRTL ? 'الفصل 3' : 'Trimestre 3'}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                {isRTL ? 'الحد الأدنى للنقطة' : 'Score min'}
              </Label>
              <Input
                type="number"
                min="0"
                max="20"
                step="0.01"
                value={scoreMinFilter}
                onChange={(event) => {
                  setScoreMinFilter(event.target.value);
                  setResultsPage(1);
                }}
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                {isRTL ? 'الحد الأقصى للنقطة' : 'Score max'}
              </Label>
              <Input
                type="number"
                min="0"
                max="20"
                step="0.01"
                value={scoreMaxFilter}
                onChange={(event) => {
                  setScoreMaxFilter(event.target.value);
                  setResultsPage(1);
                }}
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                placeholder="20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                {isRTL ? 'فلتر الأداء' : 'Filtre performance'}
              </Label>
              <select
                value={performanceFilter}
                onChange={(event) => {
                  setPerformanceFilter(event.target.value as ResultsPerformanceFilter);
                  setResultsPage(1);
                }}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white transition-all text-sm font-bold"
              >
                <option value="all">{isRTL ? 'كل الحالات' : 'Tous les cas'}</option>
                <option value="excellence">{isRTL ? 'امتياز ≥ 12/20' : 'Excellence ≥ 12/20'}</option>
                <option value="failing">{isRTL ? 'متعثر < 10/20' : 'Échec < 10/20'}</option>
              </select>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {isRTL ? 'النطاق الحالي' : 'Périmètre courant'}
              </p>
              <p className="text-sm font-black text-slate-900 mt-2">{formatScopeLabel(selectedClass, selectedTrimester, isRTL)}</p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {isRTL ? 'الفلتر المتقدم' : 'Filtre avancé'}
              </p>
              <p className="text-xs font-bold text-slate-600 mt-2 leading-relaxed">
                {getPerformanceFilterLabel(performanceFilter, isRTL)}
                {scoreMinFilter || scoreMaxFilter ? ` • ${isRTL ? 'مجال' : 'Plage'} ${scoreMinFilter || '0'}-${scoreMaxFilter || '20'}` : ''}
              </p>
            </div>
          </div>

          {canManageAcademicData && (
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/70 p-5 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{isRTL ? 'إعدادات محفوظة' : 'Presets enregistrés'}</p>
                  <p className="text-sm font-bold text-slate-600 mt-2">{isRTL ? 'احفظ الفلاتر الحالية واسترجعها لاحقاً كمدير.' : 'Enregistrez les filtres actuels et rechargez-les plus tard en tant qu’admin.'}</p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <Input
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    className="h-11 rounded-2xl bg-white border-slate-200 min-w-56"
                    placeholder={isRTL ? 'اسم الإعداد المحفوظ' : 'Nom du preset'}
                  />
                  <Button className="rounded-2xl bg-primary shadow-lg shadow-primary/20" onClick={handleSaveFilterPreset}>
                    <Save className="w-4 h-4 mr-2" /> {isRTL ? 'حفظ' : 'Enregistrer'}
                  </Button>
                </div>
              </div>

              {statisticsFilterPresets.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {statisticsFilterPresets.map((preset) => (
                    <div key={preset.id} className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{preset.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">{new Date(preset.createdAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="rounded-xl h-9 px-3" onClick={() => handleApplyFilterPreset(preset)}>
                          {isRTL ? 'تطبيق' : 'Appliquer'}
                        </Button>
                        <Button variant="ghost" className="rounded-xl h-9 px-3 text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteFilterPreset(preset.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-slate-400">{isRTL ? 'لا توجد إعدادات محفوظة بعد.' : 'Aucun preset enregistré pour le moment.'}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {canManageAcademicData && (
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden relative group">
          <label className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-pointer p-8 transition-colors hover:bg-slate-50/50">
            <div className="p-4 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm font-black text-slate-800">{isRTL ? 'اسحب وأفلت ملف Excel هنا أو انقر للتصفح' : 'Glissez-déposez un fichier Excel ici ou cliquez pour parcourir'}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{isRTL ? 'يدعم جميع الملفات' : 'Supporte tous les fichiers'}</p>
            </div>
            <input type="file" accept=".xlsx,.xls,.csv,.tsv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*" className="hidden" onChange={(e) => void handleImportFile(e)} />
          </label>
          <div className="h-48 border-2 border-dashed border-slate-200 m-8 rounded-[2rem]" />
        </Card>
      )}

      {canManageAcademicData && (
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-xl">
                <FileUp className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                  {isRTL ? 'إدارة نتائج الامتحانات — للمدير فقط' : 'Gestion des résultats académiques — Admin uniquement'}
                </CardTitle>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                  {isRTL
                    ? 'جدول كامل للنقط المفلترة مع ترقيم الصفحات، تحديد على كل الصفحات، تعديل مباشر، وتحرير جماعي.'
                    : 'Table complète des notes filtrées avec pagination, sélection sur toutes les pages, édition en ligne et actions groupées.'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-6 space-y-5">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input
                    ref={filteredSelectAllRef}
                    type="checkbox"
                    checked={areAllFilteredResultsSelected}
                    onChange={toggleFilteredResultsSelection}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {isRTL ? 'تحديد كل النتائج المفلترة' : 'Sélectionner tous les résultats filtrés'}
                </label>
                <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[10px] font-black">
                  {selectedFilteredResultIds.length} / {tableSearchedAcademicResults.length} {isRTL ? 'محدد' : 'sélectionné(s)'}
                </Badge>
                <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[10px] font-black">
                  {resultsPageStart}-{resultsPageEnd} / {tableSearchedAcademicResults.length}
                </Badge>
              </div>

              <div className="flex gap-2 flex-wrap items-center">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{isRTL ? 'حجم الصفحة' : 'Page size'}</span>
                  <select
                    value={resultsPageSize}
                    onChange={(event) => {
                      setResultsPageSize(Number.parseInt(event.target.value, 10));
                      setResultsPage(1);
                    }}
                    className="bg-transparent text-sm font-black text-slate-700 outline-none"
                  >
                    {RESULTS_PAGE_SIZE_OPTIONS.map((pageSize) => (
                      <option key={pageSize} value={pageSize}>{pageSize}</option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="outline"
                  className="rounded-2xl border-slate-200"
                  onClick={handleExportSelectedGradesXlsx}
                  disabled={selectedFilteredResultIds.length === 0}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> {isRTL ? 'تصدير المحدد XLSX' : 'Exporter sélection XLSX'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl border-slate-200"
                  onClick={handleExportSelectedGradesPdf}
                  disabled={selectedFilteredResultIds.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" /> {isRTL ? 'تصدير المحدد PDF' : 'Exporter sélection PDF'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl border-slate-200"
                  onClick={handleGenerateCertificatesPdf}
                  disabled={selectedFilteredResultIds.length === 0 && filteredAcademicResults.length === 0}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> {isRTL ? 'توليد الشهادات PDF' : 'Générer certificats PDF'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl border-slate-200"
                  onClick={() => { void handleSendSelectedReportsToManager(); }}
                  disabled={selectedFilteredResultIds.length === 0}
                >
                  <Mail className="w-4 h-4 mr-2" /> {isRTL ? 'إرسال المحدد للمدير' : 'Envoyer sélection au manager'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl border-slate-200"
                  onClick={handleOpenBulkEditDialog}
                  disabled={selectedFilteredResultIds.length === 0}
                >
                  <Pencil className="w-4 h-4 mr-2" /> {isRTL ? 'تعديل جماعي' : 'Modification groupée'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={handleBulkDelete}
                  disabled={selectedFilteredResultIds.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> {isRTL ? 'حذف المحدد' : 'Supprimer sélection'}
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={clearSelection}
                  disabled={selectedFilteredResultIds.length === 0}
                >
                  <X className="w-4 h-4 mr-2" /> {isRTL ? 'مسح التحديد' : 'Effacer la sélection'}
                </Button>
              </div>
            </div>

            {tableSearchedAcademicResults.length === 0 ? (
              <div className="rounded-[2rem] border-2 border-dashed border-slate-100 p-8 text-center bg-slate-50/50">
                <p className="text-sm font-bold text-slate-500">
                  {isRTL
                    ? 'لا توجد نتائج في النطاق الحالي. يمكنك إضافة نقطة أو استيراد ملف XLSX.'
                    : 'Aucun résultat dans le périmètre courant. Vous pouvez saisir une note ou importer un fichier XLSX.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100">
                  <table className="min-w-full bg-white">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">✓</th>
                        <th className="px-4 py-3 text-left">
                          <button type="button" onClick={() => handleResultsSort('student')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Élève {getSortIndicator('student')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button type="button" onClick={() => handleResultsSort('class')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Classe {getSortIndicator('class')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button type="button" onClick={() => handleResultsSort('subject')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Matière {getSortIndicator('subject')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button type="button" onClick={() => handleResultsSort('examLabel')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Épreuve {getSortIndicator('examLabel')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button type="button" onClick={() => handleResultsSort('trimester')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Trim. {getSortIndicator('trimester')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button type="button" onClick={() => handleResultsSort('score')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Score {getSortIndicator('score')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button type="button" onClick={() => handleResultsSort('coefficient')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Coef. {getSortIndicator('coefficient')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button type="button" onClick={() => handleResultsSort('recordedAt')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Date {getSortIndicator('recordedAt')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                      </tr>
                      <tr className="border-t border-slate-100 bg-white">
                        <th className="px-4 py-3" />
                        <th className="px-4 py-3"><Input value={tableColumnSearches.student} onChange={(event) => updateTableColumnSearch('student', event.target.value)} className="h-9 rounded-xl bg-slate-50 border-slate-200 min-w-32" placeholder="Search" /></th>
                        <th className="px-4 py-3"><Input value={tableColumnSearches.classId} onChange={(event) => updateTableColumnSearch('classId', event.target.value)} className="h-9 rounded-xl bg-slate-50 border-slate-200 min-w-24" placeholder="1A" /></th>
                        <th className="px-4 py-3"><Input value={tableColumnSearches.subject} onChange={(event) => updateTableColumnSearch('subject', event.target.value)} className="h-9 rounded-xl bg-slate-50 border-slate-200 min-w-32" placeholder="Math" /></th>
                        <th className="px-4 py-3"><Input value={tableColumnSearches.examLabel} onChange={(event) => updateTableColumnSearch('examLabel', event.target.value)} className="h-9 rounded-xl bg-slate-50 border-slate-200 min-w-36" placeholder="Exam" /></th>
                        <th className="px-4 py-3">
                          <select value={tableColumnSearches.trimester} onChange={(event) => updateTableColumnSearch('trimester', event.target.value)} className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold min-w-20">
                            <option value="">All</option>
                            <option value="1">T1</option>
                            <option value="2">T2</option>
                            <option value="3">T3</option>
                          </select>
                        </th>
                        <th className="px-4 py-3"><Input value={tableColumnSearches.score} onChange={(event) => updateTableColumnSearch('score', event.target.value)} className="h-9 rounded-xl bg-slate-50 border-slate-200 min-w-20" placeholder="15" /></th>
                        <th className="px-4 py-3"><Input value={tableColumnSearches.coefficient} onChange={(event) => updateTableColumnSearch('coefficient', event.target.value)} className="h-9 rounded-xl bg-slate-50 border-slate-200 min-w-20" placeholder="1" /></th>
                        <th className="px-4 py-3"><Input value={tableColumnSearches.recordedAt} onChange={(event) => updateTableColumnSearch('recordedAt', event.target.value)} className="h-9 rounded-xl bg-slate-50 border-slate-200 min-w-28" placeholder="2026-06" /></th>
                        <th className="px-4 py-3 text-right">
                          <Button variant="ghost" className="rounded-xl h-9 px-3" onClick={() => setTableColumnSearches(createInitialTableColumnSearches())}>
                            {isRTL ? 'مسح' : 'Clear'}
                          </Button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAcademicResults.map((result) => {
                        const student = studentDirectory.get(result.studentId);
                        const isEditing = editingResultId === result.id && editingGradeForm !== null;
                        const isSelected = selectedResultIds.includes(result.id);

                        return (
                          <tr key={result.id} className={isSelected ? 'bg-primary/5' : 'border-t border-slate-100'}>
                            {!isEditing ? (
                              <>
                                <td className="px-4 py-4 align-top">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleResultSelection(result.id)}
                                    className="h-4 w-4 rounded border-slate-300"
                                  />
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <p className="font-black text-slate-900">{student?.fullName || 'Élève inconnu'}</p>
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[9px] font-black">{result.classId}</Badge>
                                </td>
                                <td className="px-4 py-4 align-top text-sm font-bold text-slate-700">{result.subject}</td>
                                <td className="px-4 py-4 align-top text-sm font-medium text-slate-600">{result.examLabel}</td>
                                <td className="px-4 py-4 align-top">
                                  <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[9px] font-black">T{result.trimester}</Badge>
                                </td>
                                <td className="px-4 py-4 align-top text-sm font-black text-slate-900">{result.score.toFixed(2)}</td>
                                <td className="px-4 py-4 align-top text-sm font-bold text-slate-600">{(result.coefficient ?? 1).toFixed(2)}</td>
                                <td className="px-4 py-4 align-top text-sm font-medium text-slate-600">{result.recordedAt}</td>
                                <td className="px-4 py-4 align-top">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="rounded-2xl text-blue-600 hover:bg-blue-50"
                                      onClick={() => startEditingResult(result)}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="rounded-2xl text-rose-600 hover:bg-rose-50"
                                      onClick={() => deleteAcademicResult(result.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-4 align-top">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleResultSelection(result.id)}
                                    className="h-4 w-4 rounded border-slate-300"
                                  />
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <p className="font-black text-slate-900">{student?.fullName || 'Élève inconnu'}</p>
                                </td>
                                <td className="px-4 py-4 align-top text-sm font-bold text-slate-700">{result.classId}</td>
                                <td className="px-4 py-4 align-top">
                                  <Input
                                    value={editingGradeForm.subject}
                                    onChange={(event) => setEditingGradeForm((current) => current ? { ...current, subject: event.target.value } : current)}
                                    className="h-10 rounded-xl bg-white border-slate-200 min-w-32"
                                  />
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <Input
                                    value={editingGradeForm.examLabel}
                                    onChange={(event) => setEditingGradeForm((current) => current ? { ...current, examLabel: event.target.value } : current)}
                                    className="h-10 rounded-xl bg-white border-slate-200 min-w-40"
                                  />
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <select
                                    value={editingGradeForm.trimester}
                                    onChange={(event) => setEditingGradeForm((current) => current ? { ...current, trimester: event.target.value as '1' | '2' | '3' } : current)}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-bold min-w-24"
                                  >
                                    <option value="1">T1</option>
                                    <option value="2">T2</option>
                                    <option value="3">T3</option>
                                  </select>
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="20"
                                    step="0.01"
                                    value={editingGradeForm.score}
                                    onChange={(event) => setEditingGradeForm((current) => current ? { ...current, score: event.target.value } : current)}
                                    className="h-10 rounded-xl bg-white border-slate-200 min-w-24"
                                  />
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <Input
                                    type="number"
                                    min="1"
                                    step="0.1"
                                    value={editingGradeForm.coefficient}
                                    onChange={(event) => setEditingGradeForm((current) => current ? { ...current, coefficient: event.target.value } : current)}
                                    className="h-10 rounded-xl bg-white border-slate-200 min-w-24"
                                  />
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <Input
                                    type="date"
                                    value={editingGradeForm.recordedAt}
                                    onChange={(event) => setEditingGradeForm((current) => current ? { ...current, recordedAt: event.target.value } : current)}
                                    className="h-10 rounded-xl bg-white border-slate-200 min-w-36"
                                  />
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="rounded-2xl"
                                      onClick={cancelEditingResult}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      className="rounded-2xl bg-primary shadow-lg shadow-primary/20"
                                      onClick={() => handleSaveEditedResult(result)}
                                    >
                                      <Save className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm font-bold text-slate-500">
                    {isRTL
                      ? `عرض ${resultsPageStart}–${resultsPageEnd} من أصل ${tableSearchedAcademicResults.length} نتيجة مفلترة`
                      : `Affichage ${resultsPageStart}–${resultsPageEnd} sur ${tableSearchedAcademicResults.length} résultats filtrés`}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setResultsPage(Math.max(1, effectiveResultsPage - 1))}
                      disabled={effectiveResultsPage <= 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" /> {isRTL ? 'السابق' : 'Précédent'}
                    </Button>
                    {Array.from({ length: totalResultPages }, (_, index) => index + 1)
                      .slice(Math.max(0, effectiveResultsPage - 3), Math.min(totalResultPages, effectiveResultsPage + 2))
                      .map((pageNumber) => (
                        <Button
                          key={pageNumber}
                          variant={pageNumber === effectiveResultsPage ? 'default' : 'outline'}
                          className="rounded-2xl w-11"
                          onClick={() => setResultsPage(pageNumber)}
                        >
                          {pageNumber}
                        </Button>
                      ))}
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => setResultsPage(Math.min(totalResultPages, effectiveResultsPage + 1))}
                      disabled={effectiveResultsPage >= totalResultPages}
                    >
                      {isRTL ? 'التالي' : 'Suivant'} <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!hasAcademicData ? (
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
          <CardContent className="p-10 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-slate-50 flex items-center justify-center">
              <Activity className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900">
              {isRTL ? 'لا توجد نتائج أكاديمية كافية داخل هذا النطاق' : 'Aucune donnée académique exploitable dans ce périmètre'}
            </h3>
            <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
              {isRTL
                ? 'غيّر الفلاتر أو أضف/استورد نتائج امتحانات لتفعيل نسب النجاح وتوزيع الامتياز ولوحة الشرف.'
                : 'Modifiez les filtres ou ajoutez/importez des notes d’examens afin d’alimenter automatiquement les taux de réussite, la distribution d’excellence et le tableau d’honneur.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {overviewCards.map((card) => (
              <Card
                key={card.label}
                className={`border ${card.border} shadow-lg shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white`}
              >
                <CardContent className="p-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {card.label}
                    </p>
                    <p className="text-3xl font-black text-slate-900 mt-3 leading-none">{card.value}</p>
                    <p className="text-xs font-bold text-slate-500 mt-3">{card.helper}</p>
                  </div>
                  <div className={`${card.bg} ${card.color} p-3 rounded-2xl shrink-0`}>
                    <card.icon className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="p-8 pb-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <Activity className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                      {isRTL ? 'نسب النجاح حسب المستوى' : 'Taux de réussite par niveau'}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-2 font-medium">
                      {isRTL
                        ? 'يُحسب النجاح عندما يكون معدل التلميذ 10/20 أو أكثر داخل النطاق المفلتر.'
                        : 'Un élève est compté en réussite lorsque sa moyenne académique atteint au moins 10/20 dans le périmètre filtré.'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.successChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 900 }} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#94a3b8', fontWeight: 900 }} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      labelFormatter={(label) => `Niveau ${label}`}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    />
                    <Bar dataKey="successRate" fill="#1a237e" radius={[10, 10, 0, 0]} barSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="p-8 pb-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <PieIcon className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                      {isRTL ? 'توزيع الامتياز حسب المستوى' : 'Distribution de l’excellence'}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-2 font-medium">
                      {isRTL
                        ? 'عدد التلاميذ الذين يتجاوز معدلهم 12/20 داخل كل مستوى في النطاق الحالي.'
                        : 'Répartition des élèves dont la moyenne dépasse 12/20 dans chaque niveau du périmètre courant.'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={excellenceDistribution} cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={4} dataKey="value" stroke="none">
                      {excellenceDistribution.map((entry, index) => (
                        <Cell key={`${entry.name}-${entry.level}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="p-8 pb-0">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                        {isRTL ? 'تحليل الأداء حسب المادة' : 'Analyse par matière'}
                      </CardTitle>
                      <p className="text-sm text-slate-500 mt-2 font-medium">
                        {isRTL
                          ? 'متوسطات المواد ومعدلات النجاح المحسوبة من نفس النطاق المفلتر.'
                          : 'Moyennes par matière et taux de réussite calculés sur le même périmètre filtré.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {topSubject && (
                      <Badge className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1">
                        {isRTL ? 'أفضل مادة' : 'Top matière'} • {topSubject.subject}
                      </Badge>
                    )}
                    {watchSubject && (
                      <Badge className="rounded-full bg-rose-50 text-rose-700 border-rose-200 px-3 py-1">
                        {isRTL ? 'تحتاج متابعة' : 'À suivre'} • {watchSubject.subject}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="subject" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 900 }} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} domain={[0, 20]} tick={{ fill: '#94a3b8', fontWeight: 900 }} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                    <Bar dataKey="averageScore" fill="#3949ab" radius={[10, 10, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="p-8 pb-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <Target className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                      {isRTL ? 'مؤشرات المواد' : 'Indicateurs matières'}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-2 font-medium">
                      {isRTL
                        ? 'أفضل 5 مواد حسب المتوسط، مع عدد النقاط والنجاح والامتياز.'
                        : 'Top 5 matières par moyenne, avec volume de notes, réussite et excellence.'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-6 space-y-3">
                {subjectMetrics.length === 0 ? (
                  <div className="rounded-[2rem] border-2 border-dashed border-slate-100 p-8 text-center bg-slate-50/50">
                    <p className="text-sm font-bold text-slate-500">{t('no_data')}</p>
                  </div>
                ) : (
                  subjectMetrics.slice(0, 5).map((subjectMetric, index) => (
                    <div key={subjectMetric.subject} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[9px] font-black">#{index + 1}</Badge>
                            <p className="font-black text-slate-900">{subjectMetric.subject}</p>
                          </div>
                          <p className="text-xs font-bold text-slate-500 mt-2">
                            {subjectMetric.recordedGrades} {isRTL ? 'تقييماً' : 'notes'} • {subjectMetric.evaluatedStudents} {isRTL ? 'تلميذاً' : 'élèves'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Average</p>
                          <p className="text-2xl font-black text-slate-900">{subjectMetric.averageScore.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="rounded-xl bg-white border border-slate-100 px-2 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Success</p>
                          <p className="text-sm font-black text-emerald-700 mt-1">{subjectMetric.successRate.toFixed(1)}%</p>
                        </div>
                        <div className="rounded-xl bg-white border border-slate-100 px-2 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Excellence</p>
                          <p className="text-sm font-black text-amber-700 mt-1">{subjectMetric.excellenceCount}</p>
                        </div>
                        <div className="rounded-xl bg-white border border-slate-100 px-2 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Validés</p>
                          <p className="text-sm font-black text-slate-900 mt-1">{subjectMetric.successCount}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="p-8 pb-0">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                      {isRTL ? 'تفصيل المادة حسب القسم/الفصل/التلميذ' : 'Drill-down matière par trimestre / classe / élève'}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-2 font-medium">
                      {isRTL
                        ? 'اختر مادة ثم نزّل التفاصيل حسب التلميذ داخل نفس الفلاتر العامة، مع تصدير تقرير المادة بصيغة XLSX أو PDF.'
                        : 'Sélectionnez une matière puis explorez le détail par élève dans le même périmètre filtré, avec export du rapport matière en XLSX ou PDF.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" className="rounded-2xl border-slate-200" onClick={handleExportSubjectReportXlsx} disabled={!selectedSubjectMetrics}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> {isRTL ? 'تقرير المادة XLSX' : 'Rapport matière XLSX'}
                  </Button>
                  <Button variant="outline" className="rounded-2xl border-slate-200" onClick={handlePrintSubjectReport} disabled={!selectedSubjectMetrics}>
                    <Download className="w-4 h-4 mr-2" /> {isRTL ? 'تقرير المادة PDF' : 'Rapport matière PDF'}
                  </Button>
                  <Button variant="outline" className="rounded-2xl border-slate-200" onClick={() => { void handleSendSubjectReportToManager(); }} disabled={!selectedSubjectMetrics}>
                    <Mail className="w-4 h-4 mr-2" /> {isRTL ? 'إرسال للمدير' : 'Envoyer au manager'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'المادة' : 'Matière'}</Label>
                  <select
                    value={effectiveSelectedSubject}
                    onChange={(event) => {
                      setSelectedSubject(event.target.value);
                      setSelectedSubjectStudent(FILTER_ALL);
                    }}
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white transition-all text-sm font-bold"
                  >
                    <option value={FILTER_ALL}>{isRTL ? 'كل المواد' : 'Toutes les matières'}</option>
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'التلميذ' : 'Élève'}</Label>
                  <select
                    value={effectiveSelectedSubjectStudent}
                    onChange={(event) => setSelectedSubjectStudent(event.target.value)}
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white transition-all text-sm font-bold"
                  >
                    <option value={FILTER_ALL}>{isRTL ? 'كل التلاميذ' : 'Tous les élèves'}</option>
                    {subjectStudentOptions.map((student) => (
                      <option key={student.id} value={student.id}>{student.fullName} • {student.class}</option>
                    ))}
                  </select>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{isRTL ? 'المادة المختارة' : 'Matière ciblée'}</p>
                  <p className="text-sm font-black text-slate-900 mt-2">{selectedSubjectMetrics?.subject || (isRTL ? 'لا توجد مادة' : 'Aucune matière')}</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{isRTL ? 'نطاق التقرير' : 'Portée du rapport'}</p>
                  <p className="text-sm font-black text-slate-900 mt-2">{formatScopeLabel(selectedClass, selectedTrimester, isRTL)}</p>
                </div>
              </div>

              {selectedSubjectMetrics ? (
                <>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Average</p>
                      <p className="text-2xl font-black text-emerald-900 mt-2">{selectedSubjectMetrics.averageScore.toFixed(2)}/20</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Notes</p>
                      <p className="text-2xl font-black text-blue-900 mt-2">{selectedSubjectMetrics.recordedGrades}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Excellence</p>
                      <p className="text-2xl font-black text-amber-900 mt-2">{selectedSubjectMetrics.excellenceCount}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Success</p>
                      <p className="text-2xl font-black text-indigo-900 mt-2">{selectedSubjectMetrics.successRate.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
                    <Card className="border border-slate-100 shadow-none rounded-[2rem] bg-slate-50/40">
                      <CardHeader className="p-6 pb-0">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                          {isRTL ? 'اتجاه المادة عبر الفصول' : 'Tendance matière par trimestre'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Scope</Label>
                            <select
                              value={trendMode}
                              onChange={(event) => setTrendMode(event.target.value as 'class' | 'student')}
                              className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold"
                            >
                              <option value="class">{isRTL ? 'حسب القسم' : 'Par classe'}</option>
                              <option value="student">{isRTL ? 'حسب التلميذ' : 'Par élève'}</option>
                            </select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                              {trendMode === 'class' ? (isRTL ? 'القسم المقارن' : 'Classe comparée') : (isRTL ? 'التلميذ المقارن' : 'Élève comparé')}
                            </Label>
                            {trendMode === 'class' ? (
                              <select
                                value={effectiveTrendClass}
                                onChange={(event) => setSelectedTrendClass(event.target.value)}
                                className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold"
                              >
                                <option value={FILTER_ALL}>{isRTL ? 'كل الأقسام' : 'Toutes les classes'}</option>
                                {trendClassOptions.map((classId) => (
                                  <option key={classId} value={classId}>{classId}</option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value={effectiveTrendStudent}
                                onChange={(event) => setSelectedTrendStudent(event.target.value)}
                                className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold"
                              >
                                <option value={FILTER_ALL}>{isRTL ? 'كل التلاميذ' : 'Tous les élèves'}</option>
                                {trendStudentOptions.map((student) => (
                                  <option key={student.id} value={student.id}>{student.fullName} • {student.class}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{isRTL ? 'النطاق المقارن' : 'Portée comparée'}</p>
                          <p className="text-sm font-black text-slate-900 mt-2">{trendScopeLabel}</p>
                        </div>

                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={subjectTrendData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="trimester" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 900 }} />
                              <YAxis domain={[0, 20]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 900 }} />
                              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                              <Line type="monotone" dataKey="averageScore" stroke="#1a237e" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 px-1">{isRTL ? 'ترتيب التلاميذ في المادة' : 'Classement élèves sur la matière'}</h4>
                        {subjectDrilldownRows.length === 0 ? (
                          <div className="rounded-[2rem] border-2 border-dashed border-slate-100 p-8 text-center bg-slate-50/50">
                            <p className="text-sm font-bold text-slate-500">{t('no_data')}</p>
                          </div>
                        ) : (
                          subjectDrilldownRows.map((row, index) => (
                            <div key={row.student.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[9px] font-black">#{index + 1}</Badge>
                                    <p className="font-black text-slate-900">{row.student.fullName}</p>
                                    <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[9px] font-black">{row.student.class}</Badge>
                                  </div>
                                  <p className="text-xs font-bold text-slate-500 mt-2">{row.recordedGrades} {isRTL ? 'تقييماً' : 'notes'} • {isRTL ? 'أفضل نقطة' : 'meilleure note'} {row.bestScore.toFixed(2)}/20</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Average</p>
                                  <p className="text-xl font-black text-slate-900 mt-1">{row.averageScore.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 px-1">{isRTL ? 'تفاصيل فروض المادة' : 'Détail des évaluations matière'}</h4>
                        {subjectAssessmentRows.length === 0 ? (
                          <div className="rounded-[2rem] border-2 border-dashed border-slate-100 p-8 text-center bg-slate-50/50">
                            <p className="text-sm font-bold text-slate-500">{t('no_data')}</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[30rem] overflow-auto pr-1">
                            {subjectAssessmentRows.map((row) => (
                              <div key={row.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-black text-slate-900">{row.student?.fullName || 'Élève inconnu'}</p>
                                      <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[9px] font-black">{row.classId}</Badge>
                                      <Badge variant="outline" className="rounded-full bg-white border-slate-200 text-[9px] font-black">T{row.trimester}</Badge>
                                    </div>
                                    <p className="text-sm text-slate-600 font-medium mt-2">{row.examLabel}</p>
                                    <p className="text-xs font-bold text-slate-500 mt-1">{row.recordedAt} • Coef. {(row.coefficient ?? 1).toFixed(2)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Score</p>
                                    <p className="text-xl font-black text-slate-900 mt-1">{row.score.toFixed(2)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-[2rem] border-2 border-dashed border-slate-100 p-8 text-center bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-500">{isRTL ? 'اختر مادة لعرض التفاصيل والتنزيل.' : 'Sélectionnez une matière pour afficher le drill-down et exporter le rapport.'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <section className="space-y-5">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <Star className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {isRTL ? 'فلتر الامتياز حسب المستوى' : 'Filtre d’excellence par niveau'}
                </h3>
                <p className="text-sm text-slate-500">
                  {isRTL
                    ? 'عرض مباشر لعدد التلاميذ المتفوقين فوق 12/20 داخل كل مستوى بعد تطبيق الفلاتر.'
                    : 'Vue rapide du nombre total d’élèves au-dessus de 12/20 pour chacun des niveaux après application des filtres.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
              {analytics.levelMetrics.map((levelMetric, index) => {
                const isHealthy = levelMetric.successRate >= 75;
                const isWatch = levelMetric.successRate > 0 && levelMetric.successRate < 50;

                return (
                  <Card key={levelMetric.level} className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-white overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Niveau</p>
                          <h4 className="text-xl font-black text-slate-900 mt-2">{levelMetric.label}</h4>
                        </div>
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}>
                          {levelMetric.level}
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{isRTL ? 'النجاح' : 'Réussite'}</p>
                          <p className="text-2xl font-black text-slate-900 mt-1">{levelMetric.successRate.toFixed(1)}%</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`rounded-full px-2.5 py-1 text-[9px] font-black ${
                            isHealthy
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : isWatch
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {levelMetric.successCount}/{levelMetric.evaluatedStudents || 0}
                        </Badge>
                      </div>

                      <div className="rounded-[1.5rem] bg-slate-50 p-4 space-y-2 border border-slate-100">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-600">
                          <span>{isRTL ? 'الامتياز (≥ 12/20)' : 'Excellent (≥ 12)'}</span>
                          <span>{levelMetric.excellenceCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-cyan-600">
                          <span>{isRTL ? 'متوسطين (10-11.99)' : 'Moyen (10-11.99)'}</span>
                          <span>{levelMetric.averageCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-rose-600">
                          <span>{isRTL ? 'ضعفاء (< 10/20)' : 'Faible (< 10)'}</span>
                          <span>{levelMetric.failureCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-200">
                          <span>{isRTL ? 'المعدل العام' : 'Moyenne Globale'}</span>
                          <span>{levelMetric.averageScore.toFixed(2)}/20</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>{isRTL ? 'الفصول النشطة' : 'Classes actives'}</span>
                          <span>{levelMetric.activeClasses}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="p-8 pb-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <Trophy className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                    {isRTL ? 'لوحة الشرف الآلية' : 'Tableau d’Honneur Automatisé'}
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    {selectedLevelMetrics
                      ? `${selectedLevelMetrics.label} • ${selectedLevelMetrics.evaluatedStudents} ${isRTL ? 'تلميذًا مقيمًا' : 'élèves évalués'}`
                      : ''}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              <Tabs value={effectiveSelectedLevel} onValueChange={(value) => setSelectedLevel(value as SchoolLevel)}>
                <TabsList className="w-full h-auto p-2 rounded-[1.5rem] bg-slate-50 flex flex-wrap gap-2 justify-start">
                  {SCHOOL_LEVELS.map((level) => {
                    const levelMetric = analytics.levelMetrics.find((metric) => metric.level === level);
                    return (
                      <TabsTrigger key={level} value={level} className="rounded-[1rem] px-4 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white">
                        {levelMetric?.label ?? level}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {SCHOOL_LEVELS.map((level) => {
                  const performers = analytics.leaderboardByLevel[level] ?? [];
                  const levelMetric = analytics.levelMetrics.find((metric) => metric.level === level);

                  return (
                    <TabsContent key={level} value={level} className="mt-6">
                      {performers.length === 0 ? (
                        <div className="rounded-[2rem] border-2 border-dashed border-slate-100 p-10 text-center bg-slate-50/50">
                          <p className="text-sm font-bold text-slate-500">
                            {isRTL
                              ? 'لا توجد نتائج كافية لإظهار المتفوقين في هذا المستوى.'
                              : 'Aucune moyenne exploitable pour générer un podium sur ce niveau.'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {performers.map((performer, index) => (
                            <div
                              key={performer.studentId}
                              className={`rounded-[2rem] p-6 border shadow-lg ${
                                index === 0
                                  ? 'bg-amber-50 border-amber-100 shadow-amber-100/40'
                                  : index === 1
                                    ? 'bg-slate-50 border-slate-200 shadow-slate-200/40'
                                    : 'bg-orange-50 border-orange-100 shadow-orange-100/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-white text-slate-900 flex items-center justify-center text-lg font-black shadow-sm">
                                  {index + 1}
                                </div>
                                <Trophy className={`w-5 h-5 ${index === 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                              </div>

                              <div className="mt-6">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{levelMetric?.label}</p>
                                <h4 className="text-xl font-black text-slate-900 mt-2 tracking-tight">{performer.fullName}</h4>
                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                  <Badge variant="outline" className="rounded-full text-[9px] font-black border-slate-200 bg-white">{performer.classId}</Badge>
                                  <Badge variant="outline" className="rounded-full text-[9px] font-black border-slate-200 bg-white">{performer.gradeCount} {isRTL ? 'نقطة' : 'notes'}</Badge>
                                </div>
                              </div>

                              <div className="mt-6 rounded-[1.5rem] bg-white/80 p-4 border border-white space-y-2">
                                <div className="flex items-center justify-between text-sm font-bold text-slate-600">
                                  <span>{isRTL ? 'المعدل' : 'Moyenne'}</span>
                                  <span className="text-base text-slate-900">{performer.average.toFixed(2)}/20</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                  <span>{isRTL ? 'أعلى نقطة' : 'Meilleure note'}</span>
                                  <span>{performer.highestScore.toFixed(2)}/20</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-rose-50 border border-rose-100 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">{t('announcements')}</p>
                  <p className="text-3xl font-black text-rose-900 mt-3">{announcements.length}</p>
                </div>
                <Bell className="w-6 h-6 text-rose-600" />
              </div>
            </Card>
            <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-green-50 border border-green-100 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500">{t('unread_messages')}</p>
                  <p className="text-3xl font-black text-green-900 mt-3">{messages.filter((message) => !message.read).length}</p>
                </div>
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
            </Card>
            <Card className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-amber-50 border border-amber-100 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">{t('upcoming_exams')}</p>
                  <p className="text-3xl font-black text-amber-900 mt-3">{exams.length}</p>
                </div>
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
            </Card>
          </div>
        </>
      )}

      <Dialog open={isBulkEditDialogOpen} onOpenChange={(open) => {
        setIsBulkEditDialogOpen(open);
        if (!open) {
          resetBulkEditForm();
        }
      }}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-8 border-none shadow-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <Pencil className="w-5 h-5" />
              </div>
              {isRTL ? 'تعديل جماعي للنتائج المحددة' : 'Modification groupée des résultats sélectionnés'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleBulkEditSubmit} className="space-y-6 pt-6">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4 text-sm font-bold text-slate-600">
              {selectedFilteredResultIds.length} {isRTL ? 'نتائج محددة للتحديث' : 'résultat(s) sélectionné(s) pour mise à jour'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'المادة' : 'Matière'}</Label>
                <Input
                  value={bulkEditForm.subject}
                  onChange={(event) => setBulkEditForm((current) => ({ ...current, subject: event.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  placeholder={isRTL ? 'اتركه فارغاً للإبقاء على القيمة' : 'Laisser vide pour conserver'}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'نوع الاختبار' : 'Épreuve'}</Label>
                <Input
                  value={bulkEditForm.examLabel}
                  onChange={(event) => setBulkEditForm((current) => ({ ...current, examLabel: event.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  placeholder={isRTL ? 'اتركه فارغاً للإبقاء على القيمة' : 'Laisser vide pour conserver'}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('trimester')}</Label>
                <select
                  value={bulkEditForm.trimester}
                  onChange={(event) => setBulkEditForm((current) => ({ ...current, trimester: event.target.value as BulkEditFormState['trimester'] }))}
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white transition-all text-sm font-bold"
                >
                  <option value="keep">{isRTL ? 'بدون تغيير' : 'Conserver la valeur'}</option>
                  <option value="1">{isRTL ? 'الفصل 1' : 'Trimestre 1'}</option>
                  <option value="2">{isRTL ? 'الفصل 2' : 'Trimestre 2'}</option>
                  <option value="3">{isRTL ? 'الفصل 3' : 'Trimestre 3'}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'تاريخ التسجيل' : 'Date de saisie'}</Label>
                <Input
                  type="date"
                  value={bulkEditForm.recordedAt}
                  onChange={(event) => setBulkEditForm((current) => ({ ...current, recordedAt: event.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'النقطة /20' : 'Note /20'}</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  step="0.01"
                  value={bulkEditForm.score}
                  onChange={(event) => setBulkEditForm((current) => ({ ...current, score: event.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  placeholder={isRTL ? 'اختياري' : 'Optionnel'}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'المعامل' : 'Coefficient'}</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.1"
                  value={bulkEditForm.coefficient}
                  onChange={(event) => setBulkEditForm((current) => ({ ...current, coefficient: event.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  placeholder={isRTL ? 'اختياري' : 'Optionnel'}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-xs"
                onClick={() => {
                  setIsBulkEditDialogOpen(false);
                  resetBulkEditForm();
                }}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" className="flex-1 h-12 rounded-2xl bg-primary font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
                {isRTL ? 'تحديث المحدد' : 'Mettre à jour la sélection'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-8 border-none shadow-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <Plus className="w-5 h-5" />
              </div>
              {isRTL ? 'إضافة نتيجة أكاديمية' : 'Ajouter un résultat académique'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGradeSubmit} className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'القسم' : 'Classe'}</Label>
                <select
                  value={gradeForm.classId}
                  onChange={(event) => setGradeForm((current) => ({ ...current, classId: event.target.value, studentId: '' }))}
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white transition-all text-sm font-bold"
                  required
                >
                  <option value="">{isRTL ? 'اختر قسماً' : 'Choisir une classe'}</option>
                  {PRIMARY_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'التلميذ' : 'Élève'}</Label>
                <select
                  value={gradeForm.studentId}
                  onChange={(event) => setGradeForm((current) => ({ ...current, studentId: event.target.value }))}
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white transition-all text-sm font-bold"
                  required
                  disabled={!gradeForm.classId}
                >
                  <option value="">{isRTL ? 'اختر تلميذاً' : 'Choisir un élève'}</option>
                  {students.filter(s => s.class === gradeForm.classId).map((student) => (
                    <option key={student.id} value={student.id}>{student.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'المادة' : 'Matière'}</Label>
                <Input
                  value={gradeForm.subject}
                  onChange={(event) => setGradeForm((current) => ({ ...current, subject: event.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'نوع الاختبار' : 'Épreuve'}</Label>
                <Input
                  value={gradeForm.examLabel}
                  onChange={(event) => setGradeForm((current) => ({ ...current, examLabel: event.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('trimester')}</Label>
                <select
                  value={gradeForm.trimester}
                  onChange={(event) => setGradeForm((current) => ({ ...current, trimester: event.target.value as '1' | '2' | '3' }))}
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white transition-all text-sm font-bold"
                  required
                >
                  <option value="1">{isRTL ? 'الفصل 1' : 'Trimestre 1'}</option>
                  <option value="2">{isRTL ? 'الفصل 2' : 'Trimestre 2'}</option>
                  <option value="3">{isRTL ? 'الفصل 3' : 'Trimestre 3'}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'تاريخ التسجيل' : 'Date de saisie'}</Label>
                <Input
                  type="date"
                  value={gradeForm.recordedAt}
                  onChange={(event) => setGradeForm((current) => ({ ...current, recordedAt: event.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'النقطة /20' : 'Note /20'}</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  step="0.01"
                  value={gradeForm.score}
                  onChange={(event) => setGradeForm((current) => ({ ...current, score: event.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{isRTL ? 'المعامل' : 'Coefficient'}</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.1"
                  value={gradeForm.coefficient}
                  onChange={(event) => setGradeForm((current) => ({ ...current, coefficient: event.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-xs"
                onClick={() => {
                  setIsGradeDialogOpen(false);
                  resetGradeForm();
                }}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" className="flex-1 h-12 rounded-2xl bg-primary font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Statistics;

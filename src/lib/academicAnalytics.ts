import type { AcademicResult, SchoolLevel, Student } from './types';

export const SCHOOL_LEVELS: SchoolLevel[] = ['1', '2', '3', '4', '5', '6'];

export const LEVEL_LABELS: Record<SchoolLevel, string> = {
  '1': '1ère',
  '2': '2ème',
  '3': '3ème',
  '4': '4ème',
  '5': '5ème',
  '6': '6ème',
};

const SUCCESS_THRESHOLD = 10;
const EXCELLENCE_THRESHOLD = 12;

interface StudentAverageAccumulator {
  studentId: string;
  fullName: string;
  classId: string;
  level: SchoolLevel;
  totalWeightedScore: number;
  totalWeight: number;
  gradeCount: number;
  highestScore: number;
}

interface LevelAccumulator {
  level: SchoolLevel;
  label: string;
  evaluatedStudents: number;
  successCount: number;
  excellenceCount: number;
  cumulativeAverage: number;
  topPerformers: StudentAverageRecord[];
  activeClasses: Set<string>;
}

export interface StudentAverageRecord {
  studentId: string;
  fullName: string;
  classId: string;
  level: SchoolLevel;
  average: number;
  highestScore: number;
  gradeCount: number;
  isSuccessful: boolean;
  isExcellent: boolean;
}

export interface LevelAnalytics {
  level: SchoolLevel;
  label: string;
  evaluatedStudents: number;
  successCount: number;
  failureCount: number;
  failureRate: number;
  successRate: number;
  averageCount: number;
  averageStudentRate: number;
  excellenceCount: number;
  excellenceRate: number;
  averageScore: number;
  activeClasses: number;
  topPerformers: StudentAverageRecord[];
}

export interface AcademicAnalyticsOverview {
  evaluatedStudents: number;
  recordedGrades: number;
  successCount: number;
  successRate: number;
  averageStudents: number;
  averageStudentRate: number;
  failureStudents: number;
  failureRate: number;
  excellentStudents: number;
  excellenceRate: number;
  averageScore: number;
  activeLevels: number;
}

export interface AcademicAnalyticsSnapshot {
  overview: AcademicAnalyticsOverview;
  levelMetrics: LevelAnalytics[];
  leaderboardByLevel: Record<SchoolLevel, StudentAverageRecord[]>;
  successChartData: Array<{
    level: SchoolLevel;
    label: string;
    successRate: number;
    evaluatedStudents: number;
    successCount: number;
    excellenceCount: number;
  }>;
  excellenceChartData: Array<{
    level: SchoolLevel;
    name: string;
    value: number;
  }>;
}

export const parseSchoolLevel = (classId: string): SchoolLevel | null => {
  const normalizedClassId = classId.trim();
  const levelMatch = normalizedClassId.match(/^([1-6])/);

  return levelMatch ? (levelMatch[1] as SchoolLevel) : null;
};

const insertTopPerformer = (
  leaderboard: StudentAverageRecord[],
  candidate: StudentAverageRecord,
): StudentAverageRecord[] => {
  const nextLeaderboard = [...leaderboard];
  let inserted = false;

  for (let index = 0; index < nextLeaderboard.length; index += 1) {
    const currentEntry = nextLeaderboard[index];
    const shouldInsertBefore =
      candidate.average > currentEntry.average ||
      (candidate.average === currentEntry.average &&
        candidate.fullName.localeCompare(currentEntry.fullName, 'fr-FR') < 0);

    if (shouldInsertBefore) {
      nextLeaderboard.splice(index, 0, candidate);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    nextLeaderboard.push(candidate);
  }

  return nextLeaderboard.slice(0, 3);
};

export const buildAcademicAnalytics = (
  students: readonly Student[],
  academicResults: readonly AcademicResult[],
): AcademicAnalyticsSnapshot => {
  const studentDirectory = new Map<string, Student>();
  for (const student of students) {
    studentDirectory.set(student.id, student);
  }

  const studentAverageAccumulators = new Map<string, StudentAverageAccumulator>();

  for (const result of academicResults) {
    const mappedStudent = studentDirectory.get(result.studentId);
    const classId = mappedStudent?.class ?? result.classId;
    const level = mappedStudent ? parseSchoolLevel(mappedStudent.class) : result.level;
    const normalizedScore = Number.isFinite(result.score) ? result.score : 0;
    const weight = result.coefficient && result.coefficient > 0 ? result.coefficient : 1;

    if (!classId || !level) {
      continue;
    }

    const currentAccumulator = studentAverageAccumulators.get(result.studentId) ?? {
      studentId: result.studentId,
      fullName: mappedStudent?.fullName ?? 'Élève inconnu',
      classId,
      level,
      totalWeightedScore: 0,
      totalWeight: 0,
      gradeCount: 0,
      highestScore: 0,
    };

    currentAccumulator.classId = classId;
    currentAccumulator.level = level;
    currentAccumulator.fullName = mappedStudent?.fullName ?? currentAccumulator.fullName;
    currentAccumulator.totalWeightedScore += normalizedScore * weight;
    currentAccumulator.totalWeight += weight;
    currentAccumulator.gradeCount += 1;
    currentAccumulator.highestScore = Math.max(currentAccumulator.highestScore, normalizedScore);

    studentAverageAccumulators.set(result.studentId, currentAccumulator);
  }

  const levelAccumulators = new Map<SchoolLevel, LevelAccumulator>();
  for (const level of SCHOOL_LEVELS) {
    levelAccumulators.set(level, {
      level,
      label: LEVEL_LABELS[level],
      evaluatedStudents: 0,
      successCount: 0,
      excellenceCount: 0,
      cumulativeAverage: 0,
      topPerformers: [],
      activeClasses: new Set<string>(),
    });
  }

  for (const accumulator of studentAverageAccumulators.values()) {
    if (accumulator.totalWeight <= 0) {
      continue;
    }

    const average = Number((accumulator.totalWeightedScore / accumulator.totalWeight).toFixed(2));
    const averageRecord: StudentAverageRecord = {
      studentId: accumulator.studentId,
      fullName: accumulator.fullName,
      classId: accumulator.classId,
      level: accumulator.level,
      average,
      highestScore: Number(accumulator.highestScore.toFixed(2)),
      gradeCount: accumulator.gradeCount,
      isSuccessful: average >= SUCCESS_THRESHOLD,
      isExcellent: average >= EXCELLENCE_THRESHOLD,
    };

    const levelAccumulator = levelAccumulators.get(averageRecord.level);
    if (!levelAccumulator) {
      continue;
    }

    levelAccumulator.evaluatedStudents += 1;
    levelAccumulator.cumulativeAverage += averageRecord.average;
    levelAccumulator.activeClasses.add(averageRecord.classId);

    if (averageRecord.isSuccessful) {
      levelAccumulator.successCount += 1;
    }

    if (averageRecord.isExcellent) {
      levelAccumulator.excellenceCount += 1;
    }

    levelAccumulator.topPerformers = insertTopPerformer(levelAccumulator.topPerformers, averageRecord);
  }

  const levelMetrics: LevelAnalytics[] = SCHOOL_LEVELS.map((level) => {
    const levelAccumulator = levelAccumulators.get(level);

    if (!levelAccumulator) {
      return {
        level,
        label: LEVEL_LABELS[level],
        evaluatedStudents: 0,
        successCount: 0,
        failureCount: 0,
        failureRate: 0,
        successRate: 0,
        averageCount: 0,
        averageStudentRate: 0,
        excellenceCount: 0,
        excellenceRate: 0,
        averageScore: 0,
        activeClasses: 0,
        topPerformers: [],
      };
    }

    const failureCount = Math.max(0, levelAccumulator.evaluatedStudents - levelAccumulator.successCount);
    const averageCount = Math.max(0, levelAccumulator.successCount - levelAccumulator.excellenceCount);

    const successRate = levelAccumulator.evaluatedStudents
      ? Number(((levelAccumulator.successCount / levelAccumulator.evaluatedStudents) * 100).toFixed(1))
      : 0;
    const excellenceRate = levelAccumulator.evaluatedStudents
      ? Number(((levelAccumulator.excellenceCount / levelAccumulator.evaluatedStudents) * 100).toFixed(1))
      : 0;
    const failureRate = levelAccumulator.evaluatedStudents
      ? Number(((failureCount / levelAccumulator.evaluatedStudents) * 100).toFixed(1))
      : 0;
    const averageStudentRate = levelAccumulator.evaluatedStudents
      ? Number(((averageCount / levelAccumulator.evaluatedStudents) * 100).toFixed(1))
      : 0;
    const averageScore = levelAccumulator.evaluatedStudents
      ? Number((levelAccumulator.cumulativeAverage / levelAccumulator.evaluatedStudents).toFixed(2))
      : 0;

    return {
      level,
      label: levelAccumulator.label,
      evaluatedStudents: levelAccumulator.evaluatedStudents,
      successCount: levelAccumulator.successCount,
      failureCount,
      failureRate,
      successRate,
      averageCount,
      averageStudentRate,
      excellenceCount: levelAccumulator.excellenceCount,
      excellenceRate,
      averageScore,
      activeClasses: levelAccumulator.activeClasses.size,
      topPerformers: levelAccumulator.topPerformers,
    };
  });

  const overview = levelMetrics.reduce<AcademicAnalyticsOverview>(
    (aggregate, levelMetric) => ({
      evaluatedStudents: aggregate.evaluatedStudents + levelMetric.evaluatedStudents,
      recordedGrades: academicResults.length,
      successCount: aggregate.successCount + levelMetric.successCount,
      successRate: 0,
      averageStudents: aggregate.averageStudents + levelMetric.averageCount,
      averageStudentRate: 0,
      failureStudents: aggregate.failureStudents + levelMetric.failureCount,
      failureRate: 0,
      excellentStudents: aggregate.excellentStudents + levelMetric.excellenceCount,
      excellenceRate: 0,
      averageScore: aggregate.averageScore + levelMetric.averageScore * levelMetric.evaluatedStudents,
      activeLevels:
        aggregate.activeLevels + (levelMetric.evaluatedStudents > 0 ? 1 : 0),
    }),
    {
      evaluatedStudents: 0,
      recordedGrades: academicResults.length,
      successCount: 0,
      successRate: 0,
      averageStudents: 0,
      averageStudentRate: 0,
      failureStudents: 0,
      failureRate: 0,
      excellentStudents: 0,
      excellenceRate: 0,
      averageScore: 0,
      activeLevels: 0,
    },
  );

  const normalizedOverview: AcademicAnalyticsOverview = {
    ...overview,
    successRate: overview.evaluatedStudents
      ? Number(((overview.successCount / overview.evaluatedStudents) * 100).toFixed(1))
      : 0,
    averageStudentRate: overview.evaluatedStudents
      ? Number(((overview.averageStudents / overview.evaluatedStudents) * 100).toFixed(1))
      : 0,
    failureRate: overview.evaluatedStudents
      ? Number(((overview.failureStudents / overview.evaluatedStudents) * 100).toFixed(1))
      : 0,
    excellenceRate: overview.evaluatedStudents
      ? Number(((overview.excellentStudents / overview.evaluatedStudents) * 100).toFixed(1))
      : 0,
    averageScore: overview.evaluatedStudents
      ? Number((overview.averageScore / overview.evaluatedStudents).toFixed(2))
      : 0,
  };

  const leaderboardByLevel = SCHOOL_LEVELS.reduce<Record<SchoolLevel, StudentAverageRecord[]>>(
    (aggregate, level) => {
      const levelMetric = levelMetrics.find((metric) => metric.level === level);
      aggregate[level] = levelMetric?.topPerformers ?? [];
      return aggregate;
    },
    {
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5': [],
      '6': [],
    },
  );

  const successChartData = levelMetrics.map((metric) => ({
    level: metric.level,
    label: metric.label,
    successRate: metric.successRate,
    evaluatedStudents: metric.evaluatedStudents,
    successCount: metric.successCount,
    excellenceCount: metric.excellenceCount,
  }));

  const excellenceChartData = levelMetrics
    .filter((metric) => metric.excellenceCount > 0)
    .map((metric) => ({
      level: metric.level,
      name: metric.label,
      value: metric.excellenceCount,
    }));

  return {
    overview: normalizedOverview,
    levelMetrics,
    leaderboardByLevel,
    successChartData,
    excellenceChartData,
  };
};

import { browser } from '$app/environment';
import type { SubjectId, SupportedLanguage } from '$lib/trace/types';

export type LearnerLevel = 'beginner' | 'intermediate' | 'advanced';
export type LearningGoal = 'foundation' | 'exam' | 'interview' | 'curiosity';
export type ExplanationLevel = 'beginner' | 'standard' | 'exam-ready' | 'technical';

export interface Activity {
  type: 'completion';
  lessonId: string;
  xp: number;
  at: string;
}

export interface OnboardingPreferences {
  learnerLevel: LearnerLevel;
  primaryGoal: LearningGoal;
  preferredLanguage: SupportedLanguage;
  explanationLanguage: 'en' | 'bn';
  subjectsOfInterest: SubjectId[];
  dailyGoalMinutes: number;
}

export interface Progress extends OnboardingPreferences {
  version: 4;
  onboardingComplete: boolean;
  explanationLevel: ExplanationLevel;
  xp: number;
  completed: string[];
  lessonMastery: Record<string, number>;
  recentActivity: Activity[];
  languageUsage: Partial<Record<SupportedLanguage, number>>;
  badges: string[];
  badge?: string;
}

interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const learnerLevels: readonly LearnerLevel[] = ['beginner', 'intermediate', 'advanced'];
const learningGoals: readonly LearningGoal[] = ['foundation', 'exam', 'interview', 'curiosity'];
const languages: readonly SupportedLanguage[] = ['c', 'cpp', 'java', 'python'];
const explanationLanguages = ['en', 'bn'] as const;
const explanationLevels: readonly ExplanationLevel[] = [
  'beginner',
  'standard',
  'exam-ready',
  'technical'
];
const subjectIds: readonly SubjectId[] = [
  'dsa-1',
  'dsa-2',
  'dbms',
  'operating-systems',
  'computer-networks'
];
const activityTypes: readonly Activity['type'][] = ['completion'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function uniqueStrings(value: unknown, limit = 500): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (item): item is string => typeof item === 'string' && item.length > 0 && item.length <= 200
      )
    )
  ].slice(0, limit);
}

function numberRecord(value: unknown, maximum: number): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, number] =>
          entry[0].length > 0 &&
          entry[0].length <= 200 &&
          typeof entry[1] === 'number' &&
          Number.isFinite(entry[1])
      )
      .slice(0, 500)
      .map(([key, count]) => [key, Math.min(maximum, Math.max(0, Math.floor(count)))])
  );
}

function activities(value: unknown): Activity[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .flatMap((item) => {
      if (
        typeof item.lessonId !== 'string' ||
        item.lessonId.length === 0 ||
        item.lessonId.length > 200 ||
        typeof item.at !== 'string' ||
        !activityTypes.includes(item.type as Activity['type'])
      ) {
        return [];
      }
      return [
        {
          type: item.type as Activity['type'],
          lessonId: item.lessonId,
          xp: boundedInteger(item.xp, 0, 0, 1_000_000),
          at: item.at
        }
      ];
    })
    .slice(0, 20);
}

export function createEmptyProgress(): Progress {
  return {
    version: 4,
    onboardingComplete: false,
    learnerLevel: 'beginner',
    primaryGoal: 'foundation',
    preferredLanguage: 'cpp',
    explanationLanguage: 'en',
    explanationLevel: 'standard',
    subjectsOfInterest: ['dsa-1'],
    dailyGoalMinutes: 15,
    xp: 0,
    completed: [],
    lessonMastery: {},
    recentActivity: [],
    languageUsage: {},
    badges: []
  };
}

function activity(progress: Progress, item: Activity): Activity[] {
  return [item, ...progress.recentActivity].slice(0, 20);
}

export function sanitizeProgress(value: unknown): Progress {
  const empty = createEmptyProgress();
  if (!isRecord(value) || ![1, 2, 3, 4].includes(value.version as number)) return empty;

  const storedSubjects = uniqueStrings(value.subjectsOfInterest).filter(
    (subject): subject is SubjectId => subjectIds.includes(subject as SubjectId)
  );
  const storedLanguageUsage = numberRecord(value.languageUsage, 1_000_000);
  const languageUsage = Object.fromEntries(
    languages.flatMap((language) =>
      typeof storedLanguageUsage[language] === 'number'
        ? [[language, storedLanguageUsage[language]]]
        : []
    )
  ) as Partial<Record<SupportedLanguage, number>>;
  const storedBadge =
    typeof value.badge === 'string' && value.badge.length <= 100 ? value.badge : undefined;
  return {
    version: 4,
    onboardingComplete:
      typeof value.onboardingComplete === 'boolean'
        ? value.onboardingComplete
        : empty.onboardingComplete,
    learnerLevel: oneOf(value.learnerLevel, learnerLevels, empty.learnerLevel),
    primaryGoal: oneOf(value.primaryGoal, learningGoals, empty.primaryGoal),
    preferredLanguage: oneOf(value.preferredLanguage, languages, empty.preferredLanguage),
    explanationLanguage: oneOf(
      value.explanationLanguage,
      explanationLanguages,
      empty.explanationLanguage
    ),
    explanationLevel: oneOf(value.explanationLevel, explanationLevels, empty.explanationLevel),
    subjectsOfInterest: storedSubjects.length ? storedSubjects : empty.subjectsOfInterest,
    dailyGoalMinutes: boundedInteger(value.dailyGoalMinutes, empty.dailyGoalMinutes, 5, 45),
    xp: boundedInteger(value.xp, empty.xp, 0, 1_000_000_000),
    completed: uniqueStrings(value.completed),
    lessonMastery: numberRecord(value.lessonMastery, 100),
    recentActivity: activities(value.recentActivity),
    languageUsage,
    badges: uniqueStrings(value.badges, 100),
    ...(storedBadge ? { badge: storedBadge } : {})
  };
}

export function readProgressFromStorage(storage: Pick<ProgressStorage, 'getItem'>): Progress {
  try {
    return sanitizeProgress(JSON.parse(storage.getItem('replaycs-progress') ?? 'null'));
  } catch {
    return createEmptyProgress();
  }
}

export function writeProgressToStorage(
  storage: Pick<ProgressStorage, 'setItem'>,
  value: Progress
): boolean {
  try {
    storage.setItem('replaycs-progress', JSON.stringify(sanitizeProgress(value)));
    return true;
  } catch {
    return false;
  }
}

export function loadProgress(): Progress {
  return browser ? readProgressFromStorage(localStorage) : createEmptyProgress();
}

export function saveProgress(value: Progress): boolean {
  return browser ? writeProgressToStorage(localStorage, value) : false;
}

export function configureProfile(progress: Progress, preferences: OnboardingPreferences) {
  const configured = { ...progress, ...preferences, onboardingComplete: true };
  return (configured.languageUsage[preferences.preferredLanguage] ?? 0) > 0
    ? configured
    : recordLanguageUse(configured, preferences.preferredLanguage);
}

export function lessonMasteryScore(progress: Progress, id: string) {
  return progress.completed.includes(id) ? 50 : 0;
}

function syncLessonMastery(progress: Progress, id: string) {
  const score = lessonMasteryScore(progress, id);
  if (progress.lessonMastery[id] === score) return progress;
  return {
    ...progress,
    lessonMastery: {
      ...progress.lessonMastery,
      [id]: score
    }
  };
}

export function recordLanguageUse(progress: Progress, language: SupportedLanguage) {
  return {
    ...progress,
    languageUsage: {
      ...progress.languageUsage,
      [language]: Math.min(1_000_000, (progress.languageUsage[language] ?? 0) + 1)
    }
  };
}

export function completeLesson(progress: Progress, id: string, xp = 25) {
  if (progress.completed.includes(id)) return syncLessonMastery(progress, id);
  const next = {
    ...progress,
    xp: progress.xp + xp,
    completed: [...progress.completed, id],
    recentActivity: activity(progress, {
      type: 'completion',
      lessonId: id,
      xp,
      at: new Date().toISOString()
    })
  };
  return syncLessonMastery(next, id);
}

export function levelFromXp(xp: number) {
  return Math.floor(xp / 100) + 1;
}

import { browser } from '$app/environment';
import type { SubjectId, SupportedLanguage } from '$lib/trace/types';
import type { MisconceptionTag } from './misconceptions';

export type LearnerLevel = 'beginner' | 'intermediate' | 'advanced';
export type LearningGoal = 'foundation' | 'exam' | 'interview' | 'curiosity';
export type ExplanationLevel = 'beginner' | 'standard' | 'exam-ready' | 'technical';

export interface Activity {
  type: 'prediction' | 'recovery' | 'completion';
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
  version: 3;
  onboardingComplete: boolean;
  explanationLevel: ExplanationLevel;
  xp: number;
  streak: number;
  hearts: number;
  completed: string[];
  awardedPredictions: string[];
  misconceptionCounts: Partial<Record<MisconceptionTag, number>>;
  mistakeEvidence: string[];
  recoveredMistakes: string[];
  lessonMastery: Record<string, number>;
  predictionAttempts: number;
  correctPredictions: number;
  firstAttemptCorrect: number;
  hintsUsed: number;
  hintEvidence: string[];
  recentActivity: Activity[];
  languageUsage: Partial<Record<SupportedLanguage, number>>;
  badges: string[];
  completedBossChallenges: string[];
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
const activityTypes: readonly Activity['type'][] = ['prediction', 'recovery', 'completion'];

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
    version: 3,
    onboardingComplete: false,
    learnerLevel: 'beginner',
    primaryGoal: 'foundation',
    preferredLanguage: 'cpp',
    explanationLanguage: 'en',
    explanationLevel: 'standard',
    subjectsOfInterest: ['dsa-1'],
    dailyGoalMinutes: 15,
    xp: 0,
    streak: 0,
    hearts: 3,
    completed: [],
    awardedPredictions: [],
    misconceptionCounts: {},
    mistakeEvidence: [],
    recoveredMistakes: [],
    lessonMastery: {},
    predictionAttempts: 0,
    correctPredictions: 0,
    firstAttemptCorrect: 0,
    hintsUsed: 0,
    hintEvidence: [],
    recentActivity: [],
    languageUsage: {},
    badges: [],
    completedBossChallenges: []
  };
}

function activity(progress: Progress, item: Activity): Activity[] {
  return [item, ...progress.recentActivity].slice(0, 20);
}

export function sanitizeProgress(value: unknown): Progress {
  const empty = createEmptyProgress();
  if (!isRecord(value) || ![1, 2, 3].includes(value.version as number)) return empty;

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
  const predictionAttempts = boundedInteger(
    value.predictionAttempts,
    empty.predictionAttempts,
    0,
    1_000_000_000
  );
  const correctPredictions = Math.min(
    predictionAttempts,
    boundedInteger(value.correctPredictions, empty.correctPredictions, 0, 1_000_000_000)
  );
  const firstAttemptCorrect = Math.min(
    correctPredictions,
    boundedInteger(value.firstAttemptCorrect, empty.firstAttemptCorrect, 0, 1_000_000_000)
  );

  return {
    version: 3,
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
    streak: boundedInteger(value.streak, empty.streak, 0, 1_000_000),
    hearts: boundedInteger(value.hearts, empty.hearts, 0, 3),
    completed: uniqueStrings(value.completed),
    awardedPredictions: uniqueStrings(value.awardedPredictions),
    misconceptionCounts: numberRecord(value.misconceptionCounts, 1_000_000),
    mistakeEvidence: uniqueStrings(value.mistakeEvidence),
    recoveredMistakes: uniqueStrings(value.recoveredMistakes),
    lessonMastery: numberRecord(value.lessonMastery, 100),
    predictionAttempts,
    correctPredictions,
    firstAttemptCorrect,
    hintsUsed: boundedInteger(value.hintsUsed, empty.hintsUsed, 0, 1_000_000_000),
    hintEvidence: uniqueStrings(value.hintEvidence),
    recentActivity: activities(value.recentActivity),
    languageUsage,
    badges: uniqueStrings(value.badges, 100),
    completedBossChallenges: uniqueStrings(value.completedBossChallenges),
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

function evidenceBelongsToLesson(evidenceId: string, lessonId: string) {
  return evidenceId === lessonId || evidenceId.startsWith(`${lessonId}:`);
}

function lessonIdFromEvidence(evidenceId: string) {
  return evidenceId.split(':', 1)[0];
}

/**
 * Lesson mastery is derived from visible learner evidence rather than an opaque average:
 * 50 points for completing the trace, 30 for a correct prediction or recovery, and
 * 20 for either a first-try answer without a hint or fully recovering every recorded mistake.
 */
export function lessonMasteryScore(progress: Progress, id: string) {
  if (progress.completedBossChallenges.includes(id)) return 100;

  const completed = progress.completed.includes(id);
  const correctPredictions = progress.awardedPredictions.filter((evidenceId) =>
    evidenceBelongsToLesson(evidenceId, id)
  );
  const mistakes = progress.mistakeEvidence.filter((evidenceId) =>
    evidenceBelongsToLesson(evidenceId, id)
  );
  const recoveredMistakes = new Set(
    progress.recoveredMistakes.filter((evidenceId) => evidenceBelongsToLesson(evidenceId, id))
  );
  const demonstrated = correctPredictions.length > 0 || recoveredMistakes.size > 0;
  const unresolvedMistake = mistakes.some((evidenceId) => !recoveredMistakes.has(evidenceId));
  const firstTryWithoutHint =
    correctPredictions.some((evidenceId) => !progress.mistakeEvidence.includes(evidenceId)) &&
    !progress.hintEvidence.includes(id) &&
    !unresolvedMistake;
  const fullyRecovered =
    mistakes.length > 0 && mistakes.every((evidenceId) => recoveredMistakes.has(evidenceId));

  return (
    (completed ? 50 : 0) +
    (demonstrated ? 30 : 0) +
    (demonstrated && (firstTryWithoutHint || fullyRecovered) ? 20 : 0)
  );
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

export function recordHint(progress: Progress, canonicalLessonId: string) {
  const next = {
    ...progress,
    hintsUsed: Math.min(1_000_000_000, progress.hintsUsed + 1),
    hintEvidence: progress.hintEvidence.includes(canonicalLessonId)
      ? progress.hintEvidence
      : [...progress.hintEvidence, canonicalLessonId]
  };
  return syncLessonMastery(next, canonicalLessonId);
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

export function awardPrediction(progress: Progress, id: string, xp: number) {
  if (progress.awardedPredictions.includes(id)) return progress;
  const firstBadge = progress.xp + xp >= 10 ? 'First Prediction' : undefined;
  const next = {
    ...progress,
    xp: progress.xp + xp,
    streak: progress.streak + 1,
    predictionAttempts: progress.predictionAttempts + 1,
    correctPredictions: progress.correctPredictions + 1,
    firstAttemptCorrect:
      progress.firstAttemptCorrect + (progress.mistakeEvidence.includes(id) ? 0 : 1),
    awardedPredictions: [...progress.awardedPredictions, id],
    badges:
      firstBadge && !progress.badges.includes(firstBadge)
        ? [...progress.badges, firstBadge]
        : progress.badges,
    badge: firstBadge ?? progress.badge,
    recentActivity: activity(progress, {
      type: 'prediction',
      lessonId: id,
      xp,
      at: new Date().toISOString()
    })
  };
  return syncLessonMastery(next, lessonIdFromEvidence(id));
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

export function completeBossChallenge(progress: Progress, id: string, xp: number) {
  if (progress.completedBossChallenges.includes(id)) return progress;
  const completedBossChallenges = [...progress.completedBossChallenges, id];
  const badge = completedBossChallenges.length === 5 ? 'Arena Champion' : 'Boss Tracer';
  return {
    ...progress,
    xp: progress.xp + xp,
    streak: progress.streak + 1,
    completedBossChallenges,
    lessonMastery: {
      ...progress.lessonMastery,
      [id]: 100
    },
    badges: progress.badges.includes(badge) ? progress.badges : [...progress.badges, badge],
    badge,
    recentActivity: activity(progress, {
      type: 'completion',
      lessonId: id,
      xp,
      at: new Date().toISOString()
    })
  };
}

export function recordMisconception(progress: Progress, evidenceId: string, tag: MisconceptionTag) {
  if (progress.mistakeEvidence.includes(evidenceId)) return progress;
  const next = {
    ...progress,
    streak: 0,
    hearts: Math.max(0, progress.hearts - 1),
    predictionAttempts: progress.predictionAttempts + 1,
    misconceptionCounts: {
      ...progress.misconceptionCounts,
      [tag]: (progress.misconceptionCounts[tag] ?? 0) + 1
    },
    mistakeEvidence: [...progress.mistakeEvidence, evidenceId]
  };
  return syncLessonMastery(next, lessonIdFromEvidence(evidenceId));
}

export function awardRecovery(progress: Progress, evidenceId: string) {
  if (progress.recoveredMistakes.includes(evidenceId)) return progress;
  const badge = 'State Detective';
  const next = {
    ...progress,
    xp: progress.xp + 6,
    recoveredMistakes: [...progress.recoveredMistakes, evidenceId],
    badges: progress.badges.includes(badge) ? progress.badges : [...progress.badges, badge],
    badge,
    recentActivity: activity(progress, {
      type: 'recovery',
      lessonId: evidenceId.split(':')[0],
      xp: 6,
      at: new Date().toISOString()
    })
  };
  return syncLessonMastery(next, lessonIdFromEvidence(evidenceId));
}

export function levelFromXp(xp: number) {
  return Math.floor(xp / 100) + 1;
}

export function accuracy(progress: Progress) {
  return progress.predictionAttempts
    ? Math.round((progress.correctPredictions / progress.predictionAttempts) * 100)
    : 0;
}

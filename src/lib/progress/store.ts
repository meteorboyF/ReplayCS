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
  recentActivity: Activity[];
  languageUsage: Partial<Record<SupportedLanguage, number>>;
  badges: string[];
  completedBossChallenges: string[];
  badge?: string;
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
    recentActivity: [],
    languageUsage: {},
    badges: [],
    completedBossChallenges: []
  };
}

function activity(progress: Progress, item: Activity): Activity[] {
  return [item, ...progress.recentActivity].slice(0, 20);
}

export function loadProgress(): Progress {
  const empty = createEmptyProgress();
  if (!browser) return empty;
  try {
    const value = JSON.parse(localStorage.getItem('replaycs-progress') ?? 'null') as
      (Partial<Omit<Progress, 'version'>> & { version?: number }) | null;
    if (value?.version === 1 || value?.version === 2 || value?.version === 3) {
      const { version: _storedVersion, ...storedProgress } = value;
      return { ...empty, ...storedProgress, version: 3 };
    }
    return empty;
  } catch {
    return empty;
  }
}

export function saveProgress(value: Progress) {
  if (browser) localStorage.setItem('replaycs-progress', JSON.stringify(value));
}

export function configureProfile(progress: Progress, preferences: OnboardingPreferences) {
  return { ...progress, ...preferences, onboardingComplete: true };
}

export function awardPrediction(progress: Progress, id: string, xp: number) {
  if (progress.awardedPredictions.includes(id)) return progress;
  const firstBadge = progress.xp + xp >= 10 ? 'First Prediction' : undefined;
  return {
    ...progress,
    xp: progress.xp + xp,
    streak: progress.streak + 1,
    predictionAttempts: progress.predictionAttempts + 1,
    correctPredictions: progress.correctPredictions + 1,
    firstAttemptCorrect: progress.firstAttemptCorrect + 1,
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
}

export function completeLesson(progress: Progress, id: string) {
  if (progress.completed.includes(id)) return progress;
  return {
    ...progress,
    xp: progress.xp + 25,
    completed: [...progress.completed, id],
    lessonMastery: {
      ...progress.lessonMastery,
      [id]: Math.max(progress.lessonMastery[id] ?? 0, 75)
    },
    recentActivity: activity(progress, {
      type: 'completion',
      lessonId: id,
      xp: 25,
      at: new Date().toISOString()
    })
  };
}

export function recordMisconception(progress: Progress, evidenceId: string, tag: MisconceptionTag) {
  if (progress.mistakeEvidence.includes(evidenceId)) return progress;
  return {
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
}

export function awardRecovery(progress: Progress, evidenceId: string) {
  if (progress.recoveredMistakes.includes(evidenceId)) return progress;
  const badge = 'State Detective';
  return {
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
}

export function levelFromXp(xp: number) {
  return Math.floor(xp / 100) + 1;
}

export function accuracy(progress: Progress) {
  return progress.predictionAttempts
    ? Math.round((progress.correctPredictions / progress.predictionAttempts) * 100)
    : 0;
}

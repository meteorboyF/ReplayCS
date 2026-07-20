import { describe, expect, it } from 'vitest';
import {
  awardPrediction,
  awardRecovery,
  completeBossChallenge,
  completeLesson,
  configureProfile,
  createEmptyProgress,
  lessonMasteryScore,
  levelFromXp,
  readProgressFromStorage,
  recordHint,
  recordLanguageUse,
  recordMisconception,
  accuracy,
  sanitizeProgress,
  writeProgressToStorage
} from './store';

const base = createEmptyProgress();

describe('progress', () => {
  it('prevents XP farming', () => {
    const once = awardPrediction(base, 'p', 10);
    expect(awardPrediction(once, 'p', 10).xp).toBe(10);
  });
  it('does not count a correct retry as first-attempt evidence', () => {
    const mistaken = recordMisconception(base, 'binary-search:next-mid', 'index-vs-value');
    const corrected = awardPrediction(mistaken, 'binary-search:next-mid', 10);

    expect(corrected).toMatchObject({
      predictionAttempts: 2,
      correctPredictions: 1,
      firstAttemptCorrect: 0
    });
  });
  it('awards completion once', () => {
    const once = completeLesson(base, 'lesson');
    expect(completeLesson(once, 'lesson').xp).toBe(25);
  });
  it('derives transparent 50, 80, and 100 mastery paths from evidence', () => {
    const completionOnly = completeLesson(base, 'binary-search');
    const hintedPrediction = completeLesson(
      awardPrediction(recordHint(base, 'sorting-arena'), 'sorting-arena:first-prediction', 10),
      'sorting-arena'
    );
    const firstTry = completeLesson(
      awardPrediction(base, 'cpu-scheduling:first-dispatch', 10),
      'cpu-scheduling'
    );

    expect(lessonMasteryScore(completionOnly, 'binary-search')).toBe(50);
    expect(lessonMasteryScore(hintedPrediction, 'sorting-arena')).toBe(80);
    expect(lessonMasteryScore(firstTry, 'cpu-scheduling')).toBe(100);
    expect(completionOnly.lessonMastery['binary-search']).toBe(50);
    expect(hintedPrediction.lessonMastery['sorting-arena']).toBe(80);
    expect(firstTry.lessonMastery['cpu-scheduling']).toBe(100);
  });
  it('awards full mastery for a fully recovered mistake but not an unresolved one', () => {
    const mistaken = recordMisconception(base, 'query-pipeline:where-vs-having', 'where-vs-having');
    const unresolved = completeLesson(mistaken, 'query-pipeline');
    const recovered = completeLesson(
      awardRecovery(mistaken, 'query-pipeline:where-vs-having'),
      'query-pipeline'
    );

    expect(lessonMasteryScore(unresolved, 'query-pipeline')).toBe(50);
    expect(lessonMasteryScore(recovered, 'query-pipeline')).toBe(100);
  });
  it('can upgrade mastery on recompletion without duplicate XP or activity', () => {
    const completed = completeLesson(base, 'graph-explorer');
    const laterEvidence = {
      ...completed,
      awardedPredictions: ['graph-explorer:frontier-prediction']
    };
    const recompleted = completeLesson(laterEvidence, 'graph-explorer');

    expect(recompleted.xp).toBe(25);
    expect(recompleted.recentActivity).toHaveLength(1);
    expect(recompleted.lessonMastery['graph-explorer']).toBe(100);
  });
  it('persists boss completion and awards its XP only once', () => {
    const once = completeBossChallenge(base, 'binary-bound-boss', 30);
    const replayed = completeBossChallenge(once, 'binary-bound-boss', 30);

    expect(once.completedBossChallenges).toEqual(['binary-bound-boss']);
    expect(once.lessonMastery['binary-bound-boss']).toBe(100);
    expect(once.badges).toContain('Boss Tracer');
    expect(replayed.xp).toBe(30);
    expect(replayed.completedBossChallenges).toHaveLength(1);
  });
  it('unlocks the arena badge after five unique boss challenges', () => {
    const completed = ['one', 'two', 'three', 'four', 'five'].reduce(
      (progress, id) => completeBossChallenge(progress, id, 30),
      base
    );

    expect(completed.xp).toBe(150);
    expect(completed.badges).toContain('Arena Champion');
  });
  it('records misconception evidence once and resets the streak', () => {
    const once = recordMisconception({ ...base, streak: 3 }, 'mid-1', 'index-vs-value');
    const twice = recordMisconception(once, 'mid-1', 'index-vs-value');
    expect(twice.misconceptionCounts['index-vs-value']).toBe(1);
    expect(twice.streak).toBe(0);
  });
  it('awards a recovery challenge once', () => {
    const once = awardRecovery(base, 'mid-1');
    expect(awardRecovery(once, 'mid-1').xp).toBe(6);
  });
  it('calculates transparent levels and accuracy', () => {
    expect(levelFromXp(240)).toBe(3);
    expect(accuracy({ ...base, predictionAttempts: 4, correctPredictions: 3 })).toBe(75);
  });
  it('records every hint use while remembering affected lessons once', () => {
    const twice = recordHint(recordHint(base, 'binary-search'), 'binary-search');

    expect(twice.hintsUsed).toBe(2);
    expect(twice.hintEvidence).toEqual(['binary-search']);
  });
  it('counts deterministic language use and registers a preferred language once', () => {
    const used = recordLanguageUse(recordLanguageUse(base, 'python'), 'python');
    const preferences = {
      learnerLevel: 'beginner' as const,
      primaryGoal: 'foundation' as const,
      preferredLanguage: 'python' as const,
      explanationLanguage: 'en' as const,
      subjectsOfInterest: ['dsa-1' as const],
      dailyGoalMinutes: 15
    };
    const configured = configureProfile(base, preferences);
    const configuredAgain = configureProfile(configured, preferences);

    expect(used.languageUsage).toEqual({ python: 2 });
    expect(configured.languageUsage).toEqual({ python: 1 });
    expect(configuredAgain.languageUsage).toEqual({ python: 1 });
  });
  it.each([1, 2, 3])(
    'migrates version %s data and safely defaults new boss progress',
    (version) => {
      const migrated = sanitizeProgress({
        version,
        xp: 42,
        completed: ['binary-search'],
        completedBossChallenges:
          version === 3 ? ['binary-bound-boss', 42, 'binary-bound-boss'] : null
      });

      expect(migrated).toMatchObject({ version: 3, xp: 42, completed: ['binary-search'] });
      expect(migrated.completedBossChallenges).toEqual(version === 3 ? ['binary-bound-boss'] : []);
      expect(migrated.hintEvidence).toEqual([]);
    }
  );
  it('defaults malformed collections and clamps unsafe numeric state', () => {
    const sanitized = sanitizeProgress({
      version: 3,
      hearts: 99,
      xp: -20,
      dailyGoalMinutes: Number.NaN,
      misconceptionCounts: null,
      badges: null,
      lessonMastery: { safe: 130, negative: -4, broken: 'lots' },
      predictionAttempts: 2,
      correctPredictions: 12,
      firstAttemptCorrect: 8,
      hintsUsed: 4.9,
      hintEvidence: ['binary-search', 'binary-search', 12, '', 'x'.repeat(201)],
      languageUsage: { cpp: 3.9, rust: 10, python: -2 },
      recentActivity: [{ type: 'completion', lessonId: 'boss', xp: 30, at: 'now' }, null]
    });

    expect(sanitized.hearts).toBe(3);
    expect(sanitized.xp).toBe(0);
    expect(sanitized.dailyGoalMinutes).toBe(15);
    expect(sanitized.misconceptionCounts).toEqual({});
    expect(sanitized.badges).toEqual([]);
    expect(sanitized.lessonMastery).toEqual({ safe: 100, negative: 0 });
    expect(sanitized.correctPredictions).toBe(2);
    expect(sanitized.firstAttemptCorrect).toBe(2);
    expect(sanitized.hintsUsed).toBe(4);
    expect(sanitized.hintEvidence).toEqual(['binary-search']);
    expect(sanitized.languageUsage).toEqual({ cpp: 3, python: 0 });
    expect(accuracy(sanitized)).toBe(100);
    expect(sanitized.recentActivity).toHaveLength(1);
  });
  it('recovers from malformed JSON and blocked browser storage', () => {
    expect(readProgressFromStorage({ getItem: () => '{broken' })).toEqual(base);
    expect(
      readProgressFromStorage({
        getItem: () => {
          throw new Error('storage blocked');
        }
      })
    ).toEqual(base);
    expect(
      readProgressFromStorage({
        getItem: () => JSON.stringify({ version: 3, hearts: 99, misconceptionCounts: null })
      }).hearts
    ).toBe(3);
    expect(
      writeProgressToStorage(
        {
          setItem: () => {
            throw new Error('storage blocked');
          }
        },
        base
      )
    ).toBe(false);
  });
});

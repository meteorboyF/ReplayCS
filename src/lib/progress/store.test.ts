import { describe, expect, it } from 'vitest';
import {
  awardPrediction,
  awardRecovery,
  completeBossChallenge,
  completeLesson,
  createEmptyProgress,
  levelFromXp,
  readProgressFromStorage,
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
  it('awards completion once', () => {
    const once = completeLesson(base, 'lesson');
    expect(completeLesson(once, 'lesson').xp).toBe(25);
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

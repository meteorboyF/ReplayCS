import { describe, expect, it } from 'vitest';
import {
  completeLesson,
  configureProfile,
  createEmptyProgress,
  lessonMasteryScore,
  levelFromXp,
  readProgressFromStorage,
  recordLanguageUse,
  sanitizeProgress,
  writeProgressToStorage
} from './store';

const base = createEmptyProgress();

describe('progress', () => {
  it('awards completion once and derives completion-only mastery', () => {
    const once = completeLesson(base, 'binary-search');
    const twice = completeLesson(once, 'binary-search');
    expect(once.xp).toBe(25);
    expect(twice.xp).toBe(25);
    expect(lessonMasteryScore(once, 'binary-search')).toBe(50);
    expect(once.lessonMastery['binary-search']).toBe(50);
    expect(once.recentActivity).toHaveLength(1);
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

  it.each([1, 2, 3, 4])('migrates version %s and ignores obsolete prediction fields', (version) => {
    const migrated = sanitizeProgress({
      version,
      xp: 42,
      completed: ['binary-search'],
      hearts: 2,
      streak: 4,
      predictionAttempts: 9,
      misconceptionCounts: { 'index-vs-value': 2 },
      completedBossChallenges: ['old-boss'],
      recentActivity: [
        { type: 'prediction', lessonId: 'old', xp: 10, at: 'then' },
        { type: 'completion', lessonId: 'binary-search', xp: 25, at: 'now' }
      ]
    });

    expect(migrated).toMatchObject({ version: 4, xp: 42, completed: ['binary-search'] });
    expect(migrated.recentActivity).toEqual([
      { type: 'completion', lessonId: 'binary-search', xp: 25, at: 'now' }
    ]);
    expect(migrated).not.toHaveProperty('hearts');
    expect(migrated).not.toHaveProperty('predictionAttempts');
    expect(migrated).not.toHaveProperty('completedBossChallenges');
  });

  it('clamps malformed numeric and collection state', () => {
    const sanitized = sanitizeProgress({
      version: 4,
      xp: -20,
      dailyGoalMinutes: Number.NaN,
      badges: null,
      lessonMastery: { safe: 130, negative: -4, broken: 'lots' },
      languageUsage: { cpp: 3.9, rust: 10, python: -2 },
      recentActivity: [{ type: 'completion', lessonId: 'lesson', xp: 25, at: 'now' }]
    });
    expect(sanitized.xp).toBe(0);
    expect(sanitized.dailyGoalMinutes).toBe(15);
    expect(sanitized.badges).toEqual([]);
    expect(sanitized.lessonMastery).toEqual({ safe: 100, negative: 0 });
    expect(sanitized.languageUsage).toEqual({ cpp: 3, python: 0 });
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

  it('calculates transparent levels', () => {
    expect(levelFromXp(240)).toBe(3);
  });
});

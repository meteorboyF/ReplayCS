import { describe, expect, it } from 'vitest';
import {
  awardPrediction,
  awardRecovery,
  completeLesson,
  recordMisconception,
  type Progress
} from './store';

const base: Progress = {
  version: 2,
  xp: 0,
  streak: 0,
  completed: [],
  awardedPredictions: [],
  misconceptionCounts: {},
  mistakeEvidence: [],
  recoveredMistakes: []
};

describe('progress', () => {
  it('prevents XP farming', () => {
    const once = awardPrediction(base, 'p', 10);
    expect(awardPrediction(once, 'p', 10).xp).toBe(10);
  });
  it('awards completion once', () => {
    const once = completeLesson(base, 'lesson');
    expect(completeLesson(once, 'lesson').xp).toBe(25);
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
});

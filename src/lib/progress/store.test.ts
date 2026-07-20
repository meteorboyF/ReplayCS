import { describe, expect, it } from 'vitest';
import { awardPrediction, completeLesson, type Progress } from './store';
const base: Progress = { version: 1, xp: 0, streak: 0, completed: [], awardedPredictions: [] };
describe('progress', () => {
  it('prevents XP farming', () => {
    const once = awardPrediction(base, 'p', 10);
    expect(awardPrediction(once, 'p', 10).xp).toBe(10);
  });
  it('awards completion once', () => {
    const once = completeLesson(base, 'lesson');
    expect(completeLesson(once, 'lesson').xp).toBe(25);
  });
});

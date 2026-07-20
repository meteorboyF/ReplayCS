import { describe, expect, it } from 'vitest';
import { createEmptyProgress } from './store';
import { recommendNext } from './recommendations';

describe('adaptive recommendations', () => {
  it('starts new learners with binary search', () => {
    expect(recommendNext(createEmptyProgress()).title).toBe('Binary Search');
  });
  it('prioritizes evidence-backed recovery', () => {
    const profile = createEmptyProgress();
    profile.misconceptionCounts['index-vs-value'] = 2;
    expect(recommendNext(profile).label).toBe('Recovery');
  });
  it('moves completed learners across subjects', () => {
    expect(
      recommendNext({ ...createEmptyProgress(), completed: ['binary-search'] }).href
    ).toContain('dbms');
  });
});

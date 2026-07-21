import { describe, expect, it } from 'vitest';
import { createEmptyProgress } from './store';
import { recommendNext, recommendationSequence } from './recommendations';

describe('adaptive recommendations', () => {
  it('starts new learners with binary search', () => {
    expect(recommendNext(createEmptyProgress()).title).toBe('Binary Search');
  });

  it('starts with an onboarding subject interest when one is available', () => {
    const profile = {
      ...createEmptyProgress(),
      onboardingComplete: true,
      subjectsOfInterest: ['computer-networks' as const]
    };
    expect(recommendNext(profile)).toMatchObject({
      title: 'Packet Journey',
      href: '/lesson/computer-networks/packet-journey'
    });
  });

  it('preserves interest order before falling through the canonical live sequence', () => {
    const profile = {
      ...createEmptyProgress(),
      onboardingComplete: true,
      subjectsOfInterest: ['dbms' as const, 'dsa-2' as const],
      completed: ['query-pipeline']
    };
    expect(recommendNext(profile).title).toBe('Graph Explorer');
    expect(recommendationSequence(profile).map((lesson) => lesson.completionId)).toEqual([
      'query-pipeline',
      'graph-explorer',
      'binary-search',
      'sorting-arena',
      'linked-list-lab',
      'array-lab',
      'stack-lab',
      'queue-lab',
      'deque-lab',
      'hash-table-lab',
      'search-lab',
      'bst-lab',
      'strings-lab',
      'cpu-scheduling',
      'packet-journey'
    ]);
  });

  it('moves completed learners through every incomplete live lesson', () => {
    expect(
      recommendNext({
        ...createEmptyProgress(),
        completed: [
          'binary-search',
          'sorting-arena',
          'linked-list-lab',
          'array-lab',
          'stack-lab',
          'queue-lab',
          'deque-lab',
          'hash-table-lab',
          'search-lab',
          'bst-lab',
          'strings-lab',
          'graph-explorer'
        ]
      }).href
    ).toBe('/lesson/dbms/query-pipeline');
  });

  it('recommends the Linked List Lab after the earlier DSA I lessons', () => {
    expect(
      recommendNext({
        ...createEmptyProgress(),
        completed: ['binary-search', 'sorting-arena']
      })
    ).toMatchObject({
      title: 'Linked List Lab',
      href: '/lesson/dsa-1/linked-list'
    });
  });

  it('offers an interest-aligned mastery replay after all live lessons are complete', () => {
    const profile = {
      ...createEmptyProgress(),
      onboardingComplete: true,
      subjectsOfInterest: ['operating-systems' as const],
      completed: recommendationSequence(createEmptyProgress()).map((lesson) => lesson.completionId)
    };
    expect(recommendNext(profile)).toMatchObject({
      title: 'CPU Scheduling Arena Replay',
      label: 'Mastery replay',
      href: '/lesson/operating-systems/cpu-scheduling'
    });
  });
});

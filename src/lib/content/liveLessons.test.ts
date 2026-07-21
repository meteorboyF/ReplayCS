import { describe, expect, it } from 'vitest';
import { createEmptyProgress } from '$lib/progress/store';
import { subjects } from './subjects';
import {
  LIVE_LESSONS,
  liveLessonsForSubject,
  remainingCompletionXp,
  subjectMastery
} from './liveLessons';

describe('live lesson registry', () => {
  it('contains every implemented lesson from the subject map exactly once', () => {
    const subjectRoutes = Object.entries(subjects).flatMap(([subject, metadata]) =>
      metadata.lessons
        .filter((lesson) => lesson.status === 'live')
        .map((lesson) => `${subject}/${lesson.slug}`)
    );
    const registryRoutes = LIVE_LESSONS.map((lesson) => `${lesson.subject}/${lesson.slug}`);
    expect(registryRoutes).toEqual(subjectRoutes);
    expect(new Set(registryRoutes).size).toBe(registryRoutes.length);
  });

  it('derives remaining completion XP from live metadata and completion state', () => {
    const progress = { ...createEmptyProgress(), completed: ['binary-search'] };
    expect(liveLessonsForSubject('dsa-1')).toHaveLength(12);
    expect(remainingCompletionXp(progress, 'dsa-1')).toBe(395);
  });

  it('registers the complete Hash Table Lab route, reward, and recovery evidence', () => {
    const hashTable = LIVE_LESSONS.find((lesson) => lesson.completionId === 'hash-table-lab');

    expect(hashTable).toMatchObject({
      subject: 'dsa-1',
      slug: 'hash-table',
      title: 'Hash Table Lab',
      href: '/lesson/dsa-1/hash-table',
      completionXp: 40,
      recovery: {
        title: 'Hash Table Lab Recovery',
        href: '/lesson/dsa-1/hash-table'
      }
    });
    expect(hashTable?.recovery.misconceptionTags).toEqual([
      'hash-vs-bucket',
      'tombstone-vs-empty',
      'rehash-scope',
      'amortized-vs-worst'
    ]);
  });

  it('registers the Stack, Queue, and Deque Labs with routes, rewards, and recovery evidence', () => {
    const expectations = [
      {
        completionId: 'stack-lab',
        slug: 'stack',
        title: 'Stack Lab',
        tags: [
          'peek-vs-pop',
          'underflow-vs-empty',
          'capacity-vs-size',
          'amortized-vs-worst',
          'pointer-update-order',
          'off-by-one'
        ]
      },
      {
        completionId: 'queue-lab',
        slug: 'queue',
        title: 'Queue Lab',
        tags: [
          'queue-front-rear',
          'queue-shift-cost',
          'rear-pointer',
          'underflow-vs-empty',
          'stack-vs-queue'
        ]
      },
      {
        completionId: 'deque-lab',
        slug: 'deque',
        title: 'Deque Lab',
        tags: ['deque-end-confusion', 'deque-overflow-underflow', 'peek-vs-pop']
      }
    ];
    for (const expected of expectations) {
      const lesson = LIVE_LESSONS.find(
        (candidate) => candidate.completionId === expected.completionId
      );
      expect(lesson, expected.completionId).toMatchObject({
        subject: 'dsa-1',
        slug: expected.slug,
        title: expected.title,
        href: `/lesson/dsa-1/${expected.slug}`,
        completionXp: 35
      });
      expect(lesson?.recovery.misconceptionTags, expected.completionId).toEqual(expected.tags);
    }
  });

  it('registers the complete Array Lab route, reward, and recovery evidence', () => {
    const arrayLab = LIVE_LESSONS.find((lesson) => lesson.completionId === 'array-lab');

    expect(arrayLab).toMatchObject({
      subject: 'dsa-1',
      slug: 'arrays',
      title: 'Array & Dynamic Array Lab',
      href: '/lesson/dsa-1/arrays',
      completionXp: 35,
      recovery: {
        title: 'Array Lab Recovery',
        href: '/lesson/dsa-1/arrays'
      }
    });
    expect(arrayLab?.recovery.misconceptionTags).toEqual([
      'index-vs-value',
      'off-by-one',
      'loop-boundary',
      'capacity-vs-size',
      'amortized-vs-worst'
    ]);
  });

  it('registers the complete Linked List Lab route, reward, and recovery evidence', () => {
    const linkedList = LIVE_LESSONS.find((lesson) => lesson.completionId === 'linked-list-lab');

    expect(linkedList).toMatchObject({
      subject: 'dsa-1',
      slug: 'linked-list',
      title: 'Linked List Lab',
      href: '/lesson/dsa-1/linked-list',
      completionXp: 35,
      recovery: {
        title: 'Linked List Lab Recovery',
        href: '/lesson/dsa-1/linked-list'
      }
    });
    expect(linkedList?.recovery.misconceptionTags).toEqual([
      'pointer-update-order',
      'head-update-timing',
      'lost-list',
      'tail-pointer-maintenance',
      'node-vs-value',
      'incorrect-predecessor',
      'recursive-base-case',
      'fast-vs-slow-pointer'
    ]);
    expect(
      subjects['dsa-1'].lessons.some((lesson) => String(lesson.slug) === 'linked-list-insertion')
    ).toBe(false);
  });

  it('averages recorded live-lesson mastery and clamps unsafe stored values', () => {
    const progress = {
      ...createEmptyProgress(),
      lessonMastery: {
        'binary-search': 80,
        'sorting-arena': 140,
        'linked-list-lab': 90,
        'array-lab': 90,
        'stack-lab': 90,
        'queue-lab': 90,
        'deque-lab': 90,
        'hash-table-lab': 90,
        'search-lab': 90,
        'bst-lab': 90,
        'strings-lab': 90,
        'recursion-lab': 90
      }
    };
    expect(subjectMastery(progress, 'dsa-1')).toBe(90);
  });

  it('uses the completion mastery floor for migrated completed lessons', () => {
    const progress = { ...createEmptyProgress(), completed: ['graph-explorer'] };
    expect(subjectMastery(progress, 'dsa-2')).toBe(50);
  });
});

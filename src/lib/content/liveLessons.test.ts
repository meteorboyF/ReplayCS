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
    expect(liveLessonsForSubject('dsa-1')).toHaveLength(2);
    expect(remainingCompletionXp(progress, 'dsa-1')).toBe(25);
  });

  it('averages recorded live-lesson mastery and clamps unsafe stored values', () => {
    const progress = {
      ...createEmptyProgress(),
      lessonMastery: { 'binary-search': 80, 'sorting-arena': 140 }
    };
    expect(subjectMastery(progress, 'dsa-1')).toBe(90);
  });

  it('uses the completion mastery floor for migrated completed lessons', () => {
    const progress = { ...createEmptyProgress(), completed: ['graph-explorer'] };
    expect(subjectMastery(progress, 'dsa-2')).toBe(50);
  });
});

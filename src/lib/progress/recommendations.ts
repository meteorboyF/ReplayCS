import type { Progress } from './store';
import { LIVE_LESSONS, type LiveLesson } from '$lib/content/liveLessons';
import type { SubjectId } from '$lib/trace/types';

export interface Recommendation {
  title: string;
  href: string;
  reason: string;
  label: string;
}

const subjectOrder = [...new Set(LIVE_LESSONS.map((lesson) => lesson.subject))];

function orderedLessons(progress: Progress): LiveLesson[] {
  const preferredSubjects = progress.onboardingComplete
    ? progress.subjectsOfInterest.filter(
        (subject, index, interests): subject is SubjectId =>
          subjectOrder.includes(subject) && interests.indexOf(subject) === index
      )
    : [];
  const orderedSubjects = [
    ...preferredSubjects,
    ...subjectOrder.filter((subject) => !preferredSubjects.includes(subject))
  ];
  return orderedSubjects.flatMap((subject) =>
    LIVE_LESSONS.filter((lesson) => lesson.subject === subject)
  );
}

function unresolvedMistakes(progress: Progress, lesson: LiveLesson): number {
  const prefix = `${lesson.completionId}:`;
  const evidence = progress.mistakeEvidence.filter((id) => id.startsWith(prefix));
  const exactRecoveries = new Set(progress.recoveredMistakes.filter((id) => evidence.includes(id)));
  const canonicalRecoveries = progress.recoveredMistakes.filter(
    (id) => id.startsWith(prefix) && !evidence.includes(id)
  ).length;
  return Math.max(0, evidence.length - exactRecoveries.size - canonicalRecoveries);
}

function hasLegacyMisconception(progress: Progress, lesson: LiveLesson): boolean {
  if (progress.completed.includes(lesson.completionId)) return false;
  if (progress.mistakeEvidence.some((id) => id.startsWith(`${lesson.completionId}:`))) {
    return false;
  }
  return lesson.recovery.misconceptionTags.some(
    (tag) => (progress.misconceptionCounts[tag] ?? 0) > 0
  );
}

export function recommendationSequence(progress: Progress): readonly LiveLesson[] {
  return orderedLessons(progress);
}

export function recommendNext(progress: Progress): Recommendation {
  const lessons = orderedLessons(progress);
  const recovery =
    lessons.find((lesson) => unresolvedMistakes(progress, lesson) > 0) ??
    lessons.find((lesson) => hasLegacyMisconception(progress, lesson));
  if (recovery) {
    return {
      title: recovery.recovery.title,
      href: recovery.recovery.href,
      reason: recovery.recovery.reason,
      label: 'Recovery'
    };
  }

  const nextLesson = lessons.find((lesson) => !progress.completed.includes(lesson.completionId));
  if (nextLesson) {
    return {
      title: nextLesson.title,
      href: nextLesson.href,
      reason: progress.onboardingComplete
        ? `Continue your path through ${subjectsLabel(nextLesson.subject)} with an unfinished live lesson.`
        : 'Build the prediction habit with a short, visual trace.',
      label: progress.completed.length ? 'Next live lesson' : 'Recommended start'
    };
  }

  const replay = lessons[0] ?? LIVE_LESSONS[0];
  return {
    title: `${replay.title} Replay`,
    href: replay.href,
    reason: 'Every live lesson is complete. Replay a preferred trace to strengthen mastery.',
    label: 'Mastery replay'
  };
}

function subjectsLabel(subject: SubjectId): string {
  switch (subject) {
    case 'dsa-1':
      return 'DSA I';
    case 'dsa-2':
      return 'DSA II';
    case 'dbms':
      return 'DBMS';
    case 'operating-systems':
      return 'Operating Systems';
    case 'computer-networks':
      return 'Computer Networks';
  }
}

import { subjects } from './subjects';
import type { MisconceptionTag } from '$lib/progress/misconceptions';
import type { Progress } from '$lib/progress/store';
import type { SubjectId } from '$lib/trace/types';

export interface LiveLesson {
  completionId: string;
  subject: SubjectId;
  slug: string;
  title: string;
  detail: string;
  href: string;
  completionXp: number;
  recovery: {
    title: string;
    href: string;
    reason: string;
    misconceptionTags: readonly MisconceptionTag[];
  };
}

type LiveLessonDefinition = Omit<LiveLesson, 'title' | 'detail' | 'href'>;

const definitions: readonly LiveLessonDefinition[] = [
  {
    completionId: 'binary-search',
    subject: 'dsa-1',
    slug: 'binary-search',
    completionXp: 25,
    recovery: {
      title: 'Binary Search Recovery',
      href: '/lesson/dsa-1/binary-search?step=2',
      reason: 'Practice index versus value reasoning at the midpoint checkpoint.',
      misconceptionTags: ['index-vs-value', 'off-by-one']
    }
  },
  {
    completionId: 'sorting-arena',
    subject: 'dsa-1',
    slug: 'sorting-arena',
    completionXp: 25,
    recovery: {
      title: 'Sorting Arena Recovery',
      href: '/lesson/dsa-1/sorting-arena',
      reason: 'Replay the first divergence between compared values, indices, and keys.',
      misconceptionTags: ['comparison-direction', 'index-vs-value', 'key-vs-index']
    }
  },
  {
    completionId: 'linked-list-lab',
    subject: 'dsa-1',
    slug: 'linked-list',
    completionXp: 35,
    recovery: {
      title: 'Linked List Lab Recovery',
      href: '/lesson/dsa-1/linked-list',
      reason: 'Replay the first pointer divergence before reconnecting or traversing the list.',
      misconceptionTags: [
        'pointer-update-order',
        'head-update-timing',
        'lost-list',
        'tail-pointer-maintenance',
        'node-vs-value',
        'incorrect-predecessor',
        'recursive-base-case',
        'fast-vs-slow-pointer'
      ]
    }
  },
  {
    completionId: 'graph-explorer',
    subject: 'dsa-2',
    slug: 'graph-explorer',
    completionXp: 25,
    recovery: {
      title: 'Graph Explorer Recovery',
      href: '/lesson/dsa-2/graph-explorer',
      reason: 'Rebuild the frontier and distinguish stack order from queue order.',
      misconceptionTags: ['stack-vs-queue', 'visited-marking-timing']
    }
  },
  {
    completionId: 'query-pipeline',
    subject: 'dbms',
    slug: 'query-pipeline',
    completionXp: 25,
    recovery: {
      title: 'SQL Query Pipeline Recovery',
      href: '/lesson/dbms/query-pipeline',
      reason: 'Trace where row filters end and aggregate-group filters begin.',
      misconceptionTags: ['join-condition', 'where-vs-having', 'grouping-before-filtering']
    }
  },
  {
    completionId: 'cpu-scheduling',
    subject: 'operating-systems',
    slug: 'cpu-scheduling',
    completionXp: 25,
    recovery: {
      title: 'CPU Scheduling Recovery',
      href: '/lesson/operating-systems/cpu-scheduling',
      reason: 'Replay the dispatch decision and apply the scheduler tie-break explicitly.',
      misconceptionTags: ['scheduler-tie-break', 'waiting-vs-turnaround']
    }
  },
  {
    completionId: 'packet-journey',
    subject: 'computer-networks',
    slug: 'packet-journey',
    completionXp: 25,
    recovery: {
      title: 'Packet Journey Recovery',
      href: '/lesson/computer-networks/packet-journey',
      reason: 'Replay the first hop and separate cached work, IP routing, and MAC delivery.',
      misconceptionTags: [
        'cache-vs-network',
        'ip-vs-mac',
        'network-vs-broadcast-address',
        'sequence-vs-acknowledgement'
      ]
    }
  }
];

function subjectLesson(definition: LiveLessonDefinition) {
  const lesson = subjects[definition.subject].lessons.find(
    (candidate) => candidate.slug === definition.slug
  );
  if (!lesson || lesson.status !== 'live') {
    throw new Error(
      `Live lesson registry entry ${definition.subject}/${definition.slug} must match subject metadata.`
    );
  }
  return lesson;
}

/**
 * The ordered, canonical set of lesson routes that are actually implemented.
 * Recommendations and progress summaries should use this registry rather than
 * inventing routes or rewards independently.
 */
export const LIVE_LESSONS: readonly LiveLesson[] = definitions.map((definition) => {
  const lesson = subjectLesson(definition);
  return {
    ...definition,
    title: lesson.title,
    detail: lesson.detail,
    href: `/lesson/${definition.subject}/${definition.slug}`
  };
});

export function liveLessonsForSubject(subject: SubjectId): readonly LiveLesson[] {
  return LIVE_LESSONS.filter((lesson) => lesson.subject === subject);
}

function masteryForLesson(progress: Progress, lesson: LiveLesson): number {
  const recorded = progress.lessonMastery[lesson.completionId];
  const value = Number.isFinite(recorded)
    ? recorded
    : progress.completed.includes(lesson.completionId)
      ? 50
      : 0;
  return Math.min(100, Math.max(0, value));
}

export function subjectMastery(progress: Progress, subject: SubjectId): number {
  const lessons = liveLessonsForSubject(subject);
  if (!lessons.length) return 0;
  return Math.round(
    lessons.reduce((total, lesson) => total + masteryForLesson(progress, lesson), 0) /
      lessons.length
  );
}

export function remainingCompletionXp(progress: Progress, subject: SubjectId): number {
  return liveLessonsForSubject(subject)
    .filter((lesson) => !progress.completed.includes(lesson.completionId))
    .reduce((total, lesson) => total + lesson.completionXp, 0);
}

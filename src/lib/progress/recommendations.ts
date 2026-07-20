import type { Progress } from './store';

export interface Recommendation {
  title: string;
  href: string;
  reason: string;
  label: string;
}

export function recommendNext(progress: Progress): Recommendation {
  if (
    (progress.misconceptionCounts['index-vs-value'] ?? 0) > 0 &&
    !progress.completed.includes('binary-search')
  ) {
    return {
      title: 'Binary Search Recovery',
      href: '/lesson/dsa-1/binary-search?step=2',
      reason: 'Practice index versus value reasoning at the midpoint checkpoint.',
      label: 'Recovery'
    };
  }
  if (!progress.completed.includes('binary-search')) {
    return {
      title: 'Binary Search',
      href: '/lesson/dsa-1/binary-search',
      reason: 'Build the prediction habit with a short, visual trace.',
      label: 'Recommended start'
    };
  }
  return {
    title: 'SQL Query Pipeline',
    href: '/lesson/dbms/query-pipeline',
    reason: 'Transfer your state-tracing skill from code to relational data.',
    label: 'Next subject'
  };
}

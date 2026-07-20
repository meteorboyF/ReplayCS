import { browser } from '$app/environment';
export interface Progress {
  version: 1;
  xp: number;
  streak: number;
  completed: string[];
  awardedPredictions: string[];
  badge?: string;
}
const empty: Progress = { version: 1, xp: 0, streak: 0, completed: [], awardedPredictions: [] };
export function loadProgress(): Progress {
  if (!browser) return empty;
  try {
    const value = JSON.parse(
      localStorage.getItem('replaycs-progress') ?? 'null'
    ) as Partial<Progress> | null;
    return value?.version === 1 ? { ...empty, ...value } : empty;
  } catch {
    return empty;
  }
}
export function saveProgress(value: Progress) {
  if (browser) localStorage.setItem('replaycs-progress', JSON.stringify(value));
}
export function awardPrediction(progress: Progress, id: string, xp: number) {
  if (progress.awardedPredictions.includes(id)) return progress;
  return {
    ...progress,
    xp: progress.xp + xp,
    streak: progress.streak + 1,
    awardedPredictions: [...progress.awardedPredictions, id],
    badge: progress.xp + xp >= 10 ? 'First Prediction' : progress.badge
  };
}
export function completeLesson(progress: Progress, id: string) {
  if (progress.completed.includes(id)) return progress;
  return { ...progress, xp: progress.xp + 25, completed: [...progress.completed, id] };
}

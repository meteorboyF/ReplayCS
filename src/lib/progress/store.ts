import { browser } from '$app/environment';
import type { MisconceptionTag } from './misconceptions';

export interface Progress {
  version: 2;
  xp: number;
  streak: number;
  completed: string[];
  awardedPredictions: string[];
  misconceptionCounts: Partial<Record<MisconceptionTag, number>>;
  mistakeEvidence: string[];
  recoveredMistakes: string[];
  badge?: string;
}

const empty: Progress = {
  version: 2,
  xp: 0,
  streak: 0,
  completed: [],
  awardedPredictions: [],
  misconceptionCounts: {},
  mistakeEvidence: [],
  recoveredMistakes: []
};

export function loadProgress(): Progress {
  if (!browser) return empty;
  try {
    const value = JSON.parse(localStorage.getItem('replaycs-progress') ?? 'null') as
      (Partial<Omit<Progress, 'version'>> & { version?: number }) | null;
    if (value?.version === 1 || value?.version === 2) {
      const { version: _storedVersion, ...storedProgress } = value;
      return { ...empty, ...storedProgress, version: 2 };
    }
    return empty;
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

export function recordMisconception(progress: Progress, evidenceId: string, tag: MisconceptionTag) {
  if (progress.mistakeEvidence.includes(evidenceId)) return progress;
  return {
    ...progress,
    streak: 0,
    misconceptionCounts: {
      ...progress.misconceptionCounts,
      [tag]: (progress.misconceptionCounts[tag] ?? 0) + 1
    },
    mistakeEvidence: [...progress.mistakeEvidence, evidenceId]
  };
}

export function awardRecovery(progress: Progress, evidenceId: string) {
  if (progress.recoveredMistakes.includes(evidenceId)) return progress;
  return {
    ...progress,
    xp: progress.xp + 6,
    recoveredMistakes: [...progress.recoveredMistakes, evidenceId],
    badge: progress.badge ?? 'State Detective'
  };
}

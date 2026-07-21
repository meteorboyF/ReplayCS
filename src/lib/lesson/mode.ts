import type { TraceStep } from '$lib/trace/types';

/**
 * The three lesson interaction models.
 *
 * - `learn` (default): pure visualization-first exploration. Nothing is gated,
 *   nothing is hidden, predictions are entirely optional.
 * - `guided`: predictions surface inline at checkpoints but can always be
 *   skipped; playback never blocks.
 * - `challenge`: the only mode where a prediction must be answered before the
 *   resulting state is revealed, and where mistakes trigger Replay My Mistake.
 */
export type LearningMode = 'learn' | 'guided' | 'challenge';

export const LEARNING_MODES: readonly {
  id: LearningMode;
  label: string;
  blurb: string;
}[] = [
  { id: 'learn', label: 'Learn', blurb: 'Explore freely — nothing is locked.' },
  { id: 'guided', label: 'Guided', blurb: 'Optional checkpoints you can skip.' },
  { id: 'challenge', label: 'Challenge', blurb: 'Predict before each hidden step.' }
];

/**
 * The single source of truth for whether a trace step is gated. Only Challenge
 * Mode ever blocks, and only on steps that carry an unanswered prediction.
 * Centralizing this here keeps Learn/Guided completely unrestricted everywhere.
 */
export function shouldGateStep(
  mode: LearningMode,
  step: TraceStep | undefined,
  resolvedPredictionIds: readonly string[]
): boolean {
  if (mode !== 'challenge') return false;
  if (!step?.prediction) return false;
  return !resolvedPredictionIds.includes(step.prediction.id);
}

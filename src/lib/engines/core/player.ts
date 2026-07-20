import type { TraceLesson } from '$lib/trace/types';
export function clampStep(lesson: TraceLesson, index: number) {
  return Math.max(0, Math.min(index, lesson.steps.length - 1));
}
export function stateAt(lesson: TraceLesson, index: number) {
  return lesson.steps[clampStep(lesson, index)].stateAfter;
}

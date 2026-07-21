import type { ComplexityCaseType, ComplexityClass } from '$lib/complexity/types';
import type { TraceLesson } from '$lib/trace/types';
import { createSearchLesson } from './search';

export interface BinarySearchComplexityScenario {
  caseId: string;
  caseType: ComplexityCaseType;
  implementation: string;
  time: ComplexityClass;
  space: string;
  assumptions: readonly string[];
  derivation: readonly string[];
}

export function createBinarySearchLesson(
  values = [2, 5, 8, 12, 16, 23, 38, 56],
  target = 23,
  scenario?: BinarySearchComplexityScenario
): TraceLesson {
  // Just wrap the call to the new search engine
  return createSearchLesson({
    algorithm: 'binary-search-iterative',
    values,
    target
  });
}

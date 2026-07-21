import { describe, expect, it } from 'vitest';
import type { SupportedLanguage } from '$lib/trace/types';
import { createSortingTrace, type SortingAlgorithm } from './sorting';
import { SORTING_SOURCE, sortingSemanticFor } from './sortingSource';

const algorithms: SortingAlgorithm[] = [
  'bubble',
  'selection',
  'insertion',
  'merge',
  'quick',
  'heap',
  'counting',
  'radix'
];
const languages: SupportedLanguage[] = ['c', 'cpp', 'java', 'python'];
// Inputs chosen so every algorithm exercises its full event vocabulary.
const sampleInput = [7, 3, 5, 2, 9, 1];

describe('sorting source mappings', () => {
  it('provides all four languages with sequential line numbers for every algorithm', () => {
    for (const algorithm of algorithms) {
      const source = SORTING_SOURCE[algorithm];
      for (const language of languages) {
        const lines = source[language];
        expect(lines.length, `${algorithm}/${language}`).toBeGreaterThan(3);
        lines.forEach((line, index) => {
          expect(line.number, `${algorithm}/${language} line ${index}`).toBe(index + 1);
          expect(line.id).toBeTruthy();
        });
      }
    }
  });

  it('tags a source line in every language for every event the trace emits', () => {
    for (const algorithm of algorithms) {
      const trace = createSortingTrace(algorithm, sampleInput);
      const emittedEvents = new Set(trace.steps.map((step) => step.event));
      const source = SORTING_SOURCE[algorithm];

      for (const event of emittedEvents) {
        const semantic = sortingSemanticFor(event);
        for (const language of languages) {
          const hasTaggedLine = source[language].some(
            (line) => line.semanticOperationId === semantic
          );
          expect(
            hasTaggedLine,
            `${algorithm}/${language} is missing a line for event "${event}"`
          ).toBe(true);
        }
      }
    }
  });

  it('never tags a line with an unknown semantic id', () => {
    const validEvents = new Set([
      'start',
      'pass',
      'compare',
      'select',
      'swap',
      'write',
      'mark-sorted',
      'complete'
    ]);
    for (const algorithm of algorithms) {
      const source = SORTING_SOURCE[algorithm];
      for (const language of languages) {
        for (const line of source[language]) {
          if (line.semanticOperationId) {
            expect(validEvents.has(line.semanticOperationId), `${algorithm}/${language}`).toBe(
              true
            );
          }
        }
      }
    }
  });
});

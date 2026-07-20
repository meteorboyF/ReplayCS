import type { WorkCounts } from '$lib/complexity/types';
import type { TraceLesson, TraceValue } from '$lib/trace/types';
import { describe, expect, it } from 'vitest';
import {
  DYNAMIC_ARRAY_INPUT_MAX,
  DYNAMIC_ARRAY_OPERATIONS,
  createDynamicArrayLesson,
  getDynamicArrayOperationMetadata,
  slotAddress,
  type DynamicArrayConfig
} from './dynamicArray';

interface TraceFixture {
  name: string;
  config: DynamicArrayConfig;
  expectedCaseId: string;
  expectedOperations: number;
}

const values = [7, 14, 21, 28, 35];

const fixtures: TraceFixture[] = [
  {
    name: 'access',
    config: { operation: 'access', values, position: 4 },
    expectedCaseId: 'access-direct',
    expectedOperations: 4
  },
  {
    name: 'update',
    config: { operation: 'update', values, position: 2, newValue: 42 },
    expectedCaseId: 'update-direct',
    expectedOperations: 3
  },
  {
    name: 'search best',
    config: { operation: 'search', values, target: 7 },
    expectedCaseId: 'search-best',
    expectedOperations: 5
  },
  {
    name: 'search average',
    config: { operation: 'search', values, target: 21 },
    expectedCaseId: 'search-average',
    expectedOperations: 15
  },
  {
    name: 'search worst last',
    config: { operation: 'search', values, target: 35 },
    expectedCaseId: 'search-worst',
    expectedOperations: 25
  },
  {
    name: 'search worst absent',
    config: { operation: 'search', values, target: 99 },
    expectedCaseId: 'search-worst',
    expectedOperations: 28
  },
  {
    name: 'insert beginning',
    config: { operation: 'insert-beginning', values, newValue: 42 },
    expectedCaseId: 'insert-begin-shift',
    expectedOperations: 29
  },
  {
    name: 'insert middle append',
    config: { operation: 'insert-middle', values, position: 5, newValue: 42 },
    expectedCaseId: 'insert-middle-append',
    expectedOperations: 4
  },
  {
    name: 'insert middle shift',
    config: { operation: 'insert-middle', values, position: 2, newValue: 42 },
    expectedCaseId: 'insert-middle-shift',
    expectedOperations: 19
  },
  {
    name: 'append with capacity',
    config: { operation: 'insert-end', values, newValue: 42, spareCapacity: true },
    expectedCaseId: 'append-capacity',
    expectedOperations: 5
  },
  {
    name: 'append with resize',
    config: { operation: 'insert-end', values, newValue: 42, spareCapacity: false },
    expectedCaseId: 'append-resize',
    expectedOperations: 35
  },
  {
    name: 'delete beginning',
    config: { operation: 'delete-beginning', values },
    expectedCaseId: 'delete-begin-shift',
    expectedOperations: 24
  },
  {
    name: 'delete middle last',
    config: { operation: 'delete-middle', values, position: 4 },
    expectedCaseId: 'delete-middle-last',
    expectedOperations: 4
  },
  {
    name: 'delete middle shift',
    config: { operation: 'delete-middle', values, position: 2 },
    expectedCaseId: 'delete-middle-shift',
    expectedOperations: 14
  },
  {
    name: 'delete end',
    config: { operation: 'delete-end', values },
    expectedCaseId: 'delete-end-direct',
    expectedOperations: 2
  },
  {
    name: 'copy',
    config: { operation: 'copy', values },
    expectedCaseId: 'copy-full',
    expectedOperations: 29
  },
  {
    name: 'append sequence',
    config: { operation: 'append-sequence', values: [1, 2, 3, 4, 5, 6, 7, 8] },
    expectedCaseId: 'append-amortized',
    expectedOperations: 125
  }
];

function sumWork(work: WorkCounts): number {
  return Object.values(work).reduce((sum, count) => sum + (count ?? 0), 0);
}

function finalState(lesson: TraceLesson): Record<string, TraceValue> {
  const state = lesson.steps.at(-1)?.stateAfter;
  if (!state) throw new Error('Expected a non-empty trace.');
  return state;
}

function expectTraceInvariants(
  lesson: TraceLesson,
  fixture: TraceFixture,
  originalConfig: DynamicArrayConfig
) {
  const expectedCase = getDynamicArrayOperationMetadata(fixture.config.operation).cases.find(
    (item) => item.id === fixture.expectedCaseId
  );
  expect(expectedCase, fixture.name).toBeDefined();

  let total = 0;
  let cumulative: WorkCounts = {};
  lesson.steps.forEach((step, index) => {
    const evidence = step.complexityEvidence;
    expect(evidence, `${fixture.name}:step-${index}`).toBeDefined();
    if (!evidence || !expectedCase) return;

    expect(step.index).toBe(index);
    expect(step.stateBefore).toEqual(
      index === 0 ? lesson.initialState : lesson.steps[index - 1].stateAfter
    );

    for (const [metric, count] of Object.entries(evidence.stepWork)) {
      expect(Number.isSafeInteger(count), `${fixture.name}:${metric}`).toBe(true);
      expect(count, `${fixture.name}:${metric}`).toBeGreaterThanOrEqual(0);
      const key = metric as keyof WorkCounts;
      cumulative = { ...cumulative, [key]: (cumulative[key] ?? 0) + (count ?? 0) };
    }
    total += evidence.exactOperationCount;

    expect(evidence.exactOperationCount).toBe(sumWork(evidence.stepWork));
    expect(evidence.cumulativeWork).toEqual(cumulative);
    expect(evidence.cumulativeOperationCount).toBe(total);
    expect(evidence.cumulativeOperationCount).toBe(sumWork(evidence.cumulativeWork));
    expect(step.stateAfter.cumulativeWork).toEqual(cumulative);
    expect(step.stateAfter.operationCount).toBe(total);
    expect(step.complexityCost).toEqual({
      comparisons: cumulative.comparison ?? 0,
      reads: cumulative.read ?? 0,
      writes: cumulative.write ?? 0,
      swaps: cumulative.swap ?? 0
    });
    expect(evidence).toMatchObject({
      caseId: expectedCase.id,
      selectedCase: expectedCase.caseType,
      implementationVariant: expectedCase.implementationVariant,
      timeComplexity: expectedCase.timeComplexity,
      auxiliarySpace: expectedCase.auxiliarySpace
    });
    expect(step.metadata?.complexityCase).toBe(expectedCase.id);
    expect(evidence.space.auxiliary.current).toBeLessThanOrEqual(evidence.space.auxiliary.peak);
    expect(evidence.space.output.current).toBeLessThanOrEqual(evidence.space.output.peak);

    const entityIds = step.entities.map((entity) => entity.id);
    expect(new Set(entityIds).size).toBe(entityIds.length);
    for (const id of step.visualFocus) expect(entityIds).toContain(id);
    for (const mutation of step.mutations) {
      expect(entityIds).toContain(mutation.entityId);
      expect(mutation.previousValue).not.toEqual(mutation.nextValue);
    }

    if (step.prediction) {
      const mistake = step.metadata?.mistake as Record<string, TraceValue>;
      expect(mistake).toMatchObject({
        prompt: step.prediction.prompt,
        correctAnswer: step.prediction.correctAnswer,
        explanation: step.prediction.explanation
      });
      expect(step.prediction.misconceptionTags).toContain(mistake.tag);
      expect(mistake.wrongAnswer).not.toEqual(mistake.correctAnswer);
    }
  });

  expect(total, fixture.name).toBe(fixture.expectedOperations);
  expect(originalConfig, fixture.name).toEqual(fixture.config);
  expect(() => JSON.stringify(lesson)).not.toThrow();

  for (const language of lesson.supportedLanguages) {
    const source = lesson.sourceByLanguage[language];
    const semantics = new Set(
      source
        .map((line) => line.semanticOperationId)
        .filter((semantic): semantic is string => semantic !== undefined)
    );
    source.forEach((line, index) => {
      expect(line.number).toBe(index + 1);
      expect(line.text).not.toContain('\n');
    });
    for (const step of lesson.steps) {
      expect(
        semantics.has(step.semanticOperationId),
        `${fixture.name}:${language}:${step.semanticOperationId}`
      ).toBe(true);
    }
  }

  for (const language of ['c', 'cpp', 'java'] as const) {
    const text = lesson.sourceByLanguage[language].map((line) => line.text).join('\n');
    expect(text.match(/{/g)?.length ?? 0, `${fixture.name}:${language}`).toBe(
      text.match(/}/g)?.length ?? 0
    );
  }
}

describe('dynamic-array trace matrix', () => {
  it('covers every complexity case with deterministic, cumulative, source-aligned traces', () => {
    const metadataCases = DYNAMIC_ARRAY_OPERATIONS.flatMap((operation) =>
      operation.cases.map((complexityCase) => complexityCase.id)
    );
    expect(metadataCases).toHaveLength(16);
    expect(new Set(fixtures.map((fixture) => fixture.expectedCaseId))).toEqual(
      new Set(metadataCases)
    );

    const semanticGroups = new Map<string, { source: Set<string>; executed: Set<string> }>();
    for (const fixture of fixtures) {
      const snapshot = structuredClone(fixture.config);
      const lesson = createDynamicArrayLesson(fixture.config);
      expect(createDynamicArrayLesson(fixture.config)).toEqual(lesson);
      expectTraceInvariants(lesson, fixture, snapshot);

      const source = new Set(
        lesson.sourceByLanguage.c
          .map((line) => line.semanticOperationId)
          .filter((semantic): semantic is string => semantic !== undefined)
      );
      const signature = JSON.stringify([...source]);
      const group = semanticGroups.get(signature) ?? { source, executed: new Set<string>() };
      lesson.steps.forEach((step) => group.executed.add(step.semanticOperationId));
      semanticGroups.set(signature, group);
    }

    for (const group of semanticGroups.values()) {
      expect([...group.executed].sort()).toEqual([...group.source].sort());
    }
  });

  it('produces the correct final array, result, size, and capacity for every operation family', () => {
    const byName = new Map(
      fixtures.map((fixture) => [fixture.name, createDynamicArrayLesson(fixture.config)])
    );
    expect(finalState(byName.get('access')!).result).toBe(35);
    expect(finalState(byName.get('update')!).slots).toEqual([7, 14, 42, 28, 35]);
    expect(finalState(byName.get('search best')!).result).toBe(0);
    expect(finalState(byName.get('search average')!).result).toBe(2);
    expect(finalState(byName.get('search worst last')!).result).toBe(4);
    expect(finalState(byName.get('search worst absent')!).result).toBe(-1);
    expect(finalState(byName.get('insert beginning')!).slots).toEqual([42, 7, 14, 21, 28, 35]);
    expect(finalState(byName.get('insert middle append')!).slots).toEqual([7, 14, 21, 28, 35, 42]);
    expect(finalState(byName.get('insert middle shift')!).slots).toEqual([7, 14, 42, 21, 28, 35]);

    const spare = finalState(byName.get('append with capacity')!);
    expect(spare.slots).toEqual([7, 14, 21, 28, 35, 42, null]);
    expect(spare).toMatchObject({ size: 6, capacity: 7, totalElementCopies: 0 });
    const resized = finalState(byName.get('append with resize')!);
    expect((resized.slots as TraceValue[]).slice(0, 6)).toEqual([7, 14, 21, 28, 35, 42]);
    expect(resized).toMatchObject({ size: 6, capacity: 10, totalElementCopies: 5 });

    expect(finalState(byName.get('delete beginning')!)).toMatchObject({
      slots: [14, 21, 28, 35, null],
      size: 4,
      result: 7
    });
    expect(finalState(byName.get('delete middle last')!)).toMatchObject({
      slots: [7, 14, 21, 28, null],
      size: 4,
      result: 35
    });
    expect(finalState(byName.get('delete middle shift')!)).toMatchObject({
      slots: [7, 14, 28, 35, null],
      size: 4,
      result: 21
    });
    expect(finalState(byName.get('delete end')!)).toMatchObject({
      slots: [7, 14, 21, 28, null],
      size: 4,
      result: 35
    });

    const copied = finalState(byName.get('copy')!);
    expect(copied.slots).toEqual(values);
    expect(copied.copySlots).toEqual(values);
    const sequence = finalState(byName.get('append sequence')!);
    expect(sequence).toMatchObject({
      slots: [1, 2, 3, 4, 5, 6, 7, 8],
      size: 8,
      capacity: 8,
      appendsCompleted: 8,
      totalElementCopies: 7
    });
  });

  it('represents every successful and failed loop condition as its own aligned trace step', () => {
    for (const target of [7, 21, 35, 99]) {
      const lesson = createDynamicArrayLesson({ operation: 'search', values, target });
      const found = values.indexOf(target);
      const comparisons = lesson.steps.filter(
        (step) => step.semanticOperationId === 'search-compare'
      );
      const checks = lesson.steps.filter((step) => step.semanticOperationId === 'search-check');
      expect(comparisons).toHaveLength(found < 0 ? values.length : found + 1);
      expect(checks).toHaveLength(found < 0 ? values.length + 1 : found + 1);
      const checkpoint = lesson.steps.find((step) => step.prediction)?.prediction;
      expect(checkpoint?.prompt).toMatch(/value comparisons/i);
      expect(checkpoint?.correctAnswer).toBe(comparisons.length);
    }

    const insert = createDynamicArrayLesson({
      operation: 'insert-middle',
      values,
      position: 2,
      newValue: 42
    });
    expect(
      insert.steps.filter((step) => step.semanticOperationId === 'insert-shift-check')
    ).toHaveLength(4);
    const remove = createDynamicArrayLesson({ operation: 'delete-middle', values, position: 2 });
    expect(
      remove.steps.filter((step) => step.semanticOperationId === 'delete-shift-check')
    ).toHaveLength(3);
    const copy = createDynamicArrayLesson({ operation: 'copy', values });
    expect(copy.steps.filter((step) => step.semanticOperationId === 'copy-check')).toHaveLength(6);
    const resize = createDynamicArrayLesson({ operation: 'insert-end', values, newValue: 42 });
    expect(
      resize.steps.filter((step) => step.semanticOperationId === 'append-copy-check')
    ).toHaveLength(6);

    const sequence = createDynamicArrayLesson({
      operation: 'append-sequence',
      values: [1, 2, 3, 4, 5, 6, 7, 8]
    });
    const next = sequence.steps.filter((step) => step.semanticOperationId === 'seq-next');
    const capacityChecks = sequence.steps.filter(
      (step) => step.semanticOperationId === 'append-capacity-check'
    );
    expect(next).toHaveLength(9);
    expect(capacityChecks).toHaveLength(8);
    capacityChecks.forEach((step, index) => expect(next[index].index).toBeLessThan(step.index));
    expect(
      sequence.steps.filter((step) => step.semanticOperationId === 'append-copy-check')
    ).toHaveLength(10);
    expect(sequence.steps.at(-1)?.semanticOperationId).toBe('seq-return');
  });

  it('advances insert and delete cursors only on the following loop-header step', () => {
    const cases = [
      {
        lesson: createDynamicArrayLesson({
          operation: 'insert-middle',
          values,
          position: 2,
          newValue: 42
        }),
        moveSemantic: 'insert-shift-move',
        checkSemantic: 'insert-shift-check',
        delta: -1
      },
      {
        lesson: createDynamicArrayLesson({ operation: 'delete-middle', values, position: 2 }),
        moveSemantic: 'delete-shift-move',
        checkSemantic: 'delete-shift-check',
        delta: 1
      }
    ];

    for (const { lesson, moveSemantic, checkSemantic, delta } of cases) {
      const moves = lesson.steps.filter((step) => step.semanticOperationId === moveSemantic);
      expect(moves.length).toBeGreaterThan(0);
      for (const move of moves) {
        const check = lesson.steps[move.index + 1];
        expect(move.stateAfter.i).toBe(move.stateBefore.i);
        expect(move.complexityEvidence?.stepWork).toEqual({
          read: 1,
          write: 1,
          'loop-iteration': 1
        });
        expect(check.semanticOperationId).toBe(checkSemantic);
        expect(check.stateBefore.i).toBe(move.stateAfter.i);
        expect(check.stateAfter.i).toBe(Number(move.stateAfter.i) + delta);
        expect(check.complexityEvidence?.stepWork).toEqual({ write: 1, comparison: 1 });
      }

      for (const language of lesson.supportedLanguages) {
        const moveLine = lesson.sourceByLanguage[language].find(
          (line) => line.semanticOperationId === moveSemantic
        )?.text;
        const checkLine = lesson.sourceByLanguage[language].find(
          (line) => line.semanticOperationId === checkSemantic
        )?.text;
        expect(moveLine).not.toMatch(/\+\+i|--i|i\+\+|i--|range\(/);
        expect(checkLine).toMatch(/for |range\(/);
      }
    }
  });

  it('grounds a spare-capacity check in executable source for every language', () => {
    const lesson = createDynamicArrayLesson({
      operation: 'insert-end',
      values,
      newValue: 42,
      spareCapacity: true
    });
    const step = lesson.steps.find(
      (candidate) => candidate.semanticOperationId === 'append-capacity-check'
    )!;
    expect(step.complexityEvidence?.stepWork).toEqual({ read: 2, comparison: 1 });

    for (const language of lesson.supportedLanguages) {
      const line = lesson.sourceByLanguage[language].find(
        (candidate) => candidate.semanticOperationId === 'append-capacity-check'
      )?.text;
      expect(line?.trim()).toMatch(/^if\b/);
      expect(line).toMatch(/size.*capacity/);
      expect(line).not.toMatch(/^\s*(?:\/\/|\/\*|#)/);
    }
  });

  it('keeps delete source, state changes, and counted writes on separate active lines', () => {
    const shifted = createDynamicArrayLesson({ operation: 'delete-middle', values, position: 2 });
    const sizeStep = shifted.steps.find((step) => step.semanticOperationId === 'delete-size')!;
    const clearStep = shifted.steps.find((step) => step.semanticOperationId === 'delete-clear')!;
    expect(sizeStep.stateAfter.slots).toEqual([7, 14, 28, 35, 35]);
    expect(sizeStep.complexityEvidence?.stepWork).toEqual({ write: 1 });
    expect(clearStep.stateBefore).toEqual(sizeStep.stateAfter);
    expect(clearStep.stateAfter.slots).toEqual([7, 14, 28, 35, null]);
    expect(clearStep.complexityEvidence?.stepWork).toEqual({ write: 1 });

    const end = createDynamicArrayLesson({ operation: 'delete-end', values });
    expect(end.steps.map((step) => step.semanticOperationId)).toEqual([
      'delete-end-size',
      'delete-end-clear'
    ]);
    expect(end.steps.map((step) => step.complexityEvidence?.stepWork)).toEqual([
      { write: 1 },
      { write: 1 }
    ]);
  });

  it('classifies a returned copy as output while keeping cursor workspace constant', () => {
    const copy = createDynamicArrayLesson({ operation: 'copy', values });
    const evidence = copy.steps.at(-1)?.complexityEvidence!;
    expect(evidence.auxiliarySpace).toBe('O(1)');
    expect(evidence.space.auxiliary.peak).toBeLessThanOrEqual(3);
    expect(evidence.space.output).toEqual({ current: 5, peak: 5, unit: 'returned buffer slots' });
    expect(evidence.derivation.join(' ')).toMatch(/returned destination.*output/i);
    expect(copy.steps[0].deterministicExplanation).toMatch(
      /O\(n\) returned output.*O\(1\) auxiliary/i
    );

    const spare = createDynamicArrayLesson({
      operation: 'insert-end',
      values,
      newValue: 42,
      spareCapacity: true
    });
    const resize = createDynamicArrayLesson({
      operation: 'insert-end',
      values,
      newValue: 42,
      spareCapacity: false
    });
    expect(spare.steps.at(-1)?.complexityEvidence?.space.auxiliary.peak).toBeLessThanOrEqual(3);
    expect(resize.steps.at(-1)?.complexityEvidence?.space.auxiliary.peak).toBeGreaterThanOrEqual(
      10
    );
  });

  it('models buffer replacement as logical retirement without portable physical-free accounting', () => {
    const lessons = [
      createDynamicArrayLesson({
        operation: 'insert-end',
        values,
        newValue: 42,
        spareCapacity: false
      }),
      createDynamicArrayLesson({
        operation: 'append-sequence',
        values: [1, 2, 3, 4, 5, 6, 7, 8]
      })
    ];

    for (const lesson of lessons) {
      const swaps = lesson.steps.filter(
        (step) => step.semanticOperationId === 'append-swap-buffer'
      );
      expect(swaps.length).toBeGreaterThan(0);
      for (const swap of swaps) {
        expect(swap.title).toMatch(/retire/i);
        expect(swap.deterministicExplanation).toMatch(
          /C frees.*C\+\+.*Java\/Python.*physical reclamation/i
        );
        expect(swap.complexityEvidence?.stepWork).toEqual({ write: 2 });
        expect(swap.complexityEvidence?.cumulativeWork.deallocation ?? 0).toBe(0);
        expect(swap.complexityEvidence?.assumptions.join(' ')).toMatch(
          /physical reclamation.*outside the portable count/i
        );
        expect(swap.stateBefore.oldSlots).not.toBeNull();
        expect(swap.stateAfter.oldSlots).toBeNull();
      }

      const cLine = lesson.sourceByLanguage.c.find(
        (line) => line.semanticOperationId === 'append-swap-buffer'
      )?.text;
      expect(cLine).toMatch(/free\(/);
      for (const language of ['cpp', 'java', 'python'] as const) {
        const line = lesson.sourceByLanguage[language].find(
          (candidate) => candidate.semanticOperationId === 'append-swap-buffer'
        )?.text;
        expect(line).toMatch(/RAII|timing is not modeled/);
        expect(line).not.toMatch(/\bfreed\b|\breleased\b|\bcollectible\b/);
      }
    }
  });

  it('uses native backing containers and labels only the explicit C-style address model', () => {
    const access = createDynamicArrayLesson({ operation: 'access', values, position: 4 });
    const sourceText = Object.fromEntries(
      access.supportedLanguages.map((language) => [
        language,
        access.sourceByLanguage[language].map((line) => line.text).join('\n')
      ])
    ) as Record<(typeof access.supportedLanguages)[number], string>;
    expect(sourceText.c).toMatch(/int fixed\[N\]|int \*data/);
    expect(sourceText.cpp).toMatch(/std::vector<int>/);
    expect(sourceText.java).toMatch(/ArrayList<Integer>/);
    expect(sourceText.python).toMatch(/native growable container|self\.slots/);
    expect(new Set(Object.values(sourceText)).size).toBe(4);

    for (const language of ['cpp', 'java', 'python'] as const) {
      const addressLine = access.sourceByLanguage[language].find(
        (line) => line.semanticOperationId === 'access-address'
      )?.text;
      expect(addressLine).toMatch(/index/);
      expect(addressLine).not.toMatch(/0x100|\*\s*4/);
    }
    const prediction = access.steps[0].prediction!;
    expect(prediction.prompt).toMatch(/zero-based.*index/i);
    expect(prediction.correctAnswer).toBe(4);
    expect(access.steps[0].deterministicExplanation).toContain(slotAddress(4));
    expect(access.steps[0].deterministicExplanation).toMatch(/C-style teaching address/);

    const copy = createDynamicArrayLesson({ operation: 'copy', values });
    const cpp = copy.sourceByLanguage.cpp.map((line) => line.text).join('\n');
    const java = copy.sourceByLanguage.java.map((line) => line.text).join('\n');
    const python = copy.sourceByLanguage.python.map((line) => line.text).join('\n');
    expect(cpp).toMatch(/DynArray dest\{std::vector<int>/);
    expect(java).toMatch(/DynArray\(int capacity, int size\).*this\(capacity\)/);
    expect(java).toMatch(/new DynArray\(capacity, size\)/);
    expect(python).toMatch(/self\.slots|dest\.slots/);
  });

  it('guarantees prediction mistakes differ from correct answers at equality boundaries', () => {
    const boundaryLessons = [
      createDynamicArrayLesson({ operation: 'access', values: [1, 2, 3], position: 2 }),
      createDynamicArrayLesson({
        operation: 'update',
        values: [1, 2, 3],
        position: 1,
        newValue: 2
      }),
      createDynamicArrayLesson({ operation: 'delete-end', values: [1] })
    ];
    for (const lesson of boundaryLessons) {
      const predictionStep = lesson.steps.find((step) => step.prediction)!;
      const mistake = predictionStep.metadata?.mistake as Record<string, TraceValue>;
      expect(mistake.wrongAnswer).not.toEqual(mistake.correctAnswer);
      expect(mistake.correctAnswer).toEqual(predictionStep.prediction?.correctAnswer);
    }
  });

  it('supports meaningful empty cases, rejects invalid ones, and never mutates caller input', () => {
    expect(
      finalState(createDynamicArrayLesson({ operation: 'search', values: [], target: 5 })).result
    ).toBe(-1);
    expect(
      finalState(createDynamicArrayLesson({ operation: 'copy', values: [] })).copySlots
    ).toEqual([]);
    expect(
      finalState(
        createDynamicArrayLesson({ operation: 'insert-beginning', values: [], newValue: 5 })
      )
    ).toMatchObject({
      slots: [5],
      size: 1,
      capacity: 1
    });
    expect(
      finalState(
        createDynamicArrayLesson({
          operation: 'insert-middle',
          values: [],
          position: 0,
          newValue: 5
        })
      )
    ).toMatchObject({
      slots: [5],
      size: 1,
      capacity: 1
    });
    expect(
      finalState(createDynamicArrayLesson({ operation: 'insert-end', values: [], newValue: 5 }))
    ).toMatchObject({
      slots: [5],
      size: 1,
      capacity: 1
    });

    expect(() => createDynamicArrayLesson({ operation: 'access', values: [] })).toThrow(
      /requires at least one value/
    );
    expect(() => createDynamicArrayLesson({ operation: 'delete-end', values: [] })).toThrow(
      /requires at least one value/
    );
    expect(() => createDynamicArrayLesson({ operation: 'append-sequence', values: [] })).toThrow(
      /requires at least one value/
    );
    expect(() =>
      createDynamicArrayLesson({
        operation: 'search',
        values: Array(DYNAMIC_ARRAY_INPUT_MAX + 1).fill(1)
      })
    ).toThrow(/at most/);
    expect(() =>
      createDynamicArrayLesson({ operation: 'access', values: [1], position: -1 })
    ).toThrow(/existing slot/);
    expect(() =>
      createDynamicArrayLesson({ operation: 'search', values: [Number.MAX_SAFE_INTEGER + 1] })
    ).toThrow(/safe integers/);

    const frozenValues = Object.freeze([7, 14, 21]) as unknown as number[];
    const config = Object.freeze({
      operation: 'insert-middle' as const,
      values: frozenValues,
      position: 1,
      newValue: 42
    });
    const snapshot = structuredClone(config);
    expect(() => createDynamicArrayLesson(config)).not.toThrow();
    expect(config).toEqual(snapshot);
  });
});

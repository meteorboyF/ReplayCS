import { describe, expect, it } from 'vitest';
import {
  CPU_ALGORITHM_ORDER,
  CpuSchedulingInputError,
  createCpuSchedule,
  createCpuScheduleComparison,
  parseCpuProcessInput,
  parseCpuQuantum,
  validateCpuProcessInput,
  validateCpuQuantum,
  type CpuGanttSegment,
  type CpuProcess,
  type CpuSchedulingAlgorithm
} from './cpuScheduling';

const workload: CpuProcess[] = [
  { id: 'P1', arrival: 0, burst: 5, priority: 2 },
  { id: 'P2', arrival: 1, burst: 3, priority: 1 },
  { id: 'P3', arrival: 2, burst: 1, priority: 0 }
];

function compact(segments: readonly CpuGanttSegment[]): string[] {
  return segments.map(
    (segment) => `${segment.processId ?? 'idle'}:${segment.start}-${segment.end}`
  );
}

describe('deterministic CPU schedules', () => {
  it.each<[CpuSchedulingAlgorithm, string[]]>([
    ['fcfs', ['P1:0-5', 'P2:5-8', 'P3:8-9']],
    ['sjf', ['P1:0-5', 'P3:5-6', 'P2:6-9']],
    ['srtf', ['P1:0-1', 'P2:1-2', 'P3:2-3', 'P2:3-5', 'P1:5-9']],
    ['priority', ['P1:0-5', 'P3:5-6', 'P2:6-9']],
    ['round-robin', ['P1:0-2', 'P2:2-4', 'P3:4-5', 'P1:5-7', 'P2:7-8', 'P1:8-9']]
  ])('builds the exact %s Gantt schedule', (algorithm, expected) => {
    expect(compact(createCpuSchedule(workload, algorithm, 2).gantt)).toEqual(expected);
  });

  it('creates explicit idle segments without counting idle dispatches as context switches', () => {
    const trace = createCpuSchedule(
      [
        { id: 'A', arrival: 2, burst: 1, priority: 0 },
        { id: 'B', arrival: 4, burst: 1, priority: 0 }
      ],
      'fcfs'
    );

    expect(compact(trace.gantt)).toEqual(['idle:0-2', 'A:2-3', 'idle:3-4', 'B:4-5']);
    expect(trace.metrics).toMatchObject({
      makespan: 5,
      busyTime: 2,
      cpuUtilization: 40,
      contextSwitches: 0
    });
    expect(trace.steps.filter((step) => step.event === 'idle')).toHaveLength(3);
  });

  it.each<CpuSchedulingAlgorithm>(['fcfs', 'sjf', 'srtf', 'priority'])(
    '%s breaks a complete tie by input order',
    (algorithm) => {
      const simultaneous: CpuProcess[] = [
        { id: 'Zed', arrival: 0, burst: 2, priority: 1 },
        { id: 'Alpha', arrival: 0, burst: 2, priority: 1 },
        { id: 'Beta', arrival: 0, burst: 2, priority: 1 }
      ];
      expect(createCpuSchedule(simultaneous, algorithm).gantt[0].processId).toBe('Zed');
    }
  );

  it('enqueues a Round Robin boundary arrival before the expired process', () => {
    const trace = createCpuSchedule(
      [
        { id: 'P1', arrival: 0, burst: 4, priority: 0 },
        { id: 'P2', arrival: 2, burst: 1, priority: 0 }
      ],
      'round-robin',
      2
    );

    expect(compact(trace.gantt)).toEqual(['P1:0-2', 'P2:2-3', 'P1:3-5']);
    const boundary = trace.steps.find((step) => step.clock === 2 && step.event === 'execute');
    expect(boundary?.runningProcessId).toBe('P2');
    expect(boundary?.readyProcessIds).toEqual(['P1']);
  });

  it('does not mutate its input and returns byte-for-byte repeatable traces', () => {
    const input = workload.map((process) => ({ ...process }));
    const before = JSON.stringify(input);
    const first = createCpuSchedule(input, 'srtf');
    const second = createCpuSchedule(input, 'srtf');

    expect(JSON.stringify(input)).toBe(before);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe('scheduler state and metrics', () => {
  it('reports waiting, turnaround, response, completion, and average metrics exactly', () => {
    const trace = createCpuSchedule(
      [
        { id: 'P1', arrival: 0, burst: 4, priority: 2 },
        { id: 'P2', arrival: 1, burst: 2, priority: 1 },
        { id: 'P3', arrival: 1, burst: 1, priority: 0 }
      ],
      'fcfs'
    );

    expect(trace.metrics.byProcess).toEqual({
      P1: {
        processId: 'P1',
        arrival: 0,
        burst: 4,
        priority: 2,
        firstStart: 0,
        completion: 4,
        waiting: 0,
        turnaround: 4,
        response: 0
      },
      P2: {
        processId: 'P2',
        arrival: 1,
        burst: 2,
        priority: 1,
        firstStart: 4,
        completion: 6,
        waiting: 3,
        turnaround: 5,
        response: 3
      },
      P3: {
        processId: 'P3',
        arrival: 1,
        burst: 1,
        priority: 0,
        firstStart: 6,
        completion: 7,
        waiting: 5,
        turnaround: 6,
        response: 5
      }
    });
    expect(trace.metrics.averageWaiting).toBeCloseTo(8 / 3);
    expect(trace.metrics.averageTurnaround).toBe(5);
    expect(trace.metrics.averageResponse).toBeCloseTo(8 / 3);
    expect(trace.metrics.contextSwitches).toBe(2);
    expect(trace.metrics.makespan).toBe(7);
  });

  it('exposes ready, running, completed, not-arrived, clock, and remaining-burst state', () => {
    const trace = createCpuSchedule(
      [
        { id: 'A', arrival: 0, burst: 2, priority: 0 },
        { id: 'B', arrival: 1, burst: 1, priority: 0 }
      ],
      'fcfs'
    );
    const initial = trace.steps[0];
    const secondTick = trace.steps.find((step) => step.clock === 1 && step.event === 'execute');
    const terminal = trace.steps.at(-1);

    expect(initial).toMatchObject({
      clock: 0,
      runningProcessId: null,
      readyProcessIds: ['A'],
      completedProcessIds: [],
      notArrivedProcessIds: ['B'],
      remainingBurst: { A: 2, B: 1 }
    });
    expect(secondTick).toMatchObject({
      clock: 1,
      nextClock: 2,
      runningProcessId: 'A',
      readyProcessIds: ['B'],
      remainingBurst: { A: 1, B: 1 }
    });
    expect(terminal).toMatchObject({
      event: 'complete',
      clock: 3,
      runningProcessId: null,
      readyProcessIds: [],
      completedProcessIds: ['A', 'B'],
      remainingBurst: { A: 0, B: 0 }
    });
  });

  it('adds exactly one prediction checkpoint with the deterministic first dispatch', () => {
    for (const algorithm of CPU_ALGORITHM_ORDER) {
      const trace = createCpuSchedule(workload, algorithm);
      const predictions = trace.steps.flatMap((step) => (step.prediction ? [step.prediction] : []));
      expect(predictions).toHaveLength(1);
      expect(predictions[0].correctAnswer).toBe('P1');
    }
  });

  it('builds a five-algorithm side-by-side comparison', () => {
    const comparison = createCpuScheduleComparison(workload, 3);
    expect(comparison.quantum).toBe(3);
    expect(comparison.traces.map((trace) => trace.algorithm)).toEqual(CPU_ALGORITHM_ORDER);
    expect(comparison.traces).toHaveLength(5);
    expect(comparison.traces.every((trace) => trace.metrics.makespan > 0)).toBe(true);
  });
});

describe('custom process and quantum validation', () => {
  it('parses valid custom rows and whitespace', () => {
    expect(parseCpuProcessInput(' P1, 0, 5, 2\n\nP_2, 3, 1, 0 ')).toEqual([
      { id: 'P1', arrival: 0, burst: 5, priority: 2 },
      { id: 'P_2', arrival: 3, burst: 1, priority: 0 }
    ]);
    expect(parseCpuQuantum(' 4 ')).toBe(4);
  });

  it.each([
    ['', 'Add at least one'],
    ['P1,0,2', 'exactly four'],
    ['1P,0,2,1', 'invalid ID'],
    ['P1,0,2,1\nP1,1,2,2', 'duplicated'],
    ['P1,-1,2,1', 'non-negative'],
    ['P1,0,0,1', 'burst must be between'],
    ['P1,51,2,1', 'arrival must be between'],
    ['P1,0,2,100', 'priority must be between'],
    ['P1,0,2.5,1', 'whole numbers']
  ])('rejects invalid process input %j', (input, message) => {
    const result = validateCpuProcessInput(input);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain(message);
  });

  it.each([
    ['0', 'between 1 and 20'],
    ['21', 'between 1 and 20'],
    ['2.5', 'whole number'],
    ['nope', 'whole number']
  ])('rejects invalid quantum %j', (input, message) => {
    const result = validateCpuQuantum(input);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain(message);
  });

  it('rejects invalid programmatic inputs before simulation', () => {
    expect(() =>
      createCpuSchedule(
        [
          { id: 'A', arrival: 0, burst: 1, priority: 0 },
          { id: 'A', arrival: 0, burst: 1, priority: 0 }
        ],
        'fcfs'
      )
    ).toThrow(CpuSchedulingInputError);
    expect(() =>
      createCpuSchedule([{ id: 'A', arrival: 0, burst: 0, priority: 0 }], 'fcfs')
    ).toThrow('burst must be between');
    expect(() =>
      createCpuSchedule([{ id: 'A', arrival: 0, burst: 1, priority: 0 }], 'round-robin', 0)
    ).toThrow('between 1 and 20');
  });
});

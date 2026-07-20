import type { PredictionChallenge } from '$lib/trace/types';

export const CPU_PROCESS_MIN = 1;
export const CPU_PROCESS_MAX = 8;
export const CPU_MAX_ARRIVAL = 50;
export const CPU_MAX_BURST = 50;
export const CPU_MAX_TOTAL_BURST = 200;
export const CPU_MAX_PRIORITY = 99;
export const CPU_MIN_QUANTUM = 1;
export const CPU_MAX_QUANTUM = 20;

export type CpuSchedulingAlgorithm = 'fcfs' | 'sjf' | 'srtf' | 'priority' | 'round-robin';

export const CPU_ALGORITHM_ORDER: CpuSchedulingAlgorithm[] = [
  'fcfs',
  'sjf',
  'srtf',
  'priority',
  'round-robin'
];

export interface CpuAlgorithmInfo {
  name: string;
  shortName: string;
  description: string;
  preemptive: boolean;
  tieBreaking: string;
}

/**
 * Every scheduler is deterministic. `input order` below means the row order in
 * the process editor, and a lower priority number means a higher priority.
 */
export const CPU_ALGORITHMS: Record<CpuSchedulingAlgorithm, CpuAlgorithmInfo> = {
  fcfs: {
    name: 'First Come, First Served',
    shortName: 'FCFS',
    description: 'Run the earliest-arriving process until it finishes.',
    preemptive: false,
    tieBreaking: 'Earlier arrival first; simultaneous arrivals keep input order.'
  },
  sjf: {
    name: 'Shortest Job First',
    shortName: 'SJF',
    description: 'At each dispatch, run the available process with the shortest burst.',
    preemptive: false,
    tieBreaking: 'Shorter burst, then earlier arrival, then input order.'
  },
  srtf: {
    name: 'Shortest Remaining Time First',
    shortName: 'SRTF',
    description: 'Reconsider the shortest remaining process after every clock tick.',
    preemptive: true,
    tieBreaking: 'Less remaining time, then earlier arrival, then input order.'
  },
  priority: {
    name: 'Priority (non-preemptive)',
    shortName: 'Priority',
    description: 'At each dispatch, run the available process with the highest priority.',
    preemptive: false,
    tieBreaking: 'Lower priority number, then earlier arrival, then input order.'
  },
  'round-robin': {
    name: 'Round Robin',
    shortName: 'Round Robin',
    description: 'Rotate a FIFO ready queue after each process uses one time quantum.',
    preemptive: true,
    tieBreaking:
      'FIFO queue; simultaneous arrivals keep input order, and boundary arrivals enqueue before the expired process.'
  }
};

export interface CpuProcess {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
}

export interface CpuGanttSegment {
  processId: string | null;
  start: number;
  end: number;
}

export type CpuSchedulingEvent = 'initialize' | 'execute' | 'idle' | 'complete';

export interface CpuSchedulingStep {
  id: string;
  index: number;
  event: CpuSchedulingEvent;
  clock: number;
  nextClock: number;
  runningProcessId: string | null;
  readyProcessIds: string[];
  completedProcessIds: string[];
  notArrivedProcessIds: string[];
  remainingBurst: Record<string, number>;
  contextSwitches: number;
  title: string;
  explanation: string;
  prediction?: PredictionChallenge;
}

export interface CpuProcessMetrics {
  processId: string;
  arrival: number;
  burst: number;
  priority: number;
  firstStart: number;
  completion: number;
  waiting: number;
  turnaround: number;
  response: number;
}

export interface CpuScheduleMetrics {
  byProcess: Record<string, CpuProcessMetrics>;
  averageWaiting: number;
  averageTurnaround: number;
  averageResponse: number;
  makespan: number;
  busyTime: number;
  cpuUtilization: number;
  contextSwitches: number;
}

export interface CpuScheduleTrace {
  algorithm: CpuSchedulingAlgorithm;
  algorithmInfo: CpuAlgorithmInfo;
  quantum: number;
  processes: CpuProcess[];
  steps: CpuSchedulingStep[];
  gantt: CpuGanttSegment[];
  metrics: CpuScheduleMetrics;
}

export interface CpuScheduleComparison {
  processes: CpuProcess[];
  quantum: number;
  traces: CpuScheduleTrace[];
}

export type CpuProcessInputValidation =
  | { valid: true; processes: CpuProcess[]; error: null }
  | { valid: false; processes: null; error: string };

export type CpuQuantumValidation =
  { valid: true; quantum: number; error: null } | { valid: false; quantum: null; error: string };

export class CpuSchedulingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CpuSchedulingInputError';
  }
}

interface RuntimeProcess extends CpuProcess {
  inputOrder: number;
  remaining: number;
  firstStart: number | null;
  completion: number | null;
}

const processIdPattern = /^[A-Za-z][A-Za-z0-9_-]{0,11}$/;

/** Validate `ID, arrival, burst, priority` rows from the lab editor. */
export function validateCpuProcessInput(input: string): CpuProcessInputValidation {
  const rows = input
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (!rows.length) {
    return {
      valid: false,
      processes: null,
      error: 'Add at least one process row: ID, arrival, burst, priority.'
    };
  }
  if (rows.length > CPU_PROCESS_MAX) {
    return {
      valid: false,
      processes: null,
      error: `Use at most ${CPU_PROCESS_MAX} processes so the timeline stays readable.`
    };
  }

  const processes: CpuProcess[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const columns = rows[rowIndex].split(',').map((value) => value.trim());
    const rowNumber = rowIndex + 1;
    if (columns.length !== 4) {
      return {
        valid: false,
        processes: null,
        error: `Row ${rowNumber} needs exactly four values: ID, arrival, burst, priority.`
      };
    }

    const [id, arrivalText, burstText, priorityText] = columns;
    if (!processIdPattern.test(id)) {
      return {
        valid: false,
        processes: null,
        error: `Row ${rowNumber} has an invalid ID. Start with a letter and use up to 12 letters, numbers, _ or -.`
      };
    }
    if (processes.some((process) => process.id === id)) {
      return { valid: false, processes: null, error: `Process ID “${id}” is duplicated.` };
    }
    if (![arrivalText, burstText, priorityText].every((value) => /^\d+$/.test(value))) {
      return {
        valid: false,
        processes: null,
        error: `Row ${rowNumber} must use non-negative whole numbers.`
      };
    }

    const arrival = Number(arrivalText);
    const burst = Number(burstText);
    const priority = Number(priorityText);
    if (!Number.isSafeInteger(arrival) || arrival > CPU_MAX_ARRIVAL) {
      return {
        valid: false,
        processes: null,
        error: `Row ${rowNumber} arrival must be between 0 and ${CPU_MAX_ARRIVAL}.`
      };
    }
    if (!Number.isSafeInteger(burst) || burst < 1 || burst > CPU_MAX_BURST) {
      return {
        valid: false,
        processes: null,
        error: `Row ${rowNumber} burst must be between 1 and ${CPU_MAX_BURST}.`
      };
    }
    if (!Number.isSafeInteger(priority) || priority > CPU_MAX_PRIORITY) {
      return {
        valid: false,
        processes: null,
        error: `Row ${rowNumber} priority must be between 0 and ${CPU_MAX_PRIORITY}.`
      };
    }
    processes.push({ id, arrival, burst, priority });
  }

  if (processes.reduce((total, process) => total + process.burst, 0) > CPU_MAX_TOTAL_BURST) {
    return {
      valid: false,
      processes: null,
      error: `Keep total burst time at or below ${CPU_MAX_TOTAL_BURST}.`
    };
  }

  return { valid: true, processes, error: null };
}

export function parseCpuProcessInput(input: string): CpuProcess[] {
  const result = validateCpuProcessInput(input);
  if (!result.valid) throw new CpuSchedulingInputError(result.error);
  return result.processes;
}

export function validateCpuQuantum(input: string | number): CpuQuantumValidation {
  const text = String(input).trim();
  if (!/^\d+$/.test(text)) {
    return {
      valid: false,
      quantum: null,
      error: `Quantum must be a whole number from ${CPU_MIN_QUANTUM} to ${CPU_MAX_QUANTUM}.`
    };
  }
  const quantum = Number(text);
  if (!Number.isSafeInteger(quantum) || quantum < CPU_MIN_QUANTUM || quantum > CPU_MAX_QUANTUM) {
    return {
      valid: false,
      quantum: null,
      error: `Quantum must be between ${CPU_MIN_QUANTUM} and ${CPU_MAX_QUANTUM}.`
    };
  }
  return { valid: true, quantum, error: null };
}

export function parseCpuQuantum(input: string | number): number {
  const result = validateCpuQuantum(input);
  if (!result.valid) throw new CpuSchedulingInputError(result.error);
  return result.quantum;
}

function normalizeProcesses(processes: readonly CpuProcess[]): CpuProcess[] {
  if (!Array.isArray(processes) || processes.length < CPU_PROCESS_MIN) {
    throw new CpuSchedulingInputError('Add at least one process.');
  }
  if (processes.length > CPU_PROCESS_MAX) {
    throw new CpuSchedulingInputError(`Use at most ${CPU_PROCESS_MAX} processes.`);
  }

  const seen = new Set<string>();
  const normalized = processes.map((process, index) => {
    if (!process || !processIdPattern.test(process.id)) {
      throw new CpuSchedulingInputError(`Process ${index + 1} has an invalid ID.`);
    }
    if (seen.has(process.id)) {
      throw new CpuSchedulingInputError(`Process ID “${process.id}” is duplicated.`);
    }
    seen.add(process.id);
    if (
      !Number.isSafeInteger(process.arrival) ||
      process.arrival < 0 ||
      process.arrival > CPU_MAX_ARRIVAL
    ) {
      throw new CpuSchedulingInputError(
        `${process.id} arrival must be between 0 and ${CPU_MAX_ARRIVAL}.`
      );
    }
    if (
      !Number.isSafeInteger(process.burst) ||
      process.burst < 1 ||
      process.burst > CPU_MAX_BURST
    ) {
      throw new CpuSchedulingInputError(
        `${process.id} burst must be between 1 and ${CPU_MAX_BURST}.`
      );
    }
    if (
      !Number.isSafeInteger(process.priority) ||
      process.priority < 0 ||
      process.priority > CPU_MAX_PRIORITY
    ) {
      throw new CpuSchedulingInputError(
        `${process.id} priority must be between 0 and ${CPU_MAX_PRIORITY}.`
      );
    }
    return { ...process };
  });

  if (normalized.reduce((total, process) => total + process.burst, 0) > CPU_MAX_TOTAL_BURST) {
    throw new CpuSchedulingInputError(`Keep total burst time at or below ${CPU_MAX_TOTAL_BURST}.`);
  }
  return normalized;
}

function compareArrivalThenInput(left: RuntimeProcess, right: RuntimeProcess): number {
  return left.arrival - right.arrival || left.inputOrder - right.inputOrder;
}

function compareReady(
  algorithm: Exclude<CpuSchedulingAlgorithm, 'round-robin'>,
  left: RuntimeProcess,
  right: RuntimeProcess
): number {
  if (algorithm === 'sjf') {
    return left.burst - right.burst || compareArrivalThenInput(left, right);
  }
  if (algorithm === 'srtf') {
    return left.remaining - right.remaining || compareArrivalThenInput(left, right);
  }
  if (algorithm === 'priority') {
    return left.priority - right.priority || compareArrivalThenInput(left, right);
  }
  return compareArrivalThenInput(left, right);
}

function remainingSnapshot(runtime: readonly RuntimeProcess[]): Record<string, number> {
  return Object.fromEntries(runtime.map((process) => [process.id, process.remaining]));
}

function appendGanttSegment(
  segments: CpuGanttSegment[],
  processId: string | null,
  start: number,
  end: number
): void {
  const previous = segments.at(-1);
  if (previous && previous.processId === processId && previous.end === start) {
    previous.end = end;
    return;
  }
  segments.push({ processId, start, end });
}

function addStep(steps: CpuSchedulingStep[], step: Omit<CpuSchedulingStep, 'id' | 'index'>): void {
  const index = steps.length;
  steps.push({ ...step, id: `cpu-step-${index}`, index });
}

function roundedAverage(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * Build a clock-by-clock CPU schedule. Context switches count direct changes
 * from one process to another; an idle-to-process dispatch is not counted.
 */
export function createCpuSchedule(
  processes: readonly CpuProcess[],
  algorithm: CpuSchedulingAlgorithm,
  quantumInput: string | number = 2
): CpuScheduleTrace {
  const normalized = normalizeProcesses(processes);
  if (!CPU_ALGORITHM_ORDER.includes(algorithm)) {
    throw new CpuSchedulingInputError(`Unknown CPU scheduling algorithm: ${String(algorithm)}.`);
  }
  const quantum = parseCpuQuantum(quantumInput);
  const runtime: RuntimeProcess[] = normalized.map((process, inputOrder) => ({
    ...process,
    inputOrder,
    remaining: process.burst,
    firstStart: null,
    completion: null
  }));
  const gantt: CpuGanttSegment[] = [];
  const steps: CpuSchedulingStep[] = [];
  const completed = new Set<string>();
  const completionOrder: string[] = [];
  const admitted = new Set<string>();
  const roundRobinQueue: RuntimeProcess[] = [];
  let current: RuntimeProcess | null = null;
  let clock = 0;
  let quantumUsed = 0;
  let contextSwitches = 0;
  let previousTickProcessId: string | null = null;

  const available = (at: number, except: RuntimeProcess | null = null) =>
    runtime.filter(
      (process) => process.arrival <= at && process.remaining > 0 && process.id !== except?.id
    );
  const ranked = (candidates: RuntimeProcess[]) => {
    if (algorithm === 'round-robin') return [...candidates].sort(compareArrivalThenInput);
    return [...candidates].sort((left, right) => compareReady(algorithm, left, right));
  };
  const notArrivedAt = (at: number) =>
    runtime.filter((process) => process.arrival > at).map((process) => process.id);
  const enqueueArrivals = (at: number) => {
    runtime
      .filter(
        (process) => process.arrival <= at && process.remaining > 0 && !admitted.has(process.id)
      )
      .sort(compareArrivalThenInput)
      .forEach((process) => {
        roundRobinQueue.push(process);
        admitted.add(process.id);
      });
  };

  if (algorithm === 'round-robin') enqueueArrivals(0);
  const initialReady =
    algorithm === 'round-robin'
      ? roundRobinQueue.map((process) => process.id)
      : ranked(available(0)).map((process) => process.id);
  addStep(steps, {
    event: 'initialize',
    clock: 0,
    nextClock: 0,
    runningProcessId: null,
    readyProcessIds: initialReady,
    completedProcessIds: [],
    notArrivedProcessIds: notArrivedAt(0),
    remainingBurst: remainingSnapshot(runtime),
    contextSwitches: 0,
    title: 'Scheduler ready',
    explanation: `Processes are loaded. ${CPU_ALGORITHMS[algorithm].tieBreaking}`
  });

  while (completed.size < runtime.length) {
    if (algorithm === 'round-robin') {
      enqueueArrivals(clock);
      if (!current) {
        current = roundRobinQueue.shift() ?? null;
        quantumUsed = 0;
      }
    } else if (algorithm === 'srtf') {
      current = ranked(available(clock))[0] ?? null;
    } else if (!current) {
      current = ranked(available(clock))[0] ?? null;
    }

    if (!current) {
      appendGanttSegment(gantt, null, clock, clock + 1);
      addStep(steps, {
        event: 'idle',
        clock,
        nextClock: clock + 1,
        runningProcessId: null,
        readyProcessIds: [],
        completedProcessIds: [...completionOrder],
        notArrivedProcessIds: notArrivedAt(clock),
        remainingBurst: remainingSnapshot(runtime),
        contextSwitches,
        title: `CPU idle at t=${clock}`,
        explanation: `No process is ready, so the CPU stays idle from t=${clock} to t=${clock + 1}.`
      });
      previousTickProcessId = null;
      clock++;
      continue;
    }

    if (previousTickProcessId !== null && previousTickProcessId !== current.id) {
      contextSwitches++;
    }
    const before = remainingSnapshot(runtime);
    const readyProcessIds =
      algorithm === 'round-robin'
        ? roundRobinQueue.map((process) => process.id)
        : ranked(available(clock, current)).map((process) => process.id);
    const remainingAfterTick = current.remaining - 1;
    const willComplete = remainingAfterTick === 0;
    if (current.firstStart === null) current.firstStart = clock;

    appendGanttSegment(gantt, current.id, clock, clock + 1);
    addStep(steps, {
      event: 'execute',
      clock,
      nextClock: clock + 1,
      runningProcessId: current.id,
      readyProcessIds,
      completedProcessIds: [...completionOrder],
      notArrivedProcessIds: notArrivedAt(clock),
      remainingBurst: before,
      contextSwitches,
      title: `${current.id} runs from t=${clock} to t=${clock + 1}`,
      explanation: willComplete
        ? `${current.id} uses its final CPU unit and completes at t=${clock + 1}.`
        : `${current.id} executes for one unit; its remaining burst becomes ${remainingAfterTick}.`
    });

    previousTickProcessId = current.id;
    current.remaining = remainingAfterTick;
    clock++;

    if (algorithm === 'round-robin') {
      // Boundary arrivals are deliberately admitted before an expired process is requeued.
      enqueueArrivals(clock);
      quantumUsed++;
      if (current.remaining === 0) {
        current.completion = clock;
        completed.add(current.id);
        completionOrder.push(current.id);
        current = null;
        quantumUsed = 0;
      } else if (quantumUsed >= quantum) {
        roundRobinQueue.push(current);
        current = null;
        quantumUsed = 0;
      }
    } else {
      if (current.remaining === 0) {
        current.completion = clock;
        completed.add(current.id);
        completionOrder.push(current.id);
        current = null;
      }
      if (algorithm === 'srtf') current = null;
    }
  }

  addStep(steps, {
    event: 'complete',
    clock,
    nextClock: clock,
    runningProcessId: null,
    readyProcessIds: [],
    completedProcessIds: [...completionOrder],
    notArrivedProcessIds: [],
    remainingBurst: remainingSnapshot(runtime),
    contextSwitches,
    title: `Schedule complete at t=${clock}`,
    explanation: `All ${runtime.length} processes have completed after ${contextSwitches} context switch${contextSwitches === 1 ? '' : 'es'}.`
  });

  const firstProcessId = gantt.find((segment) => segment.processId !== null)?.processId;
  if (!firstProcessId) throw new Error('A valid schedule must dispatch a process.');
  steps[0].prediction = {
    id: `cpu-${algorithm}-first-dispatch-${normalized.map((process) => process.id).join('-')}`,
    prompt: 'Which process will the scheduler dispatch first?',
    type: 'text',
    correctAnswer: firstProcessId,
    explanation: `${firstProcessId} is selected first. ${CPU_ALGORITHMS[algorithm].tieBreaking}`,
    misconceptionTags: ['scheduler-tie-break'],
    xpReward: 10
  };

  const byProcess: Record<string, CpuProcessMetrics> = {};
  for (const process of runtime) {
    if (process.firstStart === null || process.completion === null) {
      throw new Error(`Schedule did not finish ${process.id}.`);
    }
    const turnaround = process.completion - process.arrival;
    const waiting = turnaround - process.burst;
    const response = process.firstStart - process.arrival;
    byProcess[process.id] = {
      processId: process.id,
      arrival: process.arrival,
      burst: process.burst,
      priority: process.priority,
      firstStart: process.firstStart,
      completion: process.completion,
      waiting,
      turnaround,
      response
    };
  }
  const processMetrics = Object.values(byProcess);
  const busyTime = normalized.reduce((total, process) => total + process.burst, 0);
  const metrics: CpuScheduleMetrics = {
    byProcess,
    averageWaiting: roundedAverage(processMetrics.map((metric) => metric.waiting)),
    averageTurnaround: roundedAverage(processMetrics.map((metric) => metric.turnaround)),
    averageResponse: roundedAverage(processMetrics.map((metric) => metric.response)),
    makespan: clock,
    busyTime,
    cpuUtilization: (busyTime / clock) * 100,
    contextSwitches
  };

  return {
    algorithm,
    algorithmInfo: CPU_ALGORITHMS[algorithm],
    quantum,
    processes: normalized.map((process) => ({ ...process })),
    steps,
    gantt,
    metrics
  };
}

export function createCpuScheduleComparison(
  processes: readonly CpuProcess[],
  quantumInput: string | number = 2
): CpuScheduleComparison {
  const quantum = parseCpuQuantum(quantumInput);
  const normalized = normalizeProcesses(processes);
  return {
    processes: normalized,
    quantum,
    traces: CPU_ALGORITHM_ORDER.map((algorithm) =>
      createCpuSchedule(normalized, algorithm, quantum)
    )
  };
}

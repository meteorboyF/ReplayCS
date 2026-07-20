<script lang="ts">
  import { onMount } from 'svelte';
  import PredictionCheckpoint from '$lib/components/trace/PredictionCheckpoint.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import {
    CPU_ALGORITHMS,
    CPU_ALGORITHM_ORDER,
    createCpuSchedule,
    createCpuScheduleComparison,
    validateCpuProcessInput,
    validateCpuQuantum,
    type CpuProcess,
    type CpuScheduleComparison,
    type CpuScheduleTrace,
    type CpuSchedulingAlgorithm
  } from '$lib/engines/os/cpuScheduling';

  const defaultInput = `P1, 0, 5, 2
P2, 1, 3, 1
P3, 2, 1, 0
P4, 4, 2, 3`;
  const defaultProcesses = validateCpuProcessInput(defaultInput);
  if (!defaultProcesses.valid) throw new Error(defaultProcesses.error);
  const initialProcesses = defaultProcesses.processes;
  const initialTrace = createCpuSchedule(initialProcesses, 'round-robin', 2);
  const initialComparison = createCpuScheduleComparison(initialProcesses, 2);

  let algorithm = $state<CpuSchedulingAlgorithm>('round-robin');
  let processInput = $state(defaultInput);
  let quantumInput = $state('2');
  let processes = $state<CpuProcess[]>(initialProcesses);
  let trace = $state<CpuScheduleTrace>(initialTrace);
  let comparison = $state<CpuScheduleComparison>(initialComparison);
  let inputError = $state('');
  let index = $state(0);
  let playing = $state(false);
  let predictionSubmitted = $state(false);
  let predictionNudge = $state('');
  let traceRevision = $state(0);
  let timer: ReturnType<typeof setInterval> | undefined;

  let step = $derived(trace.steps[index]);
  let algorithmInfo = $derived(CPU_ALGORITHMS[algorithm]);
  let revealClock = $derived(
    step.event === 'initialize'
      ? 0
      : step.event === 'complete'
        ? trace.metrics.makespan
        : step.nextClock
  );
  let visibleGantt = $derived(
    trace.gantt
      .filter((segment) => segment.start < revealClock)
      .map((segment) => ({ ...segment, end: Math.min(segment.end, revealClock) }))
  );

  onMount(() => () => clearInterval(timer));

  function stopPlayback() {
    playing = false;
    clearInterval(timer);
  }

  function resetTraceState() {
    stopPlayback();
    index = 0;
    predictionSubmitted = false;
    predictionNudge = '';
    traceRevision++;
  }

  function rebuild(
    nextAlgorithm: CpuSchedulingAlgorithm,
    nextProcesses: CpuProcess[],
    quantum: number
  ) {
    algorithm = nextAlgorithm;
    processes = nextProcesses;
    trace = createCpuSchedule(nextProcesses, nextAlgorithm, quantum);
    comparison = createCpuScheduleComparison(nextProcesses, quantum);
    quantumInput = String(quantum);
    resetTraceState();
  }

  function applyInput(event?: SubmitEvent) {
    event?.preventDefault();
    const processResult = validateCpuProcessInput(processInput);
    if (!processResult.valid) {
      inputError = processResult.error;
      return;
    }
    const quantumResult = validateCpuQuantum(quantumInput);
    if (!quantumResult.valid) {
      inputError = quantumResult.error;
      return;
    }
    inputError = '';
    processInput = processResult.processes
      .map((process) => `${process.id}, ${process.arrival}, ${process.burst}, ${process.priority}`)
      .join('\n');
    rebuild(algorithm, processResult.processes, quantumResult.quantum);
  }

  function chooseAlgorithm(nextAlgorithm: CpuSchedulingAlgorithm) {
    if (nextAlgorithm === algorithm) return;
    const quantumResult = validateCpuQuantum(quantumInput);
    if (!quantumResult.valid) {
      inputError = quantumResult.error;
      return;
    }
    inputError = '';
    rebuild(nextAlgorithm, processes, quantumResult.quantum);
  }

  function usePreset(kind: 'preemption' | 'idle' | 'ties') {
    const presets = {
      preemption: {
        input: `Long, 0, 8, 3
Quick, 1, 2, 1
Urgent, 2, 1, 0`,
        quantum: 2
      },
      idle: {
        input: `Boot, 2, 2, 1
Sync, 6, 2, 0
Worker, 6, 3, 2`,
        quantum: 2
      },
      ties: {
        input: `Alpha, 0, 3, 1
Beta, 0, 3, 1
Gamma, 0, 3, 1`,
        quantum: 1
      }
    } as const;
    processInput = presets[kind].input;
    quantumInput = String(presets[kind].quantum);
    applyInput();
  }

  function jump(nextIndex: number) {
    if (nextIndex > 0 && !predictionSubmitted) {
      predictionNudge = 'Lock a prediction before revealing the first dispatch.';
      return;
    }
    index = Math.max(0, Math.min(nextIndex, trace.steps.length - 1));
    if (index === trace.steps.length - 1) stopPlayback();
  }

  function restart() {
    stopPlayback();
    index = 0;
    predictionSubmitted = false;
    predictionNudge = '';
    traceRevision++;
  }

  function togglePlayback() {
    if (!predictionSubmitted) {
      predictionNudge = 'Lock a prediction before playing the schedule.';
      return;
    }
    if (playing) {
      stopPlayback();
      return;
    }
    if (index === trace.steps.length - 1) index = 0;
    playing = true;
    timer = setInterval(() => {
      if (index >= trace.steps.length - 1) stopPlayback();
      else jump(index + 1);
    }, 850);
  }

  function submitPrediction() {
    predictionSubmitted = true;
    predictionNudge = '';
  }

  function processStatus(
    processId: string
  ): 'running' | 'ready' | 'completed' | 'not-arrived' | 'waiting' {
    if (step.runningProcessId === processId) return 'running';
    if (step.completedProcessIds.includes(processId)) return 'completed';
    if (step.readyProcessIds.includes(processId)) return 'ready';
    if (step.notArrivedProcessIds.includes(processId)) return 'not-arrived';
    return 'waiting';
  }

  function formatMetric(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
</script>

<svelte:head>
  <title>CPU Scheduling Arena · ReplayCS</title>
  <meta
    name="description"
    content="Trace FCFS, SJF, SRTF, Priority, and Round Robin CPU schedules with Gantt timelines and exact process metrics."
  />
</svelte:head>

<div class="lesson-head">
  <div>
    <a href="/learn/operating-systems" class="back">← Operating Systems</a>
    <span class="eyebrow">Interactive execution lab</span>
    <h1>CPU Scheduling <span class="gradient">Arena</span></h1>
    <p>Predict the next dispatch, replay every clock tick, and compare five schedulers fairly.</p>
  </div>
  <div class="deterministic-badge"><span aria-hidden="true"></span> Deterministic simulation</div>
</div>

<section class="setup panel" aria-labelledby="setup-heading">
  <div class="setup-copy">
    <span class="eyebrow" id="setup-heading">1 · Build a workload</span>
    <h2>Process editor</h2>
    <p>One process per line. A lower priority number means higher priority.</p>
    <div class="presets" aria-label="Workload presets">
      <button type="button" onclick={() => usePreset('preemption')}>Preemption</button>
      <button type="button" onclick={() => usePreset('idle')}>Idle gaps</button>
      <button type="button" onclick={() => usePreset('ties')}>Exact ties</button>
    </div>
  </div>
  <form onsubmit={applyInput} novalidate>
    <label for="process-input">ID, arrival, burst, priority</label>
    <textarea
      id="process-input"
      rows="5"
      bind:value={processInput}
      aria-invalid={inputError ? 'true' : 'false'}
      aria-describedby={inputError ? 'cpu-input-error' : 'cpu-input-help'}
      oninput={() => (inputError = '')}
    ></textarea>
    <div class="form-actions">
      <div>
        <label for="quantum-input">Round Robin quantum</label>
        <input
          id="quantum-input"
          type="number"
          min="1"
          max="20"
          step="1"
          bind:value={quantumInput}
          oninput={() => (inputError = '')}
        />
      </div>
      <button class="primary" type="submit">Build schedule</button>
    </div>
    {#if inputError}
      <p class="error" id="cpu-input-error" role="alert">{inputError}</p>
    {:else}
      <p class="hint" id="cpu-input-help">1–8 processes · integer times · quantum 1–20</p>
    {/if}
  </form>
</section>

<section class="algorithm-picker" aria-labelledby="algorithm-heading">
  <div class="picker-head">
    <div>
      <span class="eyebrow">2 · Choose the policy</span>
      <h2 id="algorithm-heading">Scheduling algorithm</h2>
    </div>
    <span class:preemptive={algorithmInfo.preemptive} class="mode-pill">
      {algorithmInfo.preemptive ? 'Preemptive' : 'Non-preemptive'}
    </span>
  </div>
  <div class="algorithm-tabs" role="group" aria-label="CPU scheduling algorithm">
    {#each CPU_ALGORITHM_ORDER as option}
      <button
        type="button"
        aria-pressed={algorithm === option}
        class:selected={algorithm === option}
        onclick={() => chooseAlgorithm(option)}
      >
        <strong>{CPU_ALGORITHMS[option].shortName}</strong>
        <span>{CPU_ALGORITHMS[option].preemptive ? 'Can preempt' : 'Runs to completion'}</span>
      </button>
    {/each}
  </div>
  <div class="policy-note panel">
    <div>
      <span class="eyebrow">{algorithmInfo.name}</span>
      <p>{algorithmInfo.description}</p>
    </div>
    <div>
      <span class="eyebrow">Deterministic tie-break</span>
      <p>{algorithmInfo.tieBreaking}</p>
    </div>
  </div>
</section>

<div class="lab-grid">
  <section class="scheduler-stage panel" aria-labelledby="timeline-heading">
    <div class="stage-head">
      <div>
        <span class="eyebrow">3 · Replay execution</span>
        <h2 id="timeline-heading">Gantt timeline</h2>
      </div>
      <div class="clock" aria-live="polite">
        <span>Clock</span><strong>t={step.clock}</strong>
      </div>
    </div>

    <div class="gantt-scroll">
      <div class="gantt" aria-label={`Revealed ${algorithmInfo.shortName} Gantt timeline`}>
        {#if visibleGantt.length === 0}
          <div class="gantt-locked">
            <span aria-hidden="true">◇</span>
            Lock your prediction, then advance the trace to reveal the schedule.
          </div>
        {:else}
          {#each visibleGantt as segment, segmentIndex}
            <div
              class:idle={segment.processId === null}
              class="gantt-segment process-color-{segment.processId
                ? (trace.processes.findIndex((process) => process.id === segment.processId) % 5) + 1
                : 0}"
              style={`flex-grow: ${segment.end - segment.start}`}
              aria-label={`${segment.processId ?? 'CPU idle'} from ${segment.start} to ${segment.end}`}
            >
              <strong>{segment.processId ?? 'Idle'}</strong>
              <span>{segment.start} → {segment.end}</span>
              {#if segmentIndex === visibleGantt.length - 1}<i aria-hidden="true"></i>{/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <div class="queue-board" aria-label="Current scheduler state">
      <div>
        <span class="queue-label">Ready queue</span>
        <div class="queue-items">
          {#if step.readyProcessIds.length}
            {#each step.readyProcessIds as processId, queueIndex}
              <span><small>{queueIndex + 1}</small>{processId}</span>
            {/each}
          {:else}
            <em>Empty</em>
          {/if}
        </div>
      </div>
      <div class="running-slot">
        <span class="queue-label">Running</span>
        <strong class:empty={!step.runningProcessId}>{step.runningProcessId ?? 'CPU idle'}</strong>
      </div>
      <div>
        <span class="queue-label">Completed</span>
        <div class="completed-items">
          {#if step.completedProcessIds.length}
            {#each step.completedProcessIds as processId}<span>✓ {processId}</span>{/each}
          {:else}
            <em>None yet</em>
          {/if}
        </div>
      </div>
    </div>

    <div class="process-grid" aria-label="Remaining burst by process">
      {#each trace.processes as process}
        {@const status = processStatus(process.id)}
        {@const remaining = step.remainingBurst[process.id]}
        <article class:running={status === 'running'} class:completed={status === 'completed'}>
          <div class="process-title">
            <strong>{process.id}</strong><span class="status status-{status}">{status}</span>
          </div>
          <div class="remaining-row">
            <span>Remaining</span><b>{remaining} / {process.burst}</b>
          </div>
          <div class="burst-track" aria-hidden="true">
            <span style={`width: ${(remaining / process.burst) * 100}%`}></span>
          </div>
          <div class="process-facts">
            <span>Arrival {process.arrival}</span><span>Priority {process.priority}</span>
          </div>
        </article>
      {/each}
    </div>

    <TraceControls
      {index}
      total={trace.steps.length}
      {playing}
      onprevious={() => jump(index - 1)}
      onnext={() => jump(index + 1)}
      onrestart={restart}
      onplay={togglePlayback}
      onjump={jump}
    />
  </section>

  <aside class="lesson-side">
    <section class="step-card panel">
      <div class="step-meta">
        <span class="event event-{step.event}">{step.event}</span>
        <span>Step {index + 1} of {trace.steps.length}</span>
      </div>
      <h2>{step.title}</h2>
      <p>{step.explanation}</p>
      <dl>
        <div>
          <dt>Clock window</dt>
          <dd>{step.clock} → {step.nextClock}</dd>
        </div>
        <div>
          <dt>Context switches</dt>
          <dd>{step.contextSwitches}</dd>
        </div>
        <div>
          <dt>Not arrived</dt>
          <dd>{step.notArrivedProcessIds.join(', ') || 'None'}</dd>
        </div>
      </dl>
    </section>

    {#if step.prediction}
      {#key `${step.prediction.id}-${traceRevision}`}
        <PredictionCheckpoint
          challenge={step.prediction}
          submitted={predictionSubmitted}
          onsubmit={submitPrediction}
        />
      {/key}
      {#if predictionNudge}<p class="prediction-nudge" role="status">{predictionNudge}</p>{/if}
    {/if}

    <section class="metric-guide panel">
      <span class="eyebrow">Metric decoder</span>
      <dl>
        <div>
          <dt>Turnaround</dt>
          <dd>completion − arrival</dd>
        </div>
        <div>
          <dt>Waiting</dt>
          <dd>turnaround − burst</dd>
        </div>
        <div>
          <dt>Response</dt>
          <dd>first run − arrival</dd>
        </div>
      </dl>
      <p>Context switches count direct process-to-process changes. Dispatch after idle is free.</p>
    </section>
  </aside>
</div>

<section class="results" aria-labelledby="results-heading">
  <div class="section-heading">
    <div>
      <span class="eyebrow">4 · Inspect the outcome</span>
      <h2 id="results-heading">Per-process metrics</h2>
    </div>
    <div class="summary-pills">
      <span><b>{trace.metrics.makespan}</b> makespan</span>
      <span><b>{trace.metrics.contextSwitches}</b> switches</span>
      <span><b>{formatMetric(trace.metrics.cpuUtilization)}%</b> CPU use</span>
    </div>
  </div>
  {#if predictionSubmitted}
    <div class="table-wrap panel">
      <table>
        <thead>
          <tr>
            <th scope="col">Process</th>
            <th scope="col">Arrival</th>
            <th scope="col">Burst</th>
            <th scope="col">Priority</th>
            <th scope="col">First run</th>
            <th scope="col">Completion</th>
            <th scope="col">Waiting</th>
            <th scope="col">Turnaround</th>
            <th scope="col">Response</th>
          </tr>
        </thead>
        <tbody>
          {#each trace.processes as process}
            {@const metric = trace.metrics.byProcess[process.id]}
            <tr>
              <th scope="row">{process.id}</th>
              <td>{metric.arrival}</td>
              <td>{metric.burst}</td>
              <td>{metric.priority}</td>
              <td>{metric.firstStart}</td>
              <td>{metric.completion}</td>
              <td>{metric.waiting}</td>
              <td>{metric.turnaround}</td>
              <td>{metric.response}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colspan="6">Average</th>
            <td>{formatMetric(trace.metrics.averageWaiting)}</td>
            <td>{formatMetric(trace.metrics.averageTurnaround)}</td>
            <td>{formatMetric(trace.metrics.averageResponse)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  {:else}
    <div class="results-locked panel">
      <span aria-hidden="true">◇</span>
      <div>
        <strong>Metrics hidden until you predict</strong>
        <p>Lock the first dispatch above to reveal every process result.</p>
      </div>
    </div>
  {/if}
</section>

<section class="comparison" aria-labelledby="comparison-heading">
  <div class="section-heading">
    <div>
      <span class="eyebrow">Same workload · all policies</span>
      <h2 id="comparison-heading">Side-by-side comparison</h2>
    </div>
    <p>
      Round Robin uses q={comparison.quantum}. Lower averages are highlighted—not universally
      “better.”
    </p>
  </div>
  <div class="comparison-grid">
    {#each comparison.traces as candidate}
      <article class:active={candidate.algorithm === algorithm} class="panel">
        <div class="comparison-title">
          <div>
            <span>{candidate.algorithmInfo.preemptive ? 'Preemptive' : 'Non-preemptive'}</span>
            <h3>{candidate.algorithmInfo.shortName}</h3>
          </div>
          {#if candidate.algorithm === algorithm}<b>Viewing</b>{/if}
        </div>
        <dl>
          <div>
            <dt>Avg waiting</dt>
            <dd>{formatMetric(candidate.metrics.averageWaiting)}</dd>
          </div>
          <div>
            <dt>Avg turnaround</dt>
            <dd>{formatMetric(candidate.metrics.averageTurnaround)}</dd>
          </div>
          <div>
            <dt>Avg response</dt>
            <dd>{formatMetric(candidate.metrics.averageResponse)}</dd>
          </div>
          <div>
            <dt>Context switches</dt>
            <dd>{candidate.metrics.contextSwitches}</dd>
          </div>
          <div>
            <dt>Makespan</dt>
            <dd>{candidate.metrics.makespan}</dd>
          </div>
        </dl>
        <button type="button" onclick={() => chooseAlgorithm(candidate.algorithm)}>
          Replay {candidate.algorithmInfo.shortName}
        </button>
      </article>
    {/each}
  </div>
</section>

<style>
  .lesson-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 2rem;
    margin-bottom: 1.5rem;
  }
  .lesson-head > div:first-child {
    display: grid;
    gap: 0.35rem;
  }
  .lesson-head h1 {
    max-width: 850px;
    margin: 0.25rem 0;
    font-size: clamp(2.6rem, 6vw, 5rem);
  }
  .lesson-head p,
  .setup-copy p,
  .section-heading > p {
    color: var(--muted);
    margin: 0;
  }
  .back {
    width: max-content;
    color: var(--primary);
    font-size: 0.85rem;
    margin-bottom: 0.35rem;
  }
  .deterministic-badge {
    flex: none;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    color: var(--muted);
    border: 1px solid var(--border);
    background: rgba(14, 27, 45, 0.8);
    border-radius: 999px;
    padding: 0.55rem 0.8rem;
    font-size: 0.78rem;
  }
  .deterministic-badge span {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: var(--success);
    box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.12);
  }

  .setup {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 1.4rem;
    padding: 1.25rem;
  }
  .setup h2,
  .algorithm-picker h2,
  .section-heading h2 {
    margin: 0.35rem 0;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 1rem;
  }
  .presets button {
    padding: 0.45rem 0.65rem;
    font-size: 0.72rem;
  }
  .setup form,
  .setup form > div > div {
    display: grid;
    gap: 0.4rem;
  }
  label {
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 700;
  }
  textarea,
  input {
    width: 100%;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.7rem;
    font: 0.82rem/1.55 var(--mono);
  }
  textarea {
    resize: vertical;
    min-height: 8.4rem;
  }
  .form-actions {
    display: grid;
    grid-template-columns: 150px auto;
    justify-content: end;
    align-items: end;
    gap: 0.6rem;
    margin-top: 0.25rem;
  }
  .error,
  .hint {
    margin: 0.2rem 0 0;
    font-size: 0.78rem;
  }
  .error {
    color: var(--danger);
  }
  .hint {
    color: var(--muted);
  }

  .algorithm-picker {
    margin: 2.2rem 0 1.2rem;
  }
  .picker-head,
  .section-heading,
  .stage-head,
  .process-title,
  .remaining-row,
  .comparison-title,
  .step-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  .mode-pill {
    color: var(--muted);
    background: rgba(168, 180, 199, 0.08);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.4rem 0.65rem;
    font-size: 0.72rem;
  }
  .mode-pill.preemptive {
    color: var(--warning);
    border-color: rgba(251, 191, 36, 0.35);
    background: rgba(251, 191, 36, 0.08);
  }
  .algorithm-tabs {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.55rem;
    margin: 0.8rem 0;
  }
  .algorithm-tabs button {
    display: grid;
    gap: 0.25rem;
    text-align: left;
    min-height: 4.25rem;
  }
  .algorithm-tabs button span {
    color: var(--muted);
    font-size: 0.68rem;
  }
  .algorithm-tabs button.selected {
    color: var(--primary);
    background: rgba(45, 212, 191, 0.1);
    border-color: var(--primary);
    box-shadow: inset 0 -2px 0 var(--primary);
  }
  .policy-note {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 1.25rem;
    padding: 0.8rem 1rem;
    border-radius: 13px;
  }
  .policy-note > div + div {
    border-left: 1px solid var(--border);
    padding-left: 1.25rem;
  }
  .policy-note p {
    color: var(--muted);
    margin: 0.25rem 0 0;
    font-size: 0.82rem;
  }

  .lab-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.7fr);
    gap: 1rem;
    align-items: start;
  }
  .scheduler-stage {
    min-width: 0;
    padding: 1rem;
  }
  .stage-head h2 {
    margin: 0.35rem 0;
  }
  .clock {
    display: grid;
    text-align: right;
  }
  .clock span {
    color: var(--muted);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .clock strong {
    color: var(--primary);
    font: 1.4rem var(--mono);
  }
  .gantt-scroll {
    overflow-x: auto;
    padding: 0.5rem 0 0.8rem;
  }
  .gantt {
    display: flex;
    min-width: max-content;
    min-height: 5.4rem;
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: linear-gradient(rgba(45, 212, 191, 0.035) 1px, transparent 1px), var(--bg);
    background-size: 100% 1.7rem;
  }
  .gantt-locked {
    min-width: min(660px, 75vw);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    color: var(--muted);
    font-size: 0.82rem;
  }
  .gantt-locked span {
    color: var(--primary);
  }
  .gantt-segment {
    position: relative;
    flex-basis: 4.3rem;
    min-width: 4.3rem;
    display: grid;
    align-content: center;
    gap: 0.2rem;
    padding: 0.6rem;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 8px;
    background: rgba(45, 212, 191, 0.18);
    color: #d9fffa;
  }
  .gantt-segment + .gantt-segment {
    margin-left: 0.25rem;
  }
  .gantt-segment span {
    color: rgba(248, 250, 252, 0.7);
    font: 0.65rem var(--mono);
  }
  .gantt-segment i {
    position: absolute;
    inset: -0.3rem -0.3rem -0.3rem auto;
    width: 2px;
    background: var(--primary);
    box-shadow: 0 0 10px var(--primary);
  }
  .gantt-segment.idle {
    color: var(--muted);
    background: repeating-linear-gradient(
      135deg,
      rgba(168, 180, 199, 0.11),
      rgba(168, 180, 199, 0.11) 5px,
      transparent 5px,
      transparent 10px
    );
  }
  .process-color-2 {
    background-color: rgba(56, 189, 248, 0.18);
  }
  .process-color-3 {
    background-color: rgba(155, 124, 255, 0.2);
  }
  .process-color-4 {
    background-color: rgba(251, 191, 36, 0.18);
  }
  .process-color-5 {
    background-color: rgba(251, 113, 133, 0.18);
  }

  .queue-board {
    display: grid;
    grid-template-columns: 1.2fr 0.65fr 1fr;
    gap: 0.65rem;
    padding: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: rgba(7, 17, 31, 0.48);
  }
  .queue-board > div {
    min-width: 0;
  }
  .queue-label {
    display: block;
    color: var(--muted);
    font-size: 0.65rem;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 0.45rem;
  }
  .queue-items,
  .completed-items {
    display: flex;
    gap: 0.3rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .queue-items span,
  .completed-items span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--raised);
    font: 0.75rem var(--mono);
  }
  .queue-items small {
    color: var(--muted);
  }
  .completed-items span {
    color: var(--success);
  }
  .queue-board em {
    color: var(--muted);
    font-size: 0.75rem;
  }
  .running-slot {
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    padding: 0 0.65rem;
  }
  .running-slot strong {
    display: block;
    color: #06231f;
    background: var(--primary);
    border-radius: 7px;
    padding: 0.38rem;
    text-align: center;
    font: 0.8rem var(--mono);
  }
  .running-slot strong.empty {
    color: var(--muted);
    background: var(--raised);
  }

  .process-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.55rem;
    margin: 0.75rem 0;
  }
  .process-grid article {
    min-width: 0;
    padding: 0.7rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: rgba(7, 17, 31, 0.5);
  }
  .process-grid article.running {
    border-color: var(--primary);
    box-shadow: inset 0 0 0 1px rgba(45, 212, 191, 0.22);
  }
  .process-grid article.completed {
    opacity: 0.72;
  }
  .process-title strong {
    font: 0.9rem var(--mono);
  }
  .status {
    color: var(--muted);
    font-size: 0.57rem;
    text-transform: uppercase;
  }
  .status-running {
    color: var(--primary);
  }
  .status-ready {
    color: var(--warning);
  }
  .status-completed {
    color: var(--success);
  }
  .remaining-row {
    color: var(--muted);
    margin: 0.65rem 0 0.3rem;
    font-size: 0.65rem;
  }
  .remaining-row b {
    color: var(--text);
    font-family: var(--mono);
  }
  .burst-track {
    height: 4px;
    overflow: hidden;
    border-radius: 99px;
    background: var(--border);
  }
  .burst-track span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--accent));
    transition: width 180ms ease;
  }
  .process-facts {
    display: flex;
    justify-content: space-between;
    gap: 0.2rem;
    color: var(--muted);
    margin-top: 0.45rem;
    font-size: 0.58rem;
  }

  .lesson-side {
    display: grid;
    gap: 0.8rem;
  }
  .step-card,
  .metric-guide {
    padding: 1rem;
  }
  .step-meta {
    color: var(--muted);
    font-size: 0.68rem;
  }
  .event {
    color: var(--primary);
    border-radius: 99px;
    background: rgba(45, 212, 191, 0.1);
    padding: 0.25rem 0.45rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }
  .event-idle {
    color: var(--muted);
    background: rgba(168, 180, 199, 0.08);
  }
  .event-complete {
    color: var(--success);
    background: rgba(74, 222, 128, 0.09);
  }
  .step-card h2 {
    margin-top: 0.85rem;
    font-size: 1.35rem;
  }
  .step-card > p,
  .metric-guide > p {
    color: var(--muted);
    line-height: 1.55;
    font-size: 0.83rem;
  }
  .prediction-nudge {
    color: var(--warning);
    margin: -0.25rem 0 0;
    font-size: 0.75rem;
  }
  .step-card dl,
  .metric-guide dl,
  .comparison dl {
    margin: 0;
  }
  .step-card dl div,
  .metric-guide dl div,
  .comparison dl div {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    border-top: 1px solid var(--border);
    padding: 0.55rem 0;
    font-size: 0.75rem;
  }
  dt {
    color: var(--muted);
  }
  dd {
    margin: 0;
    text-align: right;
    font-family: var(--mono);
  }
  .metric-guide dl {
    margin-top: 0.7rem;
  }
  .metric-guide > p {
    font-size: 0.72rem;
    margin-bottom: 0;
  }

  .results,
  .comparison {
    margin-top: 2.5rem;
  }
  .summary-pills {
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: 0.4rem;
  }
  .summary-pills span {
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.4rem 0.6rem;
    font-size: 0.68rem;
  }
  .summary-pills b {
    color: var(--text);
    font-family: var(--mono);
  }
  .table-wrap {
    overflow-x: auto;
    margin-top: 0.8rem;
    border-radius: 14px;
  }
  .results-locked {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.8rem;
    min-height: 7rem;
    margin-top: 0.8rem;
    padding: 1rem;
    text-align: left;
  }
  .results-locked > span {
    color: var(--primary);
    font-size: 1.3rem;
  }
  .results-locked p {
    color: var(--muted);
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
  }
  table {
    width: 100%;
    min-width: 780px;
    border-collapse: collapse;
    font-size: 0.77rem;
  }
  th,
  td {
    border-bottom: 1px solid var(--border);
    padding: 0.7rem;
    text-align: right;
    font-family: var(--mono);
  }
  th:first-child {
    text-align: left;
  }
  thead th {
    color: var(--muted);
    background: rgba(7, 17, 31, 0.36);
    font: 0.65rem/1.3 inherit;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  tbody th {
    color: var(--primary);
  }
  tfoot th,
  tfoot td {
    color: var(--warning);
    border-bottom: 0;
  }

  .comparison .section-heading {
    align-items: end;
  }
  .comparison .section-heading p {
    max-width: 390px;
    text-align: right;
    font-size: 0.75rem;
  }
  .comparison-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(180px, 1fr));
    gap: 0.6rem;
    margin-top: 0.8rem;
  }
  .comparison-grid article {
    padding: 0.85rem;
    border-radius: 14px;
  }
  .comparison-grid article.active {
    border-color: var(--primary);
    box-shadow: inset 0 3px 0 var(--primary);
  }
  .comparison-title span {
    color: var(--muted);
    font-size: 0.58rem;
    text-transform: uppercase;
  }
  .comparison-title h3 {
    margin: 0.2rem 0;
    font-size: 1rem;
  }
  .comparison-title > b {
    color: var(--primary);
    font-size: 0.62rem;
  }
  .comparison dl {
    margin: 0.6rem 0;
  }
  .comparison dl div {
    font-size: 0.65rem;
    padding: 0.42rem 0;
  }
  .comparison article button {
    width: 100%;
    padding: 0.5rem;
    font-size: 0.68rem;
  }

  @media (max-width: 1020px) {
    .algorithm-tabs {
      grid-template-columns: repeat(3, 1fr);
    }
    .lab-grid {
      grid-template-columns: 1fr;
    }
    .lesson-side {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .lesson-side > :first-child {
      grid-column: 1 / -1;
    }
    .comparison-grid {
      grid-template-columns: repeat(3, minmax(180px, 1fr));
    }
  }
  @media (max-width: 720px) {
    .lesson-head,
    .picker-head,
    .section-heading {
      align-items: start;
      flex-direction: column;
    }
    .deterministic-badge {
      align-self: start;
    }
    .setup,
    .policy-note {
      grid-template-columns: 1fr;
    }
    .policy-note > div + div {
      border-left: 0;
      border-top: 1px solid var(--border);
      padding: 0.7rem 0 0;
    }
    .algorithm-tabs {
      grid-template-columns: repeat(2, 1fr);
    }
    .queue-board {
      grid-template-columns: 1fr;
    }
    .running-slot {
      border: 0;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      padding: 0.6rem 0;
    }
    .process-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .lesson-side,
    .comparison-grid {
      grid-template-columns: 1fr;
    }
    .lesson-side > :first-child {
      grid-column: auto;
    }
    .comparison .section-heading p {
      text-align: left;
    }
    .summary-pills {
      justify-content: start;
    }
  }
  @media (max-width: 480px) {
    .form-actions,
    .algorithm-tabs,
    .process-grid {
      grid-template-columns: 1fr;
    }
    .form-actions {
      justify-content: stretch;
    }
    .lesson-head h1 {
      font-size: 2.45rem;
    }
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import AiMentor from '$lib/components/ai/AiMentor.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import {
    PACKET_JOURNEY_SCENARIOS,
    createPacketJourney,
    type PacketCacheMode,
    type PacketJourneyNode,
    type PacketJourneyScenarioId
  } from '$lib/engines/networks/packetJourney';
  import {
    awardPrediction,
    completeLesson,
    loadProgress,
    recordMisconception,
    saveProgress
  } from '$lib/progress/store';
  import type { StepContext } from '$lib/server/openai/schemas';

  const topologyNodes: Array<{
    id: PacketJourneyNode;
    label: string;
    detail: string;
    symbol: string;
  }> = [
    { id: 'browser', label: 'Browser', detail: 'cache + navigation', symbol: 'B' },
    { id: 'client-stack', label: 'Client stack', detail: '192.0.2.10', symbol: 'C' },
    { id: 'lan', label: 'LAN', detail: 'one switched hop', symbol: 'L' },
    { id: 'router', label: 'Gateway', detail: '192.0.2.1', symbol: 'R' },
    { id: 'internet', label: 'Routed path', detail: 'collapsed hops', symbol: '↗' },
    { id: 'web-server', label: 'Web origin', detail: '203.0.113.x', symbol: 'W' }
  ];

  const initialTrace = createPacketJourney();
  let scenarioId = $state<PacketJourneyScenarioId>('lesson-page');
  let cacheMode = $state<PacketCacheMode>('cold');
  let trace = $state(initialTrace);
  let index = $state(0);
  let playing = $state(false);
  let selectedPrediction = $state('');
  let predictionSubmitted = $state(false);
  let predictionCorrect = $state<boolean | null>(null);
  let predictionAnswer = $state('');
  let predictionNudge = $state('');
  let progress = $state(loadProgress());
  let timer: ReturnType<typeof setInterval> | undefined;

  let step = $derived(trace.steps[index]);
  let lessonId = $derived(trace.id);
  let completed = $derived(progress.completed.includes('packet-journey'));
  let checkpointIndex = $derived(trace.steps.findIndex((candidate) => candidate.prediction));
  let checkpointLocked = $derived(Boolean(step.prediction && !predictionSubmitted));
  let completion = $derived(Math.round(((index + 1) / trace.steps.length) * 100));

  onMount(() => {
    progress = loadProgress();
    function handleKeydown(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          'a, button, input, select, textarea, summary, [role="button"], [contenteditable="true"]'
        )
      )
        return;
      if (event.key === 'ArrowLeft') jump(index - 1);
      if (event.key === 'ArrowRight') jump(index + 1);
      if (event.key === ' ') {
        event.preventDefault();
        togglePlayback();
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  function stopPlayback() {
    playing = false;
    clearInterval(timer);
  }

  function resetRun() {
    stopPlayback();
    index = 0;
    selectedPrediction = '';
    predictionSubmitted = false;
    predictionCorrect = null;
    predictionAnswer = '';
    predictionNudge = '';
  }

  function buildJourney(event?: SubmitEvent) {
    event?.preventDefault();
    trace = createPacketJourney({ scenarioId, cacheMode });
    resetRun();
  }

  function jump(nextIndex: number) {
    const bounded = Math.max(0, Math.min(nextIndex, trace.steps.length - 1));
    if (checkpointIndex >= 0 && bounded > checkpointIndex && !predictionSubmitted) {
      index = checkpointIndex;
      predictionNudge = 'Lock a prediction before revealing the next event.';
      stopPlayback();
      return;
    }
    predictionNudge = '';
    index = bounded;
    if (index === trace.steps.length - 1) {
      stopPlayback();
      progress = completeLesson(progress, 'packet-journey');
      saveProgress(progress);
    }
  }

  function restart() {
    resetRun();
  }

  function togglePlayback() {
    if (playing) {
      stopPlayback();
      return;
    }
    if (index === trace.steps.length - 1) index = 0;
    if (checkpointIndex === 0 && !predictionSubmitted) {
      predictionNudge = 'Lock the cache prediction before playing the journey.';
      return;
    }
    playing = true;
    timer = setInterval(() => {
      if (index >= trace.steps.length - 1) stopPlayback();
      else jump(index + 1);
    }, 1050);
  }

  function submitPrediction(event: SubmitEvent) {
    event.preventDefault();
    if (!step.prediction || !selectedPrediction) return;
    predictionCorrect = String(step.prediction.correctAnswer) === selectedPrediction;
    predictionAnswer = selectedPrediction;
    predictionSubmitted = true;
    predictionNudge = '';
    const evidenceId = `packet-journey:${scenarioId}:${trace.cacheMode}:${step.prediction.id}`;
    progress = predictionCorrect
      ? awardPrediction(
          progress,
          `packet-journey:${trace.cacheMode}:checkpoint`,
          step.prediction.xpReward
        )
      : recordMisconception(
          progress,
          evidenceId,
          trace.cacheMode === 'warm' ? 'cache-vs-network' : 'ip-vs-mac'
        );
    saveProgress(progress);
  }

  function isActive(node: PacketJourneyNode): boolean {
    return step.activeNodes.includes(node);
  }

  function mentorContext(): StepContext {
    const previous = trace.steps[Math.max(0, index - 1)];
    return {
      subject: 'computer-networks',
      lesson: lessonId,
      learningObjective:
        'Explain how a browser request moves through cache, DNS, local networking, transport security, HTTP, and rendering.',
      activeSourceLines: [],
      stateBefore: {
        phase: index === 0 ? 'navigation-start' : previous.phase,
        protocol: index === 0 ? 'Browser' : previous.protocol,
        activeNodes: index === 0 ? ['browser'] : previous.activeNodes
      },
      mutation: [
        {
          direction: step.encapsulation.direction,
          addedHeaders: step.encapsulation.addedHeaders,
          removedHeaders: step.encapsulation.removedHeaders
        }
      ],
      stateAfter: {
        phase: step.phase,
        protocol: step.protocol,
        tcpIpLayer: step.tcpIpLayer,
        addressing: step.addressing,
        activeNodes: step.activeNodes
      },
      deterministicExplanation: `${step.summary} ${step.explanation}`,
      learnerLevel: progress.learnerLevel,
      misconceptionTags:
        predictionCorrect === false
          ? [trace.cacheMode === 'warm' ? 'cache-vs-network' : 'ip-vs-mac']
          : [],
      interaction: 'explain',
      explanationLevel: progress.explanationLevel,
      explanationLanguage: progress.explanationLanguage,
      currentPrediction: step.prediction
        ? {
            prompt: step.prediction.prompt,
            learnerAnswer: predictionAnswer || undefined,
            correctAnswer: String(step.prediction.correctAnswer)
          }
        : undefined
    };
  }
</script>

<svelte:head>
  <title>Packet Journey · ReplayCS</title>
  <meta
    name="description"
    content="Predict and replay a deterministic browser-to-server packet journey through DNS, ARP, TCP, TLS, HTTP, and rendering."
  />
</svelte:head>

<div class="lesson-head">
  <div>
    <a class="back" href="/learn/computer-networks">← Computer Networks</a>
    <span class="eyebrow">Flagship protocol trace</span>
    <h1>Packet <span class="gradient">Journey</span></h1>
    <p>
      Follow one URL from browser cache to rendered bytes. Inspect what changes at every layer—and
      what does not.
    </p>
  </div>
  <div class="run-card panel" aria-label="Current journey summary">
    <span class="live-dot" aria-hidden="true"></span>
    <div>
      <strong>{trace.cacheMode === 'cold' ? 'Full network path' : 'Fresh cache path'}</strong>
      <span>{trace.steps.length} deterministic events · no live traffic · ⚡ {progress.xp} XP</span>
    </div>
  </div>
</div>

<aside class="disclaimer" role="note" aria-label="Important simplification notice">
  <strong>Deliberately simplified</strong>
  <span>{trace.disclaimer}</span>
</aside>

<form class="scenario panel" onsubmit={buildJourney}>
  <div class="scenario-copy">
    <span class="eyebrow">Scenario controls</span>
    <h2>Choose a bounded journey</h2>
    <p>Every run is generated locally from fixed teaching data.</p>
  </div>
  <label>
    <span>Destination</span>
    <select bind:value={scenarioId}>
      {#each Object.values(PACKET_JOURNEY_SCENARIOS) as scenario}
        <option value={scenario.id}>{scenario.name}</option>
      {/each}
    </select>
  </label>
  <label>
    <span>Browser response cache</span>
    <select bind:value={cacheMode}>
      <option value="cold">Cold · fetch required</option>
      <option value="warm">Warm · fresh response</option>
    </select>
  </label>
  <button class="primary" type="submit">Build journey</button>
  <div class="url-preview">
    <span>Reserved example URL</span>
    <code>{PACKET_JOURNEY_SCENARIOS[scenarioId].url}</code>
  </div>
</form>

<section class="timeline-section" aria-labelledby="timeline-heading">
  <div class="section-head">
    <div>
      <span class="eyebrow">Event timeline</span>
      <h2 id="timeline-heading">URL → render</h2>
    </div>
    <span class="progress-copy">{completion}% replayed</span>
  </div>
  <div class="progress-track" aria-hidden="true">
    <span style={`width: ${completion}%`}></span>
  </div>
  <ol class="event-strip">
    {#each trace.steps as event}
      <li>
        <button
          type="button"
          class:active={event.index === index}
          class:visited={event.index < index}
          aria-current={event.index === index ? 'step' : undefined}
          onclick={() => jump(event.index)}
        >
          <span>{event.index + 1}</span>
          {event.shortLabel}
        </button>
      </li>
    {/each}
  </ol>
</section>

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
<p class="keyboard-hint">Keyboard: ← previous · → next · Space play/pause</p>

{#if predictionNudge}
  <p class="prediction-nudge" role="alert">{predictionNudge}</p>
{/if}

{#if step.prediction}
  <form class="prediction panel" onsubmit={submitPrediction}>
    <div>
      <span class="eyebrow">Prediction checkpoint · {step.prediction.xpReward} XP</span>
      <h2>{step.prediction.prompt}</h2>
    </div>
    <fieldset disabled={predictionSubmitted}>
      <legend class="sr-only">Choose one prediction</legend>
      {#each step.prediction.options ?? [] as option}
        <label class:selected={selectedPrediction === String(option.value)}>
          <input type="radio" bind:group={selectedPrediction} value={String(option.value)} />
          <span>{option.label}</span>
        </label>
      {/each}
    </fieldset>
    <button class="primary" type="submit" disabled={!selectedPrediction || predictionSubmitted}
      >Lock prediction</button
    >
    {#if predictionCorrect !== null}
      <p class:correct={predictionCorrect} class="prediction-result" role="status">
        <strong>{predictionCorrect ? 'Correct.' : 'Replay the distinction.'}</strong>
        {step.prediction.explanation}
      </p>
    {/if}
  </form>
{/if}

{#if checkpointLocked}
  <section class="checkpoint-lock panel" role="note">
    <strong>Prediction first</strong>
    <p>Commit to the next network event before ReplayCS reveals this event’s packet state.</p>
  </section>
{:else}
  <section class="topology panel" aria-labelledby="topology-heading">
    <div class="panel-title">
      <div>
        <span class="eyebrow">Where the event happens</span>
        <h2 id="topology-heading">Illustrated topology</h2>
      </div>
      <span class="protocol-pill">{step.protocol}</span>
    </div>
    <div class="topology-scroll">
      <div
        class="main-path"
        aria-label="Browser, client, LAN, gateway, routed path, and web origin"
      >
        {#each topologyNodes as node, nodeIndex}
          <article class:active={isActive(node.id)}>
            <span class="node-symbol" aria-hidden="true">{node.symbol}</span>
            <strong>{node.label}</strong>
            <small>{node.detail}</small>
          </article>
          {#if nodeIndex < topologyNodes.length - 1}
            <span
              class:active-link={isActive(node.id) && isActive(topologyNodes[nodeIndex + 1].id)}
              class="arrow"
              aria-hidden="true">⇄</span
            >
          {/if}
        {/each}
      </div>
      <div class="branch-paths">
        <article class:active={isActive('dns-resolver')}>
          <span class="node-symbol" aria-hidden="true">D</span>
          <div><strong>DNS resolver</strong><small>198.51.100.53 · routed branch</small></div>
        </article>
        <article class:active={isActive('renderer')}>
          <span class="node-symbol" aria-hidden="true">▦</span>
          <div><strong>Renderer</strong><small>local browser handoff</small></div>
        </article>
      </div>
    </div>
    <p class="sr-only" aria-live="polite">
      Active at step {index + 1}: {step.activeNodes.join(', ')}.
    </p>
  </section>

  <div class="step-grid" aria-live="polite">
    <section class="event-detail panel" aria-labelledby="event-heading">
      <div class="step-count">Event {index + 1} of {trace.steps.length}</div>
      <span class="eyebrow">{step.phase.replace('-', ' ')}</span>
      <h2 id="event-heading">{step.title}</h2>
      <p class="summary">{step.summary}</p>
      <p>{step.explanation}</p>
      {#if step.simplification}
        <div class="step-simplification">
          <strong>What this step compresses</strong>
          <span>{step.simplification}</span>
        </div>
      {/if}
    </section>

    <section class="layer-panel panel" aria-labelledby="layer-heading">
      <span class="eyebrow">Layer lens</span>
      <h2 id="layer-heading">Where it fits</h2>
      <dl>
        <div>
          <dt>TCP/IP model</dt>
          <dd>{step.tcpIpLayer}</dd>
        </div>
        <div>
          <dt>OSI teaching map</dt>
          <dd>{step.osiLayer}</dd>
        </div>
      </dl>
      <div class="layer-chips" aria-label="Layers and protocols touched">
        {#each step.layersTouched as layer}<span>{layer}</span>{/each}
      </div>
    </section>
  </div>

  <section class="envelope panel" aria-labelledby="envelope-heading">
    <div class="panel-title">
      <div>
        <span class="eyebrow">Frame / packet / segment</span>
        <h2 id="envelope-heading">Current envelopes</h2>
      </div>
      <span class={`direction ${step.encapsulation.direction}`}>{step.encapsulation.direction}</span
      >
    </div>
    <p class="envelope-explanation">{step.encapsulation.label}</p>
    <div class="unit-stack">
      <article class:empty={!step.units.link} class="link-unit">
        <span>Link · Ethernet frame</span>
        <code>{step.units.link ?? 'No link frame at this local step'}</code>
      </article>
      <article class:empty={!step.units.network} class="network-unit">
        <span>Internet · IP packet</span>
        <code>{step.units.network ?? 'No IP packet'}</code>
      </article>
      <article class:empty={!step.units.transport} class="transport-unit">
        <span>Transport · segment / datagram</span>
        <code>{step.units.transport ?? 'No transport unit'}</code>
      </article>
      <article class:empty={!step.units.application} class="application-unit">
        <span>Application data</span>
        <code>{step.units.application ?? 'No application payload in this control event'}</code>
      </article>
    </div>
    <div class="header-delta">
      <div>
        <strong>Added here</strong>
        <span>{step.encapsulation.addedHeaders.join(' · ') || 'none'}</span>
      </div>
      <div>
        <strong>Removed here</strong>
        <span>{step.encapsulation.removedHeaders.join(' · ') || 'none'}</span>
      </div>
    </div>
  </section>

  <section class="addressing panel" aria-labelledby="address-heading">
    <div class="panel-title">
      <div>
        <span class="eyebrow">Address inspection</span>
        <h2 id="address-heading">Source → destination</h2>
      </div>
      <span class="scope-pill">MAC = this hop only</span>
    </div>
    <div class="address-grid">
      <article>
        <h3>Link hop · MAC</h3>
        <dl>
          <div>
            <dt>Source</dt>
            <dd><code>{step.addressing.sourceMac}</code></dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd><code>{step.addressing.destinationMac}</code></dd>
          </div>
        </dl>
        <p>{step.addressing.macHop}</p>
      </article>
      <article>
        <h3>Network · IPv4</h3>
        <dl>
          <div>
            <dt>Source</dt>
            <dd><code>{step.addressing.sourceIp}</code></dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd><code>{step.addressing.destinationIp}</code></dd>
          </div>
        </dl>
        <p>IP identifies the illustrated end hosts; routers forward between links.</p>
      </article>
      <article>
        <h3>Transport · port</h3>
        <dl>
          <div>
            <dt>Source</dt>
            <dd><code>{step.addressing.sourcePort}</code></dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd><code>{step.addressing.destinationPort}</code></dd>
          </div>
        </dl>
        <p>Ports select the endpoint service or client socket when transport is in use.</p>
      </article>
    </div>
  </section>
{/if}

<section class="panel mentor-panel" aria-label="Grounded packet mentor">
  {#if completed}<p class="completion" role="status">✓ Journey complete · mastery saved</p>{/if}
  {#if checkpointLocked}
    <p class="mentor-locked" role="note">Lock the packet prediction before asking the mentor.</p>
  {:else}
    {#key `${lessonId}:${step.id}`}<AiMentor context={mentorContext()} />{/key}
  {/if}
</section>

<details class="assumptions panel">
  <summary>Simulation assumptions and learning boundaries</summary>
  <ul>
    {#each trace.assumptions as assumption}<li>{assumption}</li>{/each}
  </ul>
  <p>
    Address safety: <code>.example</code> names are reserved for examples;
    <code>192.0.2.0/24</code>,
    <code>198.51.100.0/24</code>, and <code>203.0.113.0/24</code> are documentation networks. MACs
    beginning with <code>02:</code> are illustrative locally administered values.
  </p>
</details>

<style>
  .lesson-head {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 2rem;
    margin-bottom: 1.2rem;
  }
  .mentor-panel {
    margin-top: 1rem;
    padding: 1rem;
  }
  .completion {
    margin: 0;
    color: var(--success);
    font-size: 0.8rem;
    font-weight: 750;
  }
  .checkpoint-lock {
    display: grid;
    min-height: 12rem;
    place-content: center;
    margin-top: 1rem;
    padding: 1rem;
    border-style: dashed;
    text-align: center;
  }
  .checkpoint-lock strong,
  .mentor-locked {
    color: var(--warning);
  }
  .checkpoint-lock p,
  .mentor-locked {
    margin: 0.35rem 0 0;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .lesson-head > div:first-child {
    max-width: 760px;
  }

  .back {
    display: block;
    width: fit-content;
    margin-bottom: 1.5rem;
    color: var(--primary);
  }

  .lesson-head h1 {
    margin: 0.45rem 0 0.8rem;
  }

  .lesson-head p {
    max-width: 680px;
    color: var(--muted);
    font-size: 1.05rem;
    line-height: 1.65;
  }

  .run-card {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    min-width: 255px;
    padding: 1rem;
  }

  .run-card div,
  .run-card span {
    display: block;
  }

  .run-card div > span {
    margin-top: 0.25rem;
    color: var(--muted);
    font-size: 0.76rem;
  }

  .live-dot {
    width: 12px;
    height: 12px;
    flex: 0 0 12px;
    border-radius: 50%;
    background: var(--success);
    box-shadow: 0 0 0 5px #4ade8018;
  }

  .disclaimer {
    position: sticky;
    top: 76px;
    z-index: 8;
    display: flex;
    gap: 0.7rem;
    align-items: baseline;
    margin: 0 0 1.2rem;
    padding: 0.72rem 0.9rem;
    border: 1px solid #fbbf2455;
    border-radius: 12px;
    background: rgba(30, 31, 35, 0.96);
    box-shadow: 0 8px 24px #0006;
    color: #f8e8b0;
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .disclaimer strong {
    flex: 0 0 auto;
    color: var(--warning);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .scenario {
    display: grid;
    grid-template-columns: 1.25fr 1fr 1fr auto;
    align-items: end;
    gap: 1rem;
    padding: 1.15rem;
  }

  .scenario h2 {
    margin: 0.25rem 0;
    font-size: 1.2rem;
  }

  .scenario p {
    margin: 0;
    color: var(--muted);
    font-size: 0.82rem;
  }

  .scenario label > span,
  .url-preview span {
    display: block;
    margin-bottom: 0.4rem;
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 700;
  }

  select {
    width: 100%;
    padding: 0.7rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
  }

  select:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }

  .url-preview {
    grid-column: 2 / -1;
    min-width: 0;
  }

  .url-preview code {
    display: block;
    overflow: hidden;
    color: #c8f7f0;
    font: 0.8rem var(--mono);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timeline-section {
    margin-top: 2.5rem;
  }

  .section-head,
  .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .section-head h2,
  .panel-title h2 {
    margin: 0.3rem 0;
    font-size: 1.55rem;
  }

  .progress-copy {
    color: var(--muted);
    font-size: 0.8rem;
  }

  .progress-track {
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--border);
  }

  .progress-track span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--accent));
    transition: width 180ms ease;
  }

  .event-strip {
    display: flex;
    gap: 0.4rem;
    margin: 0;
    padding: 0.8rem 0 1rem;
    overflow-x: auto;
    list-style: none;
    scrollbar-color: var(--border) transparent;
  }

  .event-strip button {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    min-width: max-content;
    padding: 0.5rem 0.65rem;
    color: var(--muted);
    font-size: 0.72rem;
  }

  .event-strip button span {
    display: grid;
    width: 20px;
    height: 20px;
    place-items: center;
    border-radius: 50%;
    background: var(--bg);
    font-size: 0.65rem;
  }

  .event-strip button.visited {
    border-color: #4ade8055;
    color: var(--success);
  }

  .event-strip button.active {
    border-color: var(--primary);
    background: #2dd4bf18;
    color: var(--primary);
  }

  .keyboard-hint {
    margin: 0.45rem 0 1.3rem;
    color: var(--muted);
    text-align: right;
    font-size: 0.72rem;
  }

  .prediction-nudge {
    margin: 0 0 1rem;
    color: var(--warning);
    text-align: center;
  }

  .prediction {
    display: grid;
    grid-template-columns: 1.2fr 1fr auto;
    gap: 1rem;
    align-items: center;
    margin: 0 0 1.25rem;
    padding: 1.1rem;
    border-color: #fbbf2455;
    background: linear-gradient(145deg, #312714cc, #171d2acc);
  }

  .prediction h2 {
    margin: 0.35rem 0 0;
    font-size: 1.15rem;
    line-height: 1.35;
  }

  .prediction fieldset {
    display: grid;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .prediction fieldset label {
    display: flex;
    gap: 0.55rem;
    align-items: center;
    padding: 0.52rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .prediction fieldset label.selected {
    border-color: var(--warning);
    background: #fbbf2410;
  }

  .prediction input {
    accent-color: var(--warning);
  }

  .prediction-result {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--warning);
    font-size: 0.86rem;
  }

  .prediction-result.correct {
    color: var(--success);
  }

  .prediction-result strong {
    margin-right: 0.3rem;
  }

  .topology {
    padding: 1.15rem;
  }

  .protocol-pill,
  .scope-pill,
  .direction {
    display: inline-flex;
    padding: 0.35rem 0.65rem;
    border: 1px solid #38bdf844;
    border-radius: 999px;
    background: #38bdf811;
    color: var(--accent);
    font-size: 0.72rem;
    font-weight: 800;
  }

  .topology-scroll {
    margin-top: 1.2rem;
    overflow-x: auto;
    padding-bottom: 0.3rem;
  }

  .main-path {
    display: grid;
    grid-template-columns: repeat(5, minmax(108px, 1fr) 28px) minmax(108px, 1fr);
    align-items: center;
    min-width: 830px;
  }

  .main-path article,
  .branch-paths article {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 112px;
    justify-content: center;
    padding: 0.65rem;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--bg);
    color: var(--muted);
    text-align: center;
    transition:
      border-color 160ms ease,
      transform 160ms ease,
      background 160ms ease;
  }

  .main-path article.active,
  .branch-paths article.active {
    transform: translateY(-3px);
    border-color: var(--primary);
    background: #2dd4bf12;
    color: var(--text);
    box-shadow: 0 10px 24px #0005;
  }

  .main-path small,
  .branch-paths small {
    display: block;
    margin-top: 0.28rem;
    color: var(--muted);
    font-size: 0.65rem;
  }

  .node-symbol {
    display: grid;
    width: 34px;
    height: 34px;
    margin-bottom: 0.45rem;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--raised);
    color: var(--primary);
    font: 800 0.86rem var(--mono);
  }

  .arrow {
    color: var(--border);
    text-align: center;
  }

  .arrow.active-link {
    color: var(--primary);
  }

  .branch-paths {
    display: grid;
    grid-template-columns: repeat(2, minmax(220px, 1fr));
    gap: 0.7rem;
    max-width: 600px;
    min-width: 500px;
    margin: 0.8rem auto 0;
  }

  .branch-paths article {
    flex-direction: row;
    min-height: 72px;
    gap: 0.7rem;
    text-align: left;
  }

  .branch-paths .node-symbol {
    flex: 0 0 34px;
    margin: 0;
  }

  .step-grid {
    display: grid;
    grid-template-columns: 1.45fr 0.85fr;
    gap: 1rem;
    margin-top: 1rem;
  }

  .event-detail,
  .layer-panel,
  .envelope,
  .addressing,
  .assumptions {
    padding: 1.2rem;
  }

  .step-count {
    float: right;
    color: var(--muted);
    font-size: 0.73rem;
  }

  .event-detail h2,
  .layer-panel h2 {
    margin: 0.4rem 0 0.7rem;
    font-size: 1.5rem;
  }

  .event-detail > p {
    color: var(--muted);
    line-height: 1.65;
  }

  .event-detail .summary {
    color: var(--text);
    font-size: 1.03rem;
    font-weight: 700;
  }

  .step-simplification {
    display: grid;
    gap: 0.3rem;
    margin-top: 1rem;
    padding: 0.75rem;
    border-left: 3px solid var(--warning);
    background: #fbbf240c;
    color: var(--muted);
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .step-simplification strong {
    color: var(--warning);
  }

  .layer-panel dl {
    display: grid;
    gap: 0.7rem;
    margin: 1rem 0;
  }

  .layer-panel dl div {
    padding: 0.7rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
  }

  dt {
    color: var(--muted);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  dd {
    margin: 0.35rem 0 0;
  }

  .layer-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .layer-chips span {
    padding: 0.3rem 0.5rem;
    border-radius: 7px;
    background: #9b7cff14;
    color: #cbbcff;
    font-size: 0.68rem;
  }

  .envelope,
  .addressing,
  .assumptions {
    margin-top: 1rem;
  }

  .direction {
    border-color: #9b7cff44;
    background: #9b7cff11;
    color: #cbbcff;
    text-transform: capitalize;
  }

  .direction.decapsulate {
    border-color: #4ade8044;
    background: #4ade8011;
    color: var(--success);
  }

  .direction.replace-link {
    border-color: #fbbf2444;
    background: #fbbf2411;
    color: var(--warning);
  }

  .envelope-explanation {
    color: var(--muted);
  }

  .unit-stack {
    display: grid;
    gap: 0.42rem;
    padding: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--bg);
  }

  .unit-stack article {
    display: grid;
    grid-template-columns: 190px 1fr;
    gap: 0.7rem;
    align-items: center;
    min-width: 0;
    padding: 0.7rem;
    border: 1px solid;
    border-radius: 10px;
  }

  .unit-stack article > span {
    font-size: 0.73rem;
    font-weight: 800;
  }

  .unit-stack code,
  .address-grid code,
  .assumptions code {
    overflow-wrap: anywhere;
    color: #d8e8fa;
    font: 0.78rem/1.45 var(--mono);
  }

  .link-unit {
    border-color: #2dd4bf66 !important;
    background: #2dd4bf0b;
  }

  .network-unit {
    margin-inline: 1.1rem;
    border-color: #38bdf866 !important;
    background: #38bdf80b;
  }

  .transport-unit {
    margin-inline: 2.2rem;
    border-color: #9b7cff66 !important;
    background: #9b7cff0b;
  }

  .application-unit {
    margin-inline: 3.3rem;
    border-color: #fbbf2466 !important;
    background: #fbbf240b;
  }

  .unit-stack article.empty {
    border-style: dashed;
    opacity: 0.45;
  }

  .header-delta {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.7rem;
    margin-top: 0.8rem;
  }

  .header-delta div {
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 10px;
  }

  .header-delta strong,
  .header-delta span {
    display: block;
    font-size: 0.73rem;
  }

  .header-delta span {
    margin-top: 0.3rem;
    color: var(--muted);
  }

  .scope-pill {
    border-color: #fbbf2444;
    background: #fbbf2411;
    color: var(--warning);
  }

  .address-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.7rem;
    margin-top: 1rem;
  }

  .address-grid article {
    min-width: 0;
    padding: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg);
  }

  .address-grid h3 {
    margin: 0 0 0.8rem;
    color: var(--primary);
    font-size: 0.86rem;
  }

  .address-grid dl {
    display: grid;
    gap: 0.6rem;
    margin: 0;
  }

  .address-grid dl div {
    min-width: 0;
  }

  .address-grid p {
    margin: 0.9rem 0 0;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.5;
  }

  .assumptions summary {
    color: var(--primary);
    cursor: pointer;
    font-weight: 800;
  }

  .assumptions li,
  .assumptions p {
    color: var(--muted);
    line-height: 1.6;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 920px) {
    .lesson-head {
      display: grid;
    }

    .run-card {
      width: fit-content;
    }

    .scenario {
      grid-template-columns: repeat(2, 1fr);
    }

    .scenario-copy,
    .url-preview {
      grid-column: 1 / -1;
    }

    .scenario button {
      justify-self: start;
    }

    .prediction {
      grid-template-columns: 1fr;
    }

    .prediction-result {
      grid-column: 1;
    }

    .step-grid {
      grid-template-columns: 1fr;
    }

    .address-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 620px) {
    .lesson-head h1 {
      font-size: 3.1rem;
    }

    .disclaimer {
      top: 70px;
      align-items: flex-start;
      flex-direction: column;
      max-height: 120px;
      overflow: auto;
    }

    .scenario {
      grid-template-columns: 1fr;
    }

    .scenario-copy,
    .url-preview {
      grid-column: 1;
    }

    .section-head,
    .panel-title {
      align-items: flex-start;
      flex-direction: column;
    }

    .keyboard-hint {
      display: none;
    }

    .branch-paths {
      grid-template-columns: 1fr;
      min-width: 250px;
    }

    .unit-stack article {
      grid-template-columns: 1fr;
      gap: 0.35rem;
    }

    .network-unit,
    .transport-unit,
    .application-unit {
      margin-inline: 0;
    }

    .header-delta {
      grid-template-columns: 1fr;
    }
  }
</style>

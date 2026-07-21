<script lang="ts">
  import { onMount } from 'svelte';

  const CHECKLIST_KEY = 'replaycs-judge-demo-v1';

  const stages = [
    {
      id: 'binary-search',
      number: '01',
      duration: '90 sec',
      title: 'Predict, diverge, and recover',
      subject: 'DSA I · Binary Search',
      href: '/lesson/dsa-1/binary-search?values=2%2C5%2C8%2C12%2C16%2C23%2C38%2C56&target=23&lang=python&step=2',
      cta: 'Open Binary Search',
      outcome: 'One stop shows the core ReplayCS loop and its safe explanation path.',
      actions: [
        'Enter 4 as the midpoint prediction and lock it. Replay the first divergence, then recover with 3.',
        'Switch Python to C, C++, or Java. The selected semantic operation stays aligned.',
        'Choose “Explain this step.” The mentor uses GPT-5.6 when configured and a clearly labeled deterministic fallback otherwise.'
      ],
      evidence:
        'Look for recovered XP, the same Step 3 across languages, and a source label on the mentor response.'
    },
    {
      id: 'sql-pipeline',
      number: '02',
      duration: '25 sec',
      title: 'Trace rows through SQL clauses',
      subject: 'DBMS · SQL Query Pipeline',
      href: '/lesson/dbms/query-pipeline?scenario=dhaka-department-capacity&step=3',
      cta: 'Open SQL Pipeline',
      outcome:
        'Move from source relations to a result without pretending a logical order is an optimizer plan.',
      actions: [
        'Compare the logical teaching order with the explicitly illustrative physical plan.',
        'Inspect the before/after relation at GROUP BY, then predict HAVING for the aggregate filter.'
      ],
      evidence:
        'Look for fixed in-memory HR data, NULL-aware LEFT JOIN behavior, and row-count deltas.'
    },
    {
      id: 'cpu-scheduling',
      number: '03',
      duration: '25 sec',
      title: 'Replay a scheduler decision',
      subject: 'Operating Systems · CPU Scheduling',
      href: '/lesson/operating-systems/cpu-scheduling#algorithm-heading',
      cta: 'Open CPU Scheduling',
      outcome: 'See policy, state, and metrics derive from one deterministic workload.',
      actions: [
        'Keep the default Round Robin policy, lock the first-dispatch prediction, and reveal a few clock events.',
        'Scan the ready queue, Gantt timeline, and side-by-side waiting/turnaround comparison.'
      ],
      evidence:
        'Look for explicit tie-breaking, remaining burst state, and reproducible per-process metrics.'
    },
    {
      id: 'packet-journey',
      number: '04',
      duration: '20 sec',
      title: 'Follow one URL to rendered bytes',
      subject: 'Networks · Packet Journey',
      href: '/lesson/computer-networks/packet-journey#timeline-heading',
      cta: 'Open Packet Journey',
      outcome: 'Connect protocol events to topology, layers, addresses, and encapsulation.',
      actions: [
        'Predict the first cold-cache event, then step through DNS, ARP, TCP, TLS, HTTP, and rendering.',
        'Rebuild with a warm response cache and notice which network events disappear.'
      ],
      evidence:
        'Look for reserved example addresses, explicit simplifications, and changing frame/packet/segment envelopes.'
    },
    {
      id: 'progress',
      number: '05',
      duration: '10 sec',
      title: 'Inspect evidence-based progress',
      subject: 'Learner Profile · Recommendation',
      href: '/progress',
      cta: 'Open Progress',
      outcome: 'Close the loop with progress created by the real interactions you just performed.',
      actions: [
        'Inspect XP, prediction accuracy, recovered mistakes, and misconception evidence stored in this browser.',
        'Follow the next recommendation, which is selected from recorded progress rather than a fabricated score.'
      ],
      evidence:
        'Look for a mastery map, local-data controls, and a recommendation that links back into a real lesson.'
    }
  ] as const;

  type StageId = (typeof stages)[number]['id'];

  let completed = $state<StageId[]>([]);
  let storageNotice = $state('');
  let completionPercent = $derived(Math.round((completed.length / stages.length) * 100));
  let allComplete = $derived(completed.length === stages.length);

  onMount(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? '[]') as unknown;
      if (Array.isArray(stored)) {
        completed = stages
          .map((stage) => stage.id)
          .filter((id) => stored.includes(id)) as StageId[];
      }
    } catch {
      completed = [];
      storageNotice = 'Saved tour progress is unavailable in this browser; this visit still works.';
    }
  });

  function setCompleted(id: StageId, checked: boolean) {
    completed = checked
      ? [...new Set([...completed, id])]
      : completed.filter((stageId) => stageId !== id);
    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(completed));
      storageNotice = '';
    } catch {
      storageNotice = 'This checklist works for this visit, but the browser blocked saving it.';
    }
  }

  function resetChecklist() {
    completed = [];
    try {
      localStorage.removeItem(CHECKLIST_KEY);
      storageNotice = '';
    } catch {
      storageNotice = 'The checklist reset for this visit, but browser storage is unavailable.';
    }
  }
</script>

<svelte:head>
  <title>3-Minute Judge Demo · ReplayCS</title>
  <meta
    name="description"
    content="A guided, honest three-minute route through ReplayCS prediction, replay, deterministic simulation, grounded AI, and learner progress."
  />
</svelte:head>

<section class="demo-hero" aria-labelledby="demo-title">
  <div class="hero-copy">
    <a class="back" href="/">← ReplayCS home</a>
    <p class="eyebrow">Live product tour · about 2:50</p>
    <h1 id="demo-title">The judge path through <span class="gradient">real execution.</span></h1>
    <p class="lead">
      Five focused stops show the shipped product—not a separate pitch deck. Open each lab, perform
      the listed interaction, then return here and check off what you verified.
    </p>
    <div class="hero-actions">
      <a class="button primary" href={stages[0].href} target="_blank" rel="noreferrer"
        >Start the 3-minute path ↗</a
      >
      <a class="button" href="#tour-checklist">Preview all stops</a>
    </div>
  </div>

  <aside class="tour-status panel" aria-label="Judge tour progress">
    <div class="status-top">
      <span>Tour checklist</span><strong>{completed.length} / {stages.length}</strong>
    </div>
    <div
      class="progress-track"
      role="progressbar"
      aria-label="Judge demo completion"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={completionPercent}
    >
      <span style={`width: ${completionPercent}%`}></span>
    </div>
    <p>
      {allComplete
        ? 'Tour verified. The product routes remain open for deeper judging.'
        : `${completionPercent}% checked · saved only in this browser`}
    </p>
    {#if storageNotice}<p class="storage-note" role="status">{storageNotice}</p>{/if}
    {#if completed.length > 0}
      <button type="button" class="reset" onclick={resetChecklist}>Reset tour checklist</button>
    {/if}
  </aside>
</section>

<section class="truth-strip" aria-label="Demo integrity notes">
  <article>
    <span aria-hidden="true">◇</span>
    <div>
      <strong>Deterministic truth first</strong><small
        >Every trace is produced by a bounded local engine.</small
      >
    </div>
  </article>
  <article>
    <span aria-hidden="true">✦</span>
    <div>
      <strong>AI is optional and labeled</strong><small
        >GPT-5.6 when configured; deterministic fallback when not.</small
      >
    </div>
  </article>
  <article>
    <span aria-hidden="true">↺</span>
    <div>
      <strong>No demo-only state</strong><small
        >Lab actions update the same browser-local profile learners use.</small
      >
    </div>
  </article>
</section>

<div class="guide-note panel" role="note">
  <span aria-hidden="true">i</span>
  <p>
    Lab links open in a new tab so this checklist stays available. Checking a stop records only your
    tour position; it does not award XP or claim that a lab was completed. Real lab interactions do
    that.
  </p>
</div>

<section id="tour-checklist" class="tour-section" aria-labelledby="tour-heading">
  <div class="section-heading">
    <div>
      <p class="eyebrow">Guided verification</p>
      <h2 id="tour-heading">Five stops, one learning loop</h2>
    </div>
    <span>Target time · 2:50</span>
  </div>

  <ol class="tour-list">
    {#each stages as stage}
      <li data-testid="judge-demo-stage" class:complete={completed.includes(stage.id)}>
        <article class="stage panel">
          <div class="stage-rail" aria-hidden="true">
            <span>{stage.number}</span><i></i>
          </div>
          <div class="stage-body">
            <div class="stage-heading">
              <div>
                <p class="eyebrow">{stage.subject}</p>
                <h3>{stage.title}</h3>
              </div>
              <span class="duration">{stage.duration}</span>
            </div>
            <p class="outcome">{stage.outcome}</p>
            <ol class="actions">
              {#each stage.actions as action}<li>{action}</li>{/each}
            </ol>
            <p class="evidence"><strong>Verify:</strong> {stage.evidence}</p>
            <div class="stage-actions">
              <a
                class="button primary launch"
                data-demo-link={stage.id}
                href={stage.href}
                target="_blank"
                rel="noreferrer">{stage.cta} ↗</a
              >
              <label class="check">
                <input
                  type="checkbox"
                  checked={completed.includes(stage.id)}
                  onchange={(event) => setCompleted(stage.id, event.currentTarget.checked)}
                />
                <span>Mark {stage.title} complete</span>
              </label>
            </div>
          </div>
        </article>
      </li>
    {/each}
  </ol>
</section>

<section class:complete={allComplete} class="finish panel" aria-live="polite">
  <div>
    <p class="eyebrow">{allComplete ? 'Path complete' : 'After the final stop'}</p>
    <h2>
      {allComplete
        ? 'You verified the ReplayCS loop.'
        : 'Let the learner evidence choose what comes next.'}
    </h2>
    <p>
      Prediction, execution, explanation, recovery, and recommendation all lead to actual product
      routes and browser-local state.
    </p>
  </div>
  <a class="button primary" href="/progress" target="_blank" rel="noreferrer"
    >Review learner profile ↗</a
  >
</section>

<style>
  .demo-hero {
    min-height: 54vh;
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
    gap: 2rem;
    align-items: center;
    padding: 2rem 0 3rem;
  }

  .back {
    color: var(--primary);
    font-size: 0.82rem;
  }

  h1 {
    max-width: 780px;
    font-size: clamp(3.1rem, 7vw, 6rem);
  }

  .lead {
    max-width: 720px;
    color: var(--muted);
    font-size: 1.12rem;
    line-height: 1.7;
  }

  .hero-actions,
  .stage-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    align-items: center;
  }

  .hero-actions {
    margin-top: 1.5rem;
  }

  .tour-status {
    padding: 1.25rem;
    background:
      radial-gradient(
        circle at 100% 0,
        color-mix(in srgb, var(--primary) 11%, transparent),
        transparent 48%
      ),
      linear-gradient(145deg, var(--raised), var(--surface));
  }

  .status-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--muted);
  }

  .status-top strong {
    color: var(--primary);
    font: 800 1.8rem var(--mono);
  }

  .progress-track {
    height: 9px;
    overflow: hidden;
    margin: 0.9rem 0;
    border-radius: 99px;
    background: var(--border);
  }

  .progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--primary), var(--accent));
    transition: width 180ms ease;
  }

  .tour-status p {
    min-height: 2.6em;
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.5;
  }

  .reset {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 0.74rem;
    text-decoration: underline;
  }

  .truth-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-block: 1px solid var(--border);
  }

  .truth-strip article {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    padding: 1.1rem;
  }

  .truth-strip article + article {
    border-left: 1px solid var(--border);
  }

  .truth-strip article > span {
    display: grid;
    flex: 0 0 38px;
    width: 38px;
    aspect-ratio: 1;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--primary) 6%, transparent);
    color: var(--primary);
    font-weight: 800;
  }

  .truth-strip strong,
  .truth-strip small {
    display: block;
  }

  .truth-strip small {
    margin-top: 0.2rem;
    color: var(--muted);
    line-height: 1.4;
  }

  .guide-note {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    margin: 2rem 0;
    padding: 0.9rem 1rem;
  }

  .guide-note > span {
    display: grid;
    flex: 0 0 28px;
    width: 28px;
    aspect-ratio: 1;
    place-items: center;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    color: var(--accent);
    font-weight: 800;
  }

  .guide-note p {
    margin: 0;
    color: var(--muted);
    font-size: 0.8rem;
    line-height: 1.55;
  }

  .tour-section {
    padding-top: 1rem;
  }

  .section-heading,
  .stage-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: end;
  }

  .section-heading > span {
    color: var(--muted);
    font: 700 0.78rem var(--mono);
  }

  .tour-list {
    display: grid;
    gap: 1rem;
    margin: 1.5rem 0 0;
    padding: 0;
    list-style: none;
  }

  .stage {
    display: grid;
    grid-template-columns: 68px 1fr;
    overflow: hidden;
    transition:
      border-color 160ms ease,
      opacity 160ms ease;
  }

  .tour-list > li.complete .stage {
    border-color: color-mix(in srgb, var(--success) 44%, transparent);
  }

  .stage-rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 1.4rem;
    border-right: 1px solid var(--border);
    background: var(--bg);
  }

  .stage-rail span {
    color: var(--primary);
    font: 800 1rem var(--mono);
  }

  .stage-rail i {
    flex: 1;
    width: 1px;
    min-height: 72px;
    margin-top: 0.7rem;
    background: linear-gradient(var(--primary), transparent);
  }

  .stage-body {
    padding: 1.35rem;
  }

  .stage-heading {
    align-items: start;
  }

  .stage-heading .eyebrow {
    margin: 0;
  }

  .stage h3 {
    margin: 0.35rem 0 0;
    font-size: clamp(1.35rem, 3vw, 2rem);
  }

  .duration {
    flex: 0 0 auto;
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 99px;
    color: var(--muted);
    font: 700 0.72rem var(--mono);
  }

  .outcome {
    max-width: 760px;
    color: var(--muted);
    line-height: 1.55;
  }

  .actions {
    display: grid;
    gap: 0.55rem;
    margin: 1rem 0;
    padding-left: 1.4rem;
    line-height: 1.55;
  }

  .actions li::marker {
    color: var(--primary);
    font-weight: 800;
  }

  .evidence {
    padding: 0.75rem;
    border-left: 3px solid var(--accent);
    border-radius: 0 8px 8px 0;
    background: color-mix(in srgb, var(--accent) 5%, transparent);
    color: var(--muted);
    font-size: 0.82rem;
    line-height: 1.5;
  }

  .evidence strong {
    color: var(--accent);
  }

  .stage-actions {
    margin-top: 1rem;
  }

  .launch {
    min-width: 190px;
    text-align: center;
  }

  .check {
    display: flex;
    gap: 0.55rem;
    align-items: center;
    min-height: 42px;
    color: var(--muted);
    cursor: pointer;
    font-size: 0.8rem;
  }

  .check input {
    width: 18px;
    height: 18px;
    accent-color: var(--success);
  }

  .tour-list > li.complete .check span {
    color: var(--success);
  }

  .finish {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    align-items: center;
    margin-top: 1.5rem;
    padding: 1.5rem;
    background:
      radial-gradient(
        circle at 100% 0,
        color-mix(in srgb, var(--secondary) 10%, transparent),
        transparent 48%
      ),
      linear-gradient(145deg, var(--raised), var(--surface));
  }

  .finish.complete {
    border-color: color-mix(in srgb, var(--success) 44%, transparent);
  }

  .finish h2 {
    max-width: 760px;
    font-size: clamp(1.5rem, 3.5vw, 2.4rem);
  }

  .finish p:not(.eyebrow) {
    max-width: 760px;
    color: var(--muted);
    line-height: 1.55;
  }

  .finish .button {
    flex: 0 0 auto;
  }

  @media (max-width: 860px) {
    .demo-hero {
      min-height: auto;
      grid-template-columns: 1fr;
    }

    .truth-strip {
      grid-template-columns: 1fr;
    }

    .truth-strip article + article {
      border-top: 1px solid var(--border);
      border-left: 0;
    }

    .finish {
      align-items: start;
      flex-direction: column;
    }
  }

  @media (max-width: 560px) {
    .demo-hero {
      padding-top: 0.5rem;
    }

    h1 {
      font-size: clamp(2.75rem, 15vw, 4rem);
    }

    .hero-actions,
    .stage-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .hero-actions .button,
    .launch {
      width: 100%;
      text-align: center;
    }

    .section-heading,
    .stage-heading {
      align-items: start;
      flex-direction: column;
    }

    .stage {
      grid-template-columns: 44px minmax(0, 1fr);
    }

    .stage-body {
      padding: 1rem;
    }

    .stage-rail {
      padding-top: 1.2rem;
    }

    .stage-rail i {
      min-height: 100px;
    }

    .actions {
      padding-left: 1.15rem;
    }
  }
</style>

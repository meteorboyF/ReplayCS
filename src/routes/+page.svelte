<script lang="ts">
  import { createBinarySearchLesson } from '$lib/engines/dsa/binarySearch';
  const preview = createBinarySearchLesson().steps.find(
    (s) => s.semanticOperationId === 'calculate-middle'
  )!;
  const previewValues = preview.stateAfter.values as (string | number)[];
</script>

<section class="hero">
  <div>
    <p class="eyebrow">An execution laboratory for curious minds</p>
    <h1>Pause computer science.<br /><span class="gradient">Trace every state.</span></h1>
    <p class="lead">
      Stop memorizing the outcome. Predict the computer's next move, reveal the exact state change,
      and understand why it happened.
    </p>
    <div class="actions">
      <a class="button primary" href="/onboarding">Start tracing →</a><a
        class="button"
        href="/learn/dsa-1">Explore subjects</a
      >
    </div>
    <p class="languages">Curated equivalents in <strong>C · C++ · Java · Python</strong></p>
  </div>
  <div class="preview panel">
    <div class="window">
      <span></span><span></span><span></span><small>LIVE TRACE / BINARY SEARCH</small>
    </div>
    <code><i>3</i> mid = left + (right - left) // 2</code>
    <div class="array">
      {#each previewValues as value, i}<div class:active={i === preview.stateAfter.mid}>
          <small>{i}</small><b>{value}</b>
        </div>{/each}
    </div>
    <div class="state">
      <span>left <b>{preview.stateAfter.left}</b></span><span
        >mid <b>{preview.stateAfter.mid}</b></span
      ><span>right <b>{preview.stateAfter.right}</b></span>
    </div>
    <p><strong>Predict:</strong> which index becomes <code>mid</code>?</p>
  </div>
</section>
<section class="section">
  <p class="eyebrow">One learning loop</p>
  <h2>Predict. Execute. Explain. Master.</h2>
  <div class="cards">
    {#each [['01', 'Predict before reveal', 'Commit to the next line or state.'], ['02', 'Watch state mutate', 'See ranges, queues, rows, and variables change.'], ['03', 'Explain the why', 'Deterministic truth first; grounded AI help on request.']] as card}<article
        class="card panel"
      >
        <span class="pill">{card[0]}</span>
        <h3>{card[1]}</h3>
        <p class="muted">{card[2]}</p>
      </article>{/each}
  </div>
</section>
<section class="section">
  <p class="eyebrow">Curriculum</p>
  <h2>From pointers to packets.</h2>
  <div class="cards subjects">
    {#each [['DSA I', 'Arrays, lists, stacks, sorting and searching', '/learn/dsa-1', 'Live'], ['DSA II', 'Trees, graphs, heaps and dynamic programming', '/learn/dsa-2', 'Graph lab live'], ['DBMS', 'Trace joins, filters, grouping and transactions', '/learn/dbms', 'Pipeline live'], ['Operating Systems', 'Processes, scheduling, pages and locks', '/learn/operating-systems', 'Scheduling live'], ['Networks', 'Packets, protocols, DNS and TCP', '/learn/computer-networks', 'Foundation']] as s}<a
        class="card panel"
        href={s[2]}
        ><span class="pill">{s[3]}</span>
        <h3>{s[0]}</h3>
        <p class="muted">{s[1]}</p>
        <span class="arrow">Explore →</span></a
      >{/each}
  </div>
</section>

<style>
  .hero {
    min-height: 70vh;
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    align-items: center;
    gap: 3rem;
  }
  .lead {
    font-size: 1.17rem;
    color: var(--muted);
    max-width: 620px;
    line-height: 1.7;
  }
  .actions {
    display: flex;
    gap: 0.8rem;
    margin: 1.8rem 0;
  }
  .languages {
    font-size: 0.85rem;
    color: var(--muted);
  }
  .preview {
    padding: 1rem;
    box-shadow: 0 30px 80px #0008;
  }
  .window {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.8rem;
  }
  .window span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--danger);
  }
  .window span:nth-child(2) {
    background: var(--warning);
  }
  .window span:nth-child(3) {
    background: var(--success);
  }
  .window small {
    margin-left: auto;
    color: var(--muted);
  }
  .preview > code {
    display: block;
    padding: 1.5rem 0.3rem;
    color: var(--accent);
    font-family: var(--mono);
  }
  .preview code i {
    color: var(--muted);
    font-style: normal;
    margin-right: 1rem;
  }
  .array {
    display: flex;
    gap: 0.4rem;
  }
  .array div {
    flex: 1;
    min-width: 0;
    text-align: center;
    padding: 0.5rem 0.1rem;
    border: 1px solid var(--border);
    border-radius: 9px;
  }
  .array div.active {
    border-color: var(--primary);
    background: #2dd4bf22;
    box-shadow: 0 0 25px #2dd4bf44;
  }
  .array small {
    display: block;
    color: var(--muted);
  }
  .state {
    display: flex;
    justify-content: space-around;
    margin: 1rem 0;
    color: var(--muted);
  }
  .state b {
    color: var(--primary);
    margin-left: 0.3rem;
  }
  .section {
    padding: 5rem 0 1rem;
  }
  .subjects {
    grid-template-columns: repeat(5, 1fr);
  }
  .subjects .card {
    min-height: 210px;
    display: flex;
    flex-direction: column;
  }
  .arrow {
    margin-top: auto;
    color: var(--primary);
  }
  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
    }
    .subjects {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 560px) {
    .subjects {
      grid-template-columns: 1fr;
    }
    .actions {
      flex-direction: column;
    }
    .preview {
      overflow: hidden;
    }
  }
</style>

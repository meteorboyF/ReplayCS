<script lang="ts">
  import {
    RECAP_TOPICS,
    type RecapDepth,
    type RecapLanguage,
    type RecapSheet
  } from '$lib/study/recap';

  const subjects = [...new Set(RECAP_TOPICS.map((topic) => topic.subjectLabel))];

  let selected = $state<Set<string>>(new Set(RECAP_TOPICS.map((topic) => topic.id)));
  let language = $state<RecapLanguage>('en');
  let depth = $state<RecapDepth>('concise');
  let loading = $state(false);
  let error = $state('');
  let sheet = $state<RecapSheet | null>(null);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  function topicsFor(subjectLabel: string) {
    return RECAP_TOPICS.filter((topic) => topic.subjectLabel === subjectLabel);
  }

  function toggleSubject(subjectLabel: string) {
    const ids = topicsFor(subjectLabel).map((topic) => topic.id);
    const shouldSelect = ids.some((id) => !selected.has(id));
    const next = new Set(selected);
    for (const id of ids) {
      if (shouldSelect) next.add(id);
      else next.delete(id);
    }
    selected = next;
  }

  async function generate() {
    if (selected.size === 0) {
      error = 'Choose at least one topic.';
      return;
    }
    loading = true;
    error = '';
    try {
      const response = await fetch('/api/study-recap', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topicIds: [...selected], language, depth })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not build the recap.');
      sheet = data.recap as RecapSheet;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Could not build the recap.';
      sheet = null;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Study Recap · ReplayCS</title>
  <meta
    name="description"
    content="Turn completed ReplayCS topics into a deterministic revision sheet, optionally polished by GPT-5.6."
  />
</svelte:head>

<header class="recap-head">
  <a class="back" href="/progress">← Progress</a>
  <p class="eyebrow">Optional study tool · outside the lessons</p>
  <h1>Study Recap</h1>
  <p class="intro">
    Build a revision sheet from the topics you have traced. The content is generated
    deterministically from ReplayCS lesson metadata; when a GPT-5.6 key is configured on the server
    it rewrites that same material into more polished prose. It never changes any lesson, trace, or
    your progress.
  </p>
</header>

<section class="panel config">
  <div class="config-row">
    <fieldset>
      <legend>Language</legend>
      <label><input type="radio" bind:group={language} value="en" /> English</label>
      <label><input type="radio" bind:group={language} value="bn" /> বাংলা</label>
    </fieldset>
    <fieldset>
      <legend>Depth</legend>
      <label><input type="radio" bind:group={depth} value="concise" /> Concise</label>
      <label><input type="radio" bind:group={depth} value="exam" /> Exam-ready</label>
    </fieldset>
  </div>

  <div class="topics">
    {#each subjects as subjectLabel}
      <div class="topic-group">
        <div class="group-head">
          <span class="group-label">{subjectLabel}</span>
          <button type="button" onclick={() => toggleSubject(subjectLabel)}>
            {topicsFor(subjectLabel).every((topic) => selected.has(topic.id)) ? 'Clear' : 'Select'}
          </button>
        </div>
        {#each topicsFor(subjectLabel) as topic}
          <label class="topic" class:checked={selected.has(topic.id)}>
            <input
              type="checkbox"
              checked={selected.has(topic.id)}
              onchange={() => toggle(topic.id)}
            />
            {topic.title}
          </label>
        {/each}
      </div>
    {/each}
  </div>

  <div class="actions">
    <button class="primary" type="button" onclick={generate} disabled={loading}>
      {loading ? 'Generating…' : 'Generate revision sheet'}
    </button>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </div>
</section>

{#if sheet}
  <section class="panel sheet" aria-live="polite">
    <div class="sheet-head">
      <h2>{sheet.heading}</h2>
      <span class="source" data-testid="recap-source">
        {sheet.source === 'gpt' ? 'GPT-5.6 polished' : 'Deterministic'}
      </span>
    </div>
    <p class="sheet-intro">{sheet.intro}</p>

    <div class="topic-cards">
      {#each sheet.topics as topic}
        <article class="topic-card">
          <div class="topic-card-head">
            <span>{topic.subjectLabel}</span>
            <a href={topic.href}>Open trace →</a>
          </div>
          <h3>{topic.title}</h3>
          <p>{topic.summary}</p>
          <ul class="complexity">
            {#each topic.complexity as line}<li>{line}</li>{/each}
          </ul>
        </article>
      {/each}
    </div>

    <div class="lists">
      <section>
        <h4>Key comparisons</h4>
        <ul>
          {#each sheet.comparisons as line}<li>{line}</li>{/each}
        </ul>
      </section>
      <section>
        <h4>Big-O at a glance</h4>
        <ul>
          {#each sheet.bigO as line}<li>{line}</li>{/each}
        </ul>
      </section>
      <section>
        <h4>Common pitfalls</h4>
        <ul>
          {#each sheet.pitfalls as line}<li>{line}</li>{/each}
        </ul>
      </section>
      <section>
        <h4>Suggested study order</h4>
        <ol class="sequence">
          {#each sheet.studySequence as line}<li>{line}</li>{/each}
        </ol>
      </section>
    </div>
  </section>
{/if}

<style>
  .recap-head {
    max-width: 760px;
    margin-bottom: 1.2rem;
  }
  .back {
    color: var(--primary);
    font-size: 0.8rem;
  }
  .eyebrow {
    color: var(--muted);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0.6rem 0 0;
  }
  .recap-head h1 {
    margin: 0.2rem 0 0.4rem;
    font-size: clamp(1.9rem, 4vw, 2.6rem);
  }
  .intro {
    margin: 0;
    color: var(--muted);
    line-height: 1.6;
  }
  .config {
    padding: 1.1rem;
    display: grid;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .config-row {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 0.8rem;
    align-items: center;
  }
  legend {
    float: left;
    margin-right: 0.6rem;
    color: var(--muted);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  fieldset label {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.85rem;
  }
  .topics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.8rem;
  }
  .topic-group {
    display: grid;
    gap: 0.35rem;
    align-content: start;
  }
  .group-label {
    color: var(--muted);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .group-head button {
    border: 0;
    background: transparent;
    color: var(--primary);
    padding: 0.15rem;
    font-size: 0.7rem;
  }
  .topic {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.82rem;
    cursor: pointer;
  }
  .topic.checked {
    border-color: var(--primary);
    background: #2dd4bf12;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .error {
    color: var(--danger);
    font-size: 0.8rem;
    margin: 0;
  }
  .sheet {
    padding: 1.2rem;
  }
  .sheet-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }
  .sheet-head h2 {
    margin: 0;
  }
  .source {
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--primary);
    font-size: 0.68rem;
  }
  .sheet-intro {
    color: var(--muted);
    line-height: 1.6;
  }
  .topic-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 0.8rem;
    margin: 1rem 0;
  }
  .topic-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.9rem;
    display: grid;
    gap: 0.4rem;
    align-content: start;
  }
  .topic-card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--muted);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .topic-card-head a {
    color: var(--primary);
    text-transform: none;
    letter-spacing: 0;
  }
  .topic-card h3 {
    margin: 0;
    font-size: 1.05rem;
  }
  .topic-card p {
    margin: 0;
    color: var(--muted);
    font-size: 0.82rem;
    line-height: 1.5;
  }
  .complexity {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.15rem;
    font: 0.76rem/1.5 var(--mono);
    color: var(--text);
  }
  .lists {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }
  .lists h4 {
    margin: 0 0 0.4rem;
    font-size: 0.9rem;
  }
  .lists ul,
  .lists ol {
    margin: 0;
    padding-left: 1.2rem;
    display: grid;
    gap: 0.3rem;
    color: var(--muted);
    font-size: 0.82rem;
    line-height: 1.5;
  }
  .sequence {
    list-style: none;
    padding-left: 0;
  }
</style>

<script lang="ts">
  import { galleryScenarios } from '$lib/content/scenarioGallery';
</script>

<svelte:head>
  <title>Scenario Gallery · ReplayCS</title>
  <meta
    name="description"
    content="Jump straight into hand-picked execution traces — resizes, collisions, worst-case searches, scheduling, joins, and packet journeys."
  />
</svelte:head>

<header class="gallery-head">
  <p class="eyebrow">Scenario Gallery</p>
  <h1>Interesting traces, one click away</h1>
  <p class="intro">
    Each card opens a specific execution you can run line by line. No questions, no scores — just
    pick a scenario and watch the state change.
  </p>
</header>

<div class="grid" role="list" aria-label="Trace scenarios">
  {#each galleryScenarios as scenario (scenario.id)}
    <article
      class="card panel accent-{scenario.accent}"
      role="listitem"
      data-testid="scenario-card-{scenario.id}"
    >
      <div class="card-head">
        <span class="subject">{scenario.subjectLabel}</span>
      </div>
      <h2>{scenario.title}</h2>
      <p class="desc">{scenario.description}</p>
      <p class="observe"><span>You’ll watch</span>{scenario.observe}</p>
      <a class="open" href={scenario.href} data-testid="scenario-link-{scenario.id}">
        Open trace →
      </a>
    </article>
  {/each}
</div>

<style>
  .gallery-head {
    margin-bottom: 1.4rem;
    max-width: 720px;
  }
  .eyebrow {
    color: var(--muted);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    margin: 0;
  }
  .gallery-head h1 {
    margin: 0.2rem 0 0.4rem;
    font-size: clamp(1.9rem, 4vw, 2.6rem);
  }
  .intro {
    margin: 0;
    color: var(--muted);
    line-height: 1.6;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.9rem;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1.1rem;
    border-top: 3px solid var(--border);
  }
  .card.accent-cyan {
    border-top-color: #22d3ee;
  }
  .card.accent-violet {
    border-top-color: #a78bfa;
  }
  .card.accent-amber {
    border-top-color: #fbbf24;
  }
  .card.accent-green {
    border-top-color: #4ade80;
  }
  .card.accent-blue {
    border-top-color: #60a5fa;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .subject {
    color: var(--muted);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .card h2 {
    margin: 0;
    font-size: 1.15rem;
  }
  .desc {
    margin: 0;
    color: var(--text);
    font-size: 0.86rem;
    line-height: 1.5;
  }
  .observe {
    margin: 0;
    color: var(--muted);
    font-size: 0.8rem;
    line-height: 1.55;
  }
  .observe span {
    display: block;
    color: var(--primary);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.15rem;
  }
  .open {
    margin-top: auto;
    padding-top: 0.4rem;
    color: var(--primary);
    font-size: 0.85rem;
    font-weight: 650;
    width: fit-content;
  }
  @media (max-width: 640px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>

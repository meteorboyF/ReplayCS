<script lang="ts">
  import { onMount } from 'svelte';
  import { recommendNext } from '$lib/progress/recommendations';
  import { loadProgress } from '$lib/progress/store';

  let resume = $state<{ title: string; href: string } | null>(null);

  const groups = [
    {
      title: 'Data structures & algorithms',
      labs: [
        {
          href: '/lesson/dsa-1/binary-search',
          title: 'Binary Search',
          detail: 'Per-line, multi-language manual trace.'
        },
        {
          href: '/lesson/dsa-1/linked-list',
          title: 'Linked List Lab',
          detail: 'Trace 14 pointer algorithms, exact work, and tail-pointer tradeoffs.'
        },
        {
          href: '/lesson/dsa-1/arrays',
          title: 'Array & Dynamic Array Lab',
          detail: 'Trace indexed access, shifts, resizing, copying, and amortized append.'
        },
        {
          href: '/lesson/dsa-1/sorting-arena',
          title: 'Sorting Arena',
          detail: 'Compare three deterministic algorithms on the same input.'
        },
        {
          href: '/lesson/dsa-2/graph-explorer',
          title: 'Graph Explorer',
          detail: 'Trace BFS and DFS frontiers across custom graphs.'
        }
      ]
    },
    {
      title: 'Systems, data & networks',
      labs: [
        {
          href: '/lesson/dbms/query-pipeline',
          title: 'SQL Pipeline',
          detail: 'Seven logical execution stages.'
        },
        {
          href: '/lesson/operating-systems/cpu-scheduling',
          title: 'CPU Scheduling',
          detail: 'Compare five policies with exact Gantt metrics.'
        },
        {
          href: '/lesson/computer-networks/packet-journey',
          title: 'Packet Journey',
          detail: 'Follow one URL across protocols, layers, and addresses.'
        }
      ]
    },
    {
      title: 'Complexity analysis',
      labs: [
        {
          href: '/complexity',
          title: 'Operation Complexity Lab',
          detail: 'Compare exact work, assumptions, growth, and space across real operations.'
        }
      ]
    }
  ];

  onMount(() => {
    const progress = loadProgress();
    if (!progress.onboardingComplete) return;
    const rec = recommendNext(progress);
    resume = { title: rec.title, href: rec.href };
  });
</script>

<p class="eyebrow">Trace lab</p>
<h1>Choose an execution.</h1>

{#if resume}
  <section class="panel resume" aria-labelledby="resume-title">
    <div>
      <span class="pill">Resume</span>
      <h2 id="resume-title">{resume.title}</h2>
    </div>
    <a class="button primary" href={resume.href}>Continue trace →</a>
  </section>
{/if}

{#each groups as group}
  <section class="group">
    <h2 class="group-title">{group.title}</h2>
    <div class="cards">
      {#each group.labs as lab}
        <a class="panel card lab" href={lab.href}>
          <h3>{lab.title}</h3>
          <p class="muted">{lab.detail}</p>
          <span class="go">Open trace →</span>
        </a>
      {/each}
    </div>
  </section>
{/each}

<style>
  .resume {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    padding: 1.25rem 1.5rem;
    margin: 1.5rem 0 2rem;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--primary) 12%, transparent),
      color-mix(in srgb, var(--secondary) 6%, transparent)
    );
    border-color: color-mix(in oklab, var(--primary) 40%, var(--border));
  }
  .resume h2 {
    margin: 0.35rem 0 0;
    font-size: 1.4rem;
  }
  .group {
    margin-top: 2.25rem;
  }
  .group-title {
    font-size: 1rem;
    color: var(--muted);
    font-weight: 700;
    letter-spacing: 0.01em;
    margin: 0 0 1rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--border);
  }
  .lab {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    text-decoration: none;
    color: inherit;
    transition:
      border-color 0.15s,
      transform 0.15s;
  }
  .lab:hover {
    border-color: color-mix(in oklab, var(--primary) 45%, var(--border));
    transform: translateY(-2px);
  }
  .lab h3 {
    margin: 0;
    font-size: 1.1rem;
  }
  .lab .muted {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .lab .go {
    margin-top: auto;
    padding-top: 0.6rem;
    color: var(--primary);
    font-size: 0.85rem;
  }
  @media (max-width: 560px) {
    .resume {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>

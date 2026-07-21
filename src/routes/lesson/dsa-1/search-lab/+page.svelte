<script lang="ts">
  import LessonWorkspace from '$lib/components/lesson/LessonWorkspace.svelte';
  import SearchVisualizer from '$lib/components/visualizers/SearchVisualizer.svelte';
  import {
    DEFAULT_SEARCHING_CONFIG,
    SEARCH_STRATEGIES,
    comparisonScoreboard,
    createSearchingLesson,
    type SearchStrategy,
    type SearchingConfig
  } from '$lib/engines/dsa/searching';

  type Preset = {
    id: string;
    label: string;
    strategy: SearchStrategy;
    values: number[];
    target: number;
  };

  const presets: Preset[] = [
    {
      id: 'linear',
      label: 'Linear scan',
      strategy: 'linear',
      values: [2, 5, 8, 12, 16, 23, 38, 56],
      target: 23
    },
    {
      id: 'binary',
      label: 'Binary (iterative)',
      strategy: 'binary-iterative',
      values: [2, 5, 8, 12, 16, 23, 38, 56],
      target: 23
    },
    {
      id: 'binary-rec',
      label: 'Binary (recursive)',
      strategy: 'binary-recursive',
      values: [2, 5, 8, 12, 16, 23, 38, 56],
      target: 23
    },
    {
      id: 'bst-balanced',
      label: 'BST (balanced)',
      strategy: 'bst',
      values: [12, 5, 23, 2, 8, 16, 56],
      target: 16
    },
    {
      id: 'bst-skewed',
      label: 'BST (skewed)',
      strategy: 'bst',
      values: [2, 5, 8, 12, 16, 23, 56],
      target: 56
    },
    {
      id: 'hash',
      label: 'Hash lookup',
      strategy: 'hash',
      values: [2, 5, 8, 12, 16, 23, 38, 56],
      target: 23
    }
  ];
  const completionKeys = SEARCH_STRATEGIES.map((item) => item.id);

  let strategy = $state<SearchStrategy>(DEFAULT_SEARCHING_CONFIG.strategy);
  let valuesText = $state(DEFAULT_SEARCHING_CONFIG.values.join(', '));
  let target = $state(DEFAULT_SEARCHING_CONFIG.target ?? 23);
  let activePreset = $state('binary');
  let inputError = $state('');

  let lesson = $state(createSearchingLesson(config()));
  let strategyMetadata = $derived(
    SEARCH_STRATEGIES.find((candidate) => candidate.id === strategy) ?? SEARCH_STRATEGIES[0]
  );
  let scoreboard = $derived.by(() => {
    try {
      return comparisonScoreboard(parseValues(), target);
    } catch {
      return null;
    }
  });

  function config(): SearchingConfig {
    return { strategy, values: parseValues(), target };
  }

  function parseValues() {
    const pieces = valuesText.split(',').map((value) => value.trim());
    if (
      pieces.some((value) => value === '' || !/^\d+$/.test(value)) ||
      pieces.length < 2 ||
      pieces.length > 10
    ) {
      return [...DEFAULT_SEARCHING_CONFIG.values];
    }
    const values = pieces.map(Number);
    if (values.some((value) => !Number.isSafeInteger(value)))
      return [...DEFAULT_SEARCHING_CONFIG.values];
    return values;
  }

  function rebuild() {
    inputError = '';
    try {
      lesson = createSearchingLesson(config());
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'Could not build that trace.';
    }
  }

  function applyPreset(preset: Preset) {
    activePreset = preset.id;
    strategy = preset.strategy;
    valuesText = preset.values.join(', ');
    target = preset.target;
    rebuild();
  }
</script>

<svelte:head>
  <title>Search Strategy Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Run linear, iterative and recursive binary, BST, and hash search on the same data and count every comparison."
  />
</svelte:head>

<LessonWorkspace
  {lesson}
  subject="dsa-1"
  completionId="search-lab"
  completionXp={35}
  completionKey={strategy}
  {completionKeys}
  backHref="/learn/dsa-1"
  backLabel="← DSA I"
  eyebrow="Search strategy laboratory"
  title="Search Lab"
  operationTitle={strategyMetadata.label}
  operationSummary={strategyMetadata.description}
>
  {#snippet controls()}
    <div class="cfg">
      <label
        >Strategy
        <select
          aria-label="Strategy"
          value={strategy}
          onchange={(event) => {
            strategy = event.currentTarget.value as SearchStrategy;
            rebuild();
          }}
        >
          {#each SEARCH_STRATEGIES as item}<option value={item.id}>{item.label}</option>{/each}
        </select></label
      >
      <label class="values"
        >Values
        <input aria-label="Input" bind:value={valuesText} onchange={rebuild} /></label
      >
      <label>Target<input type="number" min="0" bind:value={target} onchange={rebuild} /></label>
      {#if scoreboard}
        <div class="scoreboard" aria-label="Comparison scoreboard">
          {#each SEARCH_STRATEGIES as item}
            <button
              type="button"
              class:active={strategy === item.id}
              onclick={() => {
                strategy = item.id;
                rebuild();
              }}
            >
              <span
                >{item.label.replace(' (iterative)', ' loop').replace(' (recursive)', ' rec')}</span
              ><b>{scoreboard[item.id]}</b>
            </button>
          {/each}
        </div>
      {/if}
      {#if inputError}<p class="err" role="alert">{inputError}</p>{/if}
    </div>
  {/snippet}

  {#snippet visual({ state })}
    <SearchVisualizer {state} />
  {/snippet}

  {#snippet about()}
    <p>
      The scoreboard counts exact comparisons for the current target across all five strategies on
      the same data. Linear scans up to n; binary halves a sorted range (O(log n)); a balanced BST
      is O(log n) but a skewed one is O(n); hashing computes the bucket directly for expected O(1).
      The BST is built in the order you type, so insertion order decides its shape.
    </p>
  {/snippet}
</LessonWorkspace>

<style>
  .cfg {
    display: flex;
    align-items: end;
    gap: 0.55rem;
    flex-wrap: wrap;
  }
  .cfg label {
    display: grid;
    gap: 0.25rem;
    color: var(--muted);
    font-size: 0.66rem;
  }
  .cfg input,
  .cfg select {
    min-width: 90px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.5rem;
    background: var(--bg);
    color: var(--text);
  }
  .cfg .values {
    flex: 1;
    min-width: 160px;
  }
  .scoreboard {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
    flex-basis: 100%;
    margin-top: 0.2rem;
  }
  .scoreboard button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 99px;
    color: var(--muted);
    font-size: 0.7rem;
  }
  .scoreboard button.active {
    border-color: var(--primary);
    color: var(--text);
  }
  .scoreboard b {
    color: var(--primary);
    font-family: var(--mono);
  }
  .err {
    flex-basis: 100%;
    margin: 0;
    color: var(--danger);
    font-size: 0.7rem;
  }
</style>

<script lang="ts">
  import LessonWorkspace from '$lib/components/lesson/LessonWorkspace.svelte';
  import TreeVisualizer from '$lib/components/visualizers/TreeVisualizer.svelte';
  import {
    BST_OPERATIONS,
    DEFAULT_BST_CONFIG,
    createBstLesson,
    type BstConfig,
    type BstOperation
  } from '$lib/engines/dsa/bst';

  type Preset = {
    id: string;
    label: string;
    operation: BstOperation;
    values: number[];
    key?: number;
  };

  const presets: Preset[] = [
    {
      id: 'search-balanced',
      label: 'Search (balanced)',
      operation: 'search',
      values: [50, 30, 70, 20, 40, 60, 80],
      key: 60
    },
    {
      id: 'search-skewed',
      label: 'Search (skewed)',
      operation: 'search',
      values: [10, 20, 30, 40, 50, 60, 70],
      key: 70
    },
    {
      id: 'insert',
      label: 'Insert leaf',
      operation: 'insert',
      values: [50, 30, 70, 20, 40, 60, 80],
      key: 65
    },
    {
      id: 'delete-two',
      label: 'Delete two-child node',
      operation: 'delete',
      values: [50, 30, 70, 20, 40, 60, 80],
      key: 30
    },
    {
      id: 'inorder',
      label: 'Inorder (sorted)',
      operation: 'inorder',
      values: [50, 30, 70, 20, 40, 60, 80]
    },
    {
      id: 'levelorder',
      label: 'Level-order (BFS)',
      operation: 'levelorder',
      values: [50, 30, 70, 20, 40, 60, 80]
    },
    { id: 'height', label: 'Height', operation: 'height', values: [50, 30, 70, 20, 40, 60, 80] }
  ];
  const completionKeys = BST_OPERATIONS.map((item) => item.id);

  let operation = $state<BstOperation>(DEFAULT_BST_CONFIG.operation);
  let valuesText = $state(DEFAULT_BST_CONFIG.values.join(', '));
  let key = $state(DEFAULT_BST_CONFIG.key ?? 65);
  let activePreset = $state('insert');
  let inputError = $state('');

  let lesson = $state(createBstLesson(config()));
  let operationMetadata = $derived(
    BST_OPERATIONS.find((candidate) => candidate.id === operation) ?? BST_OPERATIONS[0]
  );
  let needsKey = $derived(['search', 'insert', 'delete'].includes(operation));

  function config(): BstConfig {
    return { operation, values: parseValues(), key };
  }

  function parseValues() {
    const pieces = valuesText.split(',').map((value) => value.trim());
    if (
      pieces.some((value) => value === '' || !/^-?\d+$/.test(value)) ||
      pieces.length < 1 ||
      pieces.length > 10
    ) {
      return [...DEFAULT_BST_CONFIG.values];
    }
    const values = pieces.map(Number);
    if (values.some((value) => !Number.isSafeInteger(value))) return [...DEFAULT_BST_CONFIG.values];
    return values;
  }

  function rebuild() {
    inputError = '';
    try {
      lesson = createBstLesson(config());
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'Could not build that trace.';
    }
  }

  function applyPreset(preset: Preset) {
    activePreset = preset.id;
    operation = preset.operation;
    valuesText = preset.values.join(', ');
    if (preset.key !== undefined) key = preset.key;
    rebuild();
  }
</script>

<svelte:head>
  <title>Binary Search Tree Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Watch BST search, insert, delete, traversals, and height execute node by node, and see how balance decides the bound."
  />
</svelte:head>

<LessonWorkspace
  {lesson}
  subject="dsa-1"
  completionId="bst-lab"
  completionXp={40}
  completionKey={operation}
  {completionKeys}
  backHref="/learn/dsa-1"
  backLabel="← DSA I"
  eyebrow="Binary search tree laboratory"
  title="BST Lab"
  operationTitle={operationMetadata.label}
  operationSummary={operationMetadata.description}
>
  {#snippet controls()}
    <div class="cfg">
      <label
        >Operation
        <select
          aria-label="Operation"
          value={operation}
          onchange={(event) => {
            operation = event.currentTarget.value as BstOperation;
            rebuild();
          }}
        >
          {#each BST_OPERATIONS as item}<option value={item.id}>{item.label}</option>{/each}
        </select></label
      >
      <label class="values"
        >Insertion order
        <input aria-label="Input" bind:value={valuesText} onchange={rebuild} /></label
      >
      {#if needsKey}
        <label>Key<input type="number" bind:value={key} onchange={rebuild} /></label>
      {/if}
      <div class="presets" role="group" aria-label="Presets">
        {#each presets as preset}
          <button
            type="button"
            class:active={activePreset === preset.id}
            onclick={() => applyPreset(preset)}>{preset.label}</button
          >
        {/each}
      </div>
      {#if inputError}<p class="err" role="alert">{inputError}</p>{/if}
    </div>
  {/snippet}

  {#snippet visual({ state })}
    <TreeVisualizer {state} />
  {/snippet}

  {#snippet about()}
    <p>
      A BST search discards a whole subtree per comparison, so a balanced tree is O(log n) — but the
      tree is built from the order you type, and a sorted order chains it into an O(n) list.
      Deleting a two-child node promotes its in-order successor. DFS traversals use O(h) call-stack
      space; level-order BFS uses O(w) queue space; height is a postorder computation over every
      node.
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
    min-width: 180px;
  }
  .presets {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    flex-basis: 100%;
    margin-top: 0.2rem;
  }
  .presets button {
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 99px;
    color: var(--muted);
    font-size: 0.72rem;
  }
  .presets button.active {
    border-color: var(--primary);
    color: var(--primary);
  }
  .err {
    flex-basis: 100%;
    margin: 0;
    color: var(--danger);
    font-size: 0.7rem;
  }
</style>

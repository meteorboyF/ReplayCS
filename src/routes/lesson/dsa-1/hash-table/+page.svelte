<script lang="ts">
  import LessonWorkspace from '$lib/components/lesson/LessonWorkspace.svelte';
  import HashTableVisualizer from '$lib/components/visualizers/HashTableVisualizer.svelte';
  import {
    DEFAULT_HASH_TABLE_CONFIG,
    HASH_TABLE_OPERATIONS,
    createHashTableLesson,
    type HashTableConfig,
    type HashTableOperation,
    type HashTableStrategy
  } from '$lib/engines/dsa/hashTable';

  type Preset = {
    id: string;
    label: string;
    operation: HashTableOperation;
    strategy: HashTableStrategy;
    keys: number[];
    key: number;
    bucketCount: number;
  };

  const presets: Preset[] = [
    {
      id: 'uniform',
      label: 'Good distribution',
      operation: 'insert',
      strategy: 'chaining',
      keys: [12, 5, 21, 30],
      key: 19,
      bucketCount: 7
    },
    {
      id: 'collision',
      label: 'Collision-heavy',
      operation: 'search',
      strategy: 'chaining',
      keys: [7, 14, 21, 28],
      key: 28,
      bucketCount: 7
    },
    {
      id: 'probing',
      label: 'Linear probing insert',
      operation: 'insert',
      strategy: 'linear-probing',
      keys: [12, 5, 21],
      key: 19,
      bucketCount: 7
    },
    {
      id: 'tombstone',
      label: 'Probing delete (tombstone)',
      operation: 'delete',
      strategy: 'linear-probing',
      keys: [7, 14],
      key: 7,
      bucketCount: 7
    },
    {
      id: 'high-load',
      label: 'High load factor',
      operation: 'insert',
      strategy: 'chaining',
      keys: [12, 5, 30],
      key: 19,
      bucketCount: 4
    },
    {
      id: 'resize',
      label: 'Resize & rehash',
      operation: 'resize',
      strategy: 'chaining',
      keys: [12, 5, 21, 30],
      key: 19,
      bucketCount: 4
    }
  ];
  const completionKeys = HASH_TABLE_OPERATIONS.flatMap((item) =>
    item.id === 'resize' ? ['resize'] : [`${item.id}-chaining`, `${item.id}-linear-probing`]
  );

  let operation = $state<HashTableOperation>(DEFAULT_HASH_TABLE_CONFIG.operation);
  let strategy = $state<HashTableStrategy>(DEFAULT_HASH_TABLE_CONFIG.strategy);
  let keysText = $state(DEFAULT_HASH_TABLE_CONFIG.keys.join(', '));
  let key = $state(DEFAULT_HASH_TABLE_CONFIG.key ?? 19);
  let bucketCount = $state(DEFAULT_HASH_TABLE_CONFIG.bucketCount ?? 7);
  let activePreset = $state('uniform');
  let inputError = $state('');

  let lesson = $state(createHashTableLesson(config()));
  let operationMetadata = $derived(
    HASH_TABLE_OPERATIONS.find((candidate) => candidate.id === operation) ??
      HASH_TABLE_OPERATIONS[0]
  );
  let completionKey = $derived(operation === 'resize' ? 'resize' : `${operation}-${strategy}`);

  function config(): HashTableConfig {
    return { operation, strategy, keys: parseKeys(), key, bucketCount };
  }

  function parseKeys() {
    const pieces = keysText.split(',').map((value) => value.trim());
    if (pieces.some((value) => value === '' || !/^\d+$/.test(value)) || pieces.length > 8) {
      return [...DEFAULT_HASH_TABLE_CONFIG.keys];
    }
    const keys = pieces.map(Number);
    if (keys.some((value) => !Number.isSafeInteger(value)))
      return [...DEFAULT_HASH_TABLE_CONFIG.keys];
    return keys;
  }

  function rebuild() {
    inputError = '';
    try {
      lesson = createHashTableLesson(config());
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'Could not build that trace.';
    }
  }

  function applyPreset(preset: Preset) {
    activePreset = preset.id;
    operation = preset.operation;
    strategy = preset.strategy;
    keysText = preset.keys.join(', ');
    key = preset.key;
    bucketCount = preset.bucketCount;
    rebuild();
  }
</script>

<svelte:head>
  <title>Hash Table Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Watch hashing, bucket selection, collisions, chaining, linear probing, tombstones, and rehashing execute one step at a time."
  />
</svelte:head>

<LessonWorkspace
  {lesson}
  subject="dsa-1"
  completionId="hash-table-lab"
  completionXp={40}
  {completionKey}
  {completionKeys}
  backHref="/learn/dsa-1"
  backLabel="← DSA I"
  eyebrow="Hashing execution laboratory"
  title="Hash Table Lab"
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
            operation = event.currentTarget.value as HashTableOperation;
            rebuild();
          }}
        >
          {#each HASH_TABLE_OPERATIONS as item}<option value={item.id}>{item.label}</option>{/each}
        </select></label
      >
      <label
        >Strategy
        <select
          aria-label="Strategy"
          value={strategy}
          onchange={(event) => {
            strategy = event.currentTarget.value as HashTableStrategy;
            rebuild();
          }}
        >
          <option value="chaining">Separate chaining</option>
          <option value="linear-probing">Linear probing</option>
        </select></label
      >
      <label class="values"
        >Stored keys
        <input aria-label="Input" bind:value={keysText} onchange={rebuild} /></label
      >
      {#if operation !== 'resize'}
        <label>Key<input type="number" min="0" bind:value={key} onchange={rebuild} /></label>
      {/if}
      <label
        >Buckets<input
          type="number"
          min="2"
          max="16"
          bind:value={bucketCount}
          onchange={rebuild}
        /></label
      >
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
    <HashTableVisualizer {state} />
  {/snippet}

  {#snippet about()}
    <p>
      h(k) = k mod m computes the bucket directly — it is never searched for. Under uniform hashing
      a lookup is expected O(1); a degenerate distribution collapses to one chain (O(n)). Linear
      probing leaves tombstones on delete so probe runs stay intact, and a resize rehashes every
      stored key into a doubled table.
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
    min-width: 80px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.5rem;
    background: var(--bg);
    color: var(--text);
  }
  .cfg .values {
    flex: 1;
    min-width: 150px;
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

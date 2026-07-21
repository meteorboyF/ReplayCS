<script lang="ts">
  import { TOMBSTONE } from '$lib/engines/dsa/hashTable';
  import type { TraceValue } from '$lib/trace/types';

  let { state }: { state: Record<string, TraceValue> } = $props();

  let strategy = $derived(String(state.strategy ?? 'chaining'));
  let isChaining = $derived(strategy === 'chaining');
  let buckets = $derived((Array.isArray(state.buckets) ? state.buckets : []) as number[][]);
  let slots = $derived((Array.isArray(state.slots) ? state.slots : []) as (number | null)[]);
  let oldBuckets = $derived(
    Array.isArray(state.oldBuckets) ? (state.oldBuckets as number[][]) : null
  );
  let oldSlots = $derived(
    Array.isArray(state.oldSlots) ? (state.oldSlots as (number | null)[]) : null
  );
  let size = $derived(typeof state.size === 'number' ? state.size : 0);
  let bucketCount = $derived(typeof state.bucketCount === 'number' ? state.bucketCount : 0);
  let loadFactor = $derived(typeof state.loadFactor === 'number' ? state.loadFactor : 0);
  let comparedKeys = $derived(new Set((state.comparedKeys as number[] | undefined) ?? []));
  let loadPercent = $derived(Math.min(100, Math.round(loadFactor * 100)));

  function bucketClasses(index: number) {
    return [
      state.homeBucket === index ? 'home' : '',
      isChaining && (buckets[index]?.length ?? 0) > 1 ? 'collided' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }

  function slotClasses(index: number, value: number | null) {
    return [
      value === null ? 'spare' : value === TOMBSTONE ? 'tombstone' : 'live',
      state.homeBucket === index ? 'home' : '',
      state.probeIndex === index ? 'probing' : '',
      value !== null && value !== TOMBSTONE && comparedKeys.has(value) ? 'compared' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }
</script>

<section class="visualizer panel" aria-label="Hash table memory state">
  <div class="scalar-dock" aria-label="Hash bookkeeping values">
    <div class:active={state.hashedKey !== null}>
      <span>hashing</span><code
        >{state.hashedKey === null ? '—' : `h(${state.hashedKey}) = ${state.homeBucket}`}</code
      >
    </div>
    <div class="active"><span>size n</span><code>{size}</code></div>
    <div class="active"><span>buckets m</span><code>{bucketCount}</code></div>
    <div class:active={state.probeIndex !== null}>
      <span>probe i</span><code
        >{state.probeIndex === null ? 'null' : String(state.probeIndex)}</code
      >
    </div>
    <div class="active load">
      <span>load factor α</span>
      <code>{loadFactor.toFixed(2)}</code>
      <div class="load-bar" aria-hidden="true">
        <i style={`width:${loadPercent}%`} class:hot={loadFactor > 0.75}></i>
        <em style="left:75%"></em>
      </div>
    </div>
  </div>

  {#if oldBuckets || oldSlots}
    <div class="table-block old">
      <p><b>Old table</b> · m = {String(state.oldBucketCount)} · keys being rehashed out</p>
      <div class="buckets" aria-label="Old table before resize">
        {#if oldBuckets}
          {#each oldBuckets as chain, index}
            <div class="bucket">
              <small>{index}</small>
              <div class="chain">
                {#each chain as key}<b class:moving={state.hashedKey === key}>{key}</b>{:else}<b
                    class="nil">·</b
                  >{/each}
              </div>
            </div>
          {/each}
        {:else if oldSlots}
          {#each oldSlots as slot, index}
            <div class="bucket">
              <small>{index}</small>
              <div class="chain">
                <b class:moving={state.hashedKey === slot} class:nil={slot === null}
                  >{slot === null ? '·' : slot === TOMBSTONE ? '✝' : slot}</b
                >
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <div class="table-block">
    <p>
      <b>{oldBuckets || oldSlots ? 'New table' : 'Table'}</b> · {isChaining
        ? 'each bucket holds a chain of colliding keys'
        : 'one key per slot; collisions probe forward, deletes leave tombstones (✝)'}
    </p>
    <div class="buckets" aria-label="Hash table buckets">
      {#if isChaining}
        {#each buckets as chain, index}
          <div class="bucket {bucketClasses(index)}">
            <small>{index}</small>
            {#if state.homeBucket === index}<span class="home-tag">h(k)</span>{/if}
            <div class="chain">
              {#each chain as key, position}
                <b
                  class:compared={comparedKeys.has(key)}
                  class:cursor={state.homeBucket === index && state.chainPosition === position}
                  >{key}</b
                >
              {:else}
                <b class="nil">·</b>
              {/each}
            </div>
          </div>
        {/each}
      {:else}
        {#each slots as slot, index}
          <div class="bucket probe-slot {slotClasses(index, slot)}">
            <small>{index}</small>
            {#if state.homeBucket === index}<span class="home-tag">h(k)</span>{/if}
            {#if state.probeIndex === index}<span class="probe-tag">i</span>{/if}
            <div class="chain">
              <b class:nil={slot === null}
                >{slot === null ? '·' : slot === TOMBSTONE ? '✝' : slot}</b
              >
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="legend" aria-label="State legend">
    <span><i class="l-home"></i>Home bucket h(k)</span>
    {#if !isChaining}<span><i class="l-probe"></i>Probe cursor</span><span
        ><i class="l-tomb"></i>Tombstone ✝</span
      >{/if}
    <span><i class="l-compared"></i>Compared</span>
    <span><i class="l-collided"></i>Collision chain</span>
  </div>
</section>

<style>
  .visualizer {
    padding: 1rem;
    display: grid;
    gap: 0.9rem;
    overflow: hidden;
  }
  .scalar-dock {
    display: grid;
    grid-template-columns: repeat(4, minmax(76px, 1fr)) minmax(120px, 1.4fr);
    gap: 0.4rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid var(--border);
  }
  .scalar-dock > div {
    display: grid;
    gap: 0.2rem;
    padding: 0.45rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: #07111f88;
    align-content: start;
  }
  .scalar-dock > div.active {
    border-color: #2dd4bf66;
    background: #2dd4bf0b;
  }
  .scalar-dock span {
    color: var(--muted);
    font-size: 0.64rem;
  }
  .scalar-dock code {
    color: var(--primary);
    font-size: 0.78rem;
  }
  .load-bar {
    position: relative;
    height: 6px;
    margin-top: 0.2rem;
    border-radius: 99px;
    background: #1e293b;
    overflow: visible;
  }
  .load-bar i {
    display: block;
    height: 100%;
    border-radius: 99px;
    background: var(--primary);
    transition: 200ms;
  }
  .load-bar i.hot {
    background: var(--danger);
  }
  .load-bar em {
    position: absolute;
    top: -2px;
    height: 10px;
    border-left: 2px dashed var(--warning);
  }
  .table-block p {
    margin: 0 0 0.4rem;
    color: var(--muted);
    font-size: 0.68rem;
  }
  .table-block p b {
    color: var(--text);
  }
  .table-block.old p b {
    color: var(--warning);
  }
  .table-block.old .bucket {
    opacity: 0.6;
  }
  .buckets {
    display: flex;
    gap: 0.3rem;
    align-items: start;
    overflow-x: auto;
    padding: 0.7rem 0 0.2rem;
  }
  .bucket {
    position: relative;
    flex: 1;
    min-width: 46px;
    display: grid;
    gap: 0.25rem;
    justify-items: center;
    padding: 0.45rem 0.25rem 0.4rem;
    border: 2px solid #334155;
    border-radius: 10px;
    background: #0a1727;
    transition: 160ms ease;
  }
  .bucket small {
    color: var(--muted);
    font-size: 0.58rem;
  }
  .bucket.home {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px #2dd4bf18;
  }
  .bucket.collided {
    border-color: var(--warning);
  }
  .bucket.probing {
    border-color: var(--secondary);
    transform: translateY(-4px);
  }
  .bucket.tombstone {
    border-style: dashed;
    border-color: var(--danger);
  }
  .bucket.spare {
    border-style: dashed;
    opacity: 0.65;
  }
  .home-tag,
  .probe-tag {
    position: absolute;
    top: -10px;
    padding: 0.05rem 0.35rem;
    border-radius: 99px;
    font: 0.52rem var(--mono);
  }
  .home-tag {
    left: 4px;
    background: var(--primary);
    color: #04231f;
  }
  .probe-tag {
    right: 4px;
    background: var(--secondary);
    color: #150b2e;
  }
  .chain {
    display: grid;
    gap: 0.2rem;
    justify-items: center;
  }
  .chain b {
    min-width: 34px;
    padding: 0.2rem 0.3rem;
    border: 1px solid #2dd4bf44;
    border-radius: 7px;
    background: #2dd4bf0a;
    text-align: center;
    font: 0.85rem var(--mono);
    transition: 140ms;
  }
  .chain b.nil {
    border-color: var(--border);
    border-style: dashed;
    background: none;
    color: var(--muted);
  }
  .chain b.compared {
    border-color: var(--warning);
    background: #fbbf2415;
  }
  .chain b.cursor {
    border-color: var(--secondary);
    box-shadow: 0 0 0 3px #9b7cff18;
    transform: translateY(-2px);
  }
  .chain b.moving {
    border-color: var(--accent);
    background: #38bdf81c;
  }
  .bucket.tombstone .chain b {
    border-color: var(--danger);
    background: #f8717111;
    color: var(--danger);
  }
  .legend {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    color: var(--muted);
    font-size: 0.62rem;
  }
  .legend span {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
  }
  .legend i {
    width: 9px;
    height: 9px;
    border: 2px solid;
    border-radius: 3px;
  }
  .legend i.l-home {
    border-color: var(--primary);
  }
  .legend i.l-probe {
    border-color: var(--secondary);
  }
  .legend i.l-tomb {
    border-color: var(--danger);
    border-style: dashed;
  }
  .legend i.l-compared {
    border-color: var(--warning);
  }
  .legend i.l-collided {
    border-color: var(--warning);
  }
  @media (max-width: 720px) {
    .scalar-dock {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>

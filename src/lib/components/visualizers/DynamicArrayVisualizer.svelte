<script lang="ts">
  import { ELEMENT_SIZE_BYTES, ADDRESS_BASE } from '$lib/engines/dsa/dynamicArray';
  import type { SupportedLanguage, TraceValue } from '$lib/trace/types';

  let {
    state,
    language,
    activeSemantic
  }: {
    state: Record<string, TraceValue>;
    language: SupportedLanguage;
    activeSemantic: string;
  } = $props();

  let slots = $derived((Array.isArray(state.slots) ? state.slots : []) as (number | null)[]);
  let oldSlots = $derived(
    Array.isArray(state.oldSlots) ? (state.oldSlots as (number | null)[]) : null
  );
  let copySlots = $derived(
    Array.isArray(state.copySlots) ? (state.copySlots as (number | null)[]) : null
  );
  let size = $derived(typeof state.size === 'number' ? state.size : 0);
  let shifted = $derived(new Set((state.shifted as number[] | undefined) ?? []));
  let copied = $derived(new Set((state.copied as number[] | undefined) ?? []));

  const scalarNames = [
    'size',
    'capacity',
    'i',
    'readIndex',
    'writeIndex',
    'appendsCompleted',
    'totalElementCopies'
  ] as const;

  const primaryReadSemantics = new Set([
    'access-read',
    'search-compare',
    'insert-shift-move',
    'delete-shift-move',
    'copy-move'
  ]);
  const primaryWriteSemantics = new Set([
    'update-write',
    'insert-shift-move',
    'insert-write',
    'append-copy-move',
    'append-write',
    'delete-shift-move',
    'delete-clear',
    'delete-end-clear'
  ]);

  function scalarValue(name: (typeof scalarNames)[number]) {
    const value = state[name];
    return value === null || value === undefined ? 'null' : String(value);
  }

  function address(index: number) {
    return `0x${(ADDRESS_BASE + index * ELEMENT_SIZE_BYTES).toString(16).toUpperCase()}`;
  }

  function addressTitle() {
    if (language === 'c' || language === 'cpp') {
      return 'Teaching address model only. Native element spacing is determined by sizeof(int).';
    }
    if (language === 'java') {
      return 'Java exposes an array index, not a stable native address or JVM object layout.';
    }
    return 'Python exposes a logical list index; CPython pointer width and object layout are implementation details.';
  }

  function primaryRead(index: number) {
    return primaryReadSemantics.has(activeSemantic) && state.readIndex === index;
  }

  function primaryWrite(index: number) {
    return primaryWriteSemantics.has(activeSemantic) && state.writeIndex === index;
  }

  function oldBufferRead(index: number) {
    return oldSlots !== null && activeSemantic === 'append-copy-move' && state.readIndex === index;
  }

  function copyBufferWrite(index: number) {
    return (
      copySlots !== null &&
      activeSemantic === 'copy-move' &&
      state.writeIndex === index &&
      copied.has(index) &&
      copySlots[index] !== null
    );
  }

  function slotClasses(index: number, value: number | null) {
    return [
      index < size && value !== null ? 'live' : 'spare',
      shifted.has(index) ? 'shifted' : '',
      copied.has(index) ? 'copied' : '',
      primaryRead(index) ? 'reading' : '',
      primaryWrite(index) ? 'writing' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }
</script>

<section class="visualizer panel" aria-label="Array memory state">
  <div class="scalar-dock" aria-label="Cursor and bookkeeping values">
    {#each scalarNames as name}
      <div class:active={scalarValue(name) !== 'null'}>
        <span>{name}</span><code>{scalarValue(name)}</code>
      </div>
    {/each}
  </div>

  <p class="address-note">
    <b>Modeled slot addresses:</b> base 0x100 + index × 4-byte teaching slot. Native C/C++ uses
    <code>sizeof(int)</code>; Java and Python expose indexed elements rather than stable raw
    addresses.
  </p>

  {#if oldSlots}
    <div class="buffer-block old">
      <p><b>Old buffer</b> · capacity {String(state.oldCapacity)} · being copied out</p>
      <div class="buffer" aria-label="Old buffer before resize">
        {#each oldSlots as value, index}
          <div
            class="slot {copied.has(index) ? 'copied-out' : 'live'} {oldBufferRead(index)
              ? 'reading'
              : ''}"
          >
            <small>{index}</small><b>{value === null ? '·' : value}</b><em>source slot</em>
            <span class="marks">
              {#if oldBufferRead(index)}<i class="r">R</i>{/if}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="buffer-block">
    <p>
      <b>{oldSlots ? 'New buffer' : 'Buffer'}</b> · size {size} / capacity {String(state.capacity)}
    </p>
    <div class="buffer" aria-label="Array buffer slots">
      {#if slots.length === 0}
        <div class="empty">The buffer has zero capacity.</div>
      {:else}
        {#each slots as value, index}
          <div class="slot {slotClasses(index, value)}">
            <small>{index}</small>
            <b>{value === null ? '·' : value}</b>
            <em title={addressTitle()}>model {address(index)}</em>
            <span class="marks">
              {#if primaryRead(index)}<i class="r">R</i>{/if}
              {#if primaryWrite(index)}<i class="w">W</i>{/if}
            </span>
          </div>
        {/each}
      {/if}
    </div>
    <div class="size-rule" aria-hidden="true">
      <span style={`flex:${Math.max(size, 0)}`} class="in-size">← logical size {size}</span>
      <span style={`flex:${Math.max(slots.length - size, 0)}`} class="spare-run"
        >{slots.length - size > 0 ? `spare capacity ${slots.length - size}` : ''}</span
      >
    </div>
  </div>

  {#if copySlots}
    <div class="buffer-block copy">
      <p><b>Destination buffer</b> · independent new memory</p>
      <div class="buffer" aria-label="Copy destination buffer">
        {#each copySlots as value, index}
          <div
            class="slot {value === null ? 'spare' : 'copied'} {copyBufferWrite(index)
              ? 'writing'
              : ''}"
          >
            <small>{index}</small><b>{value === null ? '·' : value}</b><em>destination slot</em>
            <span class="marks">
              {#if copyBufferWrite(index)}<i class="w">W</i>{/if}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="legend" aria-label="Slot state legend">
    <span><i class="l-live"></i>In size</span><span><i class="l-spare"></i>Spare capacity</span>
    <span><i class="l-shifted"></i>Shifted</span><span><i class="l-copied"></i>Copied</span>
    <span><i class="l-rw"></i>Read / write this line</span>
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
    grid-template-columns: repeat(7, minmax(70px, 1fr));
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
  .address-note {
    margin: 0;
    color: var(--muted);
    font-size: 0.62rem;
    line-height: 1.45;
  }
  .address-note b,
  .address-note code {
    color: var(--accent);
  }
  .buffer-block p {
    margin: 0 0 0.4rem;
    color: var(--muted);
    font-size: 0.68rem;
  }
  .buffer-block p b {
    color: var(--text);
  }
  .buffer-block.old p b {
    color: var(--warning);
  }
  .buffer-block.copy p b {
    color: var(--accent);
  }
  .buffer {
    display: flex;
    gap: 0.35rem;
    overflow-x: auto;
    padding-bottom: 0.2rem;
  }
  .slot {
    position: relative;
    flex: 1;
    min-width: 58px;
    display: grid;
    gap: 0.15rem;
    justify-items: center;
    padding: 0.55rem 0.3rem 0.4rem;
    border: 2px solid #334155;
    border-radius: 10px;
    background: #0a1727;
    transition: 160ms ease;
  }
  .slot small {
    color: var(--muted);
    font-size: 0.58rem;
  }
  .slot b {
    font: 1.15rem var(--mono);
  }
  .slot em {
    color: #53647b;
    font-size: 0.5rem;
    font-style: normal;
  }
  .slot.live {
    border-color: #2dd4bf66;
    background: #2dd4bf0a;
  }
  .slot.spare {
    border-style: dashed;
    opacity: 0.65;
  }
  .slot.spare b {
    color: var(--muted);
  }
  .slot.shifted {
    border-color: var(--secondary);
    background: #9b7cff12;
  }
  .slot.copied,
  .slot.copied-out {
    border-color: var(--accent);
    background: #38bdf812;
  }
  .slot.copied-out {
    opacity: 0.55;
  }
  .slot.reading {
    border-color: var(--warning);
    transform: translateY(-4px);
  }
  .slot.writing {
    border-color: var(--success);
    box-shadow: 0 0 0 4px #4ade8018;
    transform: translateY(-4px);
  }
  .marks {
    position: absolute;
    top: -9px;
    right: -4px;
    display: flex;
    gap: 0.15rem;
  }
  .marks i {
    display: grid;
    place-items: center;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    font: 0.55rem var(--mono);
    font-style: normal;
  }
  .marks i.r {
    background: var(--warning);
    color: #241a02;
  }
  .marks i.w {
    background: var(--success);
    color: #04230d;
  }
  .size-rule {
    display: flex;
    gap: 0.35rem;
    margin-top: 0.3rem;
    font-size: 0.56rem;
  }
  .size-rule .in-size {
    color: var(--primary);
    border-top: 2px solid var(--primary);
    padding-top: 0.15rem;
  }
  .size-rule .spare-run {
    color: var(--muted);
    border-top: 2px dashed var(--border);
    padding-top: 0.15rem;
  }
  .empty {
    color: var(--muted);
    font-size: 0.75rem;
    padding: 0.6rem;
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
  .legend i.l-live {
    border-color: var(--primary);
  }
  .legend i.l-spare {
    border-color: var(--border);
    border-style: dashed;
  }
  .legend i.l-shifted {
    border-color: var(--secondary);
  }
  .legend i.l-copied {
    border-color: var(--accent);
  }
  .legend i.l-rw {
    border-color: var(--success);
  }
  @media (max-width: 720px) {
    .scalar-dock {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>

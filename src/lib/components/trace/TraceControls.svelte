<script lang="ts">
  let {
    index,
    total,
    playing,
    onprevious,
    onnext,
    onrestart,
    onplay,
    onjump
  }: {
    index: number;
    total: number;
    playing: boolean;
    onprevious: () => void;
    onnext: () => void;
    onrestart: () => void;
    onplay: () => void;
    onjump: (n: number) => void;
  } = $props();
</script>

<div class="controls panel">
  <button onclick={onrestart} aria-label="Restart trace">↺</button><button
    onclick={onprevious}
    disabled={index === 0}>← Previous</button
  ><button class="play" onclick={onplay} aria-label={playing ? 'Pause' : 'Play'}
    >{playing ? 'Ⅱ' : '▶'}</button
  ><button onclick={onnext} disabled={index === total - 1}>Next →</button><input
    aria-label="Trace timeline"
    type="range"
    min="0"
    max={total - 1}
    value={index}
    oninput={(e) => onjump(Number(e.currentTarget.value))}
  /><span>{index + 1} / {total}</span>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem;
  }
  .play {
    border-radius: 50%;
    width: 42px;
    height: 42px;
    padding: 0;
    background: var(--primary);
    color: #04231f;
  }
  .controls input {
    flex: 1;
    accent-color: var(--primary);
  }
  .controls span {
    color: var(--muted);
    font-size: 0.8rem;
  }
  @media (max-width: 600px) {
    .controls {
      flex-wrap: wrap;
    }
    .controls input {
      order: 2;
      flex-basis: 70%;
    }
  }
</style>

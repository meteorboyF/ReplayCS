<script lang="ts">
  let { value = 0, label = '' }: { value?: number; label?: string } = $props();
  const pct = $derived(Math.max(0, Math.min(100, value)));
</script>

<div
  class="progress"
  role="progressbar"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={Math.round(pct)}
  aria-label={label || undefined}
>
  <span style={`width:${pct}%`}></span>
</div>

<style>
  .progress {
    height: 6px;
    border-radius: 999px;
    background: var(--raised);
    overflow: hidden;
  }
  .progress > span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--primary), var(--accent));
    transition: width 0.35s ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .progress > span {
      transition: none;
    }
  }
</style>

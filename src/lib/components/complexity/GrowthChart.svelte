<script lang="ts">
  import {
    buildGrowthSeries,
    chartValue,
    CHARTABLE_COMPLEXITIES,
    evaluateComplexity,
    GROWTH_DISPLAY_CAP
  } from '$lib/complexity/growth';
  import type {
    ComplexityClass,
    ComplexityFamilyDefinition,
    GrowthPoint
  } from '$lib/complexity/types';

  let {
    families,
    initialInputSize = 16,
    maxInputSize = 40,
    title = 'How work grows with input size'
  }: {
    families: readonly ComplexityFamilyDefinition[];
    initialInputSize?: number;
    maxInputSize?: number;
    title?: string;
  } = $props();
  const instanceId = $props.id();

  const colors: Partial<Record<ComplexityClass, string>> = {
    'O(1)': '#4ade80',
    'O(log n)': '#2dd4bf',
    'O(sqrt n)': '#38bdf8',
    'O(n)': '#60a5fa',
    'O(n log n)': '#9b7cff',
    'O(n^2)': '#fbbf24',
    'O(n^3)': '#fb923c',
    'O(2^n)': '#fb7185',
    'O(n!)': '#f43f5e'
  };
  let chartLimit = $derived(Math.min(50, Math.max(2, Math.floor(maxInputSize))));
  let chartFamilies = $derived(
    families.filter(
      (family) => family.chartable && CHARTABLE_COMPLEXITIES.includes(family.complexityClass)
    )
  );
  let selectedClasses = $state<ComplexityClass[]>([]);
  let inputSize = $state(2);
  let scale = $state<'linear' | 'logarithmic'>('linear');
  let activeFamilyKey = $state('');
  let inputInitialized = $state(false);

  $effect(() => {
    const familyKey = chartFamilies.map((family) => family.id).join('|');
    if (familyKey !== activeFamilyKey) {
      activeFamilyKey = familyKey;
      const available = new Set(chartFamilies.map((family) => family.complexityClass));
      const preserved = selectedClasses.filter((complexityClass) => available.has(complexityClass));
      selectedClasses = preserved.length
        ? preserved
        : [...new Set(chartFamilies.slice(0, 4).map((family) => family.complexityClass))];
    }

    if (!inputInitialized) {
      inputInitialized = true;
      inputSize = Math.min(chartLimit, Math.max(2, Math.floor(initialInputSize)));
    } else if (inputSize > chartLimit) {
      inputSize = chartLimit;
    }
  });

  let series = $derived(
    selectedClasses.map((complexityClass) => ({
      complexityClass,
      points: buildGrowthSeries(complexityClass, inputSize)
    }))
  );
  let currentRows = $derived(
    selectedClasses.map((complexityClass) => ({
      complexityClass,
      evaluation: evaluateComplexity(complexityClass, { n: inputSize })
    }))
  );
  let plottedMaximum = $derived(
    Math.max(1, ...series.flatMap((item) => item.points.map((point) => chartValue(point, scale))))
  );
  let hasCappedValue = $derived(series.some((item) => item.points.some((point) => point.capped)));

  function toggleClass(complexityClass: ComplexityClass) {
    selectedClasses = selectedClasses.includes(complexityClass)
      ? selectedClasses.filter((item) => item !== complexityClass)
      : [...selectedClasses, complexityClass];
  }

  function colorFor(complexityClass: ComplexityClass) {
    return colors[complexityClass as keyof typeof colors] ?? 'var(--primary)';
  }

  function pointList(points: GrowthPoint[]) {
    const left = 28;
    const top = 18;
    const width = 664;
    const height = 224;
    return points
      .map((point, index) => {
        const x = left + (index / Math.max(1, points.length - 1)) * width;
        const normalized = chartValue(point, scale) / plottedMaximum;
        const y = top + height - normalized * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }
</script>

<section class="growth" aria-label={title}>
  <div class="heading">
    <div>
      <span class="eyebrow">Operation count, not elapsed time</span>
      <h3>{title}</h3>
    </div>
    <span class="scale-label">{scale === 'linear' ? 'Linear scale' : 'Log₁₀ scale'}</span>
  </div>

  <div class="controls">
    <label class="slider" for={`${instanceId}-growth-input-size`}>
      <span>Input size <strong>n = {inputSize}</strong></span>
      <input
        id={`${instanceId}-growth-input-size`}
        type="range"
        min="2"
        max={chartLimit}
        value={inputSize}
        oninput={(event) => (inputSize = Number(event.currentTarget.value))}
      />
    </label>

    <fieldset class="scale">
      <legend>Chart scale</legend>
      <label><input type="radio" bind:group={scale} value="linear" /> Linear</label>
      <label><input type="radio" bind:group={scale} value="logarithmic" /> Logarithmic</label>
    </fieldset>
  </div>

  <fieldset class="toggles">
    <legend>Complexity classes to compare</legend>
    {#each chartFamilies as family}
      <label style={`--toggle-color: ${colorFor(family.complexityClass)}`}>
        <input
          type="checkbox"
          checked={selectedClasses.includes(family.complexityClass)}
          onchange={() => toggleClass(family.complexityClass)}
        />
        <span aria-hidden="true"></span>{family.notation}
      </label>
    {:else}
      <p class="no-families">No chartable complexity families were supplied.</p>
    {/each}
  </fieldset>

  {#if selectedClasses.length}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable regions need keyboard focus in Safari.) -->
    <div
      class="chart-wrap"
      role="region"
      tabindex="0"
      aria-label="Scrollable complexity growth chart"
    >
      <svg
        viewBox="0 0 720 270"
        role="img"
        aria-labelledby={`${instanceId}-growth-chart-title ${instanceId}-growth-chart-desc`}
      >
        <title id={`${instanceId}-growth-chart-title`}
          >Selected complexity growth curves through n = {inputSize}</title
        >
        <desc id={`${instanceId}-growth-chart-desc`}>
          The exact values are available in the table immediately after this chart.
        </desc>
        <line x1="28" y1="242" x2="692" y2="242"></line>
        <line x1="28" y1="18" x2="28" y2="242"></line>
        <text x="28" y="261">1</text>
        <text x="678" y="261">{inputSize}</text>
        {#each series as item}
          <polyline
            points={pointList(item.points)}
            style={`stroke: ${colorFor(item.complexityClass)}`}
          ></polyline>
        {/each}
      </svg>
      <div class="legend" aria-hidden="true">
        {#each selectedClasses as complexityClass}<span
            style={`--legend-color: ${colorFor(complexityClass)}`}>{complexityClass}</span
          >{/each}
      </div>
    </div>
  {:else}
    <p class="empty" role="status">Select at least one complexity class to draw the chart.</p>
  {/if}

  {#if hasCappedValue}
    <p class="cap-warning" role="status">
      Some exponential or factorial counts reached the safe display cap of {GROWTH_DISPLAY_CAP.toLocaleString(
        'en-US'
      )}. ReplayCS stops calculating beyond that bound so the browser stays responsive.
    </p>
  {/if}

  <div class="table-wrap">
    <table>
      <caption>
        Representative growth values at input size {inputSize}
      </caption>
      <thead>
        <tr
          ><th scope="col">Complexity</th><th scope="col">n</th><th scope="col"
            >Modeled operations</th
          ></tr
        >
      </thead>
      <tbody>
        {#each currentRows as row}
          <tr>
            <th scope="row"><code>{row.complexityClass}</code></th>
            <td>{inputSize}</td>
            <td>{row.evaluation.display}{row.evaluation.capped ? ' (capped)' : ''}</td>
          </tr>
        {:else}
          <tr><td colspan="3">No classes selected.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .growth {
    min-width: 0;
  }
  .heading,
  .controls {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }
  .heading {
    align-items: start;
  }
  h3 {
    margin: 0.3rem 0 0;
    font-size: 1.15rem;
  }
  .scale-label {
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
    font-size: 0.7rem;
  }
  .controls {
    align-items: end;
    margin-top: 1rem;
  }
  .slider {
    display: grid;
    gap: 0.45rem;
    flex: 1;
    color: var(--muted);
    font-size: 0.78rem;
  }
  .slider span {
    display: flex;
    justify-content: space-between;
  }
  .slider strong {
    color: var(--primary);
  }
  .slider input {
    width: 100%;
    accent-color: var(--primary);
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
  }
  legend {
    color: var(--muted);
    font-size: 0.68rem;
    font-weight: 750;
  }
  .scale {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }
  .scale legend {
    width: 100%;
  }
  .scale label,
  .toggles label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.74rem;
  }
  input[type='radio'],
  input[type='checkbox'] {
    accent-color: var(--primary);
  }
  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 1rem;
  }
  .toggles legend {
    width: 100%;
    margin-bottom: 0.25rem;
  }
  .toggles label {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #07111f66;
  }
  .toggles label > span,
  .legend span::before {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: var(--toggle-color);
    content: '';
  }
  .no-families {
    margin: 0;
    color: var(--muted);
    font-size: 0.76rem;
  }
  .chart-wrap {
    margin-top: 1rem;
    padding: 0.7rem;
    border: 1px solid var(--border);
    border-radius: 13px;
    background: #07111f99;
    overflow-x: auto;
  }
  svg {
    display: block;
    width: 100%;
    min-width: 520px;
  }
  svg line {
    stroke: #60728a;
    stroke-width: 1;
  }
  svg text {
    fill: var(--muted);
    font: 11px var(--mono);
  }
  polyline {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    padding: 0 0.5rem 0.25rem;
  }
  .legend span {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--muted);
    font: 0.68rem var(--mono);
  }
  .legend span::before {
    background: var(--legend-color);
  }
  .empty,
  .cap-warning {
    margin: 1rem 0 0;
    padding: 0.75rem;
    border-radius: 10px;
    font-size: 0.76rem;
    line-height: 1.5;
  }
  .empty {
    border: 1px dashed var(--border);
    color: var(--muted);
  }
  .cap-warning {
    border: 1px solid #fbbf2455;
    background: #fbbf240a;
    color: var(--warning);
  }
  .table-wrap {
    margin-top: 1rem;
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.76rem;
  }
  caption {
    padding-bottom: 0.45rem;
    color: var(--muted);
    text-align: left;
    font-weight: 700;
  }
  th,
  td {
    padding: 0.55rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
  }
  thead th {
    color: var(--muted);
    font-size: 0.66rem;
    text-transform: uppercase;
  }
  tbody code {
    color: var(--primary);
  }
  @media (max-width: 620px) {
    .heading,
    .controls {
      align-items: stretch;
      flex-direction: column;
    }
    .scale-label {
      width: fit-content;
    }
  }
</style>

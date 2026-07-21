<script lang="ts">
  import type { OperationComplexityCase, OperationDefinition } from '$lib/complexity/types';

  let {
    operation,
    selectedCaseId,
    onselect = () => {}
  }: {
    operation: OperationDefinition;
    selectedCaseId?: string;
    onselect?: (caseId: string) => void;
  } = $props();

  function timeLabel(complexityCase: OperationComplexityCase) {
    return complexityCase.timeComplexity === 'custom'
      ? (complexityCase.customTimeComplexity ?? 'Custom')
      : complexityCase.timeComplexity;
  }
</script>

<section class="comparison" aria-label={`${operation.name} case comparison`}>
  <div class="intro">
    <div>
      <span class="eyebrow">Same operation, different evidence</span>
      <h3>Compare cases side by side</h3>
    </div>
    <p>{operation.cases.length} authored case{operation.cases.length === 1 ? '' : 's'}</p>
  </div>

  {#if operation.cases.length}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable regions need keyboard focus in Safari.) -->
    <div class="table-wrap" role="region" tabindex="0" aria-label="Scrollable case comparison">
      <table>
        <caption>
          Time, space, implementation, and assumptions for each deterministic case.
        </caption>
        <thead>
          <tr>
            <th scope="col">Case</th>
            <th scope="col">Implementation</th>
            <th scope="col">Time</th>
            <th scope="col">Auxiliary space</th>
            <th scope="col">Counting model / bound</th>
            <th scope="col">Key assumption</th>
          </tr>
        </thead>
        <tbody>
          {#each operation.cases as complexityCase}
            <tr class:selected={complexityCase.id === selectedCaseId}>
              <th scope="row">
                <button
                  type="button"
                  aria-pressed={complexityCase.id === selectedCaseId}
                  onclick={() => onselect(complexityCase.id)}
                >
                  <span>{complexityCase.caseType}</span>
                  {complexityCase.title}
                  {#if complexityCase.id === selectedCaseId}<small>Selected</small>{/if}
                </button>
              </th>
              <td>{complexityCase.implementationVariant}</td>
              <td><code>{timeLabel(complexityCase)}</code></td>
              <td><code>{complexityCase.auxiliarySpace}</code></td>
              <td>{complexityCase.exactCountFormula ?? 'Scenario-defined'}</td>
              <td>{complexityCase.assumptions[0] ?? 'No assumption documented'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="empty">No complexity cases have been published for this operation.</p>
  {/if}
</section>

<style>
  .intro {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 1rem;
    margin-bottom: 0.8rem;
  }
  h3 {
    margin: 0.3rem 0 0;
    font-size: 1.15rem;
  }
  .intro p {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .table-wrap {
    max-width: 100%;
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: 13px;
  }
  table {
    width: 100%;
    min-width: 830px;
    border-collapse: collapse;
    font-size: 0.78rem;
  }
  caption {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  th,
  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
    vertical-align: top;
    line-height: 1.45;
  }
  thead th {
    color: var(--muted);
    background: var(--bg);
    font-size: 0.67rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  tbody tr:last-child > * {
    border-bottom: 0;
  }
  tbody tr.selected {
    background: color-mix(in srgb, var(--primary) 4%, transparent);
  }
  tbody th {
    min-width: 145px;
  }
  tbody th button {
    display: grid;
    gap: 0.25rem;
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
    text-align: left;
    font-weight: 750;
  }
  tbody th button:hover {
    color: var(--primary);
  }
  tbody th span {
    color: var(--secondary);
    font-size: 0.63rem;
    text-transform: uppercase;
  }
  tbody th small {
    color: var(--success);
  }
  code {
    color: var(--primary);
    white-space: nowrap;
  }
  .empty {
    padding: 1rem;
    border: 1px dashed var(--border);
    border-radius: 12px;
    color: var(--muted);
  }
  @media (max-width: 600px) {
    .intro {
      align-items: start;
      flex-direction: column;
    }
  }
</style>

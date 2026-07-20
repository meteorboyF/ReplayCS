<script lang="ts">
  import type { QueryRow, QueryValue } from '$lib/engines/dbms/queryPipeline';

  let {
    rows,
    caption,
    emptyMessage = 'No rows are entering this stage.',
    compact = false
  }: {
    rows: QueryRow[];
    caption: string;
    emptyMessage?: string;
    compact?: boolean;
  } = $props();

  let columns = $derived(rows.length ? Object.keys(rows[0]) : []);

  function label(column: string) {
    return column.replaceAll('_', ' ');
  }

  function display(value: QueryValue) {
    if (value === null) return 'NULL';
    if (typeof value === 'number') return new Intl.NumberFormat('en-US').format(value);
    return value;
  }
</script>

<div class:compact class="table-shell">
  {#if rows.length}
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th class="row-number" scope="col">#</th>
          {#each columns as column}
            <th scope="col">{label(column)}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row, rowIndex}
          <tr>
            <th class="row-number" scope="row">{rowIndex + 1}</th>
            {#each columns as column}
              <td class:null-value={row[column] === null}>{display(row[column])}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <div class="empty" role="note">
      <span>∅</span>
      <p>{emptyMessage}</p>
    </div>
  {/if}
</div>

<style>
  .table-shell {
    overflow: auto;
    max-height: 420px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #07111f99;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.76rem;
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
    padding: 0.62rem 0.68rem;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid var(--border);
  }
  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    color: #ffd48a;
    background: #101e31;
    font: 700 0.65rem var(--mono);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  tbody tr:last-child > * {
    border-bottom: 0;
  }
  tbody tr:hover {
    background: #fbbf2409;
  }
  .row-number {
    width: 2.4rem;
    color: var(--muted);
    font: 500 0.65rem var(--mono);
  }
  .null-value {
    color: var(--secondary);
    font: 700 0.7rem var(--mono);
  }
  .compact {
    max-height: 300px;
  }
  .compact th,
  .compact td {
    padding: 0.48rem 0.56rem;
    font-size: 0.68rem;
  }
  .empty {
    min-height: 150px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.35rem;
    color: var(--muted);
    text-align: center;
  }
  .empty span {
    color: var(--primary);
    font: 1.6rem var(--mono);
  }
  .empty p {
    max-width: 30ch;
    margin: 0;
    font-size: 0.75rem;
  }
</style>

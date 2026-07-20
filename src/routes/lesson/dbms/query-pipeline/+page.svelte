<script lang="ts">
  import { createQueryPipeline } from '$lib/engines/dbms/queryPipeline';
  const stages = createQueryPipeline();
  let index = $state(0);
  let stage = $derived(stages[index]);
  let columns = $derived(stage.rows.length ? Object.keys(stage.rows[0]) : []);
  const sql = `SELECT d.department_name, COUNT(e.employee_id) AS employee_count,\n       AVG(e.salary) AS average_salary\nFROM departments d JOIN employees e ON e.department_id = d.department_id\nWHERE e.status = 'Active' GROUP BY d.department_name\nORDER BY average_salary DESC LIMIT 2;`;
</script>

<a class="back" href="/learn/dbms">← DBMS</a>
<p class="eyebrow">Flagship logical execution trace</p>
<h1>SQL Query Pipeline</h1>
<p class="intro">
  The database may choose a different physical plan. This lesson teaches SQL's logical processing
  model.
</p>
<div class="pipeline">
  {#each stages as s, i}<button
      class:active={i === index}
      class:done={i < index}
      onclick={() => (index = i)}>{s.operation}</button
    >{#if i < stages.length - 1}<span>→</span>{/if}{/each}
</div>
<div class="grid">
  <section class="panel query">
    <span class="eyebrow">Query</span>
    <pre>{sql}</pre>
  </section>
  <section class="panel result">
    <div class="head">
      <div>
        <span class="eyebrow">Stage {index + 1} / {stages.length}</span>
        <h2>{stage.operation}</h2>
      </div>
      <span class="pill">{stage.rows.length} rows</span>
    </div>
    <p>{stage.description}</p>
    <div class="table">
      <table>
        <thead
          ><tr
            >{#each columns as c}<th>{c}</th>{/each}</tr
          ></thead
        ><tbody
          >{#each stage.rows as row}<tr
              >{#each columns as c}<td>{row[c]}</td>{/each}</tr
            >{/each}</tbody
        >
      </table>
    </div>
    <div class="controls">
      <button onclick={() => (index = Math.max(0, index - 1))} disabled={index === 0}
        >← Previous</button
      ><button
        class="primary"
        onclick={() => (index = Math.min(stages.length - 1, index + 1))}
        disabled={index === stages.length - 1}>Reveal next stage →</button
      >
    </div>
  </section>
</div>

<style>
  .back {
    color: var(--primary);
  }
  h1 {
    font-size: 3rem;
    margin: 0.4rem 0;
  }
  .intro {
    color: var(--muted);
  }
  .pipeline {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin: 2rem 0;
    overflow: auto;
  }
  .pipeline button {
    font-size: 0.72rem;
    white-space: nowrap;
  }
  .pipeline button.active {
    border-color: var(--primary);
    color: var(--primary);
    background: #2dd4bf18;
  }
  .pipeline button.done {
    border-color: var(--success);
  }
  .pipeline span {
    color: var(--muted);
  }
  .grid {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 1rem;
  }
  .query,
  .result {
    padding: 1.2rem;
  }
  .query pre {
    white-space: pre-wrap;
    font: 13px/1.7 var(--mono);
    color: #cfe4ff;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: start;
  }
  .head h2 {
    margin: 0.3rem 0;
  }
  .result > p {
    color: var(--muted);
  }
  .table {
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.8rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.6rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  th {
    color: var(--primary);
    background: var(--bg);
  }
  .controls {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
  }
  @media (max-width: 800px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>

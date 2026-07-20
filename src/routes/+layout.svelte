<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head
  ><title>ReplayCS — Trace every state</title><meta
    name="description"
    content="Learn computer science by predicting the next execution state."
  /></svelte:head
>
<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-header">
  <a class="brand" href="/"><span class="mark">R▶</span> ReplayCS</a>
  <nav aria-label="Main navigation">
    <a href="/learn/dsa-1">Learn</a><a href="/trace-lab">Trace Lab</a><a href="/complexity"
      >Complexity</a
    ><a href="/challenges">Challenges</a><a class="judge-link" href="/judge-demo">Judge Demo</a><a
      href="/progress">Progress</a
    ><a href="/about">About</a>
  </nav>
</header>
<main id="main-content" tabindex="-1">{@render children()}</main>
<footer>ReplayCS · Built to make invisible state visible.</footer>

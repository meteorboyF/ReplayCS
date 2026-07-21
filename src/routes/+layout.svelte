<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  let { children } = $props();

  let theme = $state<'light' | 'dark'>('light');

  onMount(() => {
    try {
      theme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    } catch (e) {
      theme = 'light';
    }
  });

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    if (theme === 'dark') {
      document.documentElement.dataset.theme = 'dark';
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      /* ignore */
    }
  }
</script>

<svelte:head
  ><title>ReplayCS — Trace every state</title><meta
    name="description"
    content="Learn computer science by running code one line at a time and watching the state change."
  /></svelte:head
>
<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-header">
  <a class="brand" href="/"><span class="mark">R▶</span> ReplayCS</a>
  <nav aria-label="Main navigation">
    <a href="/learn/dsa-1">Learn</a><a href="/trace-lab">Trace Lab</a><a href="/complexity"
      >Complexity</a
    ><a class="judge-link" href="/judge-demo">Judge Demo</a><a href="/progress">Progress</a><a
      href="/about">About</a
    >
    <button
      class="theme-toggle"
      type="button"
      onclick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  </nav>
</header>
<main id="main-content" tabindex="-1">{@render children()}</main>
<footer>ReplayCS · Built to make invisible state visible.</footer>

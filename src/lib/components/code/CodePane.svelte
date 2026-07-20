<script lang="ts">
  import type { SourceLine, SupportedLanguage } from '$lib/trace/types';
  let {
    source,
    language,
    activeSemantic,
    onlanguage
  }: {
    source: Record<SupportedLanguage, SourceLine[]>;
    language: SupportedLanguage;
    activeSemantic: string;
    onlanguage: (l: SupportedLanguage) => void;
  } = $props();
  const languages: SupportedLanguage[] = ['c', 'cpp', 'java', 'python'];

  function moveLanguageFocus(event: KeyboardEvent, currentLanguage: SupportedLanguage) {
    let nextIndex: number;
    const currentIndex = languages.indexOf(currentLanguage);

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + languages.length) % languages.length;
        break;
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % languages.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = languages.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    onlanguage(languages[nextIndex]);

    const tablist = (event.currentTarget as HTMLButtonElement).closest('[role="tablist"]');
    tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }
</script>

<section class="panel code-panel">
  <div class="tabs" role="tablist" aria-label="Programming language" aria-orientation="horizontal">
    {#each languages as lang}<button
        type="button"
        role="tab"
        aria-selected={lang === language}
        tabindex={lang === language ? 0 : -1}
        class:active={lang === language}
        onclick={() => onlanguage(lang)}
        onkeydown={(event) => moveLanguageFocus(event, lang)}
        >{lang === 'cpp' ? 'C++' : lang.toUpperCase()}</button
      >{/each}
  </div>
  <pre aria-label="Source code">{#each source[language] as line}<div
        class:active={line.semanticOperationId === activeSemantic}><span>{line.number}</span><code
          >{line.text || ' '}</code
        ></div>{/each}</pre>
</section>

<style>
  .code-panel {
    overflow: hidden;
  }
  .tabs {
    padding: 0.6rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 0.3rem;
  }
  .tabs button {
    padding: 0.4rem 0.6rem;
    background: transparent;
  }
  .tabs button.active {
    color: var(--primary);
    background: #2dd4bf18;
    border-color: var(--primary);
  }
  pre {
    margin: 0;
    padding: 0.8rem 0;
    overflow: auto;
    font: 13px/1.75 var(--mono);
  }
  pre div {
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    padding: 0 1rem;
    border-left: 3px solid transparent;
    white-space: pre;
  }
  pre div.active {
    background: #2dd4bf18;
    border-left-color: var(--primary);
    color: #d8fff8;
  }
  pre span {
    color: #60728a;
    user-select: none;
  }
</style>

<script lang="ts">
  import { page } from '$app/state';
</script>

<p class="eyebrow">Trace interrupted</p>
<h1>{page.status}</h1>
<p>{page.error?.message ?? 'This state could not be restored.'}</p>
<a class="button primary" href="/">Return to ReplayCS</a>

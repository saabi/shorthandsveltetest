<script>
	import {onMount} from 'svelte';

	onMount( () => {
		console.log('posting...')
		parent.postMessage('hello', '*')
		console.log('posted')
	});
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<script>
	import {onMount} from 'svelte';

	onMount( () => {
		console.log('posting...')
		parent.postMessage('hello', '*')
		console.log('posted')

		addEventListener('message', e => {
			console.log('received');
			var key = e.message ? "message" : "data";
			var data = e[key];
			console.log(e, key, data)
		}, false);
	});
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

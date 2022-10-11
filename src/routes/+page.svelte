<script>
	import {onMount} from 'svelte';

	let message;

	onMount( () => {
		console.log('posting...')
		parent.postMessage('hello', '*')
		console.log('posted')

		addEventListener(
			'message',
			e => {
				console.log('received');
				var key = e.message ? "message" : "data";
				var data = e[key];
				message = data;
			},
			false
		);
	});
</script>

<h1>Welcome to SvelteKit</h1>
<pre>
{message && JSON.stringify(message, null, 2)}
</pre>

<script>
	import {onMount} from 'svelte';

	import HeatGrid from '$lib/components/HeatGrid.svelte';

	let message;
	let datapoint

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

<div>
	<HeatGrid
		columnHeaders={['column 1', 'column 2', 'column 3', 'column 4']}
		rowHeaders={['row 1', 'row 2', 'row 3']}
		data={[
			[0, 1, 2, 3],
			[1, 2, 3, 0],
			[2, 3, 0, 1],
		]}
		colorMap={[
			'silver',
			'cyan',
			'yellow',
			'red'
		]}
		on:pointhovered={({detail}) => datapoint = detail}
	/>
	{#if datapoint}
		<pre>{JSON.stringify(datapoint, null, 2)}</pre>
	{/if}
</div>

<style>
	div {
		font-family: sans-serif;
		width: 800px;
		height: 150px;
		display: grid;
		grid-template-columns: 50% 50%;
	}
	pre {
		background: #eee;
		border: thin solid silver;
	}
</style>

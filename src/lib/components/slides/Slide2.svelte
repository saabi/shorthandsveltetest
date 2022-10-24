<script>
	import {onMount} from 'svelte';
	import {VegaLite} from "svelte-vega";

	import HeatGrid from '../charts/HeatGrid.svelte';
	import * as specs from '../../data/vegaCharts';
    import Banner from '../svizzle/Banner.svelte';

	const chart1 = specs.test_bar_chart;
	const chart2 = specs.test_magnitude_vs_growth;
	const chart3 = specs.v2022_10_14_Heat_map;

	const URLs = [
		[chart1, chart2, chart3, chart1],
		[chart2, chart3, chart1, chart2],
		[chart3, chart1, chart2, chart3],
		[chart1, chart2, chart3, chart1],
		[chart2, chart3, chart1, chart2],
		[chart3, chart1, chart2, chart3],
		[chart1, chart2, chart3, chart1],
		[chart2, chart3, chart1, chart2],
		[chart3, chart1, chart2, chart3],
		[chart1, chart2, chart3, chart1],
	];

	let message;
	let datapoint;
	let spec;

	onMount( () => {
		console.log('posting...')
		globalThis.parent?.postMessage('hello', '*')
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

	$: datapoint && globalThis.parent?.postMessage({
		message: 'setURL',
		source: 'slide1',
		url: URLs[datapoint.i][datapoint.j]
	}, '*')

	$: datapoint && console.log(datapoint, URLs[datapoint.i][datapoint.j])
	$: datapoint && (spec = URLs[datapoint.i][datapoint.j])
</script>

<div class='heatgrid'>
	<HeatGrid
		columnHeaders={['col1', 'col2', 'col3', 'col4']}
		rowHeaders={['row 1', 'row 2', 'row 3', 'row 4', 'row 5', 'row 6', 'row 7', 'row 8', 'row 9', 'row 10']}
		data={[
			[0, 1, 2, 3],
			[1, 2, 3, 0],
			[2, 3, 0, 1],
			[3, 0, 1, 2],
			[0, 1, 2, 3],
			[1, 2, 3, 0],
			[2, 3, 0, 1],
			[3, 0, 1, 2],
			[0, 1, 2, 3],
			[1, 2, 3, 0],
		]}
		colorMap={[
			'silver',
			'cyan',
			'yellow',
			'red'
		]}
		on:pointhovered={({detail}) => datapoint = detail}
		useClick
	/>
</div>

{#if spec}
	<div class='banner'>
		<Banner
			on:close={() => spec = null}
		>
			<VegaLite
				{spec}
			/>
		</Banner>
	</div>
{/if}

<style>
	.heatgrid {
		font-family: sans-serif;
		width: 800px;
		display: grid;
		grid-template-columns: 50% 50%;
		align-items: flex-start;
	}

	.banner {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 10000;
	}
</style>

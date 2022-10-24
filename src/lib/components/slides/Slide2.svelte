<script>
	import {onMount} from 'svelte';

	import HeatGrid from '../charts/HeatGrid.svelte';

	const chart1 = 'https://discovery-hub-open-data.s3.eu-west-2.amazonaws.com/foodtech/test/v2022_10_14_Heat_map.html';
	const chart2 = 'https://discovery-hub-open-data.s3.eu-west-2.amazonaws.com/foodtech/test/test_bar_chart.html';
	const chart3 = 'https://discovery-hub-open-data.s3.eu-west-2.amazonaws.com/foodtech/test/test_magnitude_vs_growth.html';

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
	let datapoint

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
</script>

<div>
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
	/>
</div>

<style>
	div {
		font-family: sans-serif;
		width: 800px;
		display: grid;
		grid-template-columns: 50% 50%;
	}
</style>

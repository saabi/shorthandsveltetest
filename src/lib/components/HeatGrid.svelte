<script>
	import {createEventDispatcher} from 'svelte';

	export let data;
	export let rowHeaders;
	export let columnHeaders;
	export let colorMap;

	const dispatch = createEventDispatcher();

	const onPointHovered = payload => {
		dispatch('pointhovered', payload);
	}

	$: data = data || [];
	$: rowHeaders = rowHeaders || [];
	$: columnHeaders = columnHeaders || [];
	$: colorMap = colorMap || [];
</script>

<table>
	<tr>
		<td>\</td>
		{#each columnHeaders as columnName}
			<td>{columnName}</td>
		{/each}
	</tr>
	{#each rowHeaders as rowName, i}
		<tr>
			<td>{rowName}</td>
			{#each columnHeaders as columnName, j}
				{@const value = data[i][j]}
				{@const onEnter = () => onPointHovered({
					i, j,
					columnName,
					rowName,
					value
				})}
				{@const onExit = () => onPointHovered()}
				<td>
					<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
					<div
						class='datapoint'
						on:blur={onExit}
						on:focus={onEnter}
						on:mouseover={onEnter}
						on:mouseout={onExit}
						style='background: {colorMap[value]}'
						tabindex=0
					/>
				</td>
			{/each}
		</tr>
	{/each}
</table>

<style>
	table {
		width: 100%;
		height: 100%;
	}

	td {
		text-align: center;
	}

	td:first-child {
		text-align: right;
	}

	.datapoint {
		width: 16px;
		height: 16px;
		margin: auto;
	}
</style>

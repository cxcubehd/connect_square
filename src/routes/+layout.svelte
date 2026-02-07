<script lang="ts">
	import { onMount } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { initWasm } from '$lib/game/wasm-bot.js';
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';

	let { children } = $props();

	onMount(() => {
		initWasm();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />
{@render children()}

<script lang="ts">
	import { onMount } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { initWasm } from '$lib/game/wasm-bot.js';
	import '$lib/material-web.js';
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';

	let { children } = $props();

	onMount(() => {
		initWasm();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher defaultMode="light" />
{@render children()}

<script lang="ts">
	import { mode, toggleMode } from 'mode-watcher';
	import { Moon, Sun } from '@lucide/svelte';

	let currentMode = $derived(mode.current);
</script>

<button
	type="button"
	class="theme-toggle"
	onclick={toggleMode}
	aria-label="Toggle {currentMode === 'dark' ? 'light' : 'dark'} mode"
	title="Toggle theme"
>
	{#if currentMode === 'dark'}
		<Sun size={18} strokeWidth={2.2} />
	{:else}
		<Moon size={18} strokeWidth={2.2} />
	{/if}
</button>

<style>
	.theme-toggle {
		display: inline-grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
		background: color-mix(in srgb, var(--surface) 95%, transparent);
		color: var(--text-main);
		cursor: pointer;
		transition:
			background 0.18s ease,
			border-color 0.18s ease,
			transform 0.14s ease;
	}

	.theme-toggle:hover {
		background: color-mix(in srgb, var(--accent) 12%, var(--surface));
		border-color: color-mix(in srgb, var(--accent) 42%, transparent);
	}

	.theme-toggle:active {
		transform: scale(0.97);
	}
</style>

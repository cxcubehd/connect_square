<script lang="ts">
	import { toggleMode, mode } from 'mode-watcher';

	let currentMode = $derived(mode.current);
</script>

<button
	class="theme-toggle"
	onclick={toggleMode}
	aria-label="Toggle {currentMode === 'dark' ? 'light' : 'dark'} mode"
	title="Toggle theme"
>
	<span class="toggle-body">
		<span class="toggle-icon sun" aria-hidden="true">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="4" />
				<line x1="12" y1="2" x2="12" y2="4" />
				<line x1="12" y1="20" x2="12" y2="22" />
				<line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
				<line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
				<line x1="2" y1="12" x2="4" y2="12" />
				<line x1="20" y1="12" x2="22" y2="12" />
				<line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
				<line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
			</svg>
		</span>
		<span class="toggle-icon moon" aria-hidden="true">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
			</svg>
		</span>
		<span class="thumb" class:dark={currentMode === 'dark'}></span>
	</span>
</button>

<style>
	.theme-toggle {
		border: none;
		padding: 0;
		background: transparent;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.toggle-body {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		gap: 0;
		width: 62px;
		height: 36px;
		padding: 3px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface) 96%, transparent);
		border: 1px solid color-mix(in srgb, var(--line) 85%, transparent);
		box-shadow: inset 0 1px 2px rgb(14 29 61 / 0.1);
	}

	.toggle-icon {
		position: relative;
		z-index: 2;
		display: grid;
		place-items: center;
		color: var(--text-muted);
	}

	.thumb {
		position: absolute;
		left: 3px;
		top: 3px;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: linear-gradient(145deg, #ffffff, #dbe7ff);
		box-shadow:
			0 4px 10px rgb(30 56 112 / 0.2),
			inset 0 1px 1px rgb(255 255 255 / 0.85);
		transition:
			transform 0.2s ease,
			background 0.2s ease;
	}

	.thumb.dark {
		transform: translateX(26px);
		background: linear-gradient(145deg, #cfdfff, #8fb0ff);
	}

	.theme-toggle:active .thumb {
		transform: scale(0.94);
	}

	.theme-toggle:active .thumb.dark {
		transform: translateX(26px) scale(0.94);
	}
</style>

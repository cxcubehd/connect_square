<script lang="ts">
	import { onMount } from 'svelte';
	import { GameState } from '$lib/game/state.svelte.js';
	import type { PlayerConfig } from '$lib/game/types.js';
	import Board from '$lib/components/Board.svelte';
	import ScoreBoard from '$lib/components/ScoreBoard.svelte';
	import GameSetup from '$lib/components/GameSetup.svelte';
	import GameControls from '$lib/components/GameControls.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	const game = new GameState();
	let progressPercent = $derived(
		game.totalSquares === 0 ? 0 : Math.round((game.capturedCount / game.totalSquares) * 100)
	);

	let activePanel: 'score' | 'controls' = $state('score');
	let scorePanel: HTMLElement | undefined = $state(undefined);
	let controlsPanel: HTMLElement | undefined = $state(undefined);
	let isDesktop = $state(false);

	onMount(() => {
		const mq = window.matchMedia('(min-width: 1020px)');
		const apply = () => {
			isDesktop = mq.matches;
		};
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});

	function handleStart(boardSize: number, players: PlayerConfig[]) {
		game.startGame(boardSize, players);
	}

	function focusPanel(panel: 'score' | 'controls') {
		activePanel = panel;
		const target = panel === 'score' ? scorePanel : controlsPanel;
		target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}
</script>

<svelte:head>
	<title>Connect, Square!</title>
	<meta name="description" content="A strategy board game of territory and connections" />
</svelte:head>

<div class="native-app">
	<header class="native-header">
		<div class="title-wrap">
			<p class="title-kicker">Mobile Strategy Arena</p>
			<h1 class="title-main">Connect, Square!</h1>
		</div>
		<div class="header-actions">
			{#if game.phase !== 'setup'}
				<p class="turn-chip">Turn {game.moveHistory.length + 1}</p>
			{/if}
			<ThemeToggle />
		</div>
	</header>

	<main class="native-main">
		{#if game.phase === 'setup'}
			<section class="setup-stage">
				<GameSetup onStart={handleStart} />
			</section>
		{:else}
			<section class="play-stage">
				<div class="board-column">
					<div class="board-shell">
						<div class="board-toolbar">
							{#if game.phase === 'finished' && game.winner}
								<p class="status-pill" style:--pill-color={game.winner.color}>
									{game.winner.name} wins
								</p>
							{:else if game.phase === 'finished'}
								<p class="status-pill neutral">Round finished</p>
							{:else if game.currentPlayer}
								<p class="status-pill" style:--pill-color={game.currentPlayer.color}>
									{#if game.isBotThinking}
										{game.currentPlayer.name} is planning
									{:else}
										{game.currentPlayer.name}'s move
									{/if}
								</p>
							{/if}
							<p class="progress-pill">{game.capturedCount}/{game.totalSquares} • {progressPercent}%</p>
						</div>
						<Board {game} />
					</div>
					{#if game.editMode}
						<div class="edit-alert">Edit Mode Active</div>
					{/if}
				</div>

				{#if isDesktop}
					<div class="desktop-hub">
						<ScoreBoard {game} />
						<GameControls {game} />
					</div>
				{:else}
					<div class="mobile-hub" role="navigation" aria-label="Game panels">
						<div class="panel-switch">
							<button
								type="button"
								class="switch-btn"
								class:active={activePanel === 'score'}
								onclick={() => focusPanel('score')}
							>
								Score
							</button>
							<button
								type="button"
								class="switch-btn"
								class:active={activePanel === 'controls'}
								onclick={() => focusPanel('controls')}
							>
								Actions
							</button>
						</div>

						<div class="panel-stack">
							<div bind:this={scorePanel} class="panel-slot" class:focus={activePanel === 'score'}>
								<ScoreBoard {game} />
							</div>
							<div bind:this={controlsPanel} class="panel-slot" class:focus={activePanel === 'controls'}>
								<GameControls {game} />
							</div>
						</div>
					</div>
				{/if}
			</section>
		{/if}
	</main>
</div>

<style>
	.native-app {
		min-height: 100dvh;
		max-width: 1180px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
	}

	.native-header {
		position: sticky;
		top: 0;
		z-index: 30;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		padding: 0.88rem 0.88rem 0.78rem;
		background: color-mix(in srgb, var(--bg-app) 82%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
	}

	.title-wrap {
		min-width: 0;
	}

	.title-kicker {
		margin: 0;
		font-size: 0.66rem;
		letter-spacing: 0.11em;
		font-weight: 800;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.title-main {
		margin: 0.08rem 0 0;
		font-size: clamp(1.45rem, 4.8vw, 2rem);
		line-height: 0.9;
		font-weight: 800;
		color: var(--text-main);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.48rem;
	}

	.turn-chip {
		margin: 0;
		padding: 0.42rem 0.7rem;
		border-radius: 999px;
		background: var(--surface);
		border: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
		font-size: 0.74rem;
		font-weight: 800;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.native-main {
		flex: 1;
		padding: 0.7rem 0.7rem calc(1rem + env(safe-area-inset-bottom));
	}

	.setup-stage {
		max-width: 760px;
		margin: 0 auto;
	}

	.play-stage {
		display: grid;
		gap: 0.8rem;
		max-width: 1120px;
		margin: 0 auto;
	}

	.board-column {
		display: grid;
		gap: 0.5rem;
	}

	.board-shell {
		padding: 0.62rem;
		border-radius: 1.1rem;
		background: color-mix(in srgb, var(--surface) 95%, transparent);
		border: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
		box-shadow: var(--shadow-soft);
	}

	.board-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.45rem;
		margin-bottom: 0.54rem;
		flex-wrap: wrap;
	}

	.status-pill,
	.progress-pill {
		margin: 0;
		padding: 0.33rem 0.72rem;
		border-radius: 999px;
		font-size: 0.76rem;
		font-weight: 800;
	}

	.status-pill {
		--pill-color: var(--accent);
		color: var(--pill-color);
		background: color-mix(in srgb, var(--pill-color) 14%, transparent);
		border: 1px solid color-mix(in srgb, var(--pill-color) 40%, transparent);
	}

	.status-pill.neutral {
		color: var(--text-muted);
		background: var(--surface-quiet);
		border-color: color-mix(in srgb, var(--line) 84%, transparent);
	}

	.progress-pill {
		color: var(--text-muted);
		background: var(--surface-quiet);
		border: 1px dashed color-mix(in srgb, var(--line-strong) 74%, transparent);
	}

	.edit-alert {
		padding: 0.5rem 0.78rem;
		font-size: 0.78rem;
		font-weight: 800;
		color: white;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, var(--accent-warm), #ff5f5f);
		box-shadow: 0 12px 26px rgb(242 78 99 / 0.3);
	}

	.mobile-hub {
		display: grid;
		gap: 0.52rem;
	}

	.panel-switch {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.4rem;
		padding: 0.38rem;
		border-radius: 0.9rem;
		background: color-mix(in srgb, var(--surface) 88%, transparent);
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
	}

	.switch-btn {
		appearance: none;
		border: none;
		border-radius: 0.65rem;
		padding: 0.55rem 0.7rem;
		font-size: 0.84rem;
		font-weight: 800;
		color: var(--text-muted);
		background: transparent;
		cursor: pointer;
		transition:
			background 0.18s ease,
			color 0.18s ease,
			transform 0.18s ease;
		min-height: 44px;
	}

	.switch-btn.active {
		background: var(--surface);
		color: var(--text-main);
		box-shadow: 0 4px 14px rgb(38 61 110 / 0.14);
	}

	.switch-btn:active {
		transform: scale(0.98);
	}

	.panel-stack {
		display: grid;
		gap: 0.68rem;
	}

	.panel-slot {
		scroll-margin-top: 6.2rem;
	}

	.panel-slot.focus {
		animation: soft-highlight 0.45s ease;
	}

	@keyframes soft-highlight {
		0% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(-2px);
		}
		100% {
			transform: translateY(0);
		}
	}

	.desktop-hub {
		display: grid;
		gap: 0.72rem;
		position: sticky;
		top: 5.2rem;
	}

	@media (min-width: 760px) {
		.native-main {
			padding: 0.95rem 1rem calc(1.2rem + env(safe-area-inset-bottom));
		}

		.native-header {
			padding-inline: 1rem;
		}
	}

	@media (min-width: 1020px) {
		.native-header {
			padding-inline: 1.2rem;
		}

		.native-main {
			padding-inline: 1.2rem;
		}

		.play-stage {
			grid-template-columns: minmax(0, 1.33fr) minmax(290px, 0.67fr);
			align-items: start;
		}
	}
</style>

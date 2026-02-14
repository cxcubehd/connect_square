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

	const playPages = ['board', 'score', 'actions'] as const;
	type PlayPage = (typeof playPages)[number];

	let playPage: PlayPage = $state('board');
	let isDesktop = $state(false);

	let playPageIndex = $derived(playPages.indexOf(playPage));
	let progressPercent = $derived(
		game.totalSquares === 0 ? 0 : Math.round((game.capturedCount / game.totalSquares) * 100)
	);
	let boardStatus = $derived.by(() => {
		if (game.phase === 'finished' && game.winner) return `${game.winner.name} wins`;
		if (game.phase === 'finished') return 'Round finished';
		if (!game.currentPlayer) return 'Awaiting start';
		if (game.isBotThinking) return `${game.currentPlayer.name} is planning`;
		return `${game.currentPlayer.name}'s move`;
	});

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
		playPage = 'board';
	}
</script>

<svelte:head>
	<title>Connect, Square!</title>
	<meta name="description" content="A strategy board game of territory and connections" />
</svelte:head>

<div class="app-shell">
	<header class="app-bar">
		<div class="app-title">
			<p class="app-kicker">Mobile Strategy Arena</p>
			<h1>Connect, Square!</h1>
		</div>
		<div class="bar-actions">
			{#if game.phase !== 'setup'}
				<p class="turn-chip">Turn {game.moveHistory.length + 1}</p>
			{/if}
			<ThemeToggle />
		</div>
	</header>

	<main class="app-main">
		{#if game.phase === 'setup'}
			<section class="setup-stage">
				<GameSetup onStart={handleStart} />
			</section>
		{:else}
			<section class="play-stage" data-page={playPage}>
				{#if isDesktop}
					<div class="desktop-layout">
						<section class="board-page">
							<header class="board-header">
								<p
									class="status-pill"
									style:--status-color={game.currentPlayer?.color ?? 'var(--accent)'}
								>
									{boardStatus}
								</p>
								<p class="progress-pill">
									{game.capturedCount}/{game.totalSquares} • {progressPercent}%
								</p>
							</header>
							<div class="board-viewport" class:edit-mode={game.editMode}>
								<Board {game} />
							</div>
						</section>

						<aside class="desktop-side" role="navigation" aria-label="In-game pages">
							<div class="desktop-tab-row">
								<button
									type="button"
									class="tab-btn"
									class:active={playPage === 'score'}
									onclick={() => (playPage = 'score')}
								>
									<md-icon>leaderboard</md-icon>
									Score
								</button>
								<button
									type="button"
									class="tab-btn"
									class:active={playPage === 'actions'}
									onclick={() => (playPage = 'actions')}
								>
									<md-icon>tune</md-icon>
									Actions
								</button>
							</div>
							<div class="desktop-panel">
								{#if playPage === 'actions'}
									<GameControls {game} />
								{:else}
									<ScoreBoard {game} />
								{/if}
							</div>
						</aside>
					</div>
				{:else}
					{#if playPage === 'board'}
						<section class="board-page">
							<header class="board-header">
								<p
									class="status-pill"
									style:--status-color={game.currentPlayer?.color ?? 'var(--accent)'}
								>
									{boardStatus}
								</p>
								<p class="progress-pill">
									{game.capturedCount}/{game.totalSquares} • {progressPercent}%
								</p>
							</header>
							<div class="board-viewport" class:edit-mode={game.editMode}>
								<Board {game} />
							</div>
						</section>
					{:else if playPage === 'score'}
						<section class="panel-page">
							<ScoreBoard {game} />
						</section>
					{:else}
						<section class="panel-page">
							<GameControls {game} />
						</section>
					{/if}

					<md-navigation-bar class="play-nav" active-index={playPageIndex} hide-inactive-labels>
						<md-navigation-tab label="Board" onclick={() => (playPage = 'board')}>
							<md-icon slot="inactive-icon">grid_view</md-icon>
							<md-icon slot="active-icon">grid_view</md-icon>
						</md-navigation-tab>
						<md-navigation-tab label="Score" onclick={() => (playPage = 'score')}>
							<md-icon slot="inactive-icon">leaderboard</md-icon>
							<md-icon slot="active-icon">leaderboard</md-icon>
						</md-navigation-tab>
						<md-navigation-tab label="Actions" onclick={() => (playPage = 'actions')}>
							<md-icon slot="inactive-icon">tune</md-icon>
							<md-icon slot="active-icon">tune</md-icon>
						</md-navigation-tab>
					</md-navigation-bar>
				{/if}
			</section>
		{/if}
	</main>
</div>

<style>
	.app-shell {
		height: 100dvh;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		overflow: hidden;
	}

	.app-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.65rem;
		padding: calc(0.5rem + env(safe-area-inset-top)) 0.88rem 0.62rem;
		border-bottom: 1px solid color-mix(in srgb, var(--line) 75%, transparent);
		background: color-mix(in srgb, var(--bg-app) 90%, transparent);
		backdrop-filter: blur(10px);
	}

	.app-title {
		min-width: 0;
	}

	.app-kicker {
		margin: 0;
		font-size: 0.67rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
	}

	.app-title h1 {
		margin: 0.1rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(1.32rem, 5.5vw, 2rem);
		line-height: 0.95;
	}

	.bar-actions {
		display: flex;
		align-items: center;
		gap: 0.46rem;
	}

	.turn-chip {
		margin: 0;
		padding: 0.36rem 0.68rem;
		border-radius: 999px;
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--text-muted);
		background: color-mix(in srgb, var(--surface) 95%, transparent);
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
	}

	.app-main {
		min-height: 0;
		padding: 0.6rem 0.6rem calc(0.52rem + env(safe-area-inset-bottom));
	}

	.setup-stage {
		height: 100%;
	}

	.play-stage {
		height: 100%;
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		gap: 0.45rem;
	}

	.board-page,
	.panel-page {
		min-height: 0;
	}

	.board-page {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.48rem;
	}

	.board-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.44rem;
	}

	.status-pill,
	.progress-pill {
		margin: 0;
		padding: 0.35rem 0.72rem;
		border-radius: 999px;
		font-size: 0.77rem;
		font-weight: 700;
	}

	.status-pill {
		color: var(--status-color);
		border: 1px solid color-mix(in srgb, var(--status-color) 45%, transparent);
		background: color-mix(in srgb, var(--status-color) 12%, transparent);
	}

	.progress-pill {
		color: var(--text-muted);
		border: 1px dashed color-mix(in srgb, var(--line-strong) 70%, transparent);
		background: color-mix(in srgb, var(--surface) 94%, transparent);
	}

	.board-viewport {
		min-height: 0;
		display: grid;
		place-items: center;
		padding: 0;
		background: transparent;
		border: none;
	}

	.board-viewport.edit-mode {
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-warm) 52%, transparent);
	}

	.play-nav {
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--line) 76%, transparent);
	}

	.desktop-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.42fr) minmax(300px, 0.58fr);
		gap: 0.62rem;
		height: 100%;
		min-height: 0;
	}

	.desktop-side {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.55rem;
		min-height: 0;
	}

	.desktop-tab-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.45rem;
	}

	.tab-btn {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 0.32rem;
		min-height: 42px;
		padding: 0.3rem 0.62rem;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
		background: color-mix(in srgb, var(--surface) 94%, transparent);
		font-size: 0.84rem;
		font-weight: 600;
		cursor: pointer;
	}

	.tab-btn md-icon {
		font-size: 1.05rem;
	}

	.tab-btn.active {
		border-color: color-mix(in srgb, var(--accent) 60%, transparent);
		background: color-mix(in srgb, var(--accent) 14%, var(--surface));
		color: var(--accent);
	}

	.desktop-panel {
		min-height: 0;
	}

	.panel-page {
		height: 100%;
	}

	@media (max-width: 1019px) {
		.desktop-layout {
			display: none;
		}
	}

	@media (min-width: 1020px) {
		.play-stage {
			grid-template-rows: minmax(0, 1fr);
		}

		.play-nav {
			display: none;
		}

		.board-viewport {
			padding: 0.22rem;
			border-radius: 14px;
			background: color-mix(in srgb, var(--surface) 90%, transparent);
			border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
		}
	}
</style>

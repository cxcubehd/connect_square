<script lang="ts">
	import { BarChart3, Grid3x3, SlidersHorizontal } from '@lucide/svelte';
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

	function pageFromIndex(index: number): PlayPage {
		const safeIndex = Math.min(playPages.length - 1, Math.max(0, index));
		return playPages[safeIndex];
	}

	function handlePlayNavActivated(event: Event) {
		const nextIndex = (event as CustomEvent<{ activeIndex: number }>).detail?.activeIndex;
		if (typeof nextIndex !== 'number') return;
		playPage = pageFromIndex(nextIndex);
	}

	onMount(() => {
		const mq = window.matchMedia('(min-width: 960px)');
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
	<header class="top-app-bar">
		<h1>Connect, Square!</h1>
		<div class="bar-actions">
			{#if game.phase !== 'setup'}
				<p class="turn-chip">Turn {game.moveHistory.length + 1}</p>
			{/if}
			<ThemeToggle />
		</div>
	</header>

	<main class="app-content">
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
									<BarChart3 size={15} strokeWidth={2.3} />
									Score
								</button>
								<button
									type="button"
									class="tab-btn"
									class:active={playPage === 'actions'}
									onclick={() => (playPage = 'actions')}
								>
									<SlidersHorizontal size={15} strokeWidth={2.3} />
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

					<md-navigation-bar
						class="play-nav"
						active-index={playPageIndex}
						hide-inactive-labels
						onnavigation-bar-activated={handlePlayNavActivated}
					>
						<md-navigation-tab label="Board">
							<span slot="inactive-icon">
								<Grid3x3 size={18} />
							</span>
							<span slot="active-icon">
								<Grid3x3 size={18} />
							</span>
						</md-navigation-tab>
						<md-navigation-tab label="Score">
							<span slot="inactive-icon">
								<BarChart3 size={18} />
							</span>
							<span slot="active-icon">
								<BarChart3 size={18} />
							</span>
						</md-navigation-tab>
						<md-navigation-tab label="Actions">
							<span slot="inactive-icon">
								<SlidersHorizontal size={18} />
							</span>
							<span slot="active-icon">
								<SlidersHorizontal size={18} />
							</span>
						</md-navigation-tab>
					</md-navigation-bar>
				{/if}
			</section>
		{/if}
	</main>
</div>

<style>
	.app-shell {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		height: 100dvh;
		max-width: 1400px;
		margin: 0 auto;
	}

	.top-app-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.7rem;
		min-height: calc(56px + env(safe-area-inset-top));
		padding: calc(0.35rem + env(safe-area-inset-top)) 0.88rem 0.35rem;
		border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
		background: color-mix(in srgb, var(--surface) 92%, transparent);
	}

	.top-app-bar h1 {
		margin: 0;
		font-size: clamp(1.45rem, 4.4vw, 2rem);
		line-height: 1;
		font-weight: 600;
		letter-spacing: 0.01em;
	}

	.bar-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.turn-chip {
		margin: 0;
		padding: 0.34rem 0.68rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-muted);
		background: color-mix(in srgb, var(--surface) 98%, transparent);
		border: 1px solid color-mix(in srgb, var(--line) 72%, transparent);
	}

	.app-content {
		min-height: 0;
	}

	.setup-stage,
	.play-stage {
		height: 100%;
		min-height: 0;
	}

	.play-stage {
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		gap: 0.4rem;
	}

	.board-page,
	.panel-page {
		min-height: 0;
	}

	.board-page {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.44rem;
	}

	.board-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.44rem;
		margin: 0.5rem;
	}

	.status-pill,
	.progress-pill {
		margin: 0;
		padding: 0.36rem 0.72rem;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.status-pill {
		color: var(--status-color);
		border: 1px solid color-mix(in srgb, var(--status-color) 44%, transparent);
		background: color-mix(in srgb, var(--status-color) 12%, transparent);
	}

	.progress-pill {
		color: var(--text-muted);
		border: 1px dashed color-mix(in srgb, var(--line-strong) 68%, transparent);
		background: color-mix(in srgb, var(--surface) 95%, transparent);
	}

	.board-viewport {
		min-height: 0;
		display: grid;
		place-items: center;
	}

	.board-viewport.edit-mode {
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-warm) 56%, transparent);
		border-radius: 12px;
	}

	.play-nav {
		border-top: 1px solid color-mix(in srgb, var(--line) 66%, transparent);
		padding-bottom: env(safe-area-inset-bottom);
	}

	.desktop-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(360px, 410px);
		gap: 0.62rem;
		height: 100%;
		min-height: 0;
	}

	.desktop-side {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.55rem;
		min-height: 0;
		margin: 0.5rem 0;
	}

	.desktop-tab-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.45rem;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.36rem;
		min-height: 42px;
		padding: 0.34rem 0.68rem;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
		background: color-mix(in srgb, var(--surface) 94%, transparent);
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
	}

	.tab-btn.active {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 54%, transparent);
		background: color-mix(in srgb, var(--accent) 12%, var(--surface));
	}

	.desktop-panel,
	.panel-page {
		height: 100%;
		min-height: 0;
	}

	@media (max-width: 959px) {
		.desktop-layout {
			display: none;
		}
	}

	@media (min-width: 960px) {
		.play-stage {
			grid-template-rows: minmax(0, 1fr);
		}

		.play-nav {
			display: none;
		}
	}
</style>

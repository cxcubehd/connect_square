<script lang="ts">
	import { GameState } from '$lib/game/state.svelte.js';
	import type { PlayerConfig } from '$lib/game/types.js';
	import Board from '$lib/components/Board.svelte';
	import ScoreBoard from '$lib/components/ScoreBoard.svelte';
	import GameSetup from '$lib/components/GameSetup.svelte';
	import GameControls from '$lib/components/GameControls.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	const game = new GameState();

	function handleStart(boardSize: number, players: PlayerConfig[]) {
		game.startGame(boardSize, players);
	}
</script>

<svelte:head>
	<title>Connect, Square!</title>
	<meta name="description" content="A strategy board game of territory and connections" />
</svelte:head>

<div class="app">
	<header class="app-header">
		<div class="header-left">
			{#if game.phase !== 'setup'}
				<h1 class="header-title">Connect, Square!</h1>
			{/if}
		</div>
		<div class="header-right">
			<ThemeToggle />
		</div>
	</header>

	<main class="app-main">
		{#if game.phase === 'setup'}
			<div class="setup-view">
				<GameSetup onstart={handleStart} />
			</div>
		{:else}
			<div class="game-view">
				<aside class="sidebar sidebar-left">
					<ScoreBoard {game} />
				</aside>

				<div class="board-area">
					<Board {game} />
					{#if game.editMode}
						<div class="edit-banner">Edit Mode Active</div>
					{/if}
				</div>

				<aside class="sidebar sidebar-right">
					<GameControls {game} />
				</aside>
			</div>
		{/if}
	</main>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.app-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
		background: var(--panel-bg);
	}

	.header-title {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		color: var(--text-primary);
	}

	.header-left,
	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.app-main {
		flex: 1;
		display: flex;
		justify-content: center;
		padding: 1rem;
	}

	.setup-view {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 2rem 1rem;
	}

	.game-view {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
		width: 100%;
		max-width: 1200px;
		justify-content: center;
	}

	.sidebar {
		flex-shrink: 0;
		position: sticky;
		top: 1rem;
	}

	.board-area {
		flex: 1;
		max-width: 700px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.edit-banner {
		padding: 0.4rem 1rem;
		background: var(--accent-color);
		color: white;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		animation: pulse-bg 1.5s ease-in-out infinite alternate;
	}

	@keyframes pulse-bg {
		from {
			opacity: 0.8;
		}
		to {
			opacity: 1;
		}
	}

	@media (max-width: 900px) {
		.game-view {
			flex-direction: column;
			align-items: center;
		}

		.sidebar {
			position: static;
			width: 100%;
			max-width: 700px;
		}

		.sidebar-right {
			order: 3;
		}

		.board-area {
			order: 1;
		}

		.sidebar-left {
			order: 2;
		}
	}
</style>

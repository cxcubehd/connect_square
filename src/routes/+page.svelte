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
				<GameSetup onStart={handleStart} />
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
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		overflow-x: hidden;
	}

	.app-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--border-color);
		background: var(--panel-bg);
		flex-shrink: 0;
		min-height: 48px;
	}

	.header-title {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		color: var(--text-primary);
	}

	.header-left,
	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.app-main {
		flex: 1;
		display: flex;
		justify-content: center;
		padding: 0.5rem;
	}

	.setup-view {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		width: 100%;
		padding: 0.5rem 0;
	}

	.game-view {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		max-width: 1200px;
	}

	.sidebar {
		width: 100%;
		max-width: 100%;
	}

	.sidebar-left {
		order: 0;
	}

	.board-area {
		order: 1;
		width: 100%;
		max-width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.sidebar-right {
		order: 2;
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

	@media (min-width: 640px) {
		.app-header {
			padding: 0.5rem 1.25rem;
		}

		.app-main {
			padding: 0.75rem;
		}

		.setup-view {
			padding: 1rem 0.5rem;
			align-items: center;
		}

		.game-view {
			gap: 1rem;
		}

		.board-area {
			max-width: 560px;
		}
	}

	@media (min-width: 900px) {
		.app-header {
			padding: 0.75rem 1.5rem;
		}

		.header-title {
			font-size: 1.5rem;
		}

		.app-main {
			padding: 1rem;
		}

		.setup-view {
			padding: 2rem 1rem;
		}

		.game-view {
			flex-direction: row;
			align-items: flex-start;
			gap: 1.5rem;
		}

		.sidebar {
			flex-shrink: 0;
			position: sticky;
			top: 1rem;
			width: auto;
			max-width: none;
			min-width: 200px;
		}

		.sidebar-left {
			order: 0;
		}

		.board-area {
			order: 1;
			flex: 1;
			max-width: 700px;
		}

		.sidebar-right {
			order: 2;
		}
	}
</style>

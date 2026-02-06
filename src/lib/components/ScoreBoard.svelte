<script lang="ts">
	import { type GameState } from '$lib/game/state.svelte.js';

	let { game }: { game: GameState } = $props();
</script>

<div class="scoreboard" role="region" aria-label="Scoreboard">
	<div class="player-scores">
		{#each game.scores as { player, score } (player.id)}
			{@const isCurrent = game.phase === 'playing' && game.currentPlayer?.id === player.id}
			<div
				class="player-score"
				class:active={isCurrent}
				class:eliminated={player.eliminated}
				style:--player-color={player.color}
			>
				<div class="player-indicator" class:thinking={isCurrent && game.isBotThinking}>
					<div class="color-dot"></div>
					<span class="player-name">{player.name}</span>
					{#if player.type === 'bot'}
						<span class="bot-badge">BOT</span>
					{/if}
					{#if player.eliminated}
						<span class="eliminated-badge">OUT</span>
					{/if}
				</div>
				<div class="score-value">{score}</div>
			</div>
		{/each}
	</div>

	{#if game.phase === 'playing' && game.currentPlayer}
		<div class="turn-indicator" style:--player-color={game.currentPlayer.color}>
			{#if game.isBotThinking}
				<span class="thinking-text">Thinking...</span>
			{:else if game.currentPlayer.type === 'human'}
				<span>{game.currentPlayer.name}'s turn</span>
			{/if}
		</div>
	{/if}

	{#if game.phase === 'finished'}
		<div class="game-over">
			{#if game.winner}
				<span class="winner-text" style:color={game.winner.color}>
					{game.winner.name} wins!
				</span>
			{:else}
				<span class="winner-text">It's a tie!</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.scoreboard {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.6rem;
		background: var(--panel-bg);
		border-radius: 10px;
		border: 1px solid var(--border-color);
		width: 100%;
	}

	.player-scores {
		display: flex;
		gap: 0.35rem;
		overflow-x: auto;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
	}

	.player-scores::-webkit-scrollbar {
		display: none;
	}

	.player-score {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0.6rem;
		border-radius: 8px;
		transition: all 0.2s ease;
		border: 2px solid transparent;
		flex: 1;
		min-width: 0;
		gap: 0.4rem;
	}

	.player-score.active {
		border-color: var(--player-color);
		background: color-mix(in srgb, var(--player-color) 8%, transparent);
	}

	.player-score.eliminated {
		opacity: 0.4;
	}

	.player-indicator {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
		overflow: hidden;
	}

	.color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--player-color);
		flex-shrink: 0;
	}

	.thinking .color-dot {
		animation: think-pulse 0.8s ease-in-out infinite alternate;
	}

	.player-name {
		font-weight: 500;
		font-size: 0.8rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bot-badge {
		font-size: 0.55rem;
		font-weight: 700;
		padding: 1px 3px;
		border-radius: 3px;
		background: var(--player-color);
		color: white;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.eliminated-badge {
		font-size: 0.55rem;
		font-weight: 700;
		padding: 1px 3px;
		border-radius: 3px;
		background: var(--text-muted);
		color: white;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.score-value {
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--player-color);
		min-width: 1.5rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}

	.turn-indicator {
		text-align: center;
		padding: 0.3rem 0.5rem;
		color: var(--player-color);
		font-weight: 500;
		font-size: 0.8rem;
		border-top: 1px solid var(--border-color);
		padding-top: 0.4rem;
	}

	.thinking-text {
		animation: think-pulse 0.8s ease-in-out infinite alternate;
	}

	.game-over {
		text-align: center;
		padding: 0.5rem;
		border-top: 1px solid var(--border-color);
	}

	.winner-text {
		font-size: 1.1rem;
		font-weight: 700;
	}

	@keyframes think-pulse {
		from {
			opacity: 0.4;
		}
		to {
			opacity: 1;
		}
	}

	@media (min-width: 900px) {
		.scoreboard {
			padding: 1rem;
			border-radius: 12px;
			min-width: 200px;
			width: auto;
		}

		.player-scores {
			flex-direction: column;
			gap: 0.5rem;
			overflow-x: visible;
		}

		.player-score {
			padding: 0.5rem 0.75rem;
			flex: unset;
		}

		.player-indicator {
			gap: 0.5rem;
		}

		.color-dot {
			width: 12px;
			height: 12px;
		}

		.player-name {
			font-size: 0.875rem;
		}

		.bot-badge,
		.eliminated-badge {
			font-size: 0.6rem;
			padding: 1px 4px;
			border-radius: 4px;
		}

		.score-value {
			font-size: 1.5rem;
			min-width: 2rem;
		}

		.turn-indicator {
			padding: 0.5rem;
			padding-top: 0.75rem;
			margin-top: 0.25rem;
			font-size: 0.875rem;
		}

		.game-over {
			padding: 0.75rem;
			margin-top: 0.25rem;
		}

		.winner-text {
			font-size: 1.25rem;
		}
	}
</style>

<script lang="ts">
	import { type GameState } from '$lib/game/state.svelte.js';

	let { game }: { game: GameState } = $props();
</script>

<div class="scoreboard" role="region" aria-label="Scoreboard">
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
		gap: 0.5rem;
		padding: 1rem;
		background: var(--panel-bg);
		border-radius: 12px;
		border: 1px solid var(--border-color);
		min-width: 200px;
	}

	.player-score {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		transition: all 0.2s ease;
		border: 2px solid transparent;
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
		gap: 0.5rem;
	}

	.color-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--player-color);
		flex-shrink: 0;
	}

	.thinking .color-dot {
		animation: think-pulse 0.8s ease-in-out infinite alternate;
	}

	.player-name {
		font-weight: 500;
		color: var(--text-primary);
	}

	.bot-badge {
		font-size: 0.6rem;
		font-weight: 700;
		padding: 1px 4px;
		border-radius: 4px;
		background: var(--player-color);
		color: white;
		letter-spacing: 0.05em;
	}

	.eliminated-badge {
		font-size: 0.6rem;
		font-weight: 700;
		padding: 1px 4px;
		border-radius: 4px;
		background: var(--text-muted);
		color: white;
		letter-spacing: 0.05em;
	}

	.score-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--player-color);
		min-width: 2rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.turn-indicator {
		text-align: center;
		padding: 0.5rem;
		color: var(--player-color);
		font-weight: 500;
		border-top: 1px solid var(--border-color);
		margin-top: 0.25rem;
		padding-top: 0.75rem;
	}

	.thinking-text {
		animation: think-pulse 0.8s ease-in-out infinite alternate;
	}

	.game-over {
		text-align: center;
		padding: 0.75rem;
		border-top: 1px solid var(--border-color);
		margin-top: 0.25rem;
	}

	.winner-text {
		font-size: 1.25rem;
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
</style>

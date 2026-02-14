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
				<div class="player-ident" class:thinking={isCurrent && game.isBotThinking}>
					<span class="color-dot"></span>
					<span class="player-name">{player.name}</span>
					{#if player.type === 'bot'}
						<span class="bot-badge">BOT</span>
					{:else if player.type === 'server'}
						<span class="bot-badge">SERVER</span>
					{/if}
					{#if player.eliminated}
						<span class="out-badge">OUT</span>
					{/if}
				</div>
				<div class="score-value">{score}</div>
			</div>
		{/each}
	</div>

	<div class="status-section">
		{#if game.phase === 'playing' && game.currentPlayer}
			<div class="turn-indicator" style:--player-color={game.currentPlayer.color}>
				{#if game.isBotThinking}
					<span class="thinking-text">Thinking...</span>
				{:else if game.currentPlayer.type === 'human'}
					<span>{game.currentPlayer.name}'s turn</span>
				{:else}
					<span>{game.currentPlayer.name} is moving</span>
				{/if}
			</div>
		{:else if game.phase === 'finished'}
			<div class="game-over">
				{#if game.winner}
					<span class="winner-text" style:--winner={game.winner.color}>{game.winner.name} wins!</span>
				{:else}
					<span class="winner-text">It's a tie!</span>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.scoreboard {
		display: grid;
		gap: 0.58rem;
		padding: 0.78rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--surface) 95%, transparent);
		border: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
		box-shadow: var(--shadow-soft);
	}

	.player-scores {
		display: grid;
		gap: 0.44rem;
	}

	.player-score {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.55rem;
		padding: 0.52rem 0.6rem;
		border-radius: 0.84rem;
		border: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
		background: color-mix(in srgb, var(--surface-quiet) 95%, transparent);
	}

	.player-score.active {
		border-color: color-mix(in srgb, var(--player-color) 56%, transparent);
		background: color-mix(in srgb, var(--player-color) 12%, var(--surface));
	}

	.player-score.eliminated {
		opacity: 0.45;
	}

	.player-ident {
		display: flex;
		align-items: center;
		gap: 0.34rem;
		min-width: 0;
	}

	.color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--player-color);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--player-color) 24%, transparent);
		flex-shrink: 0;
	}

	.player-name {
		font-size: 0.84rem;
		font-weight: 800;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bot-badge,
	.out-badge {
		padding: 0.1rem 0.35rem;
		border-radius: 999px;
		font-size: 0.58rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		color: white;
		flex-shrink: 0;
	}

	.bot-badge {
		background: color-mix(in srgb, var(--player-color) 76%, #1f2942);
	}

	.out-badge {
		background: var(--danger);
	}

	.score-value {
		font-size: 1.35rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: var(--player-color);
		min-width: 1.6rem;
		text-align: right;
	}

	.status-section {
		border-top: 1px dashed color-mix(in srgb, var(--line) 86%, transparent);
		padding-top: 0.5rem;
		min-height: 2.2rem;
	}

	.turn-indicator {
		border-radius: 999px;
		padding: 0.34rem 0.7rem;
		text-align: center;
		font-size: 0.8rem;
		font-weight: 800;
		color: var(--player-color);
		background: color-mix(in srgb, var(--player-color) 14%, transparent);
		border: 1px solid color-mix(in srgb, var(--player-color) 42%, transparent);
	}

	.thinking {
		animation: soft-pulse 0.8s ease-in-out infinite alternate;
	}

	.thinking-text {
		animation: soft-pulse 0.8s ease-in-out infinite alternate;
	}

	.game-over {
		text-align: center;
	}

	.winner-text {
		font-family: var(--font-display);
		font-size: 1.3rem;
		line-height: 0.9;
		color: var(--winner, var(--text-main));
	}

	@keyframes soft-pulse {
		from {
			opacity: 0.45;
		}
		to {
			opacity: 1;
		}
	}
</style>

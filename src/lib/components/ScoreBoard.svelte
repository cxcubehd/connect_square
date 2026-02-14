<script lang="ts">
	import { Brain, PlayCircle } from '@lucide/svelte';
	import { type GameState } from '$lib/game/state.svelte.js';

	let { game }: { game: GameState } = $props();
</script>

<div class="scoreboard" role="region" aria-label="Scoreboard">
	<header class="score-header">
		<p class="score-label">Match status</p>
		<p class="score-progress">{game.capturedCount}/{game.totalSquares}</p>
	</header>

	<div class="score-list">
		{#each game.scores as { player, score } (player.id)}
			{@const isCurrent = game.phase === 'playing' && game.currentPlayer?.id === player.id}
			<div
				class="score-row"
				class:active={isCurrent}
				class:eliminated={player.eliminated}
				style:--player-color={player.color}
			>
				<div class="score-ident" class:thinking={isCurrent && game.isBotThinking}>
					<span class="color-dot"></span>
					<div class="identity-copy">
						<strong>{player.name}</strong>
						<small>
							{#if player.type === 'bot'}
								Bot
							{:else if player.type === 'server'}
								Server
							{:else}
								Human
							{/if}
						</small>
					</div>
				</div>
				<div class="score-value">{score}</div>
			</div>
		{/each}
	</div>

	<div class="status-section">
		{#if game.phase === 'playing' && game.currentPlayer}
			<div class="turn-indicator" style:--player-color={game.currentPlayer.color}>
				{#if game.isBotThinking}
					<Brain size={15} strokeWidth={2.3} />
					<span>{game.currentPlayer.name} is thinking...</span>
				{:else}
					<PlayCircle size={15} strokeWidth={2.3} />
					<span>{game.currentPlayer.name}'s turn</span>
				{/if}
			</div>
		{:else if game.phase === 'finished'}
			<div class="game-over">
				{#if game.winner}
					<span class="winner" style:--winner-color={game.winner.color}>{game.winner.name} wins</span>
				{:else}
					<span class="winner">Tie game</span>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.scoreboard {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: 0.72rem;
		height: 100%;
		padding: 0.86rem;
		border-radius: 18px;
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
		background: color-mix(in srgb, var(--surface) 94%, transparent);
	}

	.score-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.6rem;
	}

	.score-label,
	.score-progress {
		margin: 0;
	}

	.score-label {
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.score-progress {
		font-variant-numeric: tabular-nums;
		font-size: 0.9rem;
		font-weight: 700;
	}

	.score-list {
		display: grid;
		gap: 0.48rem;
		overflow: auto;
	}

	.score-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.7rem;
		padding: 0.56rem 0.65rem;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
		background: color-mix(in srgb, var(--surface-quiet) 96%, transparent);
	}

	.score-row.active {
		border-color: color-mix(in srgb, var(--player-color) 56%, transparent);
		background: color-mix(in srgb, var(--player-color) 16%, var(--surface));
	}

	.score-row.eliminated {
		opacity: 0.45;
	}

	.score-ident {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
	}

	.identity-copy {
		display: grid;
		min-width: 0;
	}

	.identity-copy strong {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.identity-copy small {
		font-size: 0.73rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--player-color);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--player-color) 24%, transparent);
		flex-shrink: 0;
	}

	.score-value {
		font-size: 1.35rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--player-color);
	}

	.status-section {
		min-height: 46px;
	}

	.turn-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.32rem;
		padding: 0.4rem 0.74rem;
		border-radius: 999px;
		font-size: 0.86rem;
		font-weight: 700;
		color: var(--player-color);
		border: 1px solid color-mix(in srgb, var(--player-color) 42%, transparent);
		background: color-mix(in srgb, var(--player-color) 13%, transparent);
	}

	.game-over {
		display: inline-flex;
		padding: 0.42rem 0.7rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface-quiet) 90%, transparent);
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
	}

	.winner {
		font-weight: 700;
		color: var(--winner-color, var(--text-main));
	}

	.thinking {
		animation: thinking 0.9s ease-in-out infinite alternate;
	}

	@keyframes thinking {
		from {
			opacity: 0.5;
		}
		to {
			opacity: 1;
		}
	}
</style>

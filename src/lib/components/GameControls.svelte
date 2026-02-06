<script lang="ts">
	import { type GameState } from '$lib/game/state.svelte.js';
	import { getAvailableBots } from '$lib/game/bot.js';

	let { game }: { game: GameState } = $props();

	const bots = getAvailableBots();
</script>

<div class="controls" role="region" aria-label="Game controls">
	<div class="control-group">
		<button class="control-btn" onclick={() => game.reset()}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
				<path d="M3 3v5h5" />
			</svg>
			New Game
		</button>

		{#if game.phase === 'playing'}
			<button
				class="control-btn"
				class:active={game.editMode}
				onclick={() => game.toggleEditMode()}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
				</svg>
				Edit Mode
			</button>
		{/if}
	</div>

	{#if game.phase === 'playing'}
		<div class="bot-assign">
			<h4>Assign Bots</h4>
			{#each game.players as player, i (player.id)}
				<div class="bot-row" style:--player-color={player.color}>
					<span class="bot-player-name">{player.name}</span>
					<select
						class="bot-assign-select"
						value={player.botStrategyId ?? ''}
						onchange={(e) => {
							const val = (e.target as HTMLSelectElement).value;
							game.assignBot(i, val || null);
						}}
					>
						<option value="">Human</option>
						{#each bots as bot}
							<option value={bot.id}>{bot.name}</option>
						{/each}
					</select>
				</div>
			{/each}
		</div>

		<div class="game-info">
			<div class="info-row">
				<span>Squares</span>
				<span>{game.capturedCount} / {game.totalSquares}</span>
			</div>
			<div class="info-row">
				<span>Moves</span>
				<span>{game.moveHistory.length}</span>
			</div>
			<div class="progress-bar">
				<div
					class="progress-fill"
					style:width="{(game.capturedCount / game.totalSquares) * 100}%"
				></div>
			</div>
		</div>
	{/if}
</div>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		background: var(--panel-bg);
		border-radius: 12px;
		border: 1px solid var(--border-color);
		min-width: 200px;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.control-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		background: var(--surface-bg);
		color: var(--text-primary);
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.control-btn:hover {
		background: var(--hover-bg);
		border-color: var(--accent-color);
	}

	.control-btn.active {
		background: var(--accent-color);
		border-color: var(--accent-color);
		color: white;
	}

	.bot-assign {
		border-top: 1px solid var(--border-color);
		padding-top: 0.75rem;
	}

	.bot-assign h4 {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem;
	}

	.bot-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}

	.bot-player-name {
		font-size: 0.8rem;
		color: var(--player-color);
		font-weight: 500;
	}

	.bot-assign-select {
		padding: 0.25rem 0.4rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.75rem;
	}

	.game-info {
		border-top: 1px solid var(--border-color);
		padding-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.info-row span:last-child {
		font-weight: 600;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.progress-bar {
		height: 4px;
		border-radius: 2px;
		background: var(--border-color);
		overflow: hidden;
		margin-top: 0.25rem;
	}

	.progress-fill {
		height: 100%;
		border-radius: 2px;
		background: var(--accent-color);
		transition: width 0.3s ease;
	}
</style>

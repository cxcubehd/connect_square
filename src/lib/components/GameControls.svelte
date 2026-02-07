<script lang="ts">
	import { type GameState } from '$lib/game/state.svelte.js';
	import { getAvailableBots } from '$lib/game/bot.js';
	import ServerBotConfig from './ServerBotConfig.svelte';

	let { game }: { game: GameState } = $props();

	const bots = getAvailableBots();

	let showBotAssign = $state(false);
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
		{:else}
			<div class="control-btn-placeholder"></div>
		{/if}
	</div>

	{#if game.phase === 'playing' || game.phase === 'finished'}
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

		<div class="bot-assign">
			<button
				class="bot-assign-toggle"
				onclick={() => (showBotAssign = !showBotAssign)}
				aria-expanded={showBotAssign}
			>
				<h4>Assign Bots</h4>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="chevron"
					class:expanded={showBotAssign}
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</button>
			{#if showBotAssign}
				<div class="bot-assign-list">
					{#each game.players as player, i (player.id)}
						<div class="bot-row" style:--player-color={player.color}>
							<span class="bot-player-name">{player.name}</span>
							<select
								class="bot-assign-select"
								value={player.type === 'server' ? 'server' : (player.botStrategyId ?? '')}
								onchange={(e) => {
									const val = (e.target as HTMLSelectElement).value;
									if (val === 'server') {
										game.assignBot(i, 'server');
									} else {
										game.assignBot(i, val || null);
									}
								}}
							>
								<option value="">Human</option>
								{#each bots as bot}
									<option value={bot.id}>{bot.name}</option>
								{/each}
								<option value="server">Server</option>
							</select>
						</div>
					{#if player.type === 'server'}
						<div class="server-inline-config">
							<ServerBotConfig
								serverUrl={player.serverUrl ?? 'http://localhost:3001'}
								botParams={player.serverBotParams}
								onParamsChange={(params) => {
									game.assignBot(i, 'server', player.serverUrl, params);
								}}
								compact
							/>
						</div>
					{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.6rem;
		background: var(--panel-bg);
		border-radius: 10px;
		border: 1px solid var(--border-color);
		width: 100%;
	}

	.control-group {
		display: flex;
		gap: 0.5rem;
	}

	.control-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		flex: 1;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		background: var(--surface-bg);
		color: var(--text-primary);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		-webkit-tap-highlight-color: transparent;
		min-height: 44px;
	}

	.control-btn-placeholder {
		flex: 1;
		min-height: 44px;
	}

	.control-btn:hover {
		background: var(--hover-bg);
		border-color: var(--accent-color);
	}

	.control-btn:active {
		transform: scale(0.97);
	}

	.control-btn.active {
		background: var(--accent-color);
		border-color: var(--accent-color);
		color: white;
	}

	.game-info {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-color);
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
		margin-top: 0.2rem;
	}

	.progress-fill {
		height: 100%;
		border-radius: 2px;
		background: var(--accent-color);
		transition: width 0.3s ease;
	}

	.bot-assign {
		border-top: 1px solid var(--border-color);
		padding-top: 0.5rem;
	}

	.bot-assign-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.3rem 0;
		border: none;
		background: transparent;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.bot-assign-toggle h4 {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.chevron {
		color: var(--text-muted);
		transition: transform 0.2s ease;
	}

	.chevron.expanded {
		transform: rotate(180deg);
	}

	.bot-assign-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.4rem;
	}

	.bot-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.bot-player-name {
		font-size: 0.8rem;
		color: var(--player-color);
		font-weight: 500;
	}

	.bot-assign-select {
		padding: 0.35rem 0.4rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.75rem;
		min-height: 36px;
	}

	.server-inline-config {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.4rem;
		margin-top: -0.15rem;
		border: 1px solid var(--border-color);
		border-top: none;
		border-radius: 0 0 6px 6px;
		background: var(--surface-bg);
	}

	@media (min-width: 900px) {
		.controls {
			padding: 1rem;
			border-radius: 12px;
			min-width: 200px;
			width: auto;
		}

		.control-group {
			flex-direction: column;
		}

		.control-btn {
			justify-content: flex-start;
			font-size: 0.85rem;
		}

		.game-info {
			padding-top: 0.75rem;
			gap: 0.35rem;
		}

		.bot-assign {
			padding-top: 0.75rem;
		}
	}
</style>

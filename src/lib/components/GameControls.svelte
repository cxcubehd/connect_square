<script lang="ts">
	import { type GameState } from '$lib/game/state.svelte.js';
	import { getAvailableBots } from '$lib/game/bot.js';
	import ServerBotConfig from './ServerBotConfig.svelte';

	let { game }: { game: GameState } = $props();

	const bots = getAvailableBots();
	let showBotAssign = $state(false);
	let progress = $derived(game.totalSquares === 0 ? 0 : Math.round((game.capturedCount / game.totalSquares) * 100));
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
			<button class="control-btn" class:active={game.editMode} onclick={() => game.toggleEditMode()}>
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
			<div class="info-row"><span>Squares</span><strong>{game.capturedCount} / {game.totalSquares}</strong></div>
			<div class="info-row"><span>Moves</span><strong>{game.moveHistory.length}</strong></div>
			<div class="info-row"><span>Progress</span><strong>{progress}%</strong></div>
			<div class="progress-bar" aria-hidden="true">
				<div class="progress-fill" style:width="{(game.capturedCount / game.totalSquares) * 100}%"></div>
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
		display: grid;
		gap: 0.58rem;
		padding: 0.78rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--surface) 95%, transparent);
		border: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
		box-shadow: var(--shadow-soft);
	}

	.control-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.45rem;
	}

	.control-btn,
	.control-btn-placeholder {
		min-height: 46px;
	}

	.control-btn {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 0.4rem;
		border: 1px solid color-mix(in srgb, var(--line) 86%, transparent);
		border-radius: 0.78rem;
		background: color-mix(in srgb, var(--surface-quiet) 95%, transparent);
		font-size: 0.88rem;
		font-weight: 800;
		cursor: pointer;
	}

	.control-btn.active {
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, var(--surface));
		border-color: color-mix(in srgb, var(--accent) 56%, transparent);
	}

	.control-btn:active {
		transform: scale(0.99);
	}

	.game-info {
		display: grid;
		gap: 0.25rem;
		padding: 0.54rem 0.62rem;
		border-radius: 0.82rem;
		background: color-mix(in srgb, var(--surface-quiet) 95%, transparent);
		border: 1px dashed color-mix(in srgb, var(--line) 86%, transparent);
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.82rem;
		color: var(--text-muted);
	}

	.info-row strong {
		font-variant-numeric: tabular-nums;
		color: var(--text-main);
	}

	.progress-bar {
		height: 6px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--line) 80%, white);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--accent), var(--accent-warm));
		transition: width 0.3s ease;
	}

	.bot-assign {
		padding-top: 0.52rem;
		border-top: 1px dashed color-mix(in srgb, var(--line) 86%, transparent);
	}

	.bot-assign-toggle {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 0;
		border: none;
		background: transparent;
		cursor: pointer;
	}

	.bot-assign-toggle h4 {
		margin: 0;
		font-size: 0.76rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.chevron {
		transition: transform 0.2s ease;
		color: var(--text-muted);
	}

	.chevron.expanded {
		transform: rotate(180deg);
	}

	.bot-assign-list {
		display: grid;
		gap: 0.44rem;
		margin-top: 0.46rem;
	}

	.bot-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.5rem;
		align-items: center;
		padding: 0.45rem;
		border-radius: 0.72rem;
		background: color-mix(in srgb, var(--player-color) 11%, var(--surface));
		border: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
	}

	.bot-player-name {
		font-size: 0.8rem;
		font-weight: 800;
		color: var(--player-color);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bot-assign-select {
		appearance: none;
		padding: 0.35rem 1.65rem 0.35rem 0.52rem;
		min-height: 36px;
		border-radius: 0.64rem;
		border: 1px solid color-mix(in srgb, var(--line) 88%, transparent);
		background:
			linear-gradient(45deg, transparent 50%, var(--text-muted) 50%) calc(100% - 12px) calc(50% - 2px) / 6px
				6px no-repeat,
			linear-gradient(135deg, var(--text-muted) 50%, transparent 50%) calc(100% - 8px) calc(50% - 2px) / 6px
				6px no-repeat,
			var(--surface-quiet);
		font-size: 0.76rem;
		font-weight: 700;
	}

	.server-inline-config {
		margin-top: -0.2rem;
		padding: 0.44rem;
		border-radius: 0 0 0.72rem 0.72rem;
		border: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
		border-top: none;
		background: color-mix(in srgb, var(--surface-quiet) 95%, transparent);
	}

	@media (min-width: 1020px) {
		.control-group {
			grid-template-columns: 1fr;
		}

		.control-btn {
			justify-content: flex-start;
			padding-inline: 0.75rem;
		}
	}
</style>

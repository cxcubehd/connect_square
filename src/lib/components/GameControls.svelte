<script lang="ts">
	import { type GameState } from '$lib/game/state.svelte.js';
	import { getAvailableBots } from '$lib/game/bot.js';
	import ServerBotConfig from './ServerBotConfig.svelte';

	let { game }: { game: GameState } = $props();

	const bots = getAvailableBots();
	let showBotAssign = $state(false);
	let progress = $derived(
		game.totalSquares === 0 ? 0 : Math.round((game.capturedCount / game.totalSquares) * 100)
	);
</script>

<div class="controls" role="region" aria-label="Game controls">
	<div class="control-group">
		<md-filled-tonal-button type="button" onclick={() => game.reset()}>
			<md-icon slot="icon">restart_alt</md-icon>
			New Game
		</md-filled-tonal-button>

		{#if game.phase === 'playing'}
			<md-outlined-button
				type="button"
				class="edit-toggle"
				class:active={game.editMode}
				onclick={() => game.toggleEditMode()}
			>
				<md-icon slot="icon">edit</md-icon>
				Edit Mode
			</md-outlined-button>
		{:else}
			<div class="edit-placeholder" aria-hidden="true"></div>
		{/if}
	</div>

	{#if game.phase === 'playing' || game.phase === 'finished'}
		<div class="game-info">
			<div class="info-row">
				<span>Squares</span><strong>{game.capturedCount}/{game.totalSquares}</strong>
			</div>
			<div class="info-row"><span>Moves</span><strong>{game.moveHistory.length}</strong></div>
			<div class="info-row"><span>Progress</span><strong>{progress}%</strong></div>
			<div class="progress-bar" aria-hidden="true">
				<div class="progress-fill" style:width="{progress}%"></div>
			</div>
		</div>

		<section class="bot-assign">
			<button
				type="button"
				class="bot-assign-toggle"
				onclick={() => (showBotAssign = !showBotAssign)}
				aria-expanded={showBotAssign}
			>
				<span>Assign Bots</span>
				<md-icon>{showBotAssign ? 'expand_less' : 'expand_more'}</md-icon>
			</button>

			{#if showBotAssign}
				<div class="bot-assign-list">
					{#each game.players as player, i (player.id)}
						<div class="bot-row" style:--player-color={player.color}>
							<span class="bot-player-name">{player.name}</span>
							<select
								class="bot-assign-select"
								value={player.type === 'server' ? 'server' : (player.botStrategyId ?? '')}
								onchange={(event) => {
									const value = (event.target as HTMLSelectElement).value;
									if (value === 'server') {
										game.assignBot(i, 'server');
									} else {
										game.assignBot(i, value || null);
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
		</section>
	{/if}
</div>

<style>
	.controls {
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr);
		gap: 0.7rem;
		height: 100%;
		padding: 0.85rem;
		border-radius: 18px;
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
		background: color-mix(in srgb, var(--surface) 95%, transparent);
	}

	.control-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.edit-toggle.active {
		--md-outlined-button-outline-color: color-mix(in srgb, var(--accent) 54%, transparent);
		--md-outlined-button-label-text-color: var(--accent);
		--md-outlined-button-hover-state-layer-color: var(--accent);
	}

	.edit-placeholder {
		height: 40px;
	}

	.game-info {
		display: grid;
		gap: 0.32rem;
		padding: 0.58rem 0.68rem;
		border-radius: 14px;
		border: 1px dashed color-mix(in srgb, var(--line) 74%, transparent);
		background: color-mix(in srgb, var(--surface-quiet) 94%, transparent);
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.84rem;
		color: var(--text-muted);
	}

	.info-row strong {
		font-size: 0.88rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--text-main);
	}

	.progress-bar {
		height: 6px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--line) 70%, transparent);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 45%, #fff));
		transition: width 0.2s ease;
	}

	.bot-assign {
		display: grid;
		gap: 0.45rem;
		min-height: 0;
	}

	.bot-assign-toggle {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.65rem;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
		background: color-mix(in srgb, var(--surface-quiet) 95%, transparent);
		font-size: 0.84rem;
		font-weight: 600;
		cursor: pointer;
	}

	.bot-assign-list {
		display: grid;
		gap: 0.5rem;
		overflow: auto;
	}

	.bot-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.44rem;
		align-items: center;
		padding: 0.52rem;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
		background: color-mix(in srgb, var(--player-color) 12%, var(--surface));
	}

	.bot-player-name {
		font-size: 0.84rem;
		font-weight: 700;
		color: var(--player-color);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bot-assign-select {
		appearance: none;
		min-height: 34px;
		padding: 0.35rem 1.8rem 0.35rem 0.55rem;
		border-radius: 9px;
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
		background:
			linear-gradient(45deg, transparent 50%, var(--text-muted) 50%) calc(100% - 13px) 48% / 6px 6px
				no-repeat,
			linear-gradient(135deg, var(--text-muted) 50%, transparent 50%) calc(100% - 9px) 48% / 6px 6px
				no-repeat,
			color-mix(in srgb, var(--surface) 95%, transparent);
		font-size: 0.78rem;
		font-weight: 600;
	}

	.server-inline-config {
		padding: 0.5rem;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
		background: color-mix(in srgb, var(--surface-quiet) 95%, transparent);
	}

	@media (max-width: 420px) {
		.control-group {
			grid-template-columns: 1fr;
		}
	}
</style>

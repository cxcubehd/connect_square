<script lang="ts">
	import { Cpu, Server, UserRound } from '@lucide/svelte';

	import type { PlayerConfig } from '$lib/game/types.js';
	import {
		PLAYER_COLORS,
		MIN_BOARD_SIZE,
		MAX_BOARD_SIZE,
		DEFAULT_BOARD_SIZE
	} from '$lib/game/colors.js';
	import { getAvailableBots } from '$lib/game/bot.js';
	import ServerBotConfig from './ServerBotConfig.svelte';

	let { onStart }: { onStart: (boardSize: number, players: PlayerConfig[]) => void } = $props();

	let boardSize = $state(DEFAULT_BOARD_SIZE);
	let boardProgress = $derived(
		((boardSize - MIN_BOARD_SIZE) / (MAX_BOARD_SIZE - MIN_BOARD_SIZE)) * 100
	);
	let playerConfigs: PlayerConfig[] = $state([
		{ name: 'Player 1', color: PLAYER_COLORS[0].hex, type: 'human', botStrategyId: null },
		{ name: 'Player 2', color: PLAYER_COLORS[1].hex, type: 'human', botStrategyId: null }
	]);

	const bots = getAvailableBots();
	const usedColors = $derived(playerConfigs.map((p) => p.color));
	let showServerConfig: Map<number, boolean> = $state(new Map());

	function updatePlayer(index: number, patch: Partial<PlayerConfig>) {
		playerConfigs[index] = { ...playerConfigs[index], ...patch };
		playerConfigs = [...playerConfigs];
	}

	function addPlayer() {
		if (playerConfigs.length >= 4) return;
		const nextColor = PLAYER_COLORS.find((c) => !usedColors.includes(c.hex));
		playerConfigs = [
			...playerConfigs,
			{
				name: `Player ${playerConfigs.length + 1}`,
				color: nextColor?.hex ?? PLAYER_COLORS[playerConfigs.length % PLAYER_COLORS.length].hex,
				type: 'human',
				botStrategyId: null
			}
		];
	}

	function removePlayer(index: number) {
		if (playerConfigs.length <= 2) return;
		playerConfigs = playerConfigs.filter((_, i) => i !== index);
	}

	function setPlayerType(index: number, type: 'human' | 'bot' | 'server') {
		updatePlayer(index, {
			type,
			botStrategyId: type === 'bot' ? (playerConfigs[index].botStrategyId ?? bots.at(-1)?.id ?? 'random') : null,
			serverUrl:
				type === 'server' ? (playerConfigs[index].serverUrl ?? 'http://localhost:3001') : undefined,
			serverBotParams: type === 'server' ? playerConfigs[index].serverBotParams : undefined
		});
	}

	function handleStart() {
		onStart(boardSize, playerConfigs);
	}

	function quickStart(mode: 'pvp' | 'pvb' | 'bvb') {
		const configs: PlayerConfig[] = [
			{
				name: mode === 'bvb' ? 'Bot 1' : 'Player 1',
				color: PLAYER_COLORS[0].hex,
				type: mode === 'bvb' ? 'bot' : 'human',
				botStrategyId: mode === 'bvb' ? 'hard' : null
			},
			{
				name: mode === 'pvp' ? 'Player 2' : mode === 'pvb' ? 'Bot' : 'Bot 2',
				color: PLAYER_COLORS[1].hex,
				type: mode === 'pvp' ? 'human' : 'bot',
				botStrategyId: mode === 'pvp' ? null : 'hard'
			}
		];

		if (Math.random() < 0.5) {
			configs.reverse();
		}

		onStart(boardSize, configs);
	}
</script>

<div class="setup-root">
	<section class="hero-card">
		<h2 class="hero-title">Pick Your Matchup</h2>
		<p class="hero-subtitle">A game of territory and connections</p>
	</section>

	<section class="quick-card">
		<div class="section-head">
			<h3>Quick Start</h3>
			<span>Jump in instantly</span>
		</div>
		<div class="quick-list">
			<button class="quick-btn" onclick={() => quickStart('pvp')}>
				<span class="quick-icon"><UserRound size={20} /> vs <UserRound size={20} /></span>
				<span class="quick-text">
					<strong>Player vs Player</strong>
					<small>Pass and play</small>
				</span>
			</button>
			<button class="quick-btn" onclick={() => quickStart('pvb')}>
				<span class="quick-icon"><UserRound size={20} /> vs <Cpu size={20} /></span>
				<span class="quick-text">
					<strong>Player vs Bot</strong>
					<small>Train your tactics</small>
				</span>
			</button>
			<button class="quick-btn" onclick={() => quickStart('bvb')}>
				<span class="quick-icon"><Cpu size={20} /> vs <Cpu size={20} /></span>
				<span class="quick-text">
					<strong>Bot vs Bot</strong>
					<small>Watch and learn</small>
				</span>
			</button>
		</div>
	</section>

	<div class="divider">or customize</div>

	<section class="native-card board-card">
		<div class="card-title-row">
			<h3>Board Size: {boardSize} x {boardSize}</h3>
			<div class="stepper" aria-label="Board size stepper">
				<button
					type="button"
					disabled={boardSize <= MIN_BOARD_SIZE}
					onclick={() => (boardSize = Math.max(MIN_BOARD_SIZE, boardSize - 1))}
				>
					−
				</button>
				<button
					type="button"
					disabled={boardSize >= MAX_BOARD_SIZE}
					onclick={() => (boardSize = Math.min(MAX_BOARD_SIZE, boardSize + 1))}
				>
					+
				</button>
			</div>
		</div>
		<div class="slider-wrap" style:--slider-progress="{boardProgress}%">
			<input
				type="range"
				class="board-slider"
				min={MIN_BOARD_SIZE}
				max={MAX_BOARD_SIZE}
				bind:value={boardSize}
				aria-label="Board size"
			/>
		</div>
		<p class="size-hint">{boardSize * boardSize} squares, {(boardSize + 1) * (boardSize + 1)} points</p>
	</section>

	<section class="native-card players-card">
		<div class="players-header">
			<h3>Players</h3>
			{#if playerConfigs.length < 4}
				<button class="add-player-btn" onclick={addPlayer}>+ Add Player</button>
			{/if}
		</div>

		<div class="player-list">
			{#each playerConfigs as config, i (i)}
				<div class="player-config" style:--player-color={config.color}>
					<div class="player-top-row">
						<input
							type="text"
							class="player-name-input"
							value={config.name}
							oninput={(e) => updatePlayer(i, { name: (e.target as HTMLInputElement).value })}
							placeholder="Name"
						/>
						{#if playerConfigs.length > 2}
							<button class="remove-btn" onclick={() => removePlayer(i)} aria-label="Remove player">
								&times;
							</button>
						{/if}
					</div>

					<div class="color-strip" role="radiogroup" aria-label="Player color">
						{#each PLAYER_COLORS as color}
							{@const takenByOther = playerConfigs.some((p, idx) => idx !== i && p.color === color.hex)}
							<button
								type="button"
								class="color-chip"
								class:selected={config.color === color.hex}
								style:--chip-color={color.hex}
								disabled={takenByOther}
								title={takenByOther ? `${color.name} already used` : color.name}
								onclick={() => updatePlayer(i, { color: color.hex })}
							>
								<span class="sr-only">{color.name}</span>
							</button>
						{/each}
					</div>

					<div class="player-config-type">
						<button
							type="button"
							class="type-btn"
							class:active={config.type === 'human'}
							onclick={() => setPlayerType(i, 'human')}
						>
							<UserRound size={15} /> Player
						</button>
						<button
							type="button"
							class="type-btn"
							class:active={config.type === 'bot'}
							onclick={() => setPlayerType(i, 'bot')}
						>
							<Cpu size={15} /> Bot
						</button>
						<button
							type="button"
							class="type-btn"
							class:active={config.type === 'server'}
							onclick={() => setPlayerType(i, 'server')}
						>
							<Server size={15} /> Server
						</button>
					</div>

					{#if config.type === 'bot'}
						<div class="bot-pills" role="group" aria-label="Bot strategy">
							{#each bots as bot}
								<button
									type="button"
									class="bot-pill"
									class:active={config.botStrategyId === bot.id}
									onclick={() => updatePlayer(i, { botStrategyId: bot.id })}
								>
									{bot.name}
								</button>
							{/each}
						</div>
					{/if}

					{#if config.type === 'server'}
						<input
							type="text"
							class="server-url-input"
							placeholder="http://localhost:3001"
							value={config.serverUrl ?? 'http://localhost:3001'}
							onchange={(e) => updatePlayer(i, { serverUrl: (e.target as HTMLInputElement).value })}
						/>
						<div class="server-config">
							<button
								class="server-config-toggle"
								type="button"
								onclick={() => {
									showServerConfig.set(i, !(showServerConfig.get(i) ?? false));
									showServerConfig = new Map(showServerConfig);
								}}
							>
								<span>Bot Settings</span>
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
									class:expanded={showServerConfig.get(i)}
								>
									<path d="m6 9 6 6 6-6" />
								</svg>
							</button>
							{#if showServerConfig.get(i)}
								<div class="server-config-body">
									<ServerBotConfig
										serverUrl={config.serverUrl ?? 'http://localhost:3001'}
										botParams={config.serverBotParams}
										onParamsChange={(params) => updatePlayer(i, { serverBotParams: params })}
									/>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<button class="start-btn" onclick={handleStart}>Start Game</button>
</div>

<style>
	.setup-root {
		display: grid;
		gap: 0.72rem;
	}

	.hero-card,
	.quick-card,
	.native-card {
		border-radius: 1.05rem;
		background: color-mix(in srgb, var(--surface) 94%, transparent);
		border: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
		box-shadow: var(--shadow-soft);
	}

	.hero-card {
		padding: 0.9rem;
		text-align: center;
	}

	.hero-title {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 8vw, 2.6rem);
		line-height: 0.86;
	}

	.hero-subtitle {
		margin: 0.2rem 0 0;
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.quick-card,
	.native-card {
		padding: 0.85rem;
	}

	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 0.58rem;
		gap: 0.5rem;
	}

	.section-head h3,
	.card-title-row h3,
	.players-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 800;
	}

	.section-head span {
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.quick-list {
		display: grid;
		gap: 0.5rem;
	}

	.quick-btn {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.6rem;
		padding: 0.68rem 0.72rem;
		border-radius: 0.9rem;
		border: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
		background: color-mix(in srgb, var(--surface-quiet) 95%, transparent);
		cursor: pointer;
		text-align: left;
		min-height: 56px;
		transition:
			transform 0.16s ease,
			border-color 0.16s ease;
	}

	.quick-btn:hover {
		border-color: color-mix(in srgb, var(--accent) 55%, var(--line));
	}

	.quick-btn:active {
		transform: scale(0.99);
	}

	.quick-icon {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		color: var(--accent);
	}

	.quick-text {
		display: grid;
		gap: 0.05rem;
	}

	.quick-text strong {
		font-size: 1rem;
		font-weight: 800;
	}

	.quick-text small {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.divider {
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		position: relative;
	}

	.divider::before,
	.divider::after {
		content: '';
		height: 1px;
		flex: 1;
		max-width: 120px;
		background: color-mix(in srgb, var(--line) 86%, transparent);
	}

	.divider::before {
		margin-right: 0.8rem;
	}

	.divider::after {
		margin-left: 0.8rem;
	}

	.card-title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.6rem;
	}

	.stepper {
		display: inline-flex;
		background: var(--surface-quiet);
		border: 1px solid color-mix(in srgb, var(--line) 88%, transparent);
		border-radius: 999px;
		overflow: hidden;
	}

	.stepper button {
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		font-size: 1.05rem;
		font-weight: 800;
		cursor: pointer;
		color: var(--text-main);
	}

	.stepper button:disabled {
		opacity: 0.38;
		cursor: not-allowed;
	}

	.slider-wrap {
		margin-top: 0.68rem;
		position: relative;
	}

	.slider-wrap::before {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		width: var(--slider-progress, 0%);
		height: 8px;
		transform: translateY(-50%);
		border-radius: 999px;
		background: linear-gradient(90deg, var(--accent-warm), #ffb26d);
		pointer-events: none;
	}

	.board-slider {
		width: 100%;
		appearance: none;
		height: 8px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--line) 74%, white);
		outline: none;
	}

	.board-slider::-webkit-slider-thumb {
		appearance: none;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: linear-gradient(145deg, #fff, #ffe9d6);
		border: 2px solid var(--accent-warm);
		box-shadow: 0 4px 10px rgb(255 126 84 / 0.32);
	}

	.board-slider::-moz-range-thumb {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: linear-gradient(145deg, #fff, #ffe9d6);
		border: 2px solid var(--accent-warm);
		box-shadow: 0 4px 10px rgb(255 126 84 / 0.32);
	}

	.size-hint {
		margin: 0.58rem 0 0;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.players-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.62rem;
		gap: 0.6rem;
	}

	.add-player-btn {
		border: 1px dashed color-mix(in srgb, var(--line-strong) 78%, transparent);
		background: var(--surface-quiet);
		color: var(--text-muted);
		font-size: 0.78rem;
		font-weight: 800;
		padding: 0.42rem 0.82rem;
		border-radius: 999px;
		cursor: pointer;
		min-height: 40px;
	}

	.player-list {
		display: grid;
		gap: 0.62rem;
	}

	.player-config {
		display: grid;
		gap: 0.56rem;
		padding: 0.7rem;
		border-radius: 0.9rem;
		border: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
		background:
			linear-gradient(
				130deg,
				color-mix(in srgb, var(--player-color) 12%, transparent),
				color-mix(in srgb, var(--surface-quiet) 96%, transparent)
			),
			var(--surface);
	}

	.player-top-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.5rem;
	}

	.player-name-input,
	.server-url-input {
		width: 100%;
		padding: 0.56rem 0.68rem;
		border-radius: 0.7rem;
		border: 1px solid color-mix(in srgb, var(--line) 86%, transparent);
		background: var(--input-bg);
		font-size: 16px;
		font-weight: 600;
	}

	.remove-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid color-mix(in srgb, var(--danger) 56%, transparent);
		background: color-mix(in srgb, var(--danger) 14%, var(--surface));
		color: var(--danger);
		font-weight: 800;
		cursor: pointer;
	}

	.color-strip {
		display: flex;
		gap: 0.32rem;
		flex-wrap: wrap;
	}

	.color-chip {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 2px solid color-mix(in srgb, var(--line) 90%, transparent);
		background: var(--chip-color);
		cursor: pointer;
		position: relative;
	}

	.color-chip.selected {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--chip-color) 28%, transparent);
	}

	.color-chip:disabled {
		opacity: 0.25;
		cursor: not-allowed;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	.player-config-type {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.36rem;
	}

	.type-btn {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 0.28rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--line) 86%, transparent);
		background: var(--surface-quiet);
		padding: 0.44rem 0.48rem;
		font-size: 0.78rem;
		font-weight: 800;
		color: var(--text-muted);
		cursor: pointer;
		min-height: 38px;
	}

	.type-btn.active {
		border-color: color-mix(in srgb, var(--accent) 58%, transparent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 13%, var(--surface));
	}

	.bot-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.34rem;
	}

	.bot-pill {
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--line) 86%, transparent);
		background: var(--surface-quiet);
		padding: 0.34rem 0.62rem;
		font-size: 0.72rem;
		font-weight: 800;
		cursor: pointer;
		color: var(--text-muted);
	}

	.bot-pill.active {
		border-color: color-mix(in srgb, var(--accent) 56%, transparent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 14%, var(--surface));
	}

	.server-config {
		border-top: 1px dashed color-mix(in srgb, var(--line) 88%, transparent);
		padding-top: 0.42rem;
	}

	.server-config-toggle {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		border: none;
		background: transparent;
		padding: 0.12rem 0;
		font-size: 0.74rem;
		font-weight: 800;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		cursor: pointer;
	}

	.chevron {
		transition: transform 0.2s ease;
	}

	.chevron.expanded {
		transform: rotate(180deg);
	}

	.server-config-body {
		margin-top: 0.36rem;
	}

	.start-btn {
		width: 100%;
		min-height: 52px;
		border: none;
		border-radius: 1rem;
		background: linear-gradient(130deg, var(--accent-warm), #ff9f63);
		color: white;
		font-size: 1rem;
		font-weight: 900;
		letter-spacing: 0.03em;
		cursor: pointer;
		box-shadow: 0 16px 30px rgb(255 126 84 / 0.34);
	}

	.start-btn:active {
		transform: scale(0.99);
	}

	@media (min-width: 720px) {
		.setup-root {
			gap: 0.85rem;
		}

		.quick-list {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.quick-btn {
			grid-template-columns: 1fr;
			justify-items: center;
			text-align: center;
			gap: 0.3rem;
		}
	}
</style>

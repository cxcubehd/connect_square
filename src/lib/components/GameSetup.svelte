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

	const setupPages = ['quick', 'board', 'players'] as const;
	type SetupPage = (typeof setupPages)[number];

	const bots = getAvailableBots();

	let setupPage: SetupPage = $state('quick');
	let boardSize = $state(DEFAULT_BOARD_SIZE);
	let playerConfigs: PlayerConfig[] = $state([
		{ name: 'Player 1', color: PLAYER_COLORS[0].hex, type: 'human', botStrategyId: null },
		{ name: 'Player 2', color: PLAYER_COLORS[1].hex, type: 'human', botStrategyId: null }
	]);
	let showServerConfig: Map<number, boolean> = $state(new Map());
	let boardProgress = $derived(
		((boardSize - MIN_BOARD_SIZE) / (MAX_BOARD_SIZE - MIN_BOARD_SIZE)) * 100
	);
	let setupPageIndex = $derived(setupPages.indexOf(setupPage));
	const usedColors = $derived(playerConfigs.map((p) => p.color));

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
		setupPage = 'players';
	}

	function removePlayer(index: number) {
		if (playerConfigs.length <= 2) return;
		playerConfigs = playerConfigs.filter((_, i) => i !== index);
	}

	function setPlayerType(index: number, type: 'human' | 'bot' | 'server') {
		updatePlayer(index, {
			type,
			botStrategyId:
				type === 'bot' ? (playerConfigs[index].botStrategyId ?? bots.at(-1)?.id ?? 'random') : null,
			serverUrl:
				type === 'server' ? (playerConfigs[index].serverUrl ?? 'http://localhost:3001') : undefined,
			serverBotParams: type === 'server' ? playerConfigs[index].serverBotParams : undefined
		});
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

	function startCustomGame() {
		onStart(boardSize, playerConfigs);
	}

	function nextSetupPage() {
		const next = Math.min(setupPages.length - 1, setupPageIndex + 1);
		setupPage = setupPages[next];
	}

	function previousSetupPage() {
		const prev = Math.max(0, setupPageIndex - 1);
		setupPage = setupPages[prev];
	}

	function handleBoardSizeInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const nextSize = Math.round(Number(target.value));
		if (Number.isNaN(nextSize)) return;
		boardSize = Math.min(MAX_BOARD_SIZE, Math.max(MIN_BOARD_SIZE, nextSize));
	}
</script>

<div class="setup-shell" role="region" aria-label="Game setup">
	<header class="setup-header">
		<p class="setup-kicker">Setup</p>
		<h2>Start a match your way</h2>
	</header>

	<section class="setup-page" data-page={setupPage}>
		{#if setupPage === 'quick'}
			<div class="quick-page">
				<button class="quick-option" type="button" onclick={() => quickStart('pvp')}>
					<span class="quick-icon"><UserRound size={19} /> vs <UserRound size={19} /></span>
					<span class="quick-copy">
						<strong>Player vs Player</strong>
						<small>Pass-and-play battle</small>
					</span>
				</button>
				<button class="quick-option" type="button" onclick={() => quickStart('pvb')}>
					<span class="quick-icon"><UserRound size={19} /> vs <Cpu size={19} /></span>
					<span class="quick-copy">
						<strong>Player vs Bot</strong>
						<small>Practice against AI</small>
					</span>
				</button>
				<button class="quick-option" type="button" onclick={() => quickStart('bvb')}>
					<span class="quick-icon"><Cpu size={19} /> vs <Cpu size={19} /></span>
					<span class="quick-copy">
						<strong>Bot vs Bot</strong>
						<small>Watch autonomous play</small>
					</span>
				</button>
			</div>
		{:else if setupPage === 'board'}
			<div class="board-page">
				<p class="page-label">Board density</p>
				<p class="board-size">{boardSize} x {boardSize}</p>
				<md-slider
					class="board-slider"
					min={MIN_BOARD_SIZE}
					max={MAX_BOARD_SIZE}
					step="1"
					labeled
					value={boardSize}
					oninput={handleBoardSizeInput}
				></md-slider>
				<div class="board-stepper">
					<md-outlined-button
						type="button"
						disabled={boardSize <= MIN_BOARD_SIZE}
						onclick={() => (boardSize = Math.max(MIN_BOARD_SIZE, boardSize - 1))}
					>
						Smaller
					</md-outlined-button>
					<md-outlined-button
						type="button"
						disabled={boardSize >= MAX_BOARD_SIZE}
						onclick={() => (boardSize = Math.min(MAX_BOARD_SIZE, boardSize + 1))}
					>
						Larger
					</md-outlined-button>
				</div>
				<p class="board-hint">
					{boardSize * boardSize} squares, {(boardSize + 1) * (boardSize + 1)} playable points
				</p>
				<div class="board-meter" role="presentation">
					<div style:width="{boardProgress}%"></div>
				</div>
			</div>
		{:else}
			<div class="players-page">
				<div class="players-header">
					<p class="page-label">Players</p>
					{#if playerConfigs.length < 4}
						<md-outlined-button type="button" onclick={addPlayer}>
							<md-icon slot="icon">person_add</md-icon>
							Add
						</md-outlined-button>
					{/if}
				</div>
				<div class="players-scroll">
					{#each playerConfigs as config, i (i)}
						<article class="player-card" style:--player-color={config.color}>
							<div class="player-row">
								<input
									type="text"
									class="player-name"
									value={config.name}
									oninput={(event) =>
										updatePlayer(i, {
											name: (event.target as HTMLInputElement).value
										})}
									placeholder="Name"
								/>
								{#if playerConfigs.length > 2}
									<md-icon-button
										type="button"
										onclick={() => removePlayer(i)}
										aria-label="Remove player"
									>
										<md-icon>close</md-icon>
									</md-icon-button>
								{/if}
							</div>

							<div class="color-strip" role="radiogroup" aria-label="Player color">
								{#each PLAYER_COLORS as color}
									{@const takenByOther = playerConfigs.some(
										(p, idx) => idx !== i && p.color === color.hex
									)}
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

							<div class="type-row" role="group" aria-label="Player type">
								<button
									type="button"
									class="type-btn"
									class:active={config.type === 'human'}
									onclick={() => setPlayerType(i, 'human')}
								>
									<UserRound size={14} /> Human
								</button>
								<button
									type="button"
									class="type-btn"
									class:active={config.type === 'bot'}
									onclick={() => setPlayerType(i, 'bot')}
								>
									<Cpu size={14} /> Bot
								</button>
								<button
									type="button"
									class="type-btn"
									class:active={config.type === 'server'}
									onclick={() => setPlayerType(i, 'server')}
								>
									<Server size={14} /> Server
								</button>
							</div>

							{#if config.type === 'bot'}
								<div class="bot-row" role="group" aria-label="Bot strategy">
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
									class="server-url"
									placeholder="http://localhost:3001"
									value={config.serverUrl ?? 'http://localhost:3001'}
									onchange={(event) =>
										updatePlayer(i, {
											serverUrl: (event.target as HTMLInputElement).value
										})}
								/>

								<div class="server-settings">
									<button
										type="button"
										class="server-toggle"
										onclick={() => {
											showServerConfig.set(i, !(showServerConfig.get(i) ?? false));
											showServerConfig = new Map(showServerConfig);
										}}
									>
										<span>Server bot params</span>
										<md-icon>{showServerConfig.get(i) ? 'expand_less' : 'expand_more'}</md-icon>
									</button>
									{#if showServerConfig.get(i)}
										<div class="server-body">
											<ServerBotConfig
												serverUrl={config.serverUrl ?? 'http://localhost:3001'}
												botParams={config.serverBotParams}
												onParamsChange={(params) => updatePlayer(i, { serverBotParams: params })}
											/>
										</div>
									{/if}
								</div>
							{/if}
						</article>
					{/each}
				</div>
			</div>
		{/if}
	</section>

	<footer class="setup-footer">
		<md-text-button type="button" disabled={setupPage === 'quick'} onclick={previousSetupPage}>
			Back
		</md-text-button>
		<div class="footer-actions">
			<md-outlined-button type="button" onclick={nextSetupPage} disabled={setupPage === 'players'}>
				Next
			</md-outlined-button>
			<md-filled-button type="button" onclick={startCustomGame}>
				<md-icon slot="icon">play_arrow</md-icon>
				Start Game
			</md-filled-button>
		</div>
	</footer>

	<md-navigation-bar active-index={setupPageIndex} class="setup-nav" hide-inactive-labels>
		<md-navigation-tab label="Quick" onclick={() => (setupPage = 'quick')}>
			<md-icon slot="inactive-icon">flash_on</md-icon>
			<md-icon slot="active-icon">flash_on</md-icon>
		</md-navigation-tab>
		<md-navigation-tab label="Board" onclick={() => (setupPage = 'board')}>
			<md-icon slot="inactive-icon">grid_view</md-icon>
			<md-icon slot="active-icon">grid_view</md-icon>
		</md-navigation-tab>
		<md-navigation-tab label="Players" onclick={() => (setupPage = 'players')}>
			<md-icon slot="inactive-icon">groups</md-icon>
			<md-icon slot="active-icon">groups</md-icon>
		</md-navigation-tab>
	</md-navigation-bar>
</div>

<style>
	.setup-shell {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto auto;
		height: 100%;
		border-radius: 24px;
		background: color-mix(in srgb, var(--surface) 96%, transparent);
		border: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
		overflow: hidden;
	}

	.setup-header {
		padding: 1rem 1rem 0.5rem;
	}

	.setup-header h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.2rem, 4vw, 1.5rem);
		letter-spacing: 0.01em;
	}

	.setup-kicker {
		margin: 0 0 0.22rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.setup-page {
		min-height: 0;
		padding: 0.25rem 1rem 0.6rem;
	}

	.quick-page,
	.board-page,
	.players-page {
		height: 100%;
	}

	.quick-page {
		display: grid;
		gap: 0.62rem;
	}

	.quick-option {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.62rem;
		padding: 0.92rem;
		border: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-quiet) 90%, transparent);
		cursor: pointer;
		text-align: left;
		transition:
			transform 0.16s ease,
			border-color 0.16s ease,
			background 0.16s ease;
	}

	.quick-option:hover {
		border-color: color-mix(in srgb, var(--accent) 42%, transparent);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-quiet));
	}

	.quick-option:active {
		transform: scale(0.99);
	}

	.quick-icon {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--accent);
	}

	.quick-copy {
		display: grid;
		gap: 0.05rem;
	}

	.quick-copy strong {
		font-size: 0.95rem;
		font-weight: 700;
	}

	.quick-copy small {
		font-size: 0.76rem;
		color: var(--text-muted);
	}

	.board-page {
		display: grid;
		align-content: center;
		gap: 0.58rem;
	}

	.page-label {
		margin: 0;
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.board-size {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 8vw, 2.3rem);
		line-height: 1;
	}

	.board-slider {
		width: 100%;
	}

	.board-stepper {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.board-hint {
		margin: 0;
		font-size: 0.82rem;
		color: var(--text-muted);
	}

	.board-meter {
		height: 6px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--line) 65%, transparent);
		overflow: hidden;
	}

	.board-meter > div {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 45%, #fff));
		transition: width 0.2s ease;
	}

	.players-page {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.45rem;
	}

	.players-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.players-scroll {
		display: grid;
		gap: 0.56rem;
		overflow: auto;
		padding-right: 0.12rem;
	}

	.player-card {
		display: grid;
		gap: 0.45rem;
		padding: 0.66rem;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--player-color) 40%, var(--line));
		background: color-mix(in srgb, var(--player-color) 11%, var(--surface-quiet));
	}

	.player-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.3rem;
		align-items: center;
	}

	.player-name,
	.server-url {
		width: 100%;
		min-height: 38px;
		padding: 0.5rem 0.6rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--line) 85%, transparent);
		background: color-mix(in srgb, var(--surface) 90%, transparent);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.color-strip {
		display: grid;
		grid-template-columns: repeat(8, minmax(0, 1fr));
		gap: 0.3rem;
	}

	.color-chip {
		display: inline-grid;
		place-items: center;
		aspect-ratio: 1;
		border-radius: 999px;
		border: 2px solid color-mix(in srgb, var(--line) 80%, transparent);
		background: var(--chip-color);
		cursor: pointer;
	}

	.color-chip.selected {
		outline: 2px solid color-mix(in srgb, var(--chip-color) 45%, white);
		outline-offset: 1px;
	}

	.color-chip:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.type-row,
	.bot-row {
		display: grid;
		gap: 0.3rem;
	}

	.type-row {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.bot-row {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.type-btn,
	.bot-pill {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 0.22rem;
		min-height: 34px;
		padding: 0.28rem 0.42rem;
		font-size: 0.76rem;
		font-weight: 600;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
		background: color-mix(in srgb, var(--surface) 90%, transparent);
		cursor: pointer;
	}

	.type-btn.active,
	.bot-pill.active {
		border-color: color-mix(in srgb, var(--player-color) 60%, transparent);
		background: color-mix(in srgb, var(--player-color) 23%, var(--surface));
	}

	.server-settings {
		display: grid;
		gap: 0.3rem;
	}

	.server-toggle {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.4rem;
		padding: 0.44rem 0.6rem;
		border-radius: 10px;
		border: 1px dashed color-mix(in srgb, var(--line) 82%, transparent);
		background: color-mix(in srgb, var(--surface) 92%, transparent);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.server-body {
		padding: 0.45rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
		background: color-mix(in srgb, var(--surface) 95%, transparent);
	}

	.setup-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.75rem 0.5rem;
		border-top: 1px solid color-mix(in srgb, var(--line) 62%, transparent);
	}

	.footer-actions {
		display: flex;
		gap: 0.4rem;
	}

	.setup-nav {
		border-top: 1px solid color-mix(in srgb, var(--line) 62%, transparent);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	@media (max-width: 419px) {
		.player-name,
		.server-url {
			font-size: 0.82rem;
		}

		.type-btn,
		.bot-pill {
			font-size: 0.69rem;
		}
	}

	@media (min-width: 900px) {
		.setup-shell {
			max-width: 920px;
			margin: 0 auto;
		}

		.quick-page {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>

<script lang="ts">
	import {
		ArrowLeft,
		ArrowRight,
		Cpu,
		Grid3x3,
		Play,
		Plus,
		Server,
		UserRound,
		Users,
		Zap
	} from '@lucide/svelte';

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
	const boardSizePresets = Array.from(
		{ length: MAX_BOARD_SIZE - MIN_BOARD_SIZE + 1 },
		(_, index) => MIN_BOARD_SIZE + index
	);

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
	let boardDensityLabel = $derived.by(() => {
		if (boardSize <= MIN_BOARD_SIZE + 1) return 'Faster rounds';
		if (boardSize >= MAX_BOARD_SIZE - 1) return 'More tactical';
		return 'Balanced pace';
	});
	let setupPageIndex = $derived(setupPages.indexOf(setupPage));
	const usedColors = $derived(playerConfigs.map((p) => p.color));

	function pageFromIndex(index: number): SetupPage {
		const safeIndex = Math.min(setupPages.length - 1, Math.max(0, index));
		return setupPages[safeIndex];
	}

	function handleSetupNavActivated(event: Event) {
		const nextIndex = (event as CustomEvent<{ activeIndex: number }>).detail?.activeIndex;
		if (typeof nextIndex !== 'number') return;
		setupPage = pageFromIndex(nextIndex);
	}

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
		setupPage = pageFromIndex(setupPageIndex + 1);
	}

	function previousSetupPage() {
		setupPage = pageFromIndex(setupPageIndex - 1);
	}

	function handleBoardSizeInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const nextSize = Math.round(Number(target.value));
		if (Number.isNaN(nextSize)) return;
		setBoardSize(nextSize);
	}

	function setBoardSize(nextSize: number) {
		boardSize = Math.min(MAX_BOARD_SIZE, Math.max(MIN_BOARD_SIZE, nextSize));
	}
</script>

<div class="setup-shell" role="region" aria-label="Game setup">
	<header class="setup-header">
		<p class="setup-kicker">Setup</p>
		<h2>Start a match your way</h2>
	</header>

	<section class="setup-content" data-page={setupPage}>
		{#if setupPage === 'quick'}
			<div class="quick-page">
				<button class="quick-option" type="button" onclick={() => quickStart('pvp')}>
					<span class="quick-icon"><UserRound size={18} /> vs <UserRound size={18} /></span>
					<span class="quick-copy">
						<strong>Player vs Player</strong>
						<small>Pass-and-play battle</small>
					</span>
				</button>
				<button class="quick-option" type="button" onclick={() => quickStart('pvb')}>
					<span class="quick-icon"><UserRound size={18} /> vs <Cpu size={18} /></span>
					<span class="quick-copy">
						<strong>Player vs Bot</strong>
						<small>Practice against AI</small>
					</span>
				</button>
				<button class="quick-option" type="button" onclick={() => quickStart('bvb')}>
					<span class="quick-icon"><Cpu size={18} /> vs <Cpu size={18} /></span>
					<span class="quick-copy">
						<strong>Bot vs Bot</strong>
						<small>Watch autonomous play</small>
					</span>
				</button>
			</div>
		{:else if setupPage === 'board'}
			<div class="board-page">
				<p class="page-label">Board density</p>
				<div class="board-summary">
					<p class="board-size">{boardSize} x {boardSize}</p>
					<p class="board-tone">{boardDensityLabel}</p>
				</div>
				<md-slider
					class="board-slider"
					min={MIN_BOARD_SIZE}
					max={MAX_BOARD_SIZE}
					step="1"
					labeled
					value={boardSize}
					oninput={handleBoardSizeInput}
				></md-slider>
				<div class="size-presets" role="radiogroup" aria-label="Board size presets">
					{#each boardSizePresets as size}
						<button
							type="button"
							class="size-preset"
							class:active={boardSize === size}
							onclick={() => setBoardSize(size)}
						>
							{size} x {size}
						</button>
					{/each}
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
					<div class="players-header-copy">
						<p class="page-label">Players</p>
						<p class="players-count">{playerConfigs.length} configured</p>
					</div>
					{#if playerConfigs.length < 4}
						<button type="button" class="step-btn outlined add-btn" onclick={addPlayer}>
							<Plus size={15} strokeWidth={2.3} />
							Add
						</button>
					{/if}
				</div>
				<div class="players-scroll">
					{#each playerConfigs as config, i (i)}
						<article class="player-card" style:--player-color={config.color}>
							<div class="player-top">
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
									<button
										type="button"
										class="remove-btn"
										onclick={() => removePlayer(i)}
										aria-label="Remove player"
									>
										&times;
									</button>
								{/if}
							</div>

							<div class="player-section">
								<p class="player-label">Role</p>
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
							</div>

							<div class="player-section">
								<p class="player-label">Color</p>
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
										<span class="server-chevron" aria-hidden="true"
											>{showServerConfig.get(i) ? '▴' : '▾'}</span
										>
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
		<div class="pager-actions">
			<button
				type="button"
				class="step-btn text"
				disabled={setupPage === 'quick'}
				onclick={previousSetupPage}
			>
				<ArrowLeft size={15} strokeWidth={2.3} />
				Back
			</button>
			<button
				type="button"
				class="step-btn outlined"
				disabled={setupPage === 'players'}
				onclick={nextSetupPage}
			>
				Next
				<ArrowRight size={15} strokeWidth={2.3} />
			</button>
		</div>
		<button type="button" class="step-btn filled start-btn" onclick={startCustomGame}>
			<Play size={15} strokeWidth={2.3} />
			Start Game
		</button>
	</footer>

	<md-navigation-bar
		active-index={setupPageIndex}
		class="setup-nav"
		hide-inactive-labels
		onnavigation-bar-activated={handleSetupNavActivated}
	>
		<md-navigation-tab label="Quick">
			<span slot="inactive-icon">
				<Zap size={18} />
			</span>
			<span slot="active-icon">
				<Zap size={18} />
			</span>
		</md-navigation-tab>
		<md-navigation-tab label="Board">
			<span slot="inactive-icon">
				<Grid3x3 size={18} />
			</span>
			<span slot="active-icon">
				<Grid3x3 size={18} />
			</span>
		</md-navigation-tab>
		<md-navigation-tab label="Players">
			<span slot="inactive-icon">
				<Users size={18} />
			</span>
			<span slot="active-icon">
				<Users size={18} />
			</span>
		</md-navigation-tab>
	</md-navigation-bar>
</div>

<style>
	.setup-shell {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto auto;
		height: 100%;
		min-height: 0;
	}

	.setup-header {
		padding: 0.62rem 0.82rem 0.32rem;
	}

	.setup-header h2 {
		margin: 0;
		font-size: clamp(1.3rem, 3vw, 1.8rem);
		line-height: 1.15;
		font-weight: 500;
	}

	.setup-kicker {
		margin: 0 0 0.22rem;
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.setup-content {
		min-height: 0;
		overflow: hidden;
		padding: 0.3rem 0.82rem 0.68rem;
	}

	.quick-page,
	.board-page,
	.players-page {
		height: 100%;
	}

	.quick-page {
		display: grid;
		align-content: start;
		gap: 0.72rem;
	}

	.quick-option {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: 0.7rem;
		min-height: 136px;
		padding: 0.95rem;
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-soft) 86%, transparent);
		cursor: pointer;
		text-align: left;
		transition:
			border-color 0.16s ease,
			background 0.16s ease,
			transform 0.16s ease;
	}

	.quick-option:hover {
		border-color: color-mix(in srgb, var(--accent) 45%, transparent);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-soft));
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
		gap: 0.06rem;
	}

	.quick-copy strong {
		font-size: 1rem;
		font-weight: 600;
	}

	.quick-copy small {
		font-size: 0.82rem;
		color: var(--text-muted);
	}

	.board-page {
		display: grid;
		align-content: start;
		gap: 0.72rem;
		max-width: 860px;
	}

	.page-label {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.board-size {
		margin: 0;
		font-size: clamp(2rem, 6vw, 2.8rem);
		line-height: 1;
		font-weight: 500;
	}

	.board-summary {
		display: flex;
		align-items: flex-end;
		gap: 0.8rem;
		flex-wrap: wrap;
	}

	.board-tone {
		margin: 0;
		padding: 0.26rem 0.62rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 18%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.board-slider {
		width: 100%;
	}

	.size-presets {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
		gap: 0.48rem;
	}

	.size-preset {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 34px;
		padding: 0.34rem 0.66rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
		background: color-mix(in srgb, var(--surface) 94%, transparent);
		color: var(--text-muted);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			border-color 0.16s ease,
			background 0.16s ease,
			color 0.16s ease;
	}

	.size-preset.active {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 48%, transparent);
		background: color-mix(in srgb, var(--accent) 17%, transparent);
	}

	.board-hint {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.board-meter {
		height: 6px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--line) 66%, transparent);
		overflow: hidden;
	}

	.board-meter > div {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 45%, white));
		transition: width 0.2s ease;
	}

	.players-page {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.55rem;
	}

	.players-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.72rem;
	}

	.players-header-copy {
		display: grid;
		gap: 0.08rem;
	}

	.players-count {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.players-scroll {
		display: grid;
		align-content: start;
		gap: 0.54rem;
		overflow: auto;
		padding-right: 0.12rem;
	}

	.player-card {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.42rem;
		padding: 0.58rem;
		border-radius: 18px;
		border: 1px solid color-mix(in srgb, var(--player-color) 34%, var(--line));
		background: color-mix(in srgb, var(--player-color) 10%, var(--surface-quiet));
	}

	.player-top {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.42rem;
		align-items: center;
	}

	.player-name,
	.server-url {
		width: 100%;
		min-height: 38px;
		padding: 0.44rem 0.66rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--line) 85%, transparent);
		background: color-mix(in srgb, var(--surface) 90%, transparent);
		font-size: 0.9rem;
		font-weight: 500;
	}

	.remove-btn {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 1px solid color-mix(in srgb, var(--line) 76%, transparent);
		background: color-mix(in srgb, var(--surface) 90%, transparent);
		color: var(--text-muted);
		cursor: pointer;
	}

	.player-section {
		display: grid;
		gap: 0.26rem;
	}

	.player-label {
		margin: 0;
		font-size: 0.72rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-muted);
		font-weight: 700;
	}

	.color-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.38rem;
	}

	.color-chip {
		display: inline-grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 999px;
		border: 2px solid color-mix(in srgb, var(--line) 72%, transparent);
		background: var(--chip-color);
		cursor: pointer;
		transition:
			transform 0.14s ease,
			border-color 0.14s ease;
	}

	.color-chip.selected {
		transform: scale(1.05);
		outline: 2px solid color-mix(in srgb, var(--chip-color) 38%, white);
		outline-offset: 1px;
	}

	.color-chip:disabled {
		opacity: 0.32;
		cursor: not-allowed;
	}

	.type-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.28rem;
		padding: 0.2rem;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
		background: color-mix(in srgb, var(--surface) 95%, transparent);
	}

	.bot-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.32rem;
	}

	.type-btn,
	.bot-pill {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 0.22rem;
		min-height: 34px;
		padding: 0.26rem 0.46rem;
		font-size: 0.78rem;
		font-weight: 600;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
		background: color-mix(in srgb, var(--surface) 92%, transparent);
		cursor: pointer;
	}

	.type-btn {
		min-width: 0;
	}

	.bot-pill {
		flex: 1 1 94px;
	}

	.type-btn.active,
	.bot-pill.active {
		border-color: color-mix(in srgb, var(--player-color) 62%, transparent);
		background: color-mix(in srgb, var(--player-color) 24%, var(--surface));
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
		padding: 0.44rem 0.62rem;
		border-radius: 10px;
		border: 1px dashed color-mix(in srgb, var(--line) 80%, transparent);
		background: color-mix(in srgb, var(--surface) 94%, transparent);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.server-chevron {
		font-size: 0.86rem;
	}

	.server-body {
		padding: 0.45rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
		background: color-mix(in srgb, var(--surface) 95%, transparent);
	}

	.setup-footer {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.6rem;
		align-items: center;
		padding: 0.38rem 0.82rem 0.58rem;
		border-top: 1px solid color-mix(in srgb, var(--line) 62%, transparent);
	}

	.pager-actions {
		display: flex;
		gap: 0.46rem;
	}

	.step-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.34rem;
		min-height: 42px;
		padding: 0.44rem 0.96rem;
		border-radius: 999px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		background: transparent;
	}

	.step-btn.text {
		color: var(--text-muted);
	}

	.step-btn.outlined {
		border-color: color-mix(in srgb, var(--line) 78%, transparent);
		background: color-mix(in srgb, var(--surface) 94%, transparent);
	}

	.step-btn.filled {
		background: var(--accent-soft);
		color: var(--accent);
	}

	.start-btn {
		min-width: 152px;
	}

	.step-btn:disabled {
		opacity: 0.42;
		cursor: not-allowed;
	}

	.add-btn {
		padding-inline: 0.78rem;
		min-height: 38px;
		font-size: 0.8rem;
	}

	.setup-nav {
		border-top: 1px solid color-mix(in srgb, var(--line) 62%, transparent);
		padding-bottom: env(safe-area-inset-bottom);
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

	@media (max-width: 560px) {
		.setup-footer {
			grid-template-columns: 1fr;
		}

		.pager-actions {
			justify-content: space-between;
		}

		.start-btn {
			width: 100%;
		}

		.step-btn {
			font-size: 0.84rem;
		}
	}

	@media (min-width: 760px) {
		.player-card {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: 0.5rem 0.56rem;
		}

		.player-top,
		.bot-row,
		.server-url,
		.server-settings {
			grid-column: 1 / -1;
		}
	}

	@media (min-width: 900px) {
		.quick-page {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.quick-option {
			min-height: 180px;
		}
	}
</style>

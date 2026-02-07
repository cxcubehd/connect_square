<script lang="ts">
	import type { PlayerConfig } from '$lib/game/types.js';
	import {
		PLAYER_COLORS,
		MIN_BOARD_SIZE,
		MAX_BOARD_SIZE,
		DEFAULT_BOARD_SIZE
	} from '$lib/game/colors.js';
	import { getAvailableBots } from '$lib/game/bot.js';
	import { fetchServerBotParams, type ServerParamDescriptor } from '$lib/game/server-bot.js';

	let { onstart }: { onstart: (boardSize: number, players: PlayerConfig[]) => void } = $props();

	let boardSize = $state(DEFAULT_BOARD_SIZE);
	let playerConfigs: PlayerConfig[] = $state([
		{ name: 'Player 1', color: PLAYER_COLORS[0].hex, type: 'human', botStrategyId: null },
		{ name: 'Player 2', color: PLAYER_COLORS[1].hex, type: 'human', botStrategyId: null }
	]);

	const bots = getAvailableBots();
	const usedColors = $derived(playerConfigs.map((p) => p.color));

	let serverParamsCache: Map<string, ServerParamDescriptor[]> = $state(new Map());
	let fetchingParams: Map<number, boolean> = $state(new Map());
	let showServerConfig: Map<number, boolean> = $state(new Map());
	let jsonEditMode: Map<number, boolean> = $state(new Map());
	let jsonEditValue: Map<number, string> = $state(new Map());
	let jsonEditError: Map<number, string> = $state(new Map());

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
		playerConfigs[index] = {
			...playerConfigs[index],
			type,
			botStrategyId: type === 'bot' ? (bots.at(-1)?.id ?? 'random') : null,
			serverUrl: type === 'server' ? (playerConfigs[index].serverUrl ?? 'http://localhost:3001') : undefined,
			serverBotParams: type === 'server' ? playerConfigs[index].serverBotParams : undefined
		};
		playerConfigs = [...playerConfigs];
	}

	async function fetchParams(index: number) {
		const url = playerConfigs[index].serverUrl ?? 'http://localhost:3001';
		if (fetchingParams.get(index)) return;

		fetchingParams.set(index, true);
		fetchingParams = new Map(fetchingParams);

		const params = await fetchServerBotParams(url);
		if (params) {
			serverParamsCache.set(url, params);
			serverParamsCache = new Map(serverParamsCache);

			if (!playerConfigs[index].serverBotParams) {
				const defaults: Record<string, unknown> = {};
				for (const p of params) {
					defaults[p.name] = p.default_value;
				}
				playerConfigs[index] = { ...playerConfigs[index], serverBotParams: defaults };
				playerConfigs = [...playerConfigs];
			}
		}

		fetchingParams.set(index, false);
		fetchingParams = new Map(fetchingParams);
	}

	function updateParam(index: number, paramName: string, value: unknown) {
		const current = playerConfigs[index].serverBotParams ?? {};
		playerConfigs[index] = {
			...playerConfigs[index],
			serverBotParams: { ...current, [paramName]: value }
		};
		playerConfigs = [...playerConfigs];
	}

	function toggleJsonEdit(index: number) {
		const isJson = jsonEditMode.get(index) ?? false;
		if (!isJson) {
			jsonEditValue.set(index, JSON.stringify(playerConfigs[index].serverBotParams ?? {}, null, 2));
			jsonEditError.set(index, '');
		}
		jsonEditMode.set(index, !isJson);
		jsonEditMode = new Map(jsonEditMode);
	}

	function applyJson(index: number) {
		try {
			const parsed = JSON.parse(jsonEditValue.get(index) ?? '{}');
			playerConfigs[index] = { ...playerConfigs[index], serverBotParams: parsed };
			playerConfigs = [...playerConfigs];
			jsonEditError.set(index, '');
			jsonEditMode.set(index, false);
			jsonEditMode = new Map(jsonEditMode);
		} catch (e) {
			jsonEditError.set(index, 'Invalid JSON');
			jsonEditError = new Map(jsonEditError);
		}
	}

	function handleStart() {
		onstart(boardSize, playerConfigs);
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
		onstart(boardSize, configs);
	}
</script>

<div class="setup-panel">
	<h1 class="game-title">Connect, Square!</h1>
	<p class="game-subtitle">A Game of Territory and Connections</p>

	<div class="quick-start">
		<h3>Quick Start</h3>
		<div class="quick-buttons">
			<button class="quick-btn" onclick={() => quickStart('pvp')}>
				<span class="quick-icon">👤 vs 👤</span>
				<span class="quick-label">Player vs Player</span>
			</button>
			<button class="quick-btn" onclick={() => quickStart('pvb')}>
				<span class="quick-icon">👤 vs 🤖</span>
				<span class="quick-label">Player vs Bot</span>
			</button>
			<button class="quick-btn" onclick={() => quickStart('bvb')}>
				<span class="quick-icon">🤖 vs 🤖</span>
				<span class="quick-label">Bot vs Bot</span>
			</button>
		</div>
	</div>

	<div class="divider">
		<span>or customize</span>
	</div>

	<div class="config-section">
		<label class="config-label">
			Board Size: {boardSize} x {boardSize}
			<input
				type="range"
				min={MIN_BOARD_SIZE}
				max={MAX_BOARD_SIZE}
				bind:value={boardSize}
				class="board-slider"
			/>
			<span class="size-hint"
				>{boardSize * boardSize} squares, {(boardSize + 1) * (boardSize + 1)} points</span
			>
		</label>
	</div>

	<div class="config-section">
		<div class="players-header">
			<h3>Players</h3>
			{#if playerConfigs.length < 4}
				<button class="add-player-btn" onclick={addPlayer}>+ Add Player</button>
			{/if}
		</div>

		{#each playerConfigs as config, i (i)}
			<div class="player-config">
				<div class="player-config-main">
					<input
						type="text"
						bind:value={config.name}
						class="player-name-input"
						placeholder="Name"
					/>
					<select
						class="color-select"
						style:background-color={config.color}
						style:color="white"
						value={config.color}
						onchange={(e) => {
							config.color = (e.target as HTMLSelectElement).value;
							playerConfigs = [...playerConfigs];
						}}
					>
						{#each PLAYER_COLORS as color}
							<option value={color.hex} style:background-color={color.hex}>
								{color.name}
							</option>
						{/each}
					</select>
				</div>
				<div class="player-config-type">
					<button
						class="type-btn"
						class:active={config.type === 'human'}
						onclick={() => setPlayerType(i, 'human')}
					>
						Human
					</button>
					<button
						class="type-btn"
						class:active={config.type === 'bot'}
						onclick={() => setPlayerType(i, 'bot')}
					>
						Bot
					</button>
					<button
						class="type-btn"
						class:active={config.type === 'server'}
						onclick={() => setPlayerType(i, 'server')}
					>
						Server
					</button>
					{#if config.type === 'bot'}
						<select
							class="bot-select"
							value={config.botStrategyId}
							onchange={(e) => {
								config.botStrategyId = (e.target as HTMLSelectElement).value;
								playerConfigs = [...playerConfigs];
							}}
						>
							{#each bots as bot}
								<option value={bot.id}>{bot.name}</option>
							{/each}
						</select>
					{/if}
					{#if config.type === 'server'}
						<input
							type="text"
							class="server-url-input"
							placeholder="http://localhost:3001"
							value={config.serverUrl ?? 'http://localhost:3001'}
							onchange={(e) => {
								config.serverUrl = (e.target as HTMLInputElement).value;
								playerConfigs = [...playerConfigs];
							}}
						/>
					{/if}
					{#if playerConfigs.length > 2}
						<button class="remove-btn" onclick={() => removePlayer(i)} aria-label="Remove player">
							&times;
						</button>
					{/if}
				</div>
				{#if config.type === 'server'}
					<div class="server-config">
						<div class="server-config-header">
							<button
								class="server-config-toggle"
								onclick={() => {
									showServerConfig.set(i, !(showServerConfig.get(i) ?? false));
									showServerConfig = new Map(showServerConfig);
								}}
							>
								<span class="server-config-label">Bot Settings</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="12"
									height="12"
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
						</div>
						{#if showServerConfig.get(i)}
							<div class="server-config-body">
								<div class="server-config-actions">
									<button
										class="fetch-params-btn"
										onclick={() => fetchParams(i)}
										disabled={fetchingParams.get(i)}
									>
										{fetchingParams.get(i) ? 'Fetching...' : 'Fetch from Server'}
									</button>
									<button
										class="json-toggle-btn"
										class:active={jsonEditMode.get(i)}
										onclick={() => toggleJsonEdit(i)}
									>
										JSON
									</button>
								</div>
								{#if jsonEditMode.get(i)}
									<div class="json-edit">
										<textarea
											class="json-textarea"
											value={jsonEditValue.get(i) ?? '{}'}
											oninput={(e) => {
												jsonEditValue.set(i, (e.target as HTMLTextAreaElement).value);
												jsonEditValue = new Map(jsonEditValue);
											}}
											rows="6"
										></textarea>
										{#if jsonEditError.get(i)}
											<span class="json-error">{jsonEditError.get(i)}</span>
										{/if}
										<button class="apply-json-btn" onclick={() => applyJson(i)}>Apply</button>
									</div>
								{:else}
									{@const url = config.serverUrl ?? 'http://localhost:3001'}
									{@const descriptors = serverParamsCache.get(url)}
									{#if descriptors}
										<div class="param-list">
											{#each descriptors as param}
												<div class="param-row">
													<span class="param-label" title={param.description}>
														{param.label}
													</span>
													{#if param.param_type === 'integer' || param.param_type === 'number'}
														<input
															type="number"
															class="param-input"
															value={(config.serverBotParams?.[param.name] ?? param.default_value) as number}
															min={param.min as number | undefined}
															max={param.max as number | undefined}
															onchange={(e) => updateParam(i, param.name, Number((e.target as HTMLInputElement).value))}
														/>
													{:else if param.param_type === 'boolean'}
														<input
															type="checkbox"
															class="param-checkbox"
															checked={(config.serverBotParams?.[param.name] ?? param.default_value) as boolean}
															onchange={(e) => updateParam(i, param.name, (e.target as HTMLInputElement).checked)}
														/>
													{:else}
														<input
															type="text"
															class="param-input"
															value={String(config.serverBotParams?.[param.name] ?? param.default_value ?? '')}
															onchange={(e) => updateParam(i, param.name, (e.target as HTMLInputElement).value)}
														/>
													{/if}
												</div>
											{/each}
										</div>
									{:else if config.serverBotParams && Object.keys(config.serverBotParams).length > 0}
										<div class="param-summary">
											<span class="param-summary-text">{Object.keys(config.serverBotParams).length} params configured</span>
										</div>
									{:else}
										<p class="no-params-hint">Fetch params from server or use JSON to configure</p>
									{/if}
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<button class="start-btn" onclick={handleStart}>Start Game</button>
</div>

<style>
	.setup-panel {
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
		padding: 1.25rem 1rem;
		background: var(--panel-bg);
		border-radius: 12px;
		border: 1px solid var(--border-color);
	}

	.game-title {
		font-size: 1.75rem;
		font-weight: 800;
		text-align: center;
		color: var(--text-primary);
		margin: 0 0 0.2rem;
		letter-spacing: -0.02em;
	}

	.game-subtitle {
		text-align: center;
		color: var(--text-muted);
		margin: 0 0 1.25rem;
		font-size: 0.85rem;
		font-style: italic;
	}

	.quick-start h3 {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.6rem;
	}

	.quick-buttons {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}

	.quick-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.75rem 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 10px;
		background: var(--surface-bg);
		cursor: pointer;
		transition: all 0.15s ease;
		-webkit-tap-highlight-color: transparent;
		min-height: 44px;
	}

	.quick-btn:hover {
		border-color: var(--accent-color);
		background: var(--hover-bg);
	}

	.quick-btn:active {
		transform: scale(0.97);
		background: var(--hover-bg);
	}

	.quick-icon {
		font-size: 1.25rem;
	}

	.quick-label {
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--text-muted);
		text-align: center;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 1.25rem 0;
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border-color);
	}

	.config-section {
		margin-bottom: 1rem;
	}

	.config-label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-weight: 500;
		color: var(--text-primary);
		font-size: 0.9rem;
	}

	.board-slider {
		width: 100%;
		height: 32px;
		accent-color: var(--accent-color);
	}

	.size-hint {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-weight: 400;
	}

	.players-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.6rem;
	}

	.players-header h3 {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.add-player-btn {
		font-size: 0.75rem;
		padding: 0.35rem 0.75rem;
		border-radius: 6px;
		border: 1px dashed var(--border-color);
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
		-webkit-tap-highlight-color: transparent;
		min-height: 36px;
	}

	.add-player-btn:hover {
		border-color: var(--accent-color);
		color: var(--accent-color);
	}

	.player-config {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.65rem;
		border: 1px solid var(--border-color);
		border-radius: 10px;
		margin-bottom: 0.5rem;
		background: var(--surface-bg);
	}

	.player-config-main {
		display: flex;
		gap: 0.5rem;
	}

	.player-name-input {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 16px;
	}

	.player-name-input:focus {
		outline: 2px solid var(--accent-color);
		outline-offset: -1px;
	}

	.color-select {
		width: 90px;
		padding: 0.5rem 0.4rem;
		border: none;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		min-height: 44px;
	}

	.player-config-type {
		display: flex;
		gap: 0.4rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.type-btn {
		padding: 0.4rem 0.65rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: transparent;
		color: var(--text-muted);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		-webkit-tap-highlight-color: transparent;
		min-height: 36px;
	}

	.type-btn.active {
		background: var(--accent-color);
		border-color: var(--accent-color);
		color: white;
	}

	.bot-select {
		flex: 1;
		min-width: 0;
		padding: 0.4rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.75rem;
		min-height: 36px;
	}

	.server-url-input {
		flex: 1;
		min-width: 0;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.75rem;
		min-height: 36px;
	}

	.server-url-input:focus {
		outline: 2px solid var(--accent-color);
		outline-offset: -1px;
	}

	.server-config {
		border-top: 1px solid var(--border-color);
		padding-top: 0.4rem;
	}

	.server-config-header {
		display: flex;
	}

	.server-config-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.2rem 0;
		border: none;
		background: transparent;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.server-config-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.chevron {
		color: var(--text-muted);
		transition: transform 0.2s ease;
	}

	.chevron.expanded {
		transform: rotate(180deg);
	}

	.server-config-body {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: 0.3rem;
	}

	.server-config-actions {
		display: flex;
		gap: 0.35rem;
	}

	.fetch-params-btn {
		flex: 1;
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--surface-bg);
		color: var(--text-primary);
		font-size: 0.7rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		min-height: 32px;
	}

	.fetch-params-btn:hover:not(:disabled) {
		border-color: var(--accent-color);
		color: var(--accent-color);
	}

	.fetch-params-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.json-toggle-btn {
		padding: 0.35rem 0.6rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: transparent;
		color: var(--text-muted);
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		min-height: 32px;
		font-family: monospace;
	}

	.json-toggle-btn.active {
		background: var(--accent-color);
		border-color: var(--accent-color);
		color: white;
	}

	.json-edit {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.json-textarea {
		width: 100%;
		padding: 0.4rem;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.7rem;
		font-family: monospace;
		resize: vertical;
		min-height: 80px;
		box-sizing: border-box;
	}

	.json-textarea:focus {
		outline: 2px solid var(--accent-color);
		outline-offset: -1px;
	}

	.json-error {
		font-size: 0.7rem;
		color: #e74c3c;
		font-weight: 500;
	}

	.apply-json-btn {
		align-self: flex-end;
		padding: 0.3rem 0.75rem;
		border: 1px solid var(--accent-color);
		border-radius: 6px;
		background: var(--accent-color);
		color: white;
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
		min-height: 28px;
	}

	.param-list {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.param-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.param-label {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-weight: 500;
		cursor: help;
		flex-shrink: 0;
	}

	.param-input {
		width: 80px;
		padding: 0.25rem 0.35rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.7rem;
		text-align: right;
		min-height: 28px;
	}

	.param-input:focus {
		outline: 2px solid var(--accent-color);
		outline-offset: -1px;
	}

	.param-checkbox {
		width: 16px;
		height: 16px;
		accent-color: var(--accent-color);
	}

	.param-summary {
		padding: 0.25rem 0;
	}

	.param-summary-text {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.no-params-hint {
		font-size: 0.7rem;
		color: var(--text-muted);
		margin: 0;
		font-style: italic;
	}

	.remove-btn {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		border: 1px solid var(--border-color);
		background: transparent;
		color: var(--text-muted);
		font-size: 1.1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;
	}

	.remove-btn:hover {
		background: #e74c3c;
		border-color: #e74c3c;
		color: white;
	}

	.start-btn {
		width: 100%;
		padding: 0.85rem;
		border: none;
		border-radius: 10px;
		background: var(--accent-color);
		color: white;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
		letter-spacing: 0.02em;
		-webkit-tap-highlight-color: transparent;
		min-height: 48px;
	}

	.start-btn:hover {
		filter: brightness(1.1);
	}

	.start-btn:active {
		transform: scale(0.98);
	}

	@media (min-width: 640px) {
		.setup-panel {
			padding: 2rem;
			border-radius: 16px;
		}

		.game-title {
			font-size: 2rem;
		}

		.game-subtitle {
			margin-bottom: 1.5rem;
			font-size: 0.9rem;
		}

		.quick-btn:hover {
			transform: translateY(-1px);
		}

		.quick-btn:active {
			transform: translateY(0);
		}

		.start-btn:hover {
			transform: translateY(-1px);
		}

		.start-btn:active {
			transform: translateY(0);
		}
	}
</style>

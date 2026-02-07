<script lang="ts">
	import { type GameState } from '$lib/game/state.svelte.js';
	import { getAvailableBots } from '$lib/game/bot.js';
	import { fetchServerBotParams, type ServerParamDescriptor } from '$lib/game/server-bot.js';

	let { game }: { game: GameState } = $props();

	const bots = getAvailableBots();

	let showBotAssign = $state(false);
	let serverParamsCache: Map<string, ServerParamDescriptor[]> = $state(new Map());
	let fetchingParams: Map<number, boolean> = $state(new Map());
	let showServerConfig: Map<number, boolean> = $state(new Map());
	let jsonEditMode: Map<number, boolean> = $state(new Map());
	let jsonEditValue: Map<number, string> = $state(new Map());
	let jsonEditError: Map<number, string> = $state(new Map());

	async function fetchParamsForPlayer(playerIndex: number) {
		const player = game.players[playerIndex];
		const url = player.serverUrl ?? 'http://localhost:3001';
		if (fetchingParams.get(playerIndex)) return;

		fetchingParams.set(playerIndex, true);
		fetchingParams = new Map(fetchingParams);

		const params = await fetchServerBotParams(url);
		if (params) {
			serverParamsCache.set(url, params);
			serverParamsCache = new Map(serverParamsCache);

			if (!player.serverBotParams) {
				const defaults: Record<string, unknown> = {};
				for (const p of params) {
					defaults[p.name] = p.default_value;
				}
				game.assignBot(playerIndex, 'server', player.serverUrl, defaults);
			}
		}

		fetchingParams.set(playerIndex, false);
		fetchingParams = new Map(fetchingParams);
	}

	function updatePlayerParam(playerIndex: number, paramName: string, value: unknown) {
		const player = game.players[playerIndex];
		const current = player.serverBotParams ?? {};
		game.assignBot(playerIndex, 'server', player.serverUrl, { ...current, [paramName]: value });
	}

	function toggleJsonEditForPlayer(playerIndex: number) {
		const isJson = jsonEditMode.get(playerIndex) ?? false;
		if (!isJson) {
			const player = game.players[playerIndex];
			jsonEditValue.set(playerIndex, JSON.stringify(player.serverBotParams ?? {}, null, 2));
			jsonEditError.set(playerIndex, '');
		}
		jsonEditMode.set(playerIndex, !isJson);
		jsonEditMode = new Map(jsonEditMode);
	}

	function applyJsonForPlayer(playerIndex: number) {
		try {
			const parsed = JSON.parse(jsonEditValue.get(playerIndex) ?? '{}');
			const player = game.players[playerIndex];
			game.assignBot(playerIndex, 'server', player.serverUrl, parsed);
			jsonEditError.set(playerIndex, '');
			jsonEditMode.set(playerIndex, false);
			jsonEditMode = new Map(jsonEditMode);
		} catch {
			jsonEditError.set(playerIndex, 'Invalid JSON');
			jsonEditError = new Map(jsonEditError);
		}
	}
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
								<div class="server-inline-actions">
									<button
										class="fetch-params-btn"
										onclick={() => fetchParamsForPlayer(i)}
										disabled={fetchingParams.get(i)}
									>
										{fetchingParams.get(i) ? 'Fetching...' : 'Fetch Params'}
									</button>
									<button
										class="json-toggle-btn"
										class:active={jsonEditMode.get(i)}
										onclick={() => toggleJsonEditForPlayer(i)}
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
											rows="5"
										></textarea>
										{#if jsonEditError.get(i)}
											<span class="json-error">{jsonEditError.get(i)}</span>
										{/if}
										<button class="apply-json-btn" onclick={() => applyJsonForPlayer(i)}>Apply</button>
									</div>
								{:else}
									{@const url = player.serverUrl ?? 'http://localhost:3001'}
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
															value={(player.serverBotParams?.[param.name] ?? param.default_value) as number}
															min={param.min as number | undefined}
															max={param.max as number | undefined}
															onchange={(e) => updatePlayerParam(i, param.name, Number((e.target as HTMLInputElement).value))}
														/>
													{:else if param.param_type === 'boolean'}
														<input
															type="checkbox"
															class="param-checkbox"
															checked={(player.serverBotParams?.[param.name] ?? param.default_value) as boolean}
															onchange={(e) => updatePlayerParam(i, param.name, (e.target as HTMLInputElement).checked)}
														/>
													{:else}
														<input
															type="text"
															class="param-input"
															value={String(player.serverBotParams?.[param.name] ?? param.default_value ?? '')}
															onchange={(e) => updatePlayerParam(i, param.name, (e.target as HTMLInputElement).value)}
														/>
													{/if}
												</div>
											{/each}
										</div>
									{:else if player.serverBotParams && Object.keys(player.serverBotParams).length > 0}
										<span class="param-summary-text">{Object.keys(player.serverBotParams).length} params configured</span>
									{/if}
								{/if}
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

	.server-inline-actions {
		display: flex;
		gap: 0.3rem;
	}

	.fetch-params-btn {
		flex: 1;
		padding: 0.3rem 0.4rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		background: var(--surface-bg);
		color: var(--text-primary);
		font-size: 0.65rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		min-height: 28px;
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
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		background: transparent;
		color: var(--text-muted);
		font-size: 0.65rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		min-height: 28px;
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
		gap: 0.25rem;
	}

	.json-textarea {
		width: 100%;
		padding: 0.35rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.65rem;
		font-family: monospace;
		resize: vertical;
		min-height: 60px;
		box-sizing: border-box;
	}

	.json-textarea:focus {
		outline: 2px solid var(--accent-color);
		outline-offset: -1px;
	}

	.json-error {
		font-size: 0.65rem;
		color: #e74c3c;
		font-weight: 500;
	}

	.apply-json-btn {
		align-self: flex-end;
		padding: 0.25rem 0.6rem;
		border: 1px solid var(--accent-color);
		border-radius: 4px;
		background: var(--accent-color);
		color: white;
		font-size: 0.65rem;
		font-weight: 600;
		cursor: pointer;
		min-height: 24px;
	}

	.param-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.param-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
	}

	.param-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		font-weight: 500;
		cursor: help;
		flex-shrink: 0;
	}

	.param-input {
		width: 70px;
		padding: 0.2rem 0.3rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.65rem;
		text-align: right;
		min-height: 24px;
	}

	.param-input:focus {
		outline: 2px solid var(--accent-color);
		outline-offset: -1px;
	}

	.param-checkbox {
		width: 14px;
		height: 14px;
		accent-color: var(--accent-color);
	}

	.param-summary-text {
		font-size: 0.65rem;
		color: var(--text-muted);
		font-style: italic;
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

<script lang="ts">
	import { fetchServerBotParams, type ServerParamDescriptor } from '$lib/game/server-bot.js';

	let {
		serverUrl,
		botParams,
		onParamsChange,
		compact = false
	}: {
		serverUrl: string;
		botParams: Record<string, unknown> | undefined;
		onParamsChange: (params: Record<string, unknown>) => void;
		compact?: boolean;
	} = $props();

	let descriptors: ServerParamDescriptor[] | null = $state(null);
	let fetching = $state(false);
	let jsonMode = $state(false);
	let jsonText = $state('{}');
	let jsonError = $state('');

	async function fetchParams() {
		if (fetching) return;
		fetching = true;

		const params = await fetchServerBotParams(serverUrl);
		if (params) {
			descriptors = params;
			if (!botParams) {
				const defaults: Record<string, unknown> = {};
				for (const p of params) {
					defaults[p.name] = p.default_value;
				}
				onParamsChange(defaults);
			}
		}

		fetching = false;
	}

	function updateParam(name: string, value: unknown) {
		onParamsChange({ ...(botParams ?? {}), [name]: value });
	}

	function toggleJsonMode() {
		if (!jsonMode) {
			jsonText = JSON.stringify(botParams ?? {}, null, 2);
			jsonError = '';
		}
		jsonMode = !jsonMode;
	}

	function applyJson() {
		try {
			const parsed = JSON.parse(jsonText);
			onParamsChange(parsed);
			jsonError = '';
			jsonMode = false;
		} catch {
			jsonError = 'Invalid JSON';
		}
	}
</script>

<div class="server-bot-config" class:compact>
	<div class="actions">
		<button class="fetch-btn" onclick={fetchParams} disabled={fetching}>
			{fetching ? 'Fetching...' : 'Fetch from Server'}
		</button>
		<button class="json-btn" class:active={jsonMode} onclick={toggleJsonMode}>
			JSON
		</button>
	</div>

	{#if jsonMode}
		<div class="json-edit">
			<textarea
				class="json-textarea"
				value={jsonText}
				oninput={(e) => (jsonText = (e.target as HTMLTextAreaElement).value)}
				rows={compact ? 5 : 6}
			></textarea>
			{#if jsonError}
				<span class="json-error">{jsonError}</span>
			{/if}
			<button class="apply-btn" onclick={applyJson}>Apply</button>
		</div>
	{:else if descriptors}
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
							value={(botParams?.[param.name] ?? param.default_value) as number}
							min={param.min as number | undefined}
							max={param.max as number | undefined}
							onchange={(e) =>
								updateParam(param.name, Number((e.target as HTMLInputElement).value))}
						/>
					{:else if param.param_type === 'boolean'}
						<input
							type="checkbox"
							class="param-checkbox"
							checked={(botParams?.[param.name] ?? param.default_value) as boolean}
							onchange={(e) =>
								updateParam(param.name, (e.target as HTMLInputElement).checked)}
						/>
					{:else}
						<input
							type="text"
							class="param-input"
							value={String(botParams?.[param.name] ?? param.default_value ?? '')}
							onchange={(e) =>
								updateParam(param.name, (e.target as HTMLInputElement).value)}
						/>
					{/if}
				</div>
			{/each}
		</div>
	{:else if botParams && Object.keys(botParams).length > 0}
		<span class="param-summary">{Object.keys(botParams).length} params configured</span>
	{:else}
		<p class="no-params-hint">Fetch params from server or use JSON to configure</p>
	{/if}
</div>

<style>
	.server-bot-config {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.actions {
		display: flex;
		gap: 0.35rem;
	}

	.fetch-btn {
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

	.compact .fetch-btn {
		padding: 0.3rem 0.4rem;
		border-radius: 4px;
		font-size: 0.65rem;
		min-height: 28px;
	}

	.fetch-btn:hover:not(:disabled) {
		border-color: var(--accent-color);
		color: var(--accent-color);
	}

	.fetch-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.json-btn {
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

	.compact .json-btn {
		padding: 0.3rem 0.5rem;
		border-radius: 4px;
		font-size: 0.65rem;
		min-height: 28px;
	}

	.json-btn.active {
		background: var(--accent-color);
		border-color: var(--accent-color);
		color: white;
	}

	.json-edit {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.compact .json-edit {
		gap: 0.25rem;
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

	.compact .json-textarea {
		padding: 0.35rem;
		border-radius: 4px;
		font-size: 0.65rem;
		min-height: 60px;
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

	.compact .json-error {
		font-size: 0.65rem;
	}

	.apply-btn {
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

	.compact .apply-btn {
		padding: 0.25rem 0.6rem;
		border-radius: 4px;
		font-size: 0.65rem;
		min-height: 24px;
	}

	.param-list {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.compact .param-list {
		gap: 0.25rem;
	}

	.param-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.compact .param-row {
		gap: 0.4rem;
	}

	.param-label {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-weight: 500;
		cursor: help;
		flex-shrink: 0;
	}

	.compact .param-label {
		font-size: 0.65rem;
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

	.compact .param-input {
		width: 70px;
		padding: 0.2rem 0.3rem;
		font-size: 0.65rem;
		min-height: 24px;
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

	.compact .param-checkbox {
		width: 14px;
		height: 14px;
	}

	.param-summary {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.compact .param-summary {
		font-size: 0.65rem;
	}

	.no-params-hint {
		font-size: 0.7rem;
		color: var(--text-muted);
		margin: 0;
		font-style: italic;
	}
</style>

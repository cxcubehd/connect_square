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
		<button class="json-btn" class:active={jsonMode} onclick={toggleJsonMode}>JSON</button>
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
					<span class="param-label" title={param.description}>{param.label}</span>
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
							onchange={(e) => updateParam(param.name, (e.target as HTMLInputElement).checked)}
						/>
					{:else}
						<input
							type="text"
							class="param-input"
							value={String(botParams?.[param.name] ?? param.default_value ?? '')}
							onchange={(e) => updateParam(param.name, (e.target as HTMLInputElement).value)}
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
		display: grid;
		gap: 0.4rem;
	}

	.actions {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.34rem;
	}

	.fetch-btn,
	.json-btn,
	.apply-btn {
		border-radius: 0.62rem;
		font-size: 0.72rem;
		font-weight: 800;
		cursor: pointer;
	}

	.fetch-btn {
		padding: 0.34rem 0.52rem;
		border: 1px solid color-mix(in srgb, var(--line) 85%, transparent);
		background: var(--surface-quiet);
	}

	.fetch-btn:disabled {
		opacity: 0.52;
		cursor: not-allowed;
	}

	.json-btn {
		padding: 0.34rem 0.6rem;
		border: 1px solid color-mix(in srgb, var(--line) 85%, transparent);
		background: var(--surface-quiet);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		color: var(--text-muted);
	}

	.json-btn.active {
		border-color: color-mix(in srgb, var(--accent) 56%, transparent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 13%, var(--surface));
	}

	.json-edit {
		display: grid;
		gap: 0.28rem;
	}

	.json-textarea {
		width: 100%;
		padding: 0.44rem;
		border: 1px solid color-mix(in srgb, var(--line) 85%, transparent);
		border-radius: 0.64rem;
		background: var(--input-bg);
		font-size: 0.72rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		min-height: 80px;
	}

	.json-error {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--danger);
	}

	.apply-btn {
		justify-self: end;
		padding: 0.28rem 0.68rem;
		border: 1px solid color-mix(in srgb, var(--accent) 56%, transparent);
		background: color-mix(in srgb, var(--accent) 14%, var(--surface));
		color: var(--accent);
	}

	.param-list {
		display: grid;
		gap: 0.3rem;
	}

	.param-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.45rem;
		padding: 0.32rem 0.42rem;
		border-radius: 0.6rem;
		background: color-mix(in srgb, var(--surface-quiet) 96%, transparent);
		border: 1px solid color-mix(in srgb, var(--line) 84%, transparent);
	}

	.param-label {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.param-input {
		width: 82px;
		padding: 0.25rem 0.35rem;
		min-height: 28px;
		text-align: right;
		font-size: 0.72rem;
		font-weight: 700;
		border-radius: 0.5rem;
		border: 1px solid color-mix(in srgb, var(--line) 86%, transparent);
		background: var(--input-bg);
	}

	.param-checkbox {
		width: 16px;
		height: 16px;
		accent-color: var(--accent);
	}

	.param-summary,
	.no-params-hint {
		margin: 0;
		font-size: 0.7rem;
		font-weight: 700;
		font-style: italic;
		color: var(--text-muted);
	}

	.server-bot-config.compact {
		gap: 0.3rem;
	}

	.compact .fetch-btn,
	.compact .json-btn,
	.compact .apply-btn {
		font-size: 0.64rem;
		min-height: 26px;
		padding-block: 0.24rem;
	}

	.compact .param-label,
	.compact .param-input,
	.compact .json-textarea,
	.compact .param-summary,
	.compact .no-params-hint {
		font-size: 0.64rem;
	}

	.compact .param-input {
		width: 68px;
		min-height: 24px;
	}

	.compact .param-checkbox {
		width: 14px;
		height: 14px;
	}
</style>

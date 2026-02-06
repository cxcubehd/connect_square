<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { type GameState } from '$lib/game/state.svelte.js';
	import {
		pointKey,
		lineKey,
		parseLineKey,
		getValidMoves,
		isDiagonal,
		isValidMove
	} from '$lib/game/logic.js';
	import type { Point } from '$lib/game/types.js';

	let { game }: { game: GameState } = $props();

	const padding = 40;
	const cellSize = 60;

	let svgWidth = $derived(game.boardSize * cellSize + padding * 2);
	let svgHeight = $derived(game.boardSize * cellSize + padding * 2);

	function dotX(col: number): number {
		return padding + col * cellSize;
	}

	function dotY(row: number): number {
		return padding + row * cellSize;
	}

	function jitter(a: number, b: number, scale = 1.2): number {
		let h = a * 374761393 + b * 668265263;
		h = (h ^ (h >> 13)) * 1274126177;
		h = h ^ (h >> 16);
		return ((h & 0xffff) / 0xffff - 0.5) * scale;
	}

	function penPath(x1: number, y1: number, x2: number, y2: number): string {
		const mx = (x1 + x2) / 2;
		const my = (y1 + y2) / 2;
		const dx = -(y2 - y1);
		const dy = x2 - x1;
		const len = Math.sqrt(dx * dx + dy * dy) || 1;
		const offset = jitter(Math.round(x1 * 100 + x2), Math.round(y1 * 100 + y2), 2);
		const cx = mx + (dx / len) * offset;
		const cy = my + (dy / len) * offset;
		return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
	}

	let currentPlayerPoints = $derived.by(() => {
		const player = game.currentPlayer;
		if (!player) return new Set<string>();
		return game.markedPoints.get(player.id) ?? new Set<string>();
	});

	let validMoves = $derived.by(() => {
		if (game.phase !== 'playing' || game.editMode) return [];
		const player = game.currentPlayer;
		if (!player || player.type !== 'human') return [];
		return game.validMovesForCurrentPlayer();
	});

	let validDestinations = $derived.by(() => {
		if (!game.selectedPoint) return new Set<string>();
		return new Set(
			validMoves
				.filter(
					(m) => m.from.row === game.selectedPoint!.row && m.from.col === game.selectedPoint!.col
				)
				.map((m) => pointKey(m.to))
		);
	});

	let validOrigins = $derived(new Set(validMoves.map((m) => pointKey(m.from))));

	function handleDotClick(row: number, col: number) {
		if (game.phase !== 'playing') return;
		game.selectPoint({ row, col });
	}

	function getLineColor(playerId: number): string {
		const player = game.players.find((p) => p.id === playerId);
		return player?.color ?? '#888';
	}

	function getSquareColor(playerId: number): string {
		const player = game.players.find((p) => p.id === playerId);
		if (!player) return 'transparent';
		return player.color + '30';
	}

	let drawnLines = $derived.by(() => {
		const result: Array<{
			key: string;
			x1: number;
			y1: number;
			x2: number;
			y2: number;
			color: string;
			diag: boolean;
		}> = [];
		for (const [key, playerId] of game.lines) {
			const [p1, p2] = parseLineKey(key);
			result.push({
				key,
				x1: dotX(p1.col) + jitter(p1.row, p1.col),
				y1: dotY(p1.row) + jitter(p1.col, p1.row),
				x2: dotX(p2.col) + jitter(p2.row, p2.col),
				y2: dotY(p2.row) + jitter(p2.col, p2.row),
				color: getLineColor(playerId),
				diag: isDiagonal(p1, p2)
			});
		}
		return result;
	});

	let filledSquares = $derived.by(() => {
		const result: Array<{ key: string; row: number; col: number; color: string }> = [];
		for (const [key, playerId] of game.capturedSquares) {
			const [row, col] = key.split(',').map(Number);
			result.push({ key, row, col, color: getSquareColor(playerId) });
		}
		return result;
	});

	function dotClass(row: number, col: number): string {
		const pk = pointKey({ row, col });
		const classes: string[] = ['dot'];

		if (game.selectedPoint?.row === row && game.selectedPoint?.col === col) {
			classes.push('dot-selected');
		} else if (validDestinations.has(pk)) {
			classes.push('dot-valid-target');
		} else if (
			game.phase === 'playing' &&
			!game.editMode &&
			game.currentPlayer?.type === 'human' &&
			validOrigins.has(pk)
		) {
			classes.push('dot-can-select');
		}

		for (const [playerId, points] of game.markedPoints) {
			if (points.has(pk)) {
				classes.push('dot-marked');
				break;
			}
		}

		return classes.join(' ');
	}

	function dotColor(row: number, col: number): string {
		const pk = pointKey({ row, col });
		for (const [playerId, points] of game.markedPoints) {
			if (points.has(pk)) {
				return getLineColor(playerId);
			}
		}
		return 'var(--dot-color)';
	}

	function dotRadius(row: number, col: number): number {
		const pk = pointKey({ row, col });
		if (game.selectedPoint?.row === row && game.selectedPoint?.col === col) return 6;
		if (validDestinations.has(pk)) return 5;
		if (validOrigins.has(pk)) return 4.5;

		for (const [, points] of game.markedPoints) {
			if (points.has(pk)) return 4;
		}

		return 3;
	}

	let isNewCapture = $derived(new Set(game.lastCaptures));
</script>

<div class="board-container">
	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="board-svg" role="img" aria-label="Game board">
		<defs>
			<filter id="pencil-texture" x="-5%" y="-5%" width="110%" height="110%">
				<feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" result="noise" />
				<feDisplacementMap in="SourceGraphic" in2="noise" scale="0.8" />
			</filter>
		</defs>

		<rect
			x="0"
			y="0"
			width={svgWidth}
			height={svgHeight}
			rx="8"
			fill="var(--board-bg)"
			class="board-bg"
		/>

		{#each { length: game.boardSize }, row}
			{#each { length: game.boardSize }, col}
				<rect
					x={dotX(col) + 0.5}
					y={dotY(row) + 0.5}
					width={cellSize - 1}
					height={cellSize - 1}
					fill="none"
					stroke="var(--grid-line)"
					stroke-width="0.5"
					stroke-dasharray="2 4"
					opacity="0.3"
				/>
			{/each}
		{/each}

		{#each filledSquares as sq (sq.key)}
			<rect
				x={dotX(sq.col) + 2}
				y={dotY(sq.row) + 2}
				width={cellSize - 4}
				height={cellSize - 4}
				rx="3"
				fill={sq.color}
				class="filled-square"
				class:newly-captured={isNewCapture.has(sq.key)}
			/>
		{/each}

		{#each drawnLines as line (line.key)}
			<path
				d={penPath(line.x1, line.y1, line.x2, line.y2)}
				stroke={line.color}
				stroke-width={line.diag ? 2 : 2.5}
				stroke-linecap="round"
				fill="none"
				opacity={line.diag ? 0.6 : 0.85}
				filter="url(#pencil-texture)"
				class="drawn-line"
			/>
		{/each}

		{#if game.selectedPoint && game.currentPlayer}
			{#each [...validDestinations] as destKey (destKey)}
				{@const [dr, dc] = destKey.split(',').map(Number)}
				<line
					x1={dotX(game.selectedPoint.col) + jitter(game.selectedPoint.row, game.selectedPoint.col)}
					y1={dotY(game.selectedPoint.row) + jitter(game.selectedPoint.col, game.selectedPoint.row)}
					x2={dotX(dc) + jitter(dr, dc)}
					y2={dotY(dr) + jitter(dc, dr)}
					stroke={game.currentPlayer.color}
					stroke-width="1.5"
					stroke-dasharray="4 4"
					opacity="0.35"
					stroke-linecap="round"
				/>
			{/each}
		{/if}

		{#each { length: game.boardSize + 1 }, row}
			{#each { length: game.boardSize + 1 }, col}
				{@const cx = dotX(col) + jitter(row, col)}
				{@const cy = dotY(row) + jitter(col, row)}
				<circle
					{cx}
					{cy}
					r={dotRadius(row, col)}
					fill={dotColor(row, col)}
					class={dotClass(row, col)}
					role="button"
					tabindex="0"
					aria-label="Point {row},{col}"
					onclick={() => handleDotClick(row, col)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') handleDotClick(row, col);
					}}
				/>
			{/each}
		{/each}
	</svg>
</div>

<style>
	.board-container {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		max-width: 700px;
		margin: 0 auto;
	}

	.board-svg {
		width: 100%;
		height: auto;
		user-select: none;
		-webkit-user-select: none;
	}

	.board-bg {
		filter: url(#pencil-texture);
	}

	.dot {
		cursor: pointer;
		transition:
			r 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
			fill 0.2s ease,
			opacity 0.2s ease;
	}

	.dot:hover {
		r: 6;
		filter: brightness(1.2);
	}

	.dot-selected {
		filter: drop-shadow(0 0 4px currentColor);
		animation: pulse 0.8s ease-in-out infinite alternate;
	}

	.dot-valid-target {
		animation: glow 0.6s ease-in-out infinite alternate;
		cursor: pointer;
	}

	.dot-can-select {
		cursor: pointer;
		filter: brightness(1.1);
	}

	.drawn-line {
		animation: draw-in 0.3s ease-out;
	}

	.filled-square {
		animation: fill-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.newly-captured {
		animation: capture-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes pulse {
		from {
			r: 5;
		}
		to {
			r: 7;
		}
	}

	@keyframes glow {
		from {
			opacity: 0.5;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes draw-in {
		from {
			stroke-dasharray: 100;
			stroke-dashoffset: 100;
		}
		to {
			stroke-dasharray: 100;
			stroke-dashoffset: 0;
		}
	}

	@keyframes fill-in {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes capture-pop {
		0% {
			opacity: 0;
			transform: scale(0.5);
		}
		60% {
			opacity: 1;
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
		}
	}
</style>

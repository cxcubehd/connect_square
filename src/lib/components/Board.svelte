<script lang="ts">
	import { type GameState } from '$lib/game/state.svelte.js';
	import { pointKey, parseLineKey, isDiagonal } from '$lib/game/logic.js';
	import type { Point } from '$lib/game/types.js';
	import {
		PADDING,
		CELL_SIZE,
		BASE_SNAP_RADIUS,
		TOUCH_SNAP_RADIUS,
		TURN_HINT_DURATION_MS,
		dotX,
		dotY,
		jitter,
		penPath,
		svgPointFromEvent,
		findNearestSnappablePoint,
		findDirectionalOvershootTarget,
		stripePatternId,
		winWaveDelay
	} from './board-utils.js';

	let { game }: { game: GameState } = $props();

	let isTouchDevice = $state(false);
	let snapRadius = $derived(isTouchDevice ? TOUCH_SNAP_RADIUS : BASE_SNAP_RADIUS);

	let svgWidth = $derived(game.boardSize * CELL_SIZE + PADDING * 2);
	let svgHeight = $derived(game.boardSize * CELL_SIZE + PADDING * 2);

	let svgElement: SVGSVGElement | undefined = $state(undefined);
	let isDragging = $state(false);
	let dragOrigin: Point | null = $state(null);
	let dragCursorSvg: { x: number; y: number } | null = $state(null);
	let dragMoved = $state(false);
	let hoveredPoint: Point | null = $state(null);
	let turnHintActive = $state(false);

	let isHumanTurn = $derived(
		game.phase === 'playing' && game.currentPlayer?.type === 'human' && !game.editMode
	);

	$effect(() => {
		if (!isHumanTurn) return;

		turnHintActive = true;
		const timeout = setTimeout(() => {
			turnHintActive = false;
		}, TURN_HINT_DURATION_MS);

		return () => clearTimeout(timeout);
	});

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
		const origin = game.selectedPoint ?? dragOrigin;
		if (!origin) return new Set<string>();
		return new Set(
			validMoves
				.filter((m) => m.from.row === origin.row && m.from.col === origin.col)
				.map((m) => pointKey(m.to))
		);
	});

	let validOrigins = $derived(new Set(validMoves.map((m) => pointKey(m.from))));

	let dragTarget = $derived.by((): Point | null => {
		if (!isDragging || !dragOrigin || !dragCursorSvg) return null;

		if (hoveredPoint) {
			if (hoveredPoint.row === dragOrigin.row && hoveredPoint.col === dragOrigin.col) return null;
			const pk = pointKey(hoveredPoint);
			if (validDestinations.has(pk)) return hoveredPoint;
		}

		return findDirectionalOvershootTarget(dragOrigin, dragCursorSvg, validDestinations);
	});

	let previewLine = $derived.by(() => {
		const origin = game.selectedPoint;
		if (!origin || !hoveredPoint) return null;
		if (hoveredPoint.row === origin.row && hoveredPoint.col === origin.col) return null;
		const pk = pointKey(hoveredPoint);
		if (!validDestinations.has(pk)) return null;
		return {
			x1: dotX(origin.col) + jitter(origin.row, origin.col),
			y1: dotY(origin.row) + jitter(origin.col, origin.row),
			x2: dotX(hoveredPoint.col) + jitter(hoveredPoint.row, hoveredPoint.col),
			y2: dotY(hoveredPoint.row) + jitter(hoveredPoint.col, hoveredPoint.row)
		};
	});

	let dragPreviewLine = $derived.by(() => {
		if (!isDragging || !dragOrigin || !dragTarget) return null;
		return {
			x1: dotX(dragOrigin.col) + jitter(dragOrigin.row, dragOrigin.col),
			y1: dotY(dragOrigin.row) + jitter(dragOrigin.col, dragOrigin.row),
			x2: dotX(dragTarget.col) + jitter(dragTarget.row, dragTarget.col),
			y2: dotY(dragTarget.row) + jitter(dragTarget.col, dragTarget.row)
		};
	});

	function handlePointerDown(e: PointerEvent) {
		if (e.pointerType === 'touch') isTouchDevice = true;

		if (game.phase !== 'playing' || game.editMode) return;
		const player = game.currentPlayer;
		if (!player || player.type !== 'human') return;

		if (e.ctrlKey || e.metaKey) return;

		const svgPos = svgPointFromEvent(svgElement, e);
		if (!svgPos) return;

		const point = findNearestSnappablePoint(svgPos, game.boardSize, snapRadius);
		if (!point) return;

		const pk = pointKey(point);
		const playerPoints = game.markedPoints.get(player.id);
		if (!playerPoints?.has(pk)) return;
		if (!validOrigins.has(pk)) return;

		isDragging = true;
		dragOrigin = point;
		dragCursorSvg = svgPos;
		dragMoved = false;

		(e.target as Element)?.setPointerCapture?.(e.pointerId);
		e.preventDefault();
	}

	function handlePointerMove(e: PointerEvent) {
		const svgPos = svgPointFromEvent(svgElement, e);
		if (!svgPos) return;

		if (isDragging) {
			dragCursorSvg = svgPos;
			if (!dragMoved && dragOrigin) {
				const ox = dotX(dragOrigin.col);
				const oy = dotY(dragOrigin.row);
				const dx = svgPos.x - ox;
				const dy = svgPos.y - oy;
				if (Math.sqrt(dx * dx + dy * dy) > 5) {
					dragMoved = true;
					game.selectedPoint = null;
				}
			}
		}

		hoveredPoint = findNearestSnappablePoint(svgPos, game.boardSize, snapRadius);
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isDragging || !dragOrigin) {
			isDragging = false;
			dragOrigin = null;
			dragCursorSvg = null;
			return;
		}

		if (dragMoved && dragTarget) {
			game.executeMove(dragOrigin, dragTarget);
		}

		isDragging = false;
		dragOrigin = null;
		dragCursorSvg = null;
		dragMoved = false;
	}

	function handlePointerLeave() {
		hoveredPoint = null;
		if (isDragging) {
			isDragging = false;
			dragOrigin = null;
			dragCursorSvg = null;
		}
	}

	function handleDotClick(e: MouseEvent, row: number, col: number) {
		if (game.phase !== 'playing') return;

		if (e.ctrlKey || e.metaKey) {
			game.selectPoint({ row, col });
			return;
		}

		if (game.selectedPoint) {
			game.selectPoint({ row, col });
		}
	}

	function getLineColor(playerId: number): string {
		const player = game.players.find((p) => p.id === playerId);
		return player?.color ?? '#888';
	}

	function getSquareColor(playerId: number): string {
		const player = game.players.find((p) => p.id === playerId);
		if (!player) return 'transparent';
		return player.color;
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
			isLastMove: boolean;
			fromX: number;
			fromY: number;
			toX: number;
			toY: number;
		}> = [];
		for (const [key, playerId] of game.lines) {
			const [p1, p2] = parseLineKey(key);
			const x1 = dotX(p1.col) + jitter(p1.row, p1.col);
			const y1 = dotY(p1.row) + jitter(p1.col, p1.row);
			const x2 = dotX(p2.col) + jitter(p2.row, p2.col);
			const y2 = dotY(p2.row) + jitter(p2.col, p2.row);

			const isLastMove = key === game.lastMoveLineKey;
			let fromX = x1,
				fromY = y1,
				toX = x2,
				toY = y2;
			if (isLastMove && game.lastMoveFrom && game.lastMoveTo) {
				const fromPt = game.lastMoveFrom;
				const toPt = game.lastMoveTo;
				fromX = dotX(fromPt.col) + jitter(fromPt.row, fromPt.col);
				fromY = dotY(fromPt.row) + jitter(fromPt.col, fromPt.row);
				toX = dotX(toPt.col) + jitter(toPt.row, toPt.col);
				toY = dotY(toPt.row) + jitter(toPt.col, toPt.row);
			}

			result.push({
				key,
				x1,
				y1,
				x2,
				y2,
				color: getLineColor(playerId),
				diag: isDiagonal(p1, p2),
				isLastMove,
				fromX,
				fromY,
				toX,
				toY
			});
		}
		return result;
	});

	let filledSquares = $derived.by(() => {
		const result: Array<{
			key: string;
			row: number;
			col: number;
			color: string;
			playerId: number;
		}> = [];
		for (const [key, playerId] of game.capturedSquares) {
			const [row, col] = key.split(',').map(Number);
			result.push({ key, row, col, color: getSquareColor(playerId), playerId });
		}
		return result;
	});

	function dotClass(row: number, col: number): string {
		const pk = pointKey({ row, col });
		const classes: string[] = ['dot'];

		if (game.selectedPoint?.row === row && game.selectedPoint?.col === col) {
			classes.push('dot-selected');
		} else if (dragOrigin?.row === row && dragOrigin?.col === col) {
			classes.push('dot-drag-origin');
		} else if (isDragging && dragTarget?.row === row && dragTarget?.col === col) {
			classes.push('dot-drag-target');
		} else if (validDestinations.has(pk) && (game.selectedPoint || isDragging)) {
			classes.push('dot-valid-target');
		} else if (
			game.phase === 'playing' &&
			!game.editMode &&
			game.currentPlayer?.type === 'human' &&
			validOrigins.has(pk)
		) {
			classes.push('dot-can-select');
		}

		if (turnHintActive && validOrigins.has(pk)) {
			classes.push('dot-turn-hint');
		}

		if (hoveredPoint?.row === row && hoveredPoint?.col === col && !isDragging) {
			classes.push('dot-hovered');
		}

		for (const [, points] of game.markedPoints) {
			if (points.has(pk)) {
				classes.push('dot-marked');
				break;
			}
		}

		if (isLastMoveDot(row, col)) {
			classes.push('dot-last-move');
		}

		return classes.join(' ');
	}

	function isLastMoveDot(row: number, col: number): boolean {
		if (!game.lastMoveFrom || !game.lastMoveTo) return false;
		return (
			(game.lastMoveFrom.row === row && game.lastMoveFrom.col === col) ||
			(game.lastMoveTo.row === row && game.lastMoveTo.col === col)
		);
	}

	function dotColor(row: number, col: number): string {
		const pk = pointKey({ row, col });
		const currentPlayerId = game.currentPlayer?.id;

		if (currentPlayerId !== undefined) {
			const currentPoints = game.markedPoints.get(currentPlayerId);
			if (currentPoints?.has(pk)) {
				return getLineColor(currentPlayerId);
			}
		}

		for (const [playerId, points] of game.markedPoints) {
			if (points.has(pk)) {
				return getLineColor(playerId);
			}
		}
		return 'var(--dot-color)';
	}

	function dotRadius(row: number, col: number): number {
		const pk = pointKey({ row, col });
		const touchBonus = isTouchDevice ? 1.5 : 0;

		if (game.selectedPoint?.row === row && game.selectedPoint?.col === col) return 6 + touchBonus;
		if (dragOrigin?.row === row && dragOrigin?.col === col) return 6 + touchBonus;
		if (isDragging && dragTarget?.row === row && dragTarget?.col === col) return 6 + touchBonus;
		if (validDestinations.has(pk) && (game.selectedPoint || isDragging)) return 5 + touchBonus;
		if (validOrigins.has(pk)) return 4.5 + touchBonus;
		if (isLastMoveDot(row, col)) return 4.5 + touchBonus;

		for (const [, points] of game.markedPoints) {
			if (points.has(pk)) return 4 + touchBonus;
		}

		return 3 + touchBonus;
	}

	function dotZOrder(row: number, col: number): number {
		const pk = pointKey({ row, col });
		const currentPlayerId = game.currentPlayer?.id;
		if (currentPlayerId !== undefined) {
			const currentPoints = game.markedPoints.get(currentPlayerId);
			if (currentPoints?.has(pk)) return 2;
		}
		for (const [, points] of game.markedPoints) {
			if (points.has(pk)) return 1;
		}
		return 0;
	}

	let sortedDots = $derived.by(() => {
		const dots: Array<{ row: number; col: number; zOrder: number }> = [];
		const gridSize = game.boardSize + 1;
		for (let row = 0; row < gridSize; row++) {
			for (let col = 0; col < gridSize; col++) {
				dots.push({ row, col, zOrder: dotZOrder(row, col) });
			}
		}
		dots.sort((a, b) => a.zOrder - b.zOrder);
		return dots;
	});

	let newCaptureKeys = $derived(new Set(game.lastCaptures));
	let survivorFilledKeys = $derived(new Set(game.survivorFilledSquares));

	let winHighlightSquares = $derived.by(() => {
		if (game.phase !== 'finished' || !game.winner) return new Set<string>();
		const winnerId = game.winner.id;
		return new Set(
			[...game.capturedSquares.entries()].filter(([, pid]) => pid === winnerId).map(([key]) => key)
		);
	});

	let survivorFillOrder = $derived.by(() => {
		const order = new Map<string, number>();
		game.survivorFilledSquares.forEach((key, i) => order.set(key, i));
		return order;
	});

	let totalSurvivorFillDuration = $derived(
		game.survivorFilledSquares.length > 0 ? game.survivorFilledSquares.length * 40 + 400 : 0
	);

	function survivorFillDelay(key: string): number {
		return (survivorFillOrder.get(key) ?? 0) * 40;
	}
</script>

<div class="board-container">
	<svg
		bind:this={svgElement}
		viewBox="0 0 {svgWidth} {svgHeight}"
		class="board-svg"
		role="img"
		aria-label="Game board"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointerleave={handlePointerLeave}
	>
		<defs>
			<filter id="pencil-texture" x="-5%" y="-5%" width="110%" height="110%">
				<feTurbulence
					type="turbulence"
					baseFrequency="0.04"
					numOctaves="4"
					seed="0"
					result="noise"
				/>
				<feDisplacementMap in="SourceGraphic" in2="noise" scale="0.4" />
			</filter>

			{#each game.players as player (player.id)}
				<pattern
					id={stripePatternId(player.id)}
					width="12"
					height="12"
					patternUnits="userSpaceOnUse"
					patternTransform="rotate(45)"
				>
					<animateTransform
						attributeName="patternTransform"
						type="translate"
						from="0 0"
						to="12 0"
						dur="4s"
						repeatCount="indefinite"
						additive="sum"
					/>
					<rect width="12" height="12" fill={player.color} opacity="0.18" />
					<line
						x1="0"
						y1="0"
						x2="0"
						y2="12"
						stroke={player.color}
						stroke-width="5"
						opacity="0.25"
					/>
				</pattern>
			{/each}
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
					width={CELL_SIZE - 1}
					height={CELL_SIZE - 1}
					fill="none"
					stroke="var(--grid-line)"
					stroke-width="0.5"
					stroke-dasharray="2 4"
					opacity="0.3"
				/>
			{/each}
		{/each}

		{#each filledSquares as sq (sq.key)}
			{@const isSurvivor = survivorFilledKeys.has(sq.key)}
			{@const isWinSquare = winHighlightSquares.has(sq.key)}
			<rect
				x={dotX(sq.col) + 2}
				y={dotY(sq.row) + 2}
				width={CELL_SIZE - 4}
				height={CELL_SIZE - 4}
				rx="3"
				fill="url(#{stripePatternId(sq.playerId)})"
				class="filled-square"
				class:newly-captured={newCaptureKeys.has(sq.key)}
				class:survivor-filled={isSurvivor && !isWinSquare}
				class:win-highlight={isWinSquare && !isSurvivor}
				class:survivor-win-highlight={isSurvivor && isWinSquare}
				style:--survivor-delay="{survivorFillDelay(sq.key)}ms"
				style:--win-delay="{winWaveDelay(sq.col) +
					(isSurvivor ? totalSurvivorFillDuration + 200 : 300)}ms"
			/>
		{/each}

		{#each drawnLines as line (line.key)}
			{@const isLast = line.isLastMove}
			<path
				d={penPath(line.fromX, line.fromY, line.toX, line.toY)}
				stroke={line.color}
				stroke-width={2.5}
				stroke-linecap="round"
				fill="none"
				opacity={line.diag ? 0.7 : 0.85}
				class="drawn-line"
				class:last-move-line={isLast}
			/>
		{/each}

		{#if game.selectedPoint && game.currentPlayer && !isDragging}
			{@const hpk = hoveredPoint ? pointKey(hoveredPoint) : null}
			{@const showSinglePreview = hpk && validDestinations.has(hpk)}
			{#if !showSinglePreview}
				{#each [...validDestinations] as destKey (destKey)}
					{@const [dr, dc] = destKey.split(',').map(Number)}
					<line
						x1={dotX(game.selectedPoint.col) +
							jitter(game.selectedPoint.row, game.selectedPoint.col)}
						y1={dotY(game.selectedPoint.row) +
							jitter(game.selectedPoint.col, game.selectedPoint.row)}
						x2={dotX(dc) + jitter(dr, dc)}
						y2={dotY(dr) + jitter(dc, dr)}
						stroke={game.currentPlayer.color}
						stroke-width="2"
						stroke-dasharray="4 4"
						opacity="0.25"
						stroke-linecap="round"
						class="guide-dash"
					/>
				{/each}
			{/if}
		{/if}

		{#if previewLine && !isDragging}
			<path
				d={penPath(previewLine.x1, previewLine.y1, previewLine.x2, previewLine.y2)}
				stroke={game.currentPlayer?.color ?? '#888'}
				stroke-width="2.5"
				stroke-linecap="round"
				fill="none"
				opacity="0.7"
				stroke-dasharray="6 4"
				class="preview-line"
			/>
		{/if}

		{#if dragPreviewLine}
			<path
				d={penPath(dragPreviewLine.x1, dragPreviewLine.y1, dragPreviewLine.x2, dragPreviewLine.y2)}
				stroke={game.currentPlayer?.color ?? '#888'}
				stroke-width="3"
				stroke-linecap="round"
				fill="none"
				opacity="0.8"
				class="drag-preview-line"
			/>
		{/if}

		{#if isDragging && dragOrigin && dragCursorSvg && !dragTarget}
			<line
				x1={dotX(dragOrigin.col) + jitter(dragOrigin.row, dragOrigin.col)}
				y1={dotY(dragOrigin.row) + jitter(dragOrigin.col, dragOrigin.row)}
				x2={dragCursorSvg.x}
				y2={dragCursorSvg.y}
				stroke={game.currentPlayer?.color ?? '#888'}
				stroke-width="1.5"
				stroke-dasharray="3 5"
				opacity="0.3"
				stroke-linecap="round"
				class="drag-tether"
			/>
		{/if}

		{#each sortedDots as dot (`${dot.row},${dot.col}`)}
			{@const cx = dotX(dot.col) + jitter(dot.row, dot.col)}
			{@const cy = dotY(dot.row) + jitter(dot.col, dot.row)}
			<circle
				{cx}
				{cy}
				r={dotRadius(dot.row, dot.col)}
				fill={dotColor(dot.row, dot.col)}
				class={dotClass(dot.row, dot.col)}
				role="button"
				tabindex="0"
				aria-label="Point {dot.row},{dot.col}"
				onclick={(e) => handleDotClick(e, dot.row, dot.col)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						game.selectPoint({ row: dot.row, col: dot.col });
					}
				}}
			/>
		{/each}
	</svg>
</div>

<style>
	.board-container {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		min-height: 0;
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		box-shadow: none;
	}

	.board-svg {
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		aspect-ratio: 1;
		border-radius: 14px;
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
		-webkit-touch-callout: none;
		-webkit-tap-highlight-color: transparent;
		filter: drop-shadow(0 8px 20px rgb(0 0 0 / 0.12));
	}

	.dot {
		cursor: pointer;
		outline: none;
		-webkit-tap-highlight-color: transparent;
		transition:
			r 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
			fill 0.2s ease,
			opacity 0.2s ease,
			filter 0.2s ease;
	}

	.dot:focus {
		outline: none;
	}

	.dot:focus-visible {
		outline: none;
	}

	.dot::-moz-focus-inner {
		border: 0;
	}

	@media (hover: hover) and (pointer: fine) {
		.dot:hover {
			r: 5.5;
			opacity: 0.92;
		}
	}

	.dot-hovered {
		r: 5;
		opacity: 0.9;
	}

	.dot-selected {
		filter: drop-shadow(0 0 5px currentColor);
		animation: pulse 0.8s ease-in-out infinite alternate;
	}

	.dot-drag-origin {
		filter: drop-shadow(0 0 6px currentColor);
		animation: pulse 0.6s ease-in-out infinite alternate;
	}

	.dot-drag-target {
		filter: drop-shadow(0 0 7px currentColor);
		animation: glow 0.8s ease-in-out infinite alternate;
		r: 6;
	}

	.dot-valid-target {
		animation: glow 0.8s ease-in-out infinite alternate;
		cursor: pointer;
	}

	.dot-can-select {
		cursor: pointer;
	}

	.dot-turn-hint {
		animation: turn-hint 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	.dot-last-move {
		opacity: 0.95;
	}

	.drawn-line {
		animation: draw-in 0.3s ease-out forwards;
	}

	.last-move-line {
		opacity: 0.95;
		stroke-width: 3;
	}

	.filled-square {
		opacity: 1;
		filter: saturate(1.05);
	}

	.newly-captured {
		animation: square-appear 0.4s ease-out both;
	}

	.survivor-filled {
		animation: survivor-fill 0.4s ease-out both;
		animation-delay: var(--survivor-delay, 0ms);
	}

	.win-highlight {
		stroke: color-mix(in srgb, #fff 85%, var(--accent-sun));
		animation: win-wave 0.6s ease-in-out both;
		animation-delay: var(--win-delay, 0ms);
	}

	.survivor-win-highlight {
		stroke: color-mix(in srgb, #fff 85%, var(--accent-sun));
		animation:
			survivor-fill 0.4s ease-out both,
			win-wave 0.6s ease-in-out both;
		animation-delay: var(--survivor-delay, 0ms), var(--win-delay, 0ms);
	}

	.guide-dash {
		pointer-events: none;
		animation: dash-flow 1.8s ease-in-out infinite;
	}

	.preview-line {
		pointer-events: none;
		animation: preview-pulse 0.6s ease-in-out infinite alternate;
	}

	.drag-preview-line {
		pointer-events: none;
		animation: drag-snap 0.15s ease-out;
	}

	.drag-tether {
		pointer-events: none;
	}

	@keyframes pulse {
		from {
			r: 5;
		}
		to {
			r: 7.3;
		}
	}

	@keyframes glow {
		from {
			opacity: 0.6;
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

	@keyframes square-appear {
		0% {
			opacity: 0;
			clip-path: inset(50% round 28px);
			filter: saturate(0.7);
		}
		100% {
			opacity: 1;
			clip-path: inset(0% round 3px);
			filter: saturate(1.05);
		}
	}

	@keyframes survivor-fill {
		0% {
			opacity: 0;
			clip-path: inset(50% round 28px);
			filter: saturate(0.7);
		}
		100% {
			opacity: 1;
			clip-path: inset(0% round 3px);
			filter: saturate(1.05);
		}
	}

	@keyframes win-wave {
		0% {
			opacity: 1;
			stroke-width: 0;
			stroke-opacity: 0;
		}
		30% {
			opacity: 0.5;
			stroke-width: 2;
			stroke-opacity: 0.8;
		}
		60% {
			opacity: 1;
			stroke-width: 2;
			stroke-opacity: 0.6;
		}
		100% {
			opacity: 1;
			stroke-width: 0;
			stroke-opacity: 0;
		}
	}

	@keyframes preview-pulse {
		from {
			opacity: 0.4;
		}
		to {
			opacity: 0.8;
		}
	}

	@keyframes drag-snap {
		from {
			opacity: 0.3;
			stroke-width: 1;
		}
		to {
			opacity: 0.8;
			stroke-width: 3;
		}
	}

	@keyframes dash-flow {
		0% {
			stroke-dashoffset: 0;
		}
		40% {
			stroke-dashoffset: -8;
		}
		100% {
			stroke-dashoffset: -8;
		}
	}

	@keyframes turn-hint {
		0% {
			r: 4.5;
		}
		50% {
			r: 5.2;
		}
		100% {
			r: 4.5;
		}
	}
</style>

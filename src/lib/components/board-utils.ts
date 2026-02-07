import type { Point } from '$lib/game/types.js';

export const PADDING = 40;
export const CELL_SIZE = 60;
export const BASE_SNAP_RADIUS = 26;
export const TOUCH_SNAP_RADIUS = 34;
export const DEAD_ZONE_RADIUS = 8;
export const DIRECTIONAL_OVERSHOOT_RADIUS = 260;
export const TURN_HINT_DURATION_MS = 600;

export function dotX(col: number): number {
	return PADDING + col * CELL_SIZE;
}

export function dotY(row: number): number {
	return PADDING + row * CELL_SIZE;
}

export function jitter(a: number, b: number, scale = 1.2): number {
	let h = a * 374761393 + b * 668265263;
	h = (h ^ (h >> 13)) * 1274126177;
	h = h ^ (h >> 16);
	return ((h & 0xffff) / 0xffff - 0.5) * scale;
}

export function penPath(x1: number, y1: number, x2: number, y2: number): string {
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

export function svgPointFromEvent(
	svgElement: SVGSVGElement | undefined,
	e: MouseEvent | PointerEvent
): { x: number; y: number } | null {
	if (!svgElement) return null;
	const pt = svgElement.createSVGPoint();
	pt.x = e.clientX;
	pt.y = e.clientY;
	const ctm = svgElement.getScreenCTM();
	if (!ctm) return null;
	const svgPt = pt.matrixTransform(ctm.inverse());
	return { x: svgPt.x, y: svgPt.y };
}

export function findNearestSnappablePoint(
	svgPos: { x: number; y: number },
	boardSize: number,
	snapRadius: number
): Point | null {
	let best: Point | null = null;
	let bestDist = Infinity;
	const gridSize = boardSize + 1;

	for (let row = 0; row < gridSize; row++) {
		for (let col = 0; col < gridSize; col++) {
			const px = dotX(col);
			const py = dotY(row);
			const dx = svgPos.x - px;
			const dy = svgPos.y - py;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < bestDist && dist < snapRadius) {
				bestDist = dist;
				best = { row, col };
			}
		}
	}

	if (!best) return null;
	if (isInDeadZone(svgPos, best, boardSize)) return null;

	return best;
}

function isInDeadZone(
	svgPos: { x: number; y: number },
	candidate: Point,
	boardSize: number
): boolean {
	for (let dr = -1; dr <= 0; dr++) {
		for (let dc = -1; dc <= 0; dc++) {
			const sr = candidate.row + dr;
			const sc = candidate.col + dc;
			if (sr >= 0 && sr < boardSize && sc >= 0 && sc < boardSize) {
				const centerX = dotX(sc) + CELL_SIZE / 2;
				const centerY = dotY(sr) + CELL_SIZE / 2;
				const dx = svgPos.x - centerX;
				const dy = svgPos.y - centerY;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const dotDx = svgPos.x - dotX(candidate.col);
				const dotDy = svgPos.y - dotY(candidate.row);
				const dotDist = Math.sqrt(dotDx * dotDx + dotDy * dotDy);
				if (dist < DEAD_ZONE_RADIUS && dotDist > dist) {
					return true;
				}
			}
		}
	}
	return false;
}

export function findDirectionalOvershootTarget(
	dragOrigin: Point,
	dragCursorSvg: { x: number; y: number },
	validDestinations: Set<string>
): Point | null {
	const ox = dotX(dragOrigin.col);
	const oy = dotY(dragOrigin.row);
	const dx = dragCursorSvg.x - ox;
	const dy = dragCursorSvg.y - oy;
	const dragDist = Math.sqrt(dx * dx + dy * dy);
	if (dragDist < 10) return null;

	const ndx = dx / dragDist;
	const ndy = dy / dragDist;

	let bestTarget: Point | null = null;
	let bestAlignment = -Infinity;

	for (const destKey of validDestinations) {
		const [dr, dc] = destKey.split(',').map(Number);
		const tx = dotX(dc) + jitter(dr, dc);
		const ty = dotY(dr) + jitter(dc, dr);

		const toTargetX = tx - ox;
		const toTargetY = ty - oy;
		const toTargetDist = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);
		if (toTargetDist < 1) continue;

		const alignment = (toTargetX * ndx + toTargetY * ndy) / toTargetDist;
		if (alignment < 0.7) continue;

		const cursorToTargetX = dragCursorSvg.x - tx;
		const cursorToTargetY = dragCursorSvg.y - ty;
		const cursorToTargetDist = Math.sqrt(
			cursorToTargetX * cursorToTargetX + cursorToTargetY * cursorToTargetY
		);
		if (cursorToTargetDist > DIRECTIONAL_OVERSHOOT_RADIUS) continue;

		if (alignment > bestAlignment) {
			bestAlignment = alignment;
			bestTarget = { row: dr, col: dc };
		}
	}

	return bestTarget;
}

export function stripePatternId(playerId: number): string {
	return `stripe-${playerId}`;
}

export function winWaveDelay(col: number): number {
	return col * 120;
}

import type { Point } from './types.js';

export function pointKey(p: Point): string {
	return `${p.row},${p.col}`;
}

export function parsePointKey(key: string): Point {
	const [row, col] = key.split(',').map(Number);
	return { row, col };
}

export function lineKey(p1: Point, p2: Point): string {
	if (p1.row < p2.row || (p1.row === p2.row && p1.col < p2.col)) {
		return `${p1.row},${p1.col}-${p2.row},${p2.col}`;
	}
	return `${p2.row},${p2.col}-${p1.row},${p1.col}`;
}

export function parseLineKey(key: string): [Point, Point] {
	const [a, b] = key.split('-');
	return [parsePointKey(a), parsePointKey(b)];
}

export function isAdjacent(p1: Point, p2: Point): boolean {
	const dr = Math.abs(p1.row - p2.row);
	const dc = Math.abs(p1.col - p2.col);
	return dr <= 1 && dc <= 1 && dr + dc > 0;
}

export function isDiagonal(p1: Point, p2: Point): boolean {
	return Math.abs(p1.row - p2.row) === 1 && Math.abs(p1.col - p2.col) === 1;
}

export function getNeighbors(p: Point, boardSize: number): Point[] {
	const neighbors: Point[] = [];
	for (let dr = -1; dr <= 1; dr++) {
		for (let dc = -1; dc <= 1; dc++) {
			if (dr === 0 && dc === 0) continue;
			const nr = p.row + dr;
			const nc = p.col + dc;
			if (nr >= 0 && nr <= boardSize && nc >= 0 && nc <= boardSize) {
				neighbors.push({ row: nr, col: nc });
			}
		}
	}
	return neighbors;
}

export function getSquareForDiagonal(p1: Point, p2: Point): Point | null {
	if (!isDiagonal(p1, p2)) return null;
	const [top, bottom] = p1.row < p2.row ? [p1, p2] : [p2, p1];
	if (bottom.col > top.col) {
		return { row: top.row, col: top.col };
	}
	return { row: top.row, col: top.col - 1 };
}

export function getSquareBorderKeys(row: number, col: number): string[] {
	return [
		lineKey({ row, col }, { row, col: col + 1 }),
		lineKey({ row: row + 1, col }, { row: row + 1, col: col + 1 }),
		lineKey({ row, col }, { row: row + 1, col }),
		lineKey({ row, col: col + 1 }, { row: row + 1, col: col + 1 })
	];
}

export function isSquareFilled(
	row: number,
	col: number,
	lines: ReadonlyMap<string, number>
): boolean {
	return getSquareBorderKeys(row, col).every((key) => lines.has(key));
}

export function getAffectedSquares(
	p1: Point,
	p2: Point,
	boardSize: number
): Array<{ row: number; col: number }> {
	const squares: Array<{ row: number; col: number }> = [];

	if (isDiagonal(p1, p2)) {
		const sq = getSquareForDiagonal(p1, p2);
		if (sq && sq.row >= 0 && sq.row < boardSize && sq.col >= 0 && sq.col < boardSize) {
			squares.push(sq);
		}
	} else {
		const [a, b] = p1.row < p2.row || (p1.row === p2.row && p1.col < p2.col) ? [p1, p2] : [p2, p1];

		if (a.row === b.row) {
			if (a.row > 0) squares.push({ row: a.row - 1, col: a.col });
			if (a.row < boardSize) squares.push({ row: a.row, col: a.col });
		} else {
			if (a.col > 0) squares.push({ row: a.row, col: a.col - 1 });
			if (a.col < boardSize) squares.push({ row: a.row, col: a.col });
		}
	}

	return squares;
}

export function checkCapturesForMove(
	p1: Point,
	p2: Point,
	boardSize: number,
	lines: ReadonlyMap<string, number>,
	capturedSquares: ReadonlyMap<string, number>
): string[] {
	return getAffectedSquares(p1, p2, boardSize)
		.filter((sq) => {
			const key = `${sq.row},${sq.col}`;
			return !capturedSquares.has(key) && isSquareFilled(sq.row, sq.col, lines);
		})
		.map((sq) => `${sq.row},${sq.col}`);
}

export function isValidMove(
	from: Point,
	to: Point,
	playerId: number,
	boardSize: number,
	lines: ReadonlyMap<string, number>,
	markedPoints: ReadonlyMap<number, ReadonlySet<string>>,
	capturedSquares: ReadonlyMap<string, number>
): boolean {
	const playerPoints = markedPoints.get(playerId);
	if (!playerPoints?.has(pointKey(from))) return false;
	if (!isAdjacent(from, to)) return false;
	if (to.row < 0 || to.row > boardSize || to.col < 0 || to.col > boardSize) return false;
	if (lines.has(lineKey(from, to))) return false;

	if (isDiagonal(from, to)) {
		const sq = getSquareForDiagonal(from, to);
		if (sq) {
			const sqKey = `${sq.row},${sq.col}`;
			if (capturedSquares.has(sqKey)) return false;
		}
	}

	return true;
}

export function getValidMoves(
	playerId: number,
	boardSize: number,
	lines: ReadonlyMap<string, number>,
	markedPoints: ReadonlyMap<number, ReadonlySet<string>>,
	capturedSquares: ReadonlyMap<string, number>
): Array<{ from: Point; to: Point }> {
	const moves: Array<{ from: Point; to: Point }> = [];
	const playerPoints = markedPoints.get(playerId);
	if (!playerPoints) return moves;

	for (const pk of playerPoints) {
		const from = parsePointKey(pk);
		for (const to of getNeighbors(from, boardSize)) {
			if (isValidMove(from, to, playerId, boardSize, lines, markedPoints, capturedSquares)) {
				moves.push({ from, to });
			}
		}
	}

	return moves;
}

export function getStartingCorners(boardSize: number, playerCount: number): Point[] {
	const n = boardSize;
	const corners: Point[] = [
		{ row: 0, col: 0 },
		{ row: n, col: n },
		{ row: 0, col: n },
		{ row: n, col: 0 }
	];
	return corners.slice(0, playerCount);
}

export function getTotalSquares(boardSize: number): number {
	return boardSize * boardSize;
}

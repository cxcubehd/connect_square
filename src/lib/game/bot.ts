import type { BotStrategy, BotMove, BotContext } from './types.js';

export const randomBot: BotStrategy = {
	id: 'random',
	name: 'Random',
	description: 'Picks a random valid move',
	selectMove(validMoves: BotMove[]): BotMove | null {
		if (validMoves.length === 0) return null;
		return validMoves[Math.floor(Math.random() * validMoves.length)];
	}
};

export const greedyBot: BotStrategy = {
	id: 'greedy',
	name: 'Greedy',
	description: 'Prioritizes moves that capture squares',
	selectMove(validMoves: BotMove[], context: BotContext): BotMove | null {
		if (validMoves.length === 0) return null;

		const { boardSize, lines, capturedSquares } = context;

		for (const move of validMoves) {
			const key = lineKeyFromPoints(move.from, move.to);
			const testLines = new Map(lines);
			testLines.set(key, context.currentPlayerId);

			const affected = getAffectedSquaresForBot(move.from, move.to, boardSize);
			for (const sq of affected) {
				const sqKey = `${sq.row},${sq.col}`;
				if (!capturedSquares.has(sqKey) && isSquareFilledForBot(sq.row, sq.col, testLines)) {
					return move;
				}
			}
		}

		return validMoves[Math.floor(Math.random() * validMoves.length)];
	}
};

function lineKeyFromPoints(
	p1: { row: number; col: number },
	p2: { row: number; col: number }
): string {
	if (p1.row < p2.row || (p1.row === p2.row && p1.col < p2.col)) {
		return `${p1.row},${p1.col}-${p2.row},${p2.col}`;
	}
	return `${p2.row},${p2.col}-${p1.row},${p1.col}`;
}

function getAffectedSquaresForBot(
	p1: { row: number; col: number },
	p2: { row: number; col: number },
	boardSize: number
): Array<{ row: number; col: number }> {
	const squares: Array<{ row: number; col: number }> = [];
	const dr = Math.abs(p1.row - p2.row);
	const dc = Math.abs(p1.col - p2.col);
	const isDiag = dr === 1 && dc === 1;

	if (isDiag) {
		const [top, bottom] = p1.row < p2.row ? [p1, p2] : [p2, p1];
		const sq =
			bottom.col > top.col ? { row: top.row, col: top.col } : { row: top.row, col: top.col - 1 };
		if (sq.row >= 0 && sq.row < boardSize && sq.col >= 0 && sq.col < boardSize) {
			squares.push(sq);
		}
	} else {
		const [a] = p1.row < p2.row || (p1.row === p2.row && p1.col < p2.col) ? [p1, p2] : [p2, p1];
		const [, b] = p1.row < p2.row || (p1.row === p2.row && p1.col < p2.col) ? [p1, p2] : [p2, p1];

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

function isSquareFilledForBot(
	row: number,
	col: number,
	lines: ReadonlyMap<string, number>
): boolean {
	const borders = [
		lineKeyFromPoints({ row, col }, { row, col: col + 1 }),
		lineKeyFromPoints({ row: row + 1, col }, { row: row + 1, col: col + 1 }),
		lineKeyFromPoints({ row, col }, { row: row + 1, col }),
		lineKeyFromPoints({ row, col: col + 1 }, { row: row + 1, col: col + 1 })
	];
	return borders.every((key) => lines.has(key));
}

const botRegistry = new Map<string, BotStrategy>();
botRegistry.set(randomBot.id, randomBot);
botRegistry.set(greedyBot.id, greedyBot);

export function getBotStrategy(id: string): BotStrategy | undefined {
	return botRegistry.get(id);
}

export function getAvailableBots(): BotStrategy[] {
	return Array.from(botRegistry.values());
}

export function registerBot(strategy: BotStrategy): void {
	botRegistry.set(strategy.id, strategy);
}

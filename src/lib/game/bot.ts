import type { BotStrategy, BotMove, BotContext } from './types.js';
import {
	lineKey,
	getAffectedSquares,
	isSquareFilled,
	getSquareBorderKeys,
	isDiagonal
} from './logic.js';
import { wasmHardBot } from './wasm-bot.js';

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
			const moveKey = lineKey(move.from, move.to);
			let captures = 0;
			for (const sq of getAffectedSquares(move.from, move.to, boardSize)) {
				const sqKey = `${sq.row},${sq.col}`;
				if (capturedSquares.has(sqKey)) continue;
				const borders = getSquareBorderKeys(sq.row, sq.col);
				let allPresent = true;
				for (const b of borders) {
					if (b !== moveKey && !lines.has(b)) {
						allPresent = false;
						break;
					}
				}
				if (allPresent) captures++;
			}
			if (captures > 0) return move;
		}

		return validMoves[Math.floor(Math.random() * validMoves.length)];
	}
};

export { wasmHardBot as hardBot };

const botRegistry = new Map<string, BotStrategy>();
botRegistry.set(randomBot.id, randomBot);
botRegistry.set(greedyBot.id, greedyBot);
botRegistry.set(wasmHardBot.id, wasmHardBot);

export function getBotStrategy(id: string): BotStrategy | undefined {
	return botRegistry.get(id);
}

export function getAvailableBots(): BotStrategy[] {
	return Array.from(botRegistry.values());
}

export function registerBot(strategy: BotStrategy): void {
	botRegistry.set(strategy.id, strategy);
}

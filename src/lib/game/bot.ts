import type { BotStrategy, BotMove, BotContext, Point } from './types.js';
import {
	lineKey,
	getAffectedSquares,
	isSquareFilled,
	getSquareBorderKeys,
	getValidMoves,
	pointKey,
	getNeighbors,
	isDiagonal,
	getSquareForDiagonal,
	parseLineKey
} from './logic.js';

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
			if (countCaptures(move, boardSize, lines, capturedSquares) > 0) {
				return move;
			}
		}

		return validMoves[Math.floor(Math.random() * validMoves.length)];
	}
};

function countCaptures(
	move: BotMove,
	boardSize: number,
	lines: ReadonlyMap<string, number>,
	capturedSquares: ReadonlyMap<string, number>
): number {
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
	return captures;
}

function borderCountWithMove(
	row: number,
	col: number,
	lines: ReadonlyMap<string, number>,
	moveKey: string
): number {
	let count = 0;
	for (const k of getSquareBorderKeys(row, col)) {
		if (k === moveKey || lines.has(k)) count++;
	}
	return count;
}

function borderCountWithout(row: number, col: number, lines: ReadonlyMap<string, number>): number {
	let count = 0;
	for (const k of getSquareBorderKeys(row, col)) {
		if (lines.has(k)) count++;
	}
	return count;
}

function canOpponentComplete(
	row: number,
	col: number,
	lines: ReadonlyMap<string, number>,
	moveKey: string,
	oppMarkedPoints: ReadonlySet<string> | undefined
): boolean {
	if (!oppMarkedPoints) return false;
	const borders = getSquareBorderKeys(row, col);
	for (const b of borders) {
		if (b === moveKey || lines.has(b)) continue;
		const [p1, p2] = parseLineKey(b);
		if (oppMarkedPoints.has(pointKey(p1))) return true;
		if (oppMarkedPoints.has(pointKey(p2))) return true;
	}
	return false;
}

function territoryBuildingScore(move: BotMove, ctx: BotContext): number {
	const { boardSize, lines, capturedSquares } = ctx;
	const moveKey = lineKey(move.from, move.to);
	const opp = opponentId(ctx);
	const oppPoints = opp !== -1 ? ctx.markedPoints.get(opp) : undefined;
	let score = 0;

	for (const sq of getAffectedSquares(move.from, move.to, boardSize)) {
		const sqKey = `${sq.row},${sq.col}`;
		if (capturedSquares.has(sqKey)) continue;

		const currentBorders = borderCountWithout(sq.row, sq.col, lines);
		const newBorders = borderCountWithMove(sq.row, sq.col, lines, moveKey);

		if (newBorders === 2 && currentBorders === 1) {
			score += 8;
		} else if (newBorders === 3 && currentBorders === 2) {
			if (!canOpponentComplete(sq.row, sq.col, lines, moveKey, oppPoints)) {
				score += 15;
			} else {
				score -= 40;
			}
		}
	}

	return score;
}

const MAX_CHAIN_DEPTH = 4;

function simulateChainCaptures(move: BotMove, playerId: number, ctx: BotContext): number {
	const simLines = new Map(ctx.lines);
	const simCaptured = new Map(ctx.capturedSquares);
	const simMarked = new Map<number, Set<string>>();
	for (const [pid, pts] of ctx.markedPoints) {
		simMarked.set(pid, new Set(pts));
	}

	return executeChain(move, playerId, ctx.boardSize, simLines, simCaptured, simMarked, 0);
}

function executeChain(
	move: BotMove,
	playerId: number,
	boardSize: number,
	lines: Map<string, number>,
	captured: Map<string, number>,
	marked: Map<number, Set<string>>,
	depth: number
): number {
	const key = lineKey(move.from, move.to);
	lines.set(key, playerId);

	let pts = marked.get(playerId);
	if (!pts) {
		pts = new Set<string>();
		marked.set(playerId, pts);
	}
	pts.add(pointKey(move.to));

	let totalCaptures = 0;
	for (const sq of getAffectedSquares(move.from, move.to, boardSize)) {
		const sqKey = `${sq.row},${sq.col}`;
		if (!captured.has(sqKey) && isSquareFilled(sq.row, sq.col, lines)) {
			captured.set(sqKey, playerId);
			totalCaptures++;
		}
	}

	if (totalCaptures > 0 && depth < MAX_CHAIN_DEPTH) {
		const nextMoves = getValidMoves(playerId, boardSize, lines, marked, captured);
		const capturingMoves = nextMoves.filter(
			(m) => countCaptures(m, boardSize, lines, captured) > 0
		);

		if (capturingMoves.length > 0) {
			let bestAdditional = 0;
			for (const next of capturingMoves) {
				const simLines = new Map(lines);
				const simCaptured = new Map(captured);
				const simMarked = new Map<number, Set<string>>();
				for (const [pid, p] of marked) simMarked.set(pid, new Set(p));

				const additional = executeChain(
					next,
					playerId,
					boardSize,
					simLines,
					simCaptured,
					simMarked,
					depth + 1
				);
				if (additional > bestAdditional) bestAdditional = additional;
			}
			totalCaptures += bestAdditional;
		}
	}

	return totalCaptures;
}

function opponentId(ctx: BotContext): number {
	for (const p of ctx.players) {
		if (p.id !== ctx.currentPlayerId && !p.eliminated) return p.id;
	}
	return -1;
}

function reachableAreaSize(
	playerId: number,
	boardSize: number,
	lines: ReadonlyMap<string, number>,
	markedPoints: ReadonlyMap<number, ReadonlySet<string>>,
	capturedSquares: ReadonlyMap<string, number>
): number {
	const playerPoints = markedPoints.get(playerId);
	if (!playerPoints) return 0;

	const visited = new Set<string>(playerPoints);
	const queue = [...playerPoints];

	let i = 0;
	while (i < queue.length) {
		const pk = queue[i++];
		const [r, c] = pk.split(',').map(Number);
		const point: Point = { row: r, col: c };

		for (const neighbor of getNeighbors(point, boardSize)) {
			const nk = pointKey(neighbor);
			if (visited.has(nk)) continue;

			const lk = lineKey(point, neighbor);
			if (lines.has(lk)) continue;

			if (isDiagonal(point, neighbor)) {
				const sq = getSquareForDiagonal(point, neighbor);
				if (sq && capturedSquares.has(`${sq.row},${sq.col}`)) continue;
			}

			visited.add(nk);
			queue.push(nk);
		}
	}

	return visited.size;
}

function gamePhase(ctx: BotContext): number {
	const totalSquares = ctx.boardSize * ctx.boardSize;
	const captured = ctx.capturedSquares.size;
	return totalSquares > 0 ? captured / totalSquares : 0;
}

function breachScore(move: BotMove, ctx: BotContext): number {
	const opp = opponentId(ctx);
	const myPoints = ctx.markedPoints.get(ctx.currentPlayerId);
	const toKey = pointKey(move.to);
	const isNewTerritory = !myPoints?.has(toKey) ? 1 : 0;

	const center = ctx.boardSize / 2;
	const fromCenterDist = Math.abs(move.from.row - center) + Math.abs(move.from.col - center);
	const toCenterDist = Math.abs(move.to.row - center) + Math.abs(move.to.col - center);
	const centerPull = Math.max(0, fromCenterDist - toCenterDist);

	let oppProximity = 0;
	if (opp !== -1) {
		const oppPoints = ctx.markedPoints.get(opp);
		if (oppPoints && oppPoints.size > 0) {
			let minDist = Infinity;
			for (const pk of oppPoints) {
				const [r, c] = pk.split(',').map(Number);
				const dist = Math.abs(move.to.row - r) + Math.abs(move.to.col - c);
				if (dist < minDist) minDist = dist;
			}
			oppProximity = Math.max(0, ctx.boardSize - minDist);
		}
	}

	return isNewTerritory * 3 + centerPull * 2 + oppProximity;
}

function evaluatePosition(ctx: BotContext): number {
	const myId = ctx.currentPlayerId;
	const opp = opponentId(ctx);

	let myScore = 0;
	let oppScore = 0;
	for (const [, owner] of ctx.capturedSquares) {
		if (owner === myId) myScore++;
		else if (owner === opp) oppScore++;
	}

	return myScore - oppScore;
}

const MINIMAX_MOVE_THRESHOLD = 24;
const MINIMAX_NODE_BUDGET = 20000;

function minimax(
	ctx: BotContext,
	isMaximizing: boolean,
	depth: number,
	alpha: number,
	beta: number,
	activePlayerId: number,
	nodeCount: { value: number },
	deadline: number
): number {
	nodeCount.value++;

	if (nodeCount.value >= MINIMAX_NODE_BUDGET || Date.now() >= deadline) {
		return evaluatePosition(ctx);
	}

	const moves = getValidMoves(
		activePlayerId,
		ctx.boardSize,
		ctx.lines,
		ctx.markedPoints,
		ctx.capturedSquares
	);

	if (moves.length === 0 || depth === 0) {
		return evaluatePosition(ctx);
	}

	const opp = opponentId(ctx);
	let best = isMaximizing ? -Infinity : Infinity;

	for (const move of moves) {
		const simLines = new Map(ctx.lines);
		simLines.set(lineKey(move.from, move.to), activePlayerId);

		const simMarked = new Map<number, Set<string>>();
		for (const [pid, pts] of ctx.markedPoints) simMarked.set(pid, new Set(pts));
		simMarked.get(activePlayerId)?.add(pointKey(move.to));

		const simCaptured = new Map(ctx.capturedSquares);
		let captured = false;
		for (const sq of getAffectedSquares(move.from, move.to, ctx.boardSize)) {
			const sqKey = `${sq.row},${sq.col}`;
			if (!simCaptured.has(sqKey) && isSquareFilled(sq.row, sq.col, simLines)) {
				simCaptured.set(sqKey, activePlayerId);
				captured = true;
			}
		}

		const simCtx: BotContext = {
			...ctx,
			lines: simLines,
			markedPoints: simMarked,
			capturedSquares: simCaptured
		};

		let val: number;
		if (captured) {
			const bonusMoves = getValidMoves(
				activePlayerId,
				ctx.boardSize,
				simLines,
				simMarked,
				simCaptured
			);
			if (bonusMoves.length > 0) {
				val = minimax(
					simCtx,
					isMaximizing,
					depth - 1,
					alpha,
					beta,
					activePlayerId,
					nodeCount,
					deadline
				);
			} else {
				val = minimax(
					simCtx,
					!isMaximizing,
					depth - 1,
					alpha,
					beta,
					activePlayerId === ctx.currentPlayerId ? opp : ctx.currentPlayerId,
					nodeCount,
					deadline
				);
			}
		} else {
			val = minimax(
				simCtx,
				!isMaximizing,
				depth - 1,
				alpha,
				beta,
				activePlayerId === ctx.currentPlayerId ? opp : ctx.currentPlayerId,
				nodeCount,
				deadline
			);
		}

		if (isMaximizing) {
			best = Math.max(best, val);
			alpha = Math.max(alpha, val);
		} else {
			best = Math.min(best, val);
			beta = Math.min(beta, val);
		}

		if (beta <= alpha) break;
		if (nodeCount.value >= MINIMAX_NODE_BUDGET || Date.now() >= deadline) break;
	}

	return best;
}

function totalRemainingMoves(ctx: BotContext): number {
	let total = 0;
	for (const p of ctx.players) {
		if (p.eliminated) continue;
		total += getValidMoves(
			p.id,
			ctx.boardSize,
			ctx.lines,
			ctx.markedPoints,
			ctx.capturedSquares
		).length;
	}
	return total;
}

const TURN_TIME_BUDGET_MS = 700;

export const hardBot: BotStrategy = {
	id: 'hard',
	name: 'Hard',
	description: 'Advanced strategy with territory building, lockout, and endgame solving',
	selectMove(validMoves: BotMove[], context: BotContext): BotMove | null {
		if (validMoves.length === 0) return null;
		if (validMoves.length === 1) return validMoves[0];

		const deadline = Date.now() + TURN_TIME_BUDGET_MS;

		const remaining = totalRemainingMoves(context);
		if (remaining <= MINIMAX_MOVE_THRESHOLD) {
			return selectViaMinimax(validMoves, context, deadline);
		}

		return selectViaHeuristic(validMoves, context, deadline);
	}
};

function selectViaMinimax(validMoves: BotMove[], ctx: BotContext, deadline: number): BotMove {
	const opp = opponentId(ctx);
	let bestScore = -Infinity;
	let bestMove = validMoves[0];

	for (const move of validMoves) {
		if (Date.now() >= deadline) break;

		const simLines = new Map(ctx.lines);
		simLines.set(lineKey(move.from, move.to), ctx.currentPlayerId);

		const simMarked = new Map<number, Set<string>>();
		for (const [pid, pts] of ctx.markedPoints) simMarked.set(pid, new Set(pts));
		simMarked.get(ctx.currentPlayerId)?.add(pointKey(move.to));

		const simCaptured = new Map(ctx.capturedSquares);
		let captured = false;
		for (const sq of getAffectedSquares(move.from, move.to, ctx.boardSize)) {
			const sqKey = `${sq.row},${sq.col}`;
			if (!simCaptured.has(sqKey) && isSquareFilled(sq.row, sq.col, simLines)) {
				simCaptured.set(sqKey, ctx.currentPlayerId);
				captured = true;
			}
		}

		const simCtx: BotContext = {
			...ctx,
			lines: simLines,
			markedPoints: simMarked,
			capturedSquares: simCaptured
		};

		const nodeCount = { value: 0 };
		let score: number;
		if (captured) {
			const bonusMoves = getValidMoves(
				ctx.currentPlayerId,
				ctx.boardSize,
				simLines,
				simMarked,
				simCaptured
			);
			if (bonusMoves.length > 0) {
				score = minimax(
					simCtx,
					true,
					50,
					-Infinity,
					Infinity,
					ctx.currentPlayerId,
					nodeCount,
					deadline
				);
			} else {
				score = minimax(simCtx, false, 50, -Infinity, Infinity, opp, nodeCount, deadline);
			}
		} else {
			score = minimax(simCtx, false, 50, -Infinity, Infinity, opp, nodeCount, deadline);
		}

		if (score > bestScore) {
			bestScore = score;
			bestMove = move;
		}
	}

	return bestMove;
}

const EXPENSIVE_EVAL_TOP_N = 8;

function selectViaHeuristic(validMoves: BotMove[], ctx: BotContext, deadline: number): BotMove {
	const opp = opponentId(ctx);
	const phase = gamePhase(ctx);

	const breachWeight = phase < 0.15 ? 3 : phase < 0.4 ? 2 : 1;
	const territoryWeight = phase < 0.15 ? 0.5 : 1;

	const cheapScored: Array<{ move: BotMove; score: number }> = [];

	for (const move of validMoves) {
		let score = 0;

		const captures = countCaptures(move, ctx.boardSize, ctx.lines, ctx.capturedSquares);
		if (captures > 0) {
			score += captures * 100;
		}

		score += territoryBuildingScore(move, ctx) * territoryWeight;

		score += breachScore(move, ctx) * breachWeight;

		if (!isDiagonal(move.from, move.to)) {
			score += 1;
		}

		cheapScored.push({ move, score });
	}

	cheapScored.sort((a, b) => b.score - a.score);

	const hasCapturingMove = cheapScored[0].score >= 100;
	if (hasCapturingMove) {
		const capturingMoves = cheapScored.filter((s) => s.score >= 100);
		for (const entry of capturingMoves) {
			if (Date.now() >= deadline) break;
			const chainTotal = simulateChainCaptures(entry.move, ctx.currentPlayerId, ctx);
			entry.score = chainTotal * 100 + territoryBuildingScore(entry.move, ctx);
		}
		capturingMoves.sort((a, b) => b.score - a.score);
		const topScore = capturingMoves[0].score;
		const topMoves = capturingMoves.filter((s) => s.score === topScore);
		return topMoves[Math.floor(Math.random() * topMoves.length)].move;
	}

	const topN = cheapScored.slice(0, EXPENSIVE_EVAL_TOP_N);

	if (opp !== -1 && Date.now() < deadline) {
		const oppMoveCountBefore = getValidMoves(
			opp,
			ctx.boardSize,
			ctx.lines,
			ctx.markedPoints,
			ctx.capturedSquares
		).length;

		for (const entry of topN) {
			if (Date.now() >= deadline) break;

			const move = entry.move;
			const moveKey = lineKey(move.from, move.to);

			const simLines = new Map(ctx.lines);
			simLines.set(moveKey, ctx.currentPlayerId);

			const simMarked = new Map<number, Set<string>>();
			for (const [pid, pts] of ctx.markedPoints) simMarked.set(pid, new Set(pts));
			simMarked.get(ctx.currentPlayerId)?.add(pointKey(move.to));

			const simCaptured = new Map(ctx.capturedSquares);
			for (const sq of getAffectedSquares(move.from, move.to, ctx.boardSize)) {
				const sqKey = `${sq.row},${sq.col}`;
				if (!simCaptured.has(sqKey) && isSquareFilled(sq.row, sq.col, simLines)) {
					simCaptured.set(sqKey, ctx.currentPlayerId);
				}
			}

			const oppMovesAfter = getValidMoves(
				opp,
				ctx.boardSize,
				simLines,
				simMarked,
				simCaptured
			).length;
			entry.score += (oppMoveCountBefore - oppMovesAfter) * 10;

			const myReach = reachableAreaSize(
				ctx.currentPlayerId,
				ctx.boardSize,
				simLines,
				simMarked,
				simCaptured
			);
			entry.score += myReach;
		}
	}

	topN.sort((a, b) => b.score - a.score);

	const topScore = topN[0].score;
	const topMoves = topN.filter((s) => s.score === topScore);
	return topMoves[Math.floor(Math.random() * topMoves.length)].move;
}

const botRegistry = new Map<string, BotStrategy>();
botRegistry.set(randomBot.id, randomBot);
botRegistry.set(greedyBot.id, greedyBot);
botRegistry.set(hardBot.id, hardBot);

export function getBotStrategy(id: string): BotStrategy | undefined {
	return botRegistry.get(id);
}

export function getAvailableBots(): BotStrategy[] {
	return Array.from(botRegistry.values());
}

export function registerBot(strategy: BotStrategy): void {
	botRegistry.set(strategy.id, strategy);
}

import type { BotStrategy, BotMove, BotContext, Point } from './types.js';
import { parseLineKey, parsePointKey } from './logic.js';
import init, { select_move } from '../wasm/csq_wasm.js';

let wasmReady = false;
let wasmInitPromise: Promise<void> | null = null;

export async function initWasm(): Promise<void> {
	if (wasmReady) return;
	if (wasmInitPromise) return wasmInitPromise;

	wasmInitPromise = init().then(() => {
		wasmReady = true;
	});

	return wasmInitPromise;
}

export function isWasmReady(): boolean {
	return wasmReady;
}

interface WasmLineEntry {
	from: Point;
	to: Point;
	player_id: number;
}

interface WasmMarkedPointsEntry {
	player_id: number;
	points: Point[];
}

interface WasmCapturedSquareEntry {
	square: Point;
	player_id: number;
}

interface WasmPlayerEntry {
	id: number;
	eliminated: boolean;
	score: number;
}

interface WasmMoveRequest {
	board_size: number;
	current_player_id: number;
	lines: WasmLineEntry[];
	marked_points: WasmMarkedPointsEntry[];
	captured_squares: WasmCapturedSquareEntry[];
	players: WasmPlayerEntry[];
	time_budget_ms: number;
	bot_id: string;
}

function buildWasmRequest(context: BotContext, timeBudgetMs: number, botId: string): WasmMoveRequest {
	const lines: WasmLineEntry[] = [];
	for (const [key, playerId] of context.lines) {
		const [from, to] = parseLineKey(key);
		lines.push({ from, to, player_id: playerId });
	}

	const markedPoints: WasmMarkedPointsEntry[] = [];
	for (const [playerId, points] of context.markedPoints) {
		const pts: Point[] = [];
		for (const pk of points) {
			pts.push(parsePointKey(pk));
		}
		markedPoints.push({ player_id: playerId, points: pts });
	}

	const capturedSquares: WasmCapturedSquareEntry[] = [];
	for (const [key, playerId] of context.capturedSquares) {
		const point = parsePointKey(key);
		capturedSquares.push({ square: { row: point.row, col: point.col }, player_id: playerId });
	}

	const players: WasmPlayerEntry[] = context.players.map((p) => ({
		id: p.id,
		eliminated: p.eliminated,
		score: p.score
	}));

	return {
		board_size: context.boardSize,
		current_player_id: context.currentPlayerId,
		lines,
		marked_points: markedPoints,
		captured_squares: capturedSquares,
		players,
		time_budget_ms: timeBudgetMs,
		bot_id: botId
	};
}

const WASM_TIME_BUDGET_MS = 700;

export const wasmHardBot: BotStrategy = {
	id: 'hard',
	name: 'Hard',
	description: 'Advanced strategy powered by Rust WASM engine',
	selectMove(validMoves: BotMove[], context: BotContext): BotMove | null {
		if (validMoves.length === 0) return null;
		if (validMoves.length === 1) return validMoves[0];

		if (!wasmReady) {
			return validMoves[Math.floor(Math.random() * validMoves.length)];
		}

		const request = buildWasmRequest(context, WASM_TIME_BUDGET_MS, 'hard');
		const resultJson = select_move(JSON.stringify(request));

		if (!resultJson) return null;

		const result = JSON.parse(resultJson) as { from: Point; to: Point };
		return { from: result.from, to: result.to };
	}
};

export const wasmStrongBot: BotStrategy = {
	id: 'strong',
	name: 'Strong',
	description: 'Strongest bot using heuristic evaluation and endgame minimax',
	selectMove(validMoves: BotMove[], context: BotContext): BotMove | null {
		if (validMoves.length === 0) return null;
		if (validMoves.length === 1) return validMoves[0];

		if (!wasmReady) {
			return validMoves[Math.floor(Math.random() * validMoves.length)];
		}

		const request = buildWasmRequest(context, WASM_TIME_BUDGET_MS, 'strong');
		const resultJson = select_move(JSON.stringify(request));

		if (!resultJson) return null;

		const result = JSON.parse(resultJson) as { from: Point; to: Point };
		return { from: result.from, to: result.to };
	}
};

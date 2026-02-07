import type { Player, Point, BotMove } from './types.js';
import { parseLineKey, parsePointKey } from './logic.js';

interface ServerLineEntry {
	from: Point;
	to: Point;
	player_id: number;
}

interface ServerMarkedPointsEntry {
	player_id: number;
	points: Point[];
}

interface ServerCapturedSquareEntry {
	square: Point;
	player_id: number;
}

interface ServerPlayerEntry {
	id: number;
	eliminated: boolean;
	score: number;
}

interface ServerMoveRequest {
	board_size: number;
	current_player_id: number;
	lines: ServerLineEntry[];
	marked_points: ServerMarkedPointsEntry[];
	captured_squares: ServerCapturedSquareEntry[];
	players: ServerPlayerEntry[];
	bot_params?: Record<string, unknown>;
}

interface ServerMoveResponse {
	from: Point;
	to: Point;
}

function buildMoveRequest(
	boardSize: number,
	currentPlayerId: number,
	lines: ReadonlyMap<string, number>,
	markedPoints: ReadonlyMap<number, ReadonlySet<string>>,
	capturedSquares: ReadonlyMap<string, number>,
	players: readonly Player[],
	botParams?: Record<string, unknown>
): ServerMoveRequest {
	const serverLines: ServerLineEntry[] = [];
	for (const [key, playerId] of lines) {
		const [from, to] = parseLineKey(key);
		serverLines.push({ from, to, player_id: playerId });
	}

	const serverMarkedPoints: ServerMarkedPointsEntry[] = [];
	for (const [playerId, points] of markedPoints) {
		const pts: Point[] = [];
		for (const pk of points) {
			pts.push(parsePointKey(pk));
		}
		serverMarkedPoints.push({ player_id: playerId, points: pts });
	}

	const serverCapturedSquares: ServerCapturedSquareEntry[] = [];
	for (const [key, playerId] of capturedSquares) {
		const point = parsePointKey(key);
		serverCapturedSquares.push({ square: { row: point.row, col: point.col }, player_id: playerId });
	}

	const serverPlayers: ServerPlayerEntry[] = players.map((p) => ({
		id: p.id,
		eliminated: p.eliminated,
		score: p.score
	}));

	return {
		board_size: boardSize,
		current_player_id: currentPlayerId,
		lines: serverLines,
		marked_points: serverMarkedPoints,
		captured_squares: serverCapturedSquares,
		players: serverPlayers,
		bot_params: botParams
	};
}

export async function requestServerMove(
	serverUrl: string,
	boardSize: number,
	currentPlayerId: number,
	lines: ReadonlyMap<string, number>,
	markedPoints: ReadonlyMap<number, ReadonlySet<string>>,
	capturedSquares: ReadonlyMap<string, number>,
	players: readonly Player[],
	botParams?: Record<string, unknown>
): Promise<BotMove | null> {
	const body = buildMoveRequest(
		boardSize,
		currentPlayerId,
		lines,
		markedPoints,
		capturedSquares,
		players,
		botParams
	);

	const response = await fetch(`${serverUrl}/move`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		throw new Error(`Server returned ${response.status}: ${response.statusText}`);
	}

	const result: ServerMoveResponse | null = await response.json();
	if (!result) return null;

	return { from: result.from, to: result.to };
}

export async function checkServerHealth(serverUrl: string): Promise<boolean> {
	try {
		const response = await fetch(`${serverUrl}/health`);
		if (!response.ok) return false;
		const data = await response.json();
		return data.status === 'ok';
	} catch {
		return false;
	}
}

export interface ServerParamDescriptor {
	name: string;
	label: string;
	param_type: string;
	default_value: unknown;
	min?: unknown;
	max?: unknown;
	description: string;
}

export async function fetchServerBotParams(
	serverUrl: string
): Promise<ServerParamDescriptor[] | null> {
	try {
		const response = await fetch(`${serverUrl}/bot-params`);
		if (!response.ok) return null;
		const data = await response.json();
		return data.params ?? null;
	} catch {
		return null;
	}
}

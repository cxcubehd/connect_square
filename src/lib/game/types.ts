export interface Point {
	row: number;
	col: number;
}

export interface Player {
	id: number;
	name: string;
	color: string;
	type: 'human' | 'bot' | 'server';
	botStrategyId: string | null;
	serverUrl?: string;
	serverBotParams?: Record<string, unknown>;
	eliminated: boolean;
	score: number;
}

export interface PlayerConfig {
	name: string;
	color: string;
	type: 'human' | 'bot' | 'server';
	botStrategyId: string | null;
	serverUrl?: string;
	serverBotParams?: Record<string, unknown>;
}

export type GamePhase = 'setup' | 'playing' | 'finished';

export interface MoveRecord {
	playerId: number;
	from: Point;
	to: Point;
	capturedSquares: string[];
}

export interface BotMove {
	from: Point;
	to: Point;
}

export interface BotStrategy {
	id: string;
	name: string;
	description: string;
	selectMove(validMoves: BotMove[], context: BotContext): BotMove | null;
}

export interface BotContext {
	boardSize: number;
	lines: ReadonlyMap<string, number>;
	markedPoints: ReadonlyMap<number, ReadonlySet<string>>;
	capturedSquares: ReadonlyMap<string, number>;
	currentPlayerId: number;
	players: readonly Player[];
}

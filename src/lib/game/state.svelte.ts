import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { Player, PlayerConfig, GamePhase, Point, MoveRecord, BotContext } from './types.js';
import {
	pointKey,
	lineKey,
	getValidMoves,
	isValidMove,
	checkCapturesForMove,
	getStartingCorners,
	getTotalSquares
} from './logic.js';
import { getBotStrategy } from './bot.js';

export class GameState {
	boardSize = $state(6);
	players: Player[] = $state([]);
	lines = new SvelteMap<string, number>();
	markedPoints = new SvelteMap<number, SvelteSet<string>>();
	capturedSquares = new SvelteMap<string, number>();
	currentPlayerIndex = $state(0);
	phase: GamePhase = $state('setup');
	selectedPoint: Point | null = $state(null);
	moveHistory: MoveRecord[] = $state([]);
	editMode = $state(false);
	lastCaptures: string[] = $state([]);
	winner: Player | null = $state(null);
	isBotThinking = $state(false);
	lastMoveFrom: Point | null = $state(null);
	lastMoveTo: Point | null = $state(null);
	lastMoveLineKey: string | null = $state(null);
	private botTimeout: ReturnType<typeof setTimeout> | null = null;

	get currentPlayer(): Player | undefined {
		return this.players[this.currentPlayerIndex];
	}

	get scores(): Array<{ player: Player; score: number }> {
		return this.players.map((p) => ({
			player: p,
			score: [...this.capturedSquares.values()].filter((id) => id === p.id).length
		}));
	}

	get activePlayers(): Player[] {
		return this.players.filter((p) => !p.eliminated);
	}

	get totalSquares(): number {
		return getTotalSquares(this.boardSize);
	}

	get capturedCount(): number {
		return this.capturedSquares.size;
	}

	validMovesForCurrentPlayer(): Array<{ from: Point; to: Point }> {
		const player = this.currentPlayer;
		if (!player) return [];
		return getValidMoves(
			player.id,
			this.boardSize,
			this.lines,
			this.markedPoints,
			this.capturedSquares
		);
	}

	startGame(boardSize: number, configs: PlayerConfig[]) {
		this.boardSize = boardSize;
		this.lines.clear();
		this.markedPoints.clear();
		this.capturedSquares.clear();
		this.moveHistory = [];
		this.selectedPoint = null;
		this.editMode = false;
		this.lastCaptures = [];
		this.winner = null;
		this.isBotThinking = false;
		this.lastMoveFrom = null;
		this.lastMoveTo = null;
		this.lastMoveLineKey = null;

		if (this.botTimeout) {
			clearTimeout(this.botTimeout);
			this.botTimeout = null;
		}

		this.players = configs.map((c, i) => ({
			id: i,
			name: c.name,
			color: c.color,
			type: c.type,
			botStrategyId: c.botStrategyId,
			eliminated: false,
			score: 0
		}));

		const corners = getStartingCorners(boardSize, configs.length);
		corners.forEach((corner, i) => {
			const pSet = new SvelteSet<string>();
			pSet.add(pointKey(corner));
			this.markedPoints.set(i, pSet);
		});

		this.currentPlayerIndex = 0;
		this.phase = 'playing';
		this.scheduleBotMoveIfNeeded();
	}

	selectPoint(point: Point) {
		if (this.phase !== 'playing' || this.editMode) return;

		const player = this.currentPlayer;
		if (!player || player.type !== 'human') return;

		if (this.selectedPoint) {
			if (this.selectedPoint.row === point.row && this.selectedPoint.col === point.col) {
				this.selectedPoint = null;
				return;
			}

			if (
				isValidMove(
					this.selectedPoint,
					point,
					player.id,
					this.boardSize,
					this.lines,
					this.markedPoints,
					this.capturedSquares
				)
			) {
				this.executeMove(this.selectedPoint, point);
				return;
			}

			const playerPoints = this.markedPoints.get(player.id);
			if (playerPoints?.has(pointKey(point))) {
				this.selectedPoint = point;
				return;
			}

			this.selectedPoint = null;
			return;
		}

		const playerPoints = this.markedPoints.get(player.id);
		if (playerPoints?.has(pointKey(point))) {
			const moves = getValidMoves(
				player.id,
				this.boardSize,
				this.lines,
				this.markedPoints,
				this.capturedSquares
			);
			const hasMovesFrom = moves.some((m) => m.from.row === point.row && m.from.col === point.col);
			if (hasMovesFrom) {
				this.selectedPoint = point;
			}
		}
	}

	executeMove(from: Point, to: Point) {
		const player = this.currentPlayer;
		if (!player) return;

		const key = lineKey(from, to);
		this.lines.set(key, player.id);
		this.lastMoveFrom = from;
		this.lastMoveTo = to;
		this.lastMoveLineKey = key;

		let playerPoints = this.markedPoints.get(player.id);
		if (!playerPoints) {
			playerPoints = new SvelteSet<string>();
			this.markedPoints.set(player.id, playerPoints);
		}
		playerPoints.add(pointKey(to));

		const captures = checkCapturesForMove(
			from,
			to,
			this.boardSize,
			this.lines,
			this.capturedSquares
		);

		for (const sqKey of captures) {
			this.capturedSquares.set(sqKey, player.id);
		}

		this.lastCaptures = captures;
		this.moveHistory = [
			...this.moveHistory,
			{ playerId: player.id, from, to, capturedSquares: captures }
		];

		this.selectedPoint = null;
		this.updateScores();

		if (captures.length > 0) {
			const remainingMoves = getValidMoves(
				player.id,
				this.boardSize,
				this.lines,
				this.markedPoints,
				this.capturedSquares
			);
			if (remainingMoves.length > 0) {
				this.scheduleBotMoveIfNeeded();
				return;
			}
		}

		this.advanceTurn();
	}

	private updateScores() {
		this.players = this.players.map((p) => ({
			...p,
			score: [...this.capturedSquares.values()].filter((id) => id === p.id).length
		}));
	}

	private advanceTurn() {
		if (this.capturedSquares.size >= this.totalSquares) {
			this.endGame();
			return;
		}

		this.checkEliminations();

		const active = this.activePlayers;
		if (active.length === 0) {
			this.endGame();
			return;
		}

		if (active.length === 1) {
			this.awardLastSurvivor(active[0]);
			this.endGame();
			return;
		}

		let attempts = 0;
		do {
			this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
			attempts++;
		} while (this.players[this.currentPlayerIndex].eliminated && attempts < this.players.length);

		if (attempts >= this.players.length) {
			this.endGame();
			return;
		}

		this.scheduleBotMoveIfNeeded();
	}

	private checkEliminations() {
		for (const player of this.players) {
			if (player.eliminated) continue;
			const moves = getValidMoves(
				player.id,
				this.boardSize,
				this.lines,
				this.markedPoints,
				this.capturedSquares
			);
			if (moves.length === 0) {
				player.eliminated = true;
			}
		}
		this.players = [...this.players];
	}

	private awardLastSurvivor(survivor: Player) {
		for (let r = 0; r < this.boardSize; r++) {
			for (let c = 0; c < this.boardSize; c++) {
				const key = `${r},${c}`;
				if (!this.capturedSquares.has(key)) {
					this.capturedSquares.set(key, survivor.id);
				}
			}
		}
		this.updateScores();
	}

	private endGame() {
		this.phase = 'finished';
		this.selectedPoint = null;
		this.isBotThinking = false;

		if (this.botTimeout) {
			clearTimeout(this.botTimeout);
			this.botTimeout = null;
		}

		const maxScore = Math.max(...this.players.map((p) => p.score));
		const winners = this.players.filter((p) => p.score === maxScore);
		this.winner = winners.length === 1 ? winners[0] : null;
	}

	private scheduleBotMoveIfNeeded() {
		const player = this.currentPlayer;
		if (!player || player.type !== 'bot' || this.phase !== 'playing') return;

		this.isBotThinking = true;

		this.botTimeout = setTimeout(() => {
			this.executeBotMove();
		}, 400);
	}

	private executeBotMove() {
		const player = this.currentPlayer;
		if (!player || player.type !== 'bot' || this.phase !== 'playing') {
			this.isBotThinking = false;
			return;
		}

		const strategy = getBotStrategy(player.botStrategyId ?? 'random');
		if (!strategy) {
			this.isBotThinking = false;
			return;
		}

		const validMoves = this.validMovesForCurrentPlayer();
		if (validMoves.length === 0) {
			this.isBotThinking = false;
			this.advanceTurn();
			return;
		}

		const context: BotContext = {
			boardSize: this.boardSize,
			lines: this.lines,
			markedPoints: this.markedPoints,
			capturedSquares: this.capturedSquares,
			currentPlayerId: player.id,
			players: this.players
		};

		const move = strategy.selectMove(validMoves, context);
		this.isBotThinking = false;

		if (move) {
			this.executeMove(move.from, move.to);
		} else {
			this.advanceTurn();
		}
	}

	toggleEditMode() {
		this.editMode = !this.editMode;
		this.selectedPoint = null;
	}

	editToggleLine(from: Point, to: Point, playerId: number) {
		if (!this.editMode || this.phase !== 'playing') return;

		const key = lineKey(from, to);
		if (this.lines.has(key)) {
			this.lines.delete(key);
			const affected = checkCapturesForMove(
				from,
				to,
				this.boardSize,
				this.lines,
				this.capturedSquares
			);
			for (const sqKey of [...this.capturedSquares.keys()]) {
				if (!affected.includes(sqKey)) continue;
				this.capturedSquares.delete(sqKey);
			}
		} else {
			this.lines.set(key, playerId);
			let playerPoints = this.markedPoints.get(playerId);
			if (!playerPoints) {
				playerPoints = new SvelteSet<string>();
				this.markedPoints.set(playerId, playerPoints);
			}
			playerPoints.add(pointKey(from));
			playerPoints.add(pointKey(to));

			const captures = checkCapturesForMove(
				from,
				to,
				this.boardSize,
				this.lines,
				this.capturedSquares
			);
			for (const sqKey of captures) {
				this.capturedSquares.set(sqKey, playerId);
			}
		}
		this.updateScores();
	}

	assignBot(playerIndex: number, botId: string | null) {
		if (playerIndex < 0 || playerIndex >= this.players.length) return;
		this.players[playerIndex] = {
			...this.players[playerIndex],
			type: botId ? 'bot' : 'human',
			botStrategyId: botId
		};
		this.players = [...this.players];

		if (
			botId &&
			this.currentPlayerIndex === playerIndex &&
			this.phase === 'playing' &&
			!this.isBotThinking
		) {
			this.scheduleBotMoveIfNeeded();
		}
	}

	reset() {
		if (this.botTimeout) {
			clearTimeout(this.botTimeout);
			this.botTimeout = null;
		}
		this.phase = 'setup';
		this.lines.clear();
		this.markedPoints.clear();
		this.capturedSquares.clear();
		this.players = [];
		this.currentPlayerIndex = 0;
		this.selectedPoint = null;
		this.moveHistory = [];
		this.editMode = false;
		this.lastCaptures = [];
		this.winner = null;
		this.isBotThinking = false;
		this.lastMoveFrom = null;
		this.lastMoveTo = null;
		this.lastMoveLineKey = null;
	}
}

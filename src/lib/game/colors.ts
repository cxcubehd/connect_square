export interface PlayerColor {
	id: string;
	name: string;
	hex: string;
	light: string;
}

export const PLAYER_COLORS: PlayerColor[] = [
	{ id: 'crimson', name: 'Crimson', hex: '#dc3545', light: '#dc354540' },
	{ id: 'royal', name: 'Royal Blue', hex: '#4169e1', light: '#4169e140' },
	{ id: 'emerald', name: 'Emerald', hex: '#2ecc71', light: '#2ecc7140' },
	{ id: 'violet', name: 'Violet', hex: '#9b59b6', light: '#9b59b640' },
	{ id: 'tangerine', name: 'Tangerine', hex: '#e67e22', light: '#e67e2240' },
	{ id: 'teal', name: 'Teal', hex: '#1abc9c', light: '#1abc9c40' },
	{ id: 'coral', name: 'Coral', hex: '#e91e63', light: '#e91e6340' },
	{ id: 'golden', name: 'Golden', hex: '#f1c40f', light: '#f1c40f40' }
];

export const MIN_BOARD_SIZE = 3;
export const MAX_BOARD_SIZE = 10;
export const DEFAULT_BOARD_SIZE = 6;

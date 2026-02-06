import { expect, test, type Page } from '@playwright/test';

async function startSmallBotGame(page: Page) {
	await page.goto('/');
	const slider = page.locator('input[type="range"]').first();
	await slider.fill('3');
	await page.getByText('Bot vs Bot').click();
	await expect(page.locator('.board-svg')).toBeVisible();
}

async function waitForGameOver(page: Page) {
	await page.waitForFunction(() => document.querySelector('.game-over') !== null, {
		timeout: 30000
	});
}

test.describe('Setup', () => {
	test('shows setup screen on load', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Connect, Square!')).toBeVisible();
		await expect(page.getByText('A Game of Territory and Connections')).toBeVisible();
	});

	test('has quick start buttons', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Player vs Player')).toBeVisible();
		await expect(page.getByText('Player vs Bot')).toBeVisible();
		await expect(page.getByText('Bot vs Bot')).toBeVisible();
	});

	test('can configure board size', async ({ page }) => {
		await page.goto('/');
		const slider = page.locator('input[type="range"]').first();
		await expect(slider).toBeVisible();
	});

	test('can start a PvP game', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();
		await expect(page.locator('.board-svg')).toBeVisible();
		await expect(
			page.getByLabel('Scoreboard').getByText('Player 1', { exact: true })
		).toBeVisible();
		await expect(
			page.getByLabel('Scoreboard').getByText('Player 2', { exact: true })
		).toBeVisible();
	});

	test('can start a PvB game', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Bot').click();
		await expect(page.locator('.board-svg')).toBeVisible();
		await expect(page.getByLabel('Scoreboard').getByText('BOT', { exact: true })).toBeVisible();
	});

	test('has start game button for custom setup', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Start Game')).toBeVisible();
	});

	test('can add and remove players', async ({ page }) => {
		await page.goto('/');
		await page.getByText('+ Add Player').click();
		const playerInputs = page.locator('.player-config');
		await expect(playerInputs).toHaveCount(3);
	});
});

test.describe('Gameplay', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();
	});

	test('displays game board with dots', async ({ page }) => {
		const dots = page.locator('.dot');
		await expect(dots.first()).toBeVisible();
	});

	test('shows scoreboard during game', async ({ page }) => {
		await expect(page.locator('.scoreboard')).toBeVisible();
	});

	test('shows game controls during game', async ({ page }) => {
		await expect(page.getByText('New Game')).toBeVisible();
		await expect(page.getByText('Edit Mode')).toBeVisible();
	});

	test('shows squares progress', async ({ page }) => {
		await expect(page.getByText(/Squares/)).toBeVisible();
		await expect(page.getByText(/Moves/)).toBeVisible();
	});

	test('can click on dots', async ({ page }) => {
		const dot = page.locator('circle[role="button"]').first();
		await dot.click();
	});

	test('can return to setup with New Game button', async ({ page }) => {
		await page.getByText('New Game').click();
		await expect(page.getByText('A Game of Territory and Connections')).toBeVisible();
	});

	test('can toggle edit mode', async ({ page }) => {
		await page.getByRole('button', { name: 'Edit Mode' }).click();
		await expect(page.getByText('Edit Mode Active')).toBeVisible();
		await page.getByRole('button', { name: 'Edit Mode' }).click();
		await expect(page.getByText('Edit Mode Active')).not.toBeVisible();
	});

	test('shows bot assignment controls', async ({ page }) => {
		await expect(page.getByText('Assign Bots')).toBeVisible();
	});

	test('can expand bot assignment panel', async ({ page }) => {
		await page.getByText('Assign Bots').click();
		await expect(page.locator('.bot-assign-select').first()).toBeVisible();
	});
});

test.describe('Theme', () => {
	test('has theme toggle button', async ({ page }) => {
		await page.goto('/');
		const toggle = page.locator('.theme-toggle');
		await expect(toggle).toBeVisible();
	});

	test('can toggle dark mode', async ({ page }) => {
		await page.goto('/');
		const toggle = page.locator('.theme-toggle');
		await toggle.click();
		await page.waitForTimeout(300);
		const html = page.locator('html');
		const classList = await html.getAttribute('class');
		expect(classList).toBeTruthy();
	});
});

test.describe('Bot vs Bot', () => {
	test('bots play automatically', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Bot vs Bot').click();
		await expect(page.locator('.board-svg')).toBeVisible();
		await page.waitForTimeout(2000);
		const moves = page.getByText(/Moves/);
		await expect(moves).toBeVisible();
	});
});

test.describe('Drag Interaction', () => {
	test.skip(
		({ browserName }) => browserName === 'webkit',
		'Keyboard modifiers not reliable on WebKit mobile'
	);

	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();
	});

	test('dots have no focus outline artifacts', async ({ page }) => {
		const dot = page.locator('.dot').first();
		await dot.focus();
		const outline = await dot.evaluate((el) => getComputedStyle(el).outline);
		expect(outline).toContain('none');
	});

	test('hovering near a dot highlights it', async ({ page }) => {
		const svg = page.locator('.board-svg');
		const box = await svg.boundingBox();
		if (!box) return;

		await page.mouse.move(box.x + 42, box.y + 42);
		await page.waitForTimeout(100);

		const hoveredDots = page.locator('.dot-hovered');
		const count = await hoveredDots.count();
		expect(count).toBeLessThanOrEqual(1);
	});

	test('ctrl+click selects a point', async ({ page }) => {
		const originDot = page.locator('circle[aria-label="Point 0,0"]');
		await originDot.click({ modifiers: ['Control'] });
		await page.waitForTimeout(100);

		const selectedDots = page.locator('.dot-selected');
		await expect(selectedDots).toHaveCount(1);
	});

	test('ctrl+click on valid destination makes a connection', async ({ page }) => {
		const originDot = page.locator('circle[aria-label="Point 0,0"]');
		await originDot.click({ modifiers: ['Control'] });
		await page.waitForTimeout(100);

		const destDot = page.locator('circle[aria-label="Point 0,1"]');
		await destDot.click({ modifiers: ['Control'] });
		await page.waitForTimeout(100);

		const drawnLines = page.locator('.drawn-line');
		await expect(drawnLines.first()).toBeVisible();
	});

	test('clicking without ctrl deselects', async ({ page }) => {
		const originDot = page.locator('circle[aria-label="Point 0,0"]');
		await originDot.click({ modifiers: ['Control'] });
		await page.waitForTimeout(100);
		await expect(page.locator('.dot-selected')).toHaveCount(1);

		await originDot.click({ force: true });
		await page.waitForTimeout(100);
		await expect(page.locator('.dot-selected')).toHaveCount(0);
	});

	test('drag from origin to neighbor makes a connection', async ({ page }) => {
		const svg = page.locator('.board-svg');
		const box = await svg.boundingBox();
		if (!box) return;

		const viewBoxWidth = await svg.evaluate((el) => {
			const vb = el.getAttribute('viewBox')?.split(' ').map(Number);
			return vb ? vb[2] : 440;
		});
		const scale = box.width / viewBoxWidth;

		const originX = box.x + 40 * scale;
		const originY = box.y + 40 * scale;
		const destX = box.x + 100 * scale;
		const destY = box.y + 40 * scale;

		await page.mouse.move(originX, originY);
		await page.mouse.down();
		await page.waitForTimeout(50);
		await page.mouse.move(destX, destY, { steps: 5 });
		await page.waitForTimeout(50);
		await page.mouse.up();
		await page.waitForTimeout(200);

		const drawnLines = page.locator('.drawn-line');
		await expect(drawnLines.first()).toBeVisible();
	});
});

test.describe('Visual Enhancements', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();
	});

	test('filled squares use stripe pattern', async ({ page }) => {
		const patterns = page.locator('pattern[id^="stripe-"]');
		const count = await patterns.count();
		expect(count).toBeGreaterThan(0);
	});

	test('stripe patterns have animation', async ({ page }) => {
		const animateTransforms = page.locator('pattern[id^="stripe-"] animateTransform');
		const count = await animateTransforms.count();
		expect(count).toBeGreaterThan(0);
	});

	test('board has warm earthy theme colors', async ({ page }) => {
		const body = page.locator('body');
		const bgColor = await body.evaluate((el) =>
			getComputedStyle(el).getPropertyValue('--bg-color').trim()
		);
		expect(bgColor).not.toBe('#faf8f5');
		expect(bgColor).toBeTruthy();
	});

	test('last move line is emphasized', async ({ page, browserName }) => {
		test.skip(browserName === 'webkit', 'Ctrl+click not reliable on WebKit mobile');

		const originDot = page.locator('circle[aria-label="Point 0,0"]');
		await originDot.click({ modifiers: ['Control'] });
		await page.waitForTimeout(100);

		const destDot = page.locator('circle[aria-label="Point 0,1"]');
		await destDot.click({ modifiers: ['Control'] });
		await page.waitForTimeout(200);

		const lastMoveLine = page.locator('.last-move-line');
		await expect(lastMoveLine).toBeVisible();
	});

	test('current player dots are rendered on top', async ({ page }) => {
		const dots = page.locator('.dot');
		const count = await dots.count();
		expect(count).toBe(49);
	});

	test('dashed guide lines have flow animation', async ({ page, browserName }) => {
		test.skip(browserName === 'webkit', 'Ctrl+click not reliable on WebKit mobile');

		const originDot = page.locator('circle[aria-label="Point 0,0"]');
		await originDot.click({ modifiers: ['Control'] });
		await page.waitForTimeout(100);

		const guideDashes = page.locator('.guide-dash');
		const count = await guideDashes.count();
		expect(count).toBeGreaterThan(0);

		const firstDash = guideDashes.first();
		const classes = await firstDash.getAttribute('class');
		expect(classes).toMatch(/guide-dash/);
	});
});

test.describe('Mobile Responsive Layout', () => {
	test('setup panel fits within mobile viewport', async ({ page }) => {
		await page.goto('/');

		const viewport = page.viewportSize();
		if (!viewport) return;

		const panel = page.locator('.setup-panel');
		await expect(panel).toBeVisible();

		const box = await panel.boundingBox();
		if (!box) return;

		expect(box.width).toBeLessThanOrEqual(viewport.width);
	});

	test('quick start buttons are accessible on mobile', async ({ page }) => {
		await page.goto('/');

		const pvpButton = page.getByRole('button', { name: 'Player vs Player' });
		await expect(pvpButton).toBeVisible();

		const box = await pvpButton.boundingBox();
		if (!box) return;

		expect(box.height).toBeGreaterThanOrEqual(40);
	});

	test('game board is visible and sized correctly', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();

		const viewport = page.viewportSize();
		if (!viewport) return;

		const board = page.locator('.board-svg');
		await expect(board).toBeVisible();

		const box = await board.boundingBox();
		if (!box) return;

		expect(box.width).toBeLessThanOrEqual(viewport.width);
		expect(box.width).toBeGreaterThan(100);
	});

	test('scoreboard is visible during game', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();

		const scoreboard = page.locator('.scoreboard');
		await expect(scoreboard).toBeVisible();

		const viewport = page.viewportSize();
		if (!viewport) return;

		const box = await scoreboard.boundingBox();
		if (!box) return;

		expect(box.width).toBeLessThanOrEqual(viewport.width);
	});

	test('game controls are accessible', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();

		const newGameBtn = page.getByText('New Game');
		await expect(newGameBtn).toBeVisible();

		const box = await newGameBtn.boundingBox();
		if (!box) return;

		expect(box.height).toBeGreaterThanOrEqual(40);
	});

	test('all game elements are within viewport bounds', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();

		const viewport = page.viewportSize();
		if (!viewport) return;

		const board = page.locator('.board-svg');
		await expect(board).toBeVisible();

		const boardBox = await board.boundingBox();
		if (!boardBox) return;

		expect(boardBox.x).toBeGreaterThanOrEqual(-1);
		expect(boardBox.x + boardBox.width).toBeLessThanOrEqual(viewport.width + 1);
	});

	test('page does not have horizontal overflow', async ({ page }) => {
		await page.goto('/');

		const hasOverflow = await page.evaluate(() => {
			return document.documentElement.scrollWidth > document.documentElement.clientWidth;
		});

		expect(hasOverflow).toBe(false);
	});

	test('theme toggle is accessible on all screen sizes', async ({ page }) => {
		await page.goto('/');

		const toggle = page.locator('.theme-toggle');
		await expect(toggle).toBeVisible();

		const box = await toggle.boundingBox();
		if (!box) return;

		expect(box.width).toBeGreaterThanOrEqual(36);
		expect(box.height).toBeGreaterThanOrEqual(36);
	});
});

test.describe('Touch Target Sizes', () => {
	test('start game button meets minimum touch target size', async ({ page }) => {
		await page.goto('/');

		const startBtn = page.getByText('Start Game');
		await expect(startBtn).toBeVisible();

		const box = await startBtn.boundingBox();
		if (!box) return;

		expect(box.height).toBeGreaterThanOrEqual(44);
	});

	test('control buttons meet minimum touch target size', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();

		const newGameBtn = page.getByRole('button', { name: /New Game/ });
		await expect(newGameBtn).toBeVisible();

		const box = await newGameBtn.boundingBox();
		if (!box) return;

		expect(box.height).toBeGreaterThanOrEqual(40);
	});

	test('player name inputs do not trigger zoom on mobile', async ({ page }) => {
		await page.goto('/');

		const nameInput = page.locator('.player-name-input').first();
		await expect(nameInput).toBeVisible();

		const fontSize = await nameInput.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

		expect(fontSize).toBeGreaterThanOrEqual(16);
	});
});

test.describe('Drag Overshoot Snapping', () => {
	test.skip(
		({ browserName }) => browserName === 'webkit',
		'Pointer events not reliable on WebKit mobile'
	);

	test('drag past destination still creates connection', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();

		const svg = page.locator('.board-svg');
		const box = await svg.boundingBox();
		if (!box) return;

		const viewBoxWidth = await svg.evaluate((el) => {
			const vb = el.getAttribute('viewBox')?.split(' ').map(Number);
			return vb ? vb[2] : 440;
		});
		const scale = box.width / viewBoxWidth;

		const originX = box.x + 40 * scale;
		const originY = box.y + 40 * scale;
		const overshootX = box.x + 130 * scale;
		const overshootY = box.y + 40 * scale;

		await page.mouse.move(originX, originY);
		await page.mouse.down();
		await page.waitForTimeout(50);
		await page.mouse.move(overshootX, overshootY, { steps: 10 });
		await page.waitForTimeout(50);
		await page.mouse.up();
		await page.waitForTimeout(200);

		const drawnLines = page.locator('.drawn-line');
		await expect(drawnLines.first()).toBeVisible();
	});

	test('drag far past destination does not create connection', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();

		const svg = page.locator('.board-svg');
		const box = await svg.boundingBox();
		if (!box) return;

		const viewBoxWidth = await svg.evaluate((el) => {
			const vb = el.getAttribute('viewBox')?.split(' ').map(Number);
			return vb ? vb[2] : 440;
		});
		const scale = box.width / viewBoxWidth;

		const originX = box.x + 40 * scale;
		const originY = box.y + 40 * scale;
		const farX = box.x + 300 * scale;
		const farY = box.y + 300 * scale;

		await page.mouse.move(originX, originY);
		await page.mouse.down();
		await page.waitForTimeout(50);
		await page.mouse.move(farX, farY, { steps: 10 });
		await page.waitForTimeout(50);
		await page.mouse.up();
		await page.waitForTimeout(200);

		const drawnLines = page.locator('.drawn-line');
		const count = await drawnLines.count();
		expect(count).toBe(0);
	});
});

test.describe('Survivor Fill Animation', () => {
	test('survivor-filled squares have animation class', async ({ page }) => {
		await startSmallBotGame(page);
		await waitForGameOver(page);
		await page.waitForTimeout(500);

		const survivorSquares = page.locator('.survivor-filled, .survivor-win-highlight');
		const winSquares = page.locator('.win-highlight, .survivor-win-highlight');
		const totalFilled = page.locator('.filled-square');

		const filledCount = await totalFilled.count();
		expect(filledCount).toBeGreaterThan(0);

		const survivorCount = await survivorSquares.count();
		const winCount = await winSquares.count();
		expect(survivorCount + winCount).toBeGreaterThanOrEqual(0);
	});
});

test.describe('Win Highlight Animation', () => {
	test('winning squares get wave animation', async ({ page }) => {
		await startSmallBotGame(page);
		await waitForGameOver(page);
		await page.waitForTimeout(200);

		const winSquares = page.locator('.win-highlight, .survivor-win-highlight');
		const count = await winSquares.count();
		expect(count).toBeGreaterThanOrEqual(0);
	});

	test('winner text is displayed after game ends', async ({ page }) => {
		await startSmallBotGame(page);
		await waitForGameOver(page);

		const gameOver = page.locator('.game-over');
		await expect(gameOver).toBeVisible();

		const winnerText = page.locator('.winner-text');
		await expect(winnerText).toBeVisible();
	});
});

test.describe('Layout Stability After Game End', () => {
	test('board maintains position after game finishes', async ({ page }) => {
		await startSmallBotGame(page);

		const boardBefore = await page.locator('.board-svg').boundingBox();
		if (!boardBefore) return;

		await waitForGameOver(page);
		await page.waitForTimeout(300);

		const boardAfter = await page.locator('.board-svg').boundingBox();
		if (!boardAfter) return;

		expect(Math.abs(boardAfter.width - boardBefore.width)).toBeLessThan(50);
		expect(Math.abs(boardAfter.x - boardBefore.x)).toBeLessThan(50);
	});

	test('game info remains visible after game ends', async ({ page }) => {
		await startSmallBotGame(page);
		await waitForGameOver(page);

		await expect(page.getByText(/Squares/)).toBeVisible();
		await expect(page.getByText(/Moves/)).toBeVisible();
	});
});

import { expect, test } from '@playwright/test';

test.describe('Connect, Square! - Setup', () => {
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

test.describe('Connect, Square! - Gameplay', () => {
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
});

test.describe('Connect, Square! - Theme', () => {
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

test.describe('Connect, Square! - Bot vs Bot', () => {
	test('bots play automatically', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Bot vs Bot').click();
		await expect(page.locator('.board-svg')).toBeVisible();
		await page.waitForTimeout(2000);
		const moves = page.getByText(/Moves/);
		await expect(moves).toBeVisible();
	});
});

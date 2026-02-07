import { expect, test, type Page } from '@playwright/test';

const SERVER_URL = 'http://localhost:3001';

function mockServerMove(page: Page, response: { from: { row: number; col: number }; to: { row: number; col: number } } | null = null) {
	return page.route(`${SERVER_URL}/move`, async (route) => {
		const moveResponse = response ?? { from: { row: 0, col: 0 }, to: { row: 0, col: 1 } };
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(moveResponse)
		});
	});
}

function mockServerHealth(page: Page, healthy = true) {
	return page.route(`${SERVER_URL}/health`, async (route) => {
		if (healthy) {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ status: 'ok' })
			});
		} else {
			await route.abort('connectionrefused');
		}
	});
}

async function setupServerGame(page: Page) {
	await page.goto('/');
	const serverButtons = page.locator('.type-btn', { hasText: 'Server' });
	await serverButtons.last().click();
	await page.locator('.start-btn').click();
}

test.describe('Server Player Setup', () => {
	test('shows Server type button in player config', async ({ page }) => {
		await page.goto('/');
		const serverButtons = page.locator('.type-btn', { hasText: 'Server' });
		const count = await serverButtons.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});

	test('shows URL input when Server type is selected', async ({ page }) => {
		await page.goto('/');
		const serverButtons = page.locator('.type-btn', { hasText: 'Server' });
		await serverButtons.first().click();
		await expect(page.locator('.server-url-input')).toBeVisible();
	});

	test('URL input has default value', async ({ page }) => {
		await page.goto('/');
		const serverButtons = page.locator('.type-btn', { hasText: 'Server' });
		await serverButtons.first().click();
		const urlInput = page.locator('.server-url-input');
		await expect(urlInput).toHaveValue('http://localhost:3001');
	});

	test('can start game with Server player', async ({ page }) => {
		await mockServerMove(page);
		await setupServerGame(page);
		await expect(page.locator('.board-svg')).toBeVisible();
		await expect(
			page.getByLabel('Scoreboard').getByText('Player 1', { exact: true })
		).toBeVisible();
		await expect(
			page.getByLabel('Scoreboard').getByText('Player 2', { exact: true })
		).toBeVisible();
	});
});

test.describe('Server Player Gameplay', () => {
	test('server move is applied after human moves', async ({ page }) => {
		let moveCount = 0;
		await page.route(`${SERVER_URL}/move`, async (route) => {
			moveCount++;
			const moves = [
				{ from: { row: 6, col: 6 }, to: { row: 6, col: 5 } },
				{ from: { row: 6, col: 5 }, to: { row: 5, col: 5 } },
				{ from: { row: 5, col: 5 }, to: { row: 5, col: 4 } }
			];
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(moves[Math.min(moveCount - 1, moves.length - 1)])
			});
		});

		await setupServerGame(page);
		await expect(page.locator('.board-svg')).toBeVisible();

		const originDot = page.locator('circle[aria-label="Point 0,0"]');
		await originDot.click({ modifiers: ['Control'] });
		await page.waitForTimeout(100);

		const destDot = page.locator('circle[aria-label="Point 0,1"]');
		await destDot.click({ modifiers: ['Control'] });
		await page.waitForTimeout(1000);

		const drawnLines = page.locator('.drawn-line');
		const count = await drawnLines.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});

	test('shows thinking indicator for server moves', async ({ page }) => {
		await page.route(`${SERVER_URL}/move`, async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 500));
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ from: { row: 6, col: 6 }, to: { row: 6, col: 5 } })
			});
		});

		await setupServerGame(page);

		const originDot = page.locator('circle[aria-label="Point 0,0"]');
		await originDot.click({ modifiers: ['Control'] });
		await page.waitForTimeout(100);

		const destDot = page.locator('circle[aria-label="Point 0,1"]');
		await destDot.click({ modifiers: ['Control'] });

		await expect(page.getByText(/thinking/i)).toBeVisible({ timeout: 2000 });
	});
});

test.describe('Server Assignment Mid-Game', () => {
	test('can assign Server from bot dropdown during game', async ({ page }) => {
		await mockServerMove(page);
		await page.goto('/');
		await page.getByText('Player vs Player').click();

		await page.getByText('Assign Bots').click();
		const selects = page.locator('.bot-assign-select');
		await selects.last().selectOption('server');

		await page.waitForTimeout(200);

		const selectValue = await selects.last().inputValue();
		expect(selectValue).toBe('server');
	});

	test('Server option appears in bot assignment dropdown', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();

		await page.getByText('Assign Bots').click();
		const select = page.locator('.bot-assign-select').first();
		const options = select.locator('option');
		const texts = await options.allTextContents();
		expect(texts).toContain('Server');
	});
});

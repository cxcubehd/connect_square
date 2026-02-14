import { expect, test, type Page } from '@playwright/test';

const SERVER_URL = 'http://localhost:3001';

async function openActionsPage(page: Page) {
	const mobileNav = page.locator('md-navigation-bar.play-nav');
	if (await mobileNav.isVisible()) {
		await mobileNav.locator('md-navigation-tab').nth(2).click();
		return;
	}

	await page.locator('.tab-btn', { hasText: 'Actions' }).click();
}

async function startServerGame(page: Page) {
	await page.goto('/');
	const setupNav = page.locator('md-navigation-bar.setup-nav');
	await setupNav.locator('md-navigation-tab').nth(2).click();

	const secondPlayer = page.locator('.player-card').nth(1);
	await secondPlayer.locator('.type-btn', { hasText: 'Server' }).click();
	await page.locator('.setup-footer md-filled-button').click();
	await expect(page.locator('.board-svg')).toBeVisible();
}

test.describe('Server Setup', () => {
	test('exposes Server player mode in setup', async ({ page }) => {
		await page.goto('/');
		const setupNav = page.locator('md-navigation-bar.setup-nav');
		await setupNav.locator('md-navigation-tab').nth(2).click();

		const secondPlayer = page.locator('.player-card').nth(1);
		await secondPlayer.locator('.type-btn', { hasText: 'Server' }).click();
		await expect(secondPlayer.locator('.server-url')).toBeVisible();
	});
});

test.describe('Server Gameplay', () => {
	test('applies server response after human move', async ({ page }) => {
		let moveCount = 0;
		await page.route(`${SERVER_URL}/move`, async (route) => {
			moveCount += 1;
			const moves = [
				{ from: { row: 6, col: 6 }, to: { row: 6, col: 5 } },
				{ from: { row: 6, col: 5 }, to: { row: 5, col: 5 } }
			];
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(moves[Math.min(moveCount - 1, moves.length - 1)])
			});
		});

		await startServerGame(page);

		await page.locator('circle[aria-label="Point 0,0"]').click({ modifiers: ['Control'] });
		await page.locator('circle[aria-label="Point 0,1"]').click({ modifiers: ['Control'] });

		await expect(async () => {
			const count = await page.locator('.drawn-line').count();
			expect(count).toBeGreaterThanOrEqual(2);
		}).toPass({ timeout: 5000 });
	});

	test('keeps server option available in in-game assignment', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Player vs Player').click();
		await expect(page.locator('.board-svg')).toBeVisible();

		await openActionsPage(page);
		await page.locator('.bot-assign-toggle').click();

		const options = await page
			.locator('.bot-assign-select')
			.first()
			.locator('option')
			.allTextContents();
		expect(options).toContain('Server');
	});
});

import { expect, test, type Page } from '@playwright/test';

async function startPvpGame(page: Page) {
	await page.goto('/');
	await page.getByText('Player vs Player').click();
	await expect(page.locator('.board-svg')).toBeVisible();
}

async function openInGamePage(page: Page, pageName: 'board' | 'score' | 'actions') {
	const mobileNav = page.locator('md-navigation-bar.play-nav');
	if (await mobileNav.isVisible()) {
		const targetIndex = pageName === 'board' ? 0 : pageName === 'score' ? 1 : 2;
		await mobileNav.locator('md-navigation-tab').nth(targetIndex).click();
		return;
	}

	if (pageName === 'board') return;

	const tabLabel = pageName === 'score' ? 'Score' : 'Actions';
	await page.locator('.tab-btn', { hasText: tabLabel }).click();
}

test.describe('Native Setup Flow', () => {
	test('shows setup pages and quick actions', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Connect, Square!')).toBeVisible();
		await expect(page.getByText('Player vs Player')).toBeVisible();

		const setupNav = page.locator('md-navigation-bar.setup-nav');
		await setupNav.locator('md-navigation-tab').nth(1).click();
		await expect(page.locator('.board-size')).toBeVisible();

		await setupNav.locator('md-navigation-tab').nth(2).click();
		await expect(page.locator('.player-card')).toHaveCount(2);
	});

	test('starts game from quick setup and keeps app non-scrolling', async ({ page }) => {
		await startPvpGame(page);

		const overflow = await page.evaluate(() => {
			const app = document.querySelector('.app-shell') as HTMLElement | null;
			if (!app) return 999;
			return app.scrollHeight - app.clientHeight;
		});
		expect(overflow).toBeLessThanOrEqual(2);
	});
});

test.describe('In-Game Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await startPvpGame(page);
	});

	test('switches between board, score, and actions pages', async ({ page }) => {
		await openInGamePage(page, 'score');
		await expect(page.getByLabel('Scoreboard')).toBeVisible();

		await openInGamePage(page, 'actions');
		await expect(page.getByLabel('Game controls')).toBeVisible();

		await openInGamePage(page, 'board');
		await expect(page.locator('.board-svg')).toBeVisible();
	});

	test('supports basic move interaction', async ({ page }) => {
		const originDot = page.locator('circle[aria-label="Point 0,0"]');
		await originDot.click({ modifiers: ['Control'] });
		await page.locator('circle[aria-label="Point 0,1"]').click({ modifiers: ['Control'] });

		await expect(page.locator('.drawn-line').first()).toBeVisible();
	});
});

test.describe('Bot Automation', () => {
	test('bot vs bot creates moves automatically', async ({ page }) => {
		await page.goto('/');
		await page.getByText('Bot vs Bot').click();
		await expect(page.locator('.board-svg')).toBeVisible();

		await expect(async () => {
			const lines = await page.locator('.drawn-line').count();
			expect(lines).toBeGreaterThan(0);
		}).toPass({ timeout: 6000 });
	});
});

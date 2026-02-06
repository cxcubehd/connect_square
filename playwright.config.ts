import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testDir: 'e2e',
	projects: [
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'mobile',
			use: {
				...devices['iPhone 14'],
				defaultBrowserType: 'chromium'
			}
		},
		{
			name: 'tablet',
			use: {
				...devices['iPad (gen 7)'],
				defaultBrowserType: 'chromium'
			}
		}
	]
});

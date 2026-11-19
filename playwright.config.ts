import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 4100);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['iPhone 15'], browserName: 'chromium' }, grep: /@phone/ },
  ],
  webServer: {
    command: `pnpm --filter @dtheo/docs dev --port ${port}`,
    port,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

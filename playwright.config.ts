import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 4100);
// E2E_SERVER=production tests what ships: `next start` on the build `pnpm build` made, with the production headers
// (Content-Security-Policy, HSTS) that `next dev` leaves out. CI runs every browser test this way, and the Linux visual
// baselines are recorded this way, since a cold dev server compiles too slowly in a container.
const production = process.env.E2E_SERVER === 'production';

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
    // `exec next …` rather than the package's `dev` script, which pins its own --port.
    command: `pnpm --filter @dtheo/docs exec next ${production ? 'start' : 'dev'} --port ${port}`,
    port,
    // A dev server already on the port is reused; a production run must not quietly test a dev server instead.
    reuseExistingServer: !production,
    timeout: 120_000,
  },
});

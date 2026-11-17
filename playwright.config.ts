import { defineConfig, devices } from '@playwright/test';

// Runs against the production build (vite preview) — service workers only behave realistically there.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI, timeout: 180_000 },
  projects: [{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }],
});

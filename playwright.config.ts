import { defineConfig, devices } from '@playwright/test';

const remoteBaseUrl = process.env.REPLAYCS_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: remoteBaseUrl ?? 'http://127.0.0.1:4173', trace: 'on-first-retry' },
  webServer: remoteBaseUrl
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --host 127.0.0.1',
        port: 4173,
        reuseExistingServer: !process.env.CI
      },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});

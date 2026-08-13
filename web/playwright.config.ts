import { defineConfig, devices } from "@playwright/test";

const deploymentUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: deploymentUrl ?? "http://127.0.0.1:3107",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: deploymentUrl
    ? undefined
    : {
        command: "npm run dev -- --port 3107",
        url: "http://127.0.0.1:3107",
        reuseExistingServer: false,
        timeout: 120_000,
      },
});

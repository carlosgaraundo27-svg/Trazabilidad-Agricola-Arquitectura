import { defineConfig } from "@playwright/test";
const port = process.env.E2E_PORT || "3001";
const origin = process.env.E2E_BASE_URL || "http://127.0.0.1:" + port;
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  retries: 0,
  globalSetup: "./tests/e2e/global-setup.js",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
  },
});

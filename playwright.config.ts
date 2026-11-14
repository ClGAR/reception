import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

// E2E runs against a production build on port 3108 with fresh FICTIONAL seed data.
// AI is switched to its deterministic FAQ mode (AI_PROVIDER="") so tests don't depend on
// free-tier model availability. Live-model behaviour is covered by tests/eval.
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3108", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: "npx next start -p 3108",
    url: "http://localhost:3108",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { AI_PROVIDER: "", BETTER_AUTH_URL: "http://localhost:3108", RESEND_API_KEY: "", EMAIL_CAPTURE_FILE: "test-results/e2e-emails.jsonl", INNGEST_DEV: "", INNGEST_EVENT_KEY: "" },
  },
});

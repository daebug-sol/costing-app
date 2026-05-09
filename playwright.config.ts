import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression / smoke harness for costing-app.
 *
 * - Starts `next dev` on port 3100 locally (separate from the editor's 3000)
 *   so a running dev server is not disturbed.
 * - In CI, serves a production build (`next build` + `next start`) for more
 *   deterministic visual snapshots.
 * - Chromium desktop + mobile projects are enabled to guard responsive
 *   regressions from the same spec files.
 * - Baselines live next to specs under `tests/ui/__screenshots__/` and are
 *   committed alongside the spec.
 *
 * Day-to-day commands are wired in `package.json`:
 *   npm run ui:test
 *   npm run ui:test:headed
 *   npm run ui:test:update
 *   npm run ui:test:report
 *
 * See docs/UI-HARNESS.md §4 for the authoring rules.
 */

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/ui",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  outputDir: "test-results",
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{arg}{-projectName}{ext}",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: { width: 1440, height: 900 },
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: isCI
      ? `npm run build && npm run start -- -p ${PORT}`
      : `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});

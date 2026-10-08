import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

try {
  process.loadEnvFile(".env.local");
} catch {
  // No local env file (e.g. CI): the variables come from the environment instead.
}

// Signed-out journeys against a production build on its own port, so a running
// dev server (and any signed-in browser session) is never touched. Set E2E_BASE_URL
// to check a deployment instead (e.g. a Vercel preview).
const externalBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: externalBaseUrl ?? `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: externalBaseUrl ? undefined : {
    command: `npm run build && npx next start -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/privacy`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});

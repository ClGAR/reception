// Screenshot sweep: every public and app page at 1920 / 1440 / 768 / 390.
// Usage: npx tsx --env-file=.env scripts/screens.mts [outDir] [baseUrl]
// Defaults: outDir = screens/, baseUrl = http://localhost:3107. Logs in as the demo owner.
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? "screens";
const base = process.argv[3] ?? "http://localhost:3107";
const widths = (process.env.SCREEN_WIDTHS ?? "1920,1440,768,390").split(",").map(Number);
const heights: Record<number, number> = { 1920: 1080, 1440: 900, 768: 1024, 390: 844 };

const PUBLIC = [
  ["landing", "/"],
  ["login", "/login"],
  ["register", "/register"],
  ["booking", "/b/glow-studio"],
  ["privacy", "/privacy"],
] as const;
const APP = ["overview", "inbox", "bookings", "customers", "services", "knowledge", "settings"] as const;

async function login(page: Page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto(`${base}/login`);
    await page.getByLabel("Work email").fill("owner@glowstudio.test");
    await page.getByLabel("Password").fill(process.env.DEMO_PASSWORD!);
    await page.getByRole("button", { name: "Log in" }).click();
    const ok = await page.waitForURL(/\/app\//, { timeout: 30_000 }).then(() => true, () => false);
    if (ok) return;
    await page.waitForTimeout(11_000);
  }
  throw new Error("Login failed");
}

async function shoot(page: Page, name: string, width: number) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(700);
  const file = join(outDir, `${name}-${width}.png`);
  await page.screenshot({ path: file, fullPage: name === "landing" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${file}${overflow > 0 ? `  !! horizontal overflow ${overflow}px` : ""}`);
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const only = process.env.SCREEN_ONLY?.split(",");
for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: heights[width] ?? 900 }, colorScheme: "light" });
  const page = await context.newPage();
  for (const [name, path] of PUBLIC) {
    if (only && !only.includes(name)) continue;
    await page.goto(`${base}${path}`);
    await shoot(page, name, width);
  }
  if (!only || APP.some((a) => only.includes(a))) {
    await login(page);
    for (const name of APP) {
      if (only && !only.includes(name)) continue;
      await page.goto(`${base}/app/${name}`);
      await shoot(page, name, width);
    }
  }
  await context.close();
}
await browser.close();

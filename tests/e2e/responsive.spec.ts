import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.use({ viewport: { width: 390, height: 844 } });

for (const path of ["/", "/b/glow-studio", "/login"]) {
  test(`no horizontal scroll at 390px: ${path}`, async ({ page }) => {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}

test("app pages fit at 390px and inbox switches to list → thread", async ({ page }) => {
  await login(page, "owner@glowstudio.test");
  for (const path of ["/app/overview", "/app/inbox", "/app/bookings", "/app/customers", "/app/services", "/app/knowledge", "/app/settings"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(390);
  }
  await page.goto("/app/inbox");
  await page.getByRole("link", { name: /John Reyes/ }).click();
  await expect(page.getByRole("link", { name: "Back to conversations" })).toBeVisible();
});

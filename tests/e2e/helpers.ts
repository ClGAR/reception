import { expect, type Page } from "@playwright/test";

export const PASSWORD = process.env.DEMO_PASSWORD!;

/** Logs in. Better Auth limits sign-ins (3 per 10 s per IP); on "Too many requests" wait and retry. */
export async function login(page: Page, email: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto("/login");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.locator("body")).toContainText(/Good (morning|afternoon|evening)|Too many requests/);
    if (!(await page.getByText("Too many requests").count())) break;
    await page.waitForTimeout(11_000);
  }
  await expect(page).toHaveURL(/\/app\/overview/);
}

/** Book through the public page: first service matching `service`, given date, first open time. Returns the chosen time label. */
export async function bookOnPublicPage(page: Page, opts: { service: string; date?: string; time?: string; name: string; email: string }) {
  await page.goto("/b/glow-studio");
  await page.getByRole("button", { name: new RegExp(opts.service) }).click();
  const dates = page.getByRole("radiogroup", { name: "Date" }).getByRole("radio");
  await expect(dates.first()).toBeVisible();
  if (opts.date) await page.getByRole("radio", { name: new RegExp(opts.date) }).click();
  const times = page.getByRole("radiogroup", { name: "Time" }).getByRole("radio");
  await expect(times.first()).toBeVisible();
  const slot = opts.time ? times.filter({ hasText: opts.time }).first() : times.first();
  const label = (await slot.textContent())!.trim();
  await slot.click();
  await page.getByLabel("Full name").fill(opts.name);
  await page.getByLabel("Email").fill(opts.email);
  await page.getByRole("checkbox").check();
  return label;
}

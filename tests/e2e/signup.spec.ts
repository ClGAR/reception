import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Pool } from "@neondatabase/serverless";

// The E2E server writes every email to this file (EMAIL_CAPTURE_FILE in playwright.config.ts).
export const CAPTURE = "test-results/e2e-emails.jsonl";

async function linkFor(to: string, label: string) {
  for (let i = 0; i < 40; i++) {
    if (existsSync(CAPTURE)) {
      const mail = readFileSync(CAPTURE, "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l) as { to: string; text: string })
        .reverse()
        .find((m) => m.to === to);
      const url = mail?.text.split(`${label}: `)[1]?.split(/\s/)[0];
      if (url) return url;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No "${label}" email for ${to}`);
}

// Fictional sign-ups (*@signup.test) are removed afterwards; deleting the organization cascades to the business.
test.afterAll(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`delete from organization where id in (select m.organization_id from member m join "user" u on u.id = m.user_id where u.email like '%@signup.test')`);
  await pool.query(`delete from "user" where email like '%@signup.test'`);
  await pool.end();
});

test("a new owner signs up, confirms their email and sets up a business", async ({ page }) => {
  const email = `owner-${Date.now()}@signup.test`;
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Rosa Testing");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  // Unverified accounts can't log in yet.
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText(/verify your email first/i)).toBeVisible();

  await page.goto(await linkFor(email, "Confirm my email"));
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByLabel("Business name").fill("Rosa Test Salon");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "When are you open?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Service name").first().fill("Haircut");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Staff member 1").fill("Rosa");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL(/\/app\/overview/, { timeout: 30_000 });
  await expect(page.getByText("Rosa Test Salon").first()).toBeVisible();

  // The service from onboarding is saved.
  await page.goto("/app/services");
  await expect(page.getByText("Haircut").filter({ visible: true }).first()).toBeVisible();
});

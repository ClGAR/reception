import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("another business's owner cannot see or open this business's records", async ({ page, browser }) => {
  await login(page, "owner@glowstudio.test");
  await page.goto("/app/inbox");
  await page.getByRole("link", { name: /Maria Santos/ }).click();
  const convUrl = page.url();
  await page.goto("/app/customers?q=Maria");
  await page.getByRole("link", { name: /Maria Santos/ }).click();
  const customerUrl = page.url();

  const other = await (await browser.newContext()).newPage();
  await login(other, "owner@smilelab.test");
  await expect(other.getByText("Smile Lab Dental").first()).toBeVisible();

  await other.goto(convUrl.replace(/^https?:\/\/[^/]+/, ""));
  await expect(other.getByText("Maria Santos")).toHaveCount(0);
  await expect(other.getByText("Is 2 PM available")).toHaveCount(0);

  await other.goto(customerUrl.replace(/^https?:\/\/[^/]+/, ""));
  await expect(other.getByText("Maria Santos")).toHaveCount(0);
  await expect(other.getByText("Select a customer")).toBeVisible();

  await other.goto("/app/bookings");
  await expect(other.getByText("Paolo Garcia")).toHaveCount(0);
});

test("signed-out visitors are sent to login", async ({ page }) => {
  await page.goto("/app/inbox");
  await expect(page).toHaveURL(/\/login/);
});

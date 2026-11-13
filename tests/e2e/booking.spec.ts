import { expect, test } from "@playwright/test";
import { bookOnPublicPage, login } from "./helpers";

test("customer books on the public page → staff approves → calendar shows it confirmed", async ({ page }) => {
  const time = await bookOnPublicPage(page, { service: "Manicure", name: "E2E Customer", email: "e2e.customer@example.test" });
  await page.getByRole("button", { name: "Request appointment" }).click();
  await expect(page.getByRole("status")).toContainText("Request sent");
  await expect(page.getByRole("status")).toContainText("not confirmed yet");

  await login(page, "owner@glowstudio.test");
  const row = page.locator("li", { hasText: "E2E Customer" });
  await expect(row).toContainText("Manicure");
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Booking confirmed.")).toBeVisible();
  await expect(page.locator("li", { hasText: "E2E Customer" })).toHaveCount(0);

  await page.goto("/app/customers?q=E2E");
  await page.getByRole("link", { name: /E2E Customer/ }).click();
  await expect(page.getByLabel("Customer details")).toContainText("Confirmed");
  await expect(page.getByLabel("Customer details")).toContainText(time);

  // Calendar: find the event in the week view and open it.
  await page.goto("/app/bookings?view=week");
  for (let i = 0; i < 3 && !(await page.getByRole("button", { name: /E2E Customer/ }).count()); i++) await page.getByRole("link", { name: "Next week" }).click();
  await page.getByRole("button", { name: /E2E Customer/ }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Confirmed");
  await expect(page.getByRole("dialog")).toContainText("Manicure");
});

test("two customers submit the same last-picked slot at once: exactly one succeeds", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const time = await bookOnPublicPage(a, { service: "Hair Color", name: "Race One", email: "race.one@example.test" });
  await bookOnPublicPage(b, { service: "Hair Color", time, name: "Race Two", email: "race.two@example.test" });
  await Promise.all([a.getByRole("button", { name: "Request appointment" }).click(), b.getByRole("button", { name: "Request appointment" }).click()]);
  // Wait for each page's real outcome text (Next.js also renders a hidden role="alert" route announcer).
  const outcome = async (p: typeof a) => {
    await expect(p.getByText(/Request sent|just taken/i).first()).toBeVisible();
    return (await p.getByText("Request sent").count()) ? "booked" : "rejected";
  };
  const results = [await outcome(a), await outcome(b)].sort();
  expect(results).toEqual(["booked", "rejected"]);
});

test("a customer can't see times the system knows are taken", async ({ page }) => {
  // Seeded pending request: Maria Santos, Cleaning, next open day 2:00 PM (Joy is the only aesthetician).
  await page.goto("/b/glow-studio");
  await page.getByRole("button", { name: /Cleaning/ }).click();
  const dates = page.getByRole("radiogroup", { name: "Date" });
  await expect(dates.getByRole("radio").first()).toBeVisible();
  const times = page.getByRole("radiogroup", { name: "Time" });
  await expect(times.getByRole("radio").first()).toBeVisible();
  // Whole-button match ("12:00 PM" contains the substring "2:00 PM").
  await expect(times.getByRole("radio", { name: "2:00 PM", exact: true })).toHaveCount(0);
  await expect(times.getByRole("radio", { name: "1:30 PM", exact: true })).toHaveCount(0); // overlaps 2:00–3:00
});

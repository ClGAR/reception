import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("widget visitor → staff inbox → takeover reply → visitor sees it", async ({ page, browser }) => {
  // Staff: find the widget token in Settings → Chat widget.
  await login(page, "owner@glowstudio.test");
  await page.goto("/app/settings?tab=widget");
  const snippet = await page.locator("pre code").textContent();
  const token = snippet!.match(/data-reception="([^"]+)"/)![1];

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/widget/${token}`);
  await visitor.getByLabel("Message").fill("Hi, is there parking?");
  await visitor.getByRole("button", { name: "Send" }).click();
  await expect(visitor.getByText("free parking for 2 hours", { exact: false })).toBeVisible();
  await expect(visitor.getByText("Automated answer from the business's FAQ").first()).toBeVisible();

  await page.goto("/app/inbox");
  await page.getByRole("link", { name: /Website visitor/ }).first().click();
  await expect(page.getByLabel(/Conversation with Website visitor/)).toContainText("Hi, is there parking?");
  await page.getByLabel(/Message Website visitor/).fill("Hi from the team! Anything else I can help with?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("You're handling this conversation. AI replies are paused.")).toBeVisible();

  await expect(visitor.getByText("Hi from the team! Anything else I can help with?")).toBeVisible({ timeout: 20_000 });
  await expect(visitor.getByText("A team member will reply here")).toBeVisible();
});

test("seeded chat booking request can be approved from the inbox", async ({ page }) => {
  await login(page, "owner@glowstudio.test");
  await page.goto("/app/inbox");
  await page.getByRole("link", { name: /Maria Santos/ }).click();
  const thread = page.getByLabel("Conversation with Maria Santos");
  await expect(thread).toContainText("Pending approval");
  await thread.getByRole("button", { name: "Approve & Confirm" }).click();
  await expect(thread).toContainText("Confirmed");
  await expect(thread).toContainText("Appointment confirmed by staff.");
});

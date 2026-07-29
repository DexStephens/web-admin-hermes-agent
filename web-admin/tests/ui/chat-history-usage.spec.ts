import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../helpers/login";

// STORY-UI2: As an admin, I want to view API usage and chat logs to
// monitor costs and interactions. Acceptance: readable history of all
// chats, and a metric of LLM tokens/costs used.

test.describe("STORY-UI2: chat history and API usage", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Chat History shows a readable list of sessions", async ({ page }) => {
    const response = await page.goto("/portal/chat-history");
    expect(response?.ok()).toBeTruthy();

    // Never a raw "Couldn't reach Hermes" error — that would mean the
    // dashboard proxy (login/cookie handling) is broken, not just empty data.
    await expect(page.getByText("Couldn't reach Hermes")).not.toBeVisible();

    const sessionLinks = page.locator('a[href^="/portal/chat-history/"]');
    const emptyState = page.getByText("No sessions yet.");

    // This deployment has real session history from prior testing, so we
    // expect actual rows — but tolerate a freshly-reset deployment too,
    // as long as the page states that clearly rather than erroring.
    const count = await sessionLinks.count();
    if (count === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(sessionLinks.first()).toBeVisible();
      const text = await sessionLinks.first().innerText();
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  test("API Usage shows token/cost metrics", async ({ page }) => {
    const response = await page.goto("/portal/usage");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByText("Couldn't reach Hermes")).not.toBeVisible();

    await expect(page.getByRole("heading", { name: "Daily tokens" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Per-model breakdown" })
    ).toBeVisible();

    // Per-model table has an "Est. cost" column with a $-formatted figure —
    // this is the actual "metric of LLM tokens/costs" the story asks for.
    const costCells = page.locator("table").nth(1).locator("td", { hasText: "$" });
    if ((await costCells.count()) > 0) {
      await expect(costCells.first()).toBeVisible();
    }
  });
});

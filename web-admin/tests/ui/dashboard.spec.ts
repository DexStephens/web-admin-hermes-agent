import { test, expect } from "@playwright/test";

// STORY-UI1: As an admin, I want a web dashboard to monitor the agent's
// activity. Acceptance: dashboard loads successfully, displaying clear
// navigation for chat history and settings. Note: "must be non-technical
// friendly" — checked here as "plain-language nav labels", not literally
// testable via automation, but the labels asserted below are the actual
// UX contract.

test.describe("STORY-UI1: admin portal loads with clear navigation", () => {
  test("portal loads and shows nav for chat history, usage, skills, pairing", async ({
    page,
  }) => {
    const response = await page.goto("/portal");
    expect(response?.ok()).toBeTruthy();

    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    for (const label of ["Overview", "Chat History", "API Usage", "Skills", "Pairing"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("nav links actually navigate", async ({ page }) => {
    await page.goto("/portal");
    await page.getByRole("link", { name: "Chat History" }).click();
    await expect(page).toHaveURL(/\/portal\/chat-history$/);

    await page.getByRole("link", { name: "API Usage" }).click();
    await expect(page).toHaveURL(/\/portal\/usage$/);

    await page.getByRole("link", { name: "Skills" }).click();
    await expect(page).toHaveURL(/\/portal\/skills$/);
  });
});

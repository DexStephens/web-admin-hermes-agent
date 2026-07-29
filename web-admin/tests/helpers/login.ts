import type { Page } from "@playwright/test";

export async function loginAsAdmin(page: Page): Promise<void> {
  const response = await page.request.post("/api/login", {
    data: { username: "demo", password: "demo" },
  });
  if (!response.ok()) {
    throw new Error(
      `loginAsAdmin failed: ${response.status()} ${await response.text()}`
    );
  }
}

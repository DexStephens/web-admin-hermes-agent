import { test, expect } from "@playwright/test";
import { hermesChat } from "../helpers/hermesCli";
import { loginAsAdmin } from "../helpers/login";

// STORY-UI3: As an admin, I want to add or remove skills visually without
// touching code. Acceptance: toggle a skill off in the portal, then ask
// the bot to use it — it refuses/fails because it was disabled via the UI.
//
// Verification asks the agent to call its own `skills_list` tool and
// report the names back, rather than asking it to *perform* the skill's
// task — a capable model can sometimes improvise a skill's job from
// general knowledge even without the skill loaded (e.g. simple ASCII
// art), which would make a behavioral check flaky. Checking what
// skills_list actually returns directly reflects the disabled-skills
// filter (agent/skill_utils.py get_disabled_skill_names()) with no
// LLM-judgment risk in the assertion itself.
//
// `hermes chat -q` is a fresh process per call, so it always reads current
// config — unlike a long-running Telegram gateway process, there's no
// stale in-memory skill-command cache to worry about here.

const TARGET_SKILL = "ascii-art";

test.describe("STORY-UI3: disabling a skill via the portal actually disables it", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    // Always leave the skill re-enabled, even if an assertion above failed.
    await page.goto("/portal/skills");
    const row = page.locator("div.flex.items-center.justify-between", {
      hasText: TARGET_SKILL,
    });
    const checkbox = row.getByRole("checkbox");
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  });

  test("toggling off in the UI removes it from the agent's skills_list", async ({
    page,
  }) => {
    await page.goto("/portal/skills");

    const row = page.locator("div.flex.items-center.justify-between", {
      hasText: TARGET_SKILL,
    });
    await expect(row).toBeVisible();
    const checkbox = row.getByRole("checkbox");
    await expect(checkbox).toBeChecked();

    // Toggle off via the real UI control (not the API directly).
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    // Give the PUT /api/skills request a moment to land before we ask the agent.
    await page.waitForTimeout(500);

    const result = await hermesChat(
      `Call the skills_list tool right now and reply with nothing but the exact skill names it returns, one per line. Do not use prior knowledge of what skills you have — only report what the tool call actually returns.`
    );

    expect(result.output).not.toMatch(new RegExp(`\\b${TARGET_SKILL}\\b`));
  });
});

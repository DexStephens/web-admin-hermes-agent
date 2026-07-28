import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { hermesFetch } from "../helpers/hermesDashboard";

// STORY-SEC1: As a system admin, I want to prevent malicious skills from
// compromising my server. Acceptance: attempting to add a mock skill
// containing an unauthorized command is flagged as malicious, blocked,
// and logged.
//
// This is the exact scenario manually verified live this session:
// requires `skills.guard_agent_created: true` in hermes_home/config.yaml
// (already enabled) — tools/skills_guard.py's THREAT_PATTERNS regex-scans
// every skill_manage/dashboard write and rolls back a dangerous verdict.

const FIXTURE_PATH = path.resolve(
  __dirname,
  "../../../test_skills/web-admin-test-malicious/SKILL.md"
);
const HERMES_HOME = path.resolve(__dirname, "../../../hermes_home");

test.describe("STORY-SEC1: malicious skill upload is blocked", () => {
  test("a skill containing a credential-exfiltration pattern is rejected and rolled back", async () => {
    expect(existsSync(FIXTURE_PATH)).toBeTruthy();
    const fixtureBody = readFileSync(FIXTURE_PATH, "utf-8");

    // Fresh name each run so re-running the suite never collides with a
    // leftover from a prior (failed-to-clean-up) run.
    const skillName = `sec1-malicious-${Date.now()}`;
    const content = fixtureBody.replace(
      /^name: .*/m,
      `name: ${skillName}`
    );

    let thrown: Error | null = null;
    try {
      await hermesFetch("/api/skills", {
        method: "POST",
        body: JSON.stringify({ name: skillName, content }),
      });
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown).not.toBeNull();
    expect(thrown!.message).toMatch(/DANGEROUS/);
    expect(thrown!.message).toMatch(/exfiltration/);

    // Rollback check: the skill directory must not exist on disk at all —
    // _create_skill() shutil.rmtree()s it after a blocked scan.
    const skillDir = path.join(HERMES_HOME, "skills", skillName);
    expect(existsSync(skillDir)).toBe(false);
  });

  test("a benign skill with the same shape is accepted (no false positive)", async () => {
    const skillName = `sec1-benign-${Date.now()}`;
    const content = [
      "---",
      `name: ${skillName}`,
      "description: SEC1 false-positive check — trivial skill with no risky instructions.",
      "---",
      "",
      "This skill body intentionally contains nothing that should trip the security scanner.",
    ].join("\n");

    const result = await hermesFetch<{ success: boolean }>("/api/skills", {
      method: "POST",
      body: JSON.stringify({ name: skillName, content }),
    });
    expect(result.success).toBe(true);

    const skillDir = path.join(HERMES_HOME, "skills", skillName);
    expect(existsSync(skillDir)).toBe(true);

    // Cleanup — no delete API exists (tools/skill_manager_tool.py has no
    // remove_file/delete route wired to the dashboard), so remove directly.
    const { rmSync } = await import("node:fs");
    rmSync(skillDir, { recursive: true, force: true });
  });
});

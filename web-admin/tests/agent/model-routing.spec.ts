import { test, expect } from "@playwright/test";
import { hermesChat } from "../helpers/hermesCli";

// STORY-T4: As a system admin, I want dynamic routing via OpenRouter to
// save costs on simple tasks. Acceptance: logs confirm a basic question
// stays on the cheap model and a complex question escalates to Sonnet/Opus.
//
// Ground truth from this session's live investigation: the primary model
// (config.yaml model.default: ~google/gemini-flash-latest) never switches
// itself mid-conversation — the actual mechanism is delegate_task, which
// hands complex work to a subagent on delegation.model
// (anthropic/claude-sonnet-4.6). It only fires for prompts shaped like
// delegate_task's own "WHEN TO USE" criteria (reasoning-heavy debugging /
// code review / research synthesis) — NOT generic "write me X" requests,
// which Gemini Flash correctly just answers inline. The "complex" prompt
// below is the exact shape proven live to trigger it.

test.describe("STORY-T4: dynamic model routing", () => {
  test("a simple question stays on the cheap default model", async () => {
    const result = await hermesChat("What is 12 times 8? Answer with just the number.");
    expect(result.output).toMatch(/model=~google\/gemini-flash-latest/);
    expect(result.output).not.toMatch(/Tool call: delegate_task/);
  });

  test("a reasoning-heavy debugging request escalates to Sonnet via delegate_task", async () => {
    test.setTimeout(5 * 60_000);

    const result = await hermesChat(
      "Debug this: our Next.js web-admin app intermittently fails to authenticate " +
        "against the Hermes dashboard API — sometimes GET /api/skills returns 401 " +
        "even though the login succeeded moments earlier. Investigate the session " +
        "cookie handling in web-admin/src/lib/hermes.ts, cross-reference it against " +
        "how hermes_cli/web_server.py's dashboard auth middleware validates sessions, " +
        "and figure out the root cause. This requires reading and reasoning across " +
        "multiple files, not a quick fix.",
      { maxTurns: 10 }
    );

    // Primary agent stays on the cheap model for its own turns...
    expect(result.output).toMatch(/model=~google\/gemini-flash-latest/);
    // ...but dispatches the investigation to a subagent...
    expect(result.output).toMatch(/Tool call: delegate_task/);
    expect(result.output).toMatch(/"status":\s*"dispatched"/);
    // ...which runs on the configured delegation model, not the cheap default.
    expect(result.output).toMatch(
      /platform=subagent[^\n]*model=anthropic\/claude-sonnet-4\.6|model=anthropic\/claude-sonnet-4\.6[^\n]*platform=subagent/
    );
  });
});

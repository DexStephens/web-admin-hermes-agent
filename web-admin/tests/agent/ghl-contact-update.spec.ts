import { test, expect } from "@playwright/test";
import { hermesChat } from "../helpers/hermesCli";

// STORY-GHL1: As a system admin, I want a GHL sub-agent to automatically
// update my CRM. Acceptance: telling the agent "Update John Doe's phone
// number to 555-0199" locates the contact via the GHL API and updates it.
//
// Per the user's confirmed trade-off (real systems, no test fixtures),
// this writes to a REAL GoHighLevel contact. Precondition: a contact
// literally named "John Doe" must already exist in the configured GHL
// location (mcp_servers.ghl in config.yaml) — this test fails clearly if
// not, rather than silently no-op'ing.
//
// Verification is a *second*, non-resumed hermesChat call that asks the
// agent to read the phone number back from GHL directly — deliberately
// not `--resume`, so the check is a fresh API read, not the agent
// reporting from its own turn memory of what it just did.

const NEW_PHONE = "555-0199";

test.describe("STORY-GHL1: GHL contact update via chat", () => {
  test("updating John Doe's phone number via chat actually changes it in GHL", async () => {
    test.setTimeout(5 * 60_000);

    const update = await hermesChat(
      `Update John Doe's phone number to ${NEW_PHONE} in GHL.`
    );

    // Confirms the agent actually called a GHL write tool, not just replied
    // conversationally as if it had.
    expect(update.output).toMatch(
      /mcp__ghl__contacts_(update_contact|upsert_contact)/
    );

    const verify = await hermesChat(
      "Look up John Doe's contact record in GHL right now — call the tool, " +
        "don't answer from memory — and tell me exactly what phone number is on file."
    );

    expect(verify.output).toMatch(/555.?0199/);
  });
});

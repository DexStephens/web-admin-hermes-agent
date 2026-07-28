import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";
import { hermesChat } from "../helpers/hermesCli";

// STORY-BKP1: As a user, I want a Bookkeeping sub-agent to process receipt
// images and log them to Google Sheets. Acceptance: send a receipt photo,
// agent extracts amount/vendor, asks for the category, reply "Client
// Meals", and a new row is appended to the Google Sheet.
//
// Matches the extract_receipt -> (ask user) -> log_receipt human-in-the-loop
// flow built into hermes_home/plugins/bookkeeping/__init__.py this session.
// Per the user's confirmed trade-off, this appends a REAL row to the real
// bookkeeping spreadsheet (BOOKKEEPING_SPREADSHEET_ID in hermes_home/.env)
// — no test-fixture sheet isolation.
//
// Needs a receipt image fixture this repo doesn't ship — supply one at
// tests/fixtures/receipt.jpg (any real or realistic-looking receipt photo
// with a legible vendor + total). The test skips clearly if it's missing
// rather than failing confusingly on a bad image path.

const FIXTURE_IMAGE = path.resolve(__dirname, "../fixtures/receipt.jpg");

test.describe("STORY-BKP1: receipt photo -> category prompt -> Sheet row", () => {
  test.skip(
    !existsSync(FIXTURE_IMAGE),
    `Missing test fixture: tests/fixtures/receipt.jpg. Add a real receipt photo to run this test.`
  );

  test("photo triggers extraction, asks for category, then logs on confirmation", async () => {
    test.setTimeout(5 * 60_000);

    const extract = await hermesChat(
      "Here's a receipt, please log it for bookkeeping.",
      { imagePath: FIXTURE_IMAGE }
    );
    expect(extract.sessionId).not.toBeNull();
    expect(extract.output).toMatch(/extract_receipt/);
    // Must NOT log yet — it should ask the user for the category first.
    expect(extract.output).not.toMatch(/Tool call: log_receipt/);
    expect(extract.output).toMatch(/categor/i);

    const logged = await hermesChat("Client Meals", {
      resume: extract.sessionId!,
    });

    expect(logged.output).toMatch(/Tool call: log_receipt/);
    expect(logged.output).toMatch(/"category":\s*"Client Meals"/);
    expect(logged.output).toMatch(/"status":\s*"ok"/);
  });
});

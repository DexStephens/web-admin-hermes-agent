import { test, expect } from "@playwright/test";
import { hermesChat } from "../helpers/hermesCli";

// STORY-T3: As a user, I want the assistant to remember my previous
// messages over time. Acceptance: tell it a fact, send 20+ unrelated
// messages, ask about the fact — it answers correctly with no token-limit
// or compaction errors.
//
// Real LLM calls throughout (~23 turns) — slow and costs real tokens by
// design (see plan's "Live LLM tests" trade-off). A deliberately unusual
// fact (specific number + specific tool name) minimizes the chance the
// model "recalls" it by coincidence/prior training rather than actual
// conversation memory.

test.describe("STORY-T3: long-conversation memory recall", () => {
  test("recalls a fact stated 20+ turns earlier", async () => {
    test.setTimeout(10 * 60_000);

    const luckyNumber = 4173;
    const first = await hermesChat(
      `Please remember this fact for later in our conversation: my lucky number is ${luckyNumber} and my favorite testing framework is Playwright.`
    );
    expect(first.sessionId).not.toBeNull();
    const sessionId = first.sessionId!;

    const fillerTopics = [
      "What's a fun fact about octopuses?",
      "Name three rivers in South America.",
      "What year was the printing press invented?",
      "Give me a one-sentence summary of what HTTP is.",
      "What's the boiling point of water in Fahrenheit?",
      "Name a famous painting by Van Gogh.",
      "What does CPU stand for?",
      "Give a one-line definition of photosynthesis.",
      "What's the tallest mountain in Africa?",
      "Name two programming languages that start with 'P'.",
      "What is the capital of Portugal?",
      "Give a one-sentence explanation of gravity.",
      "What's a common use for baking soda besides cooking?",
      "Name one moon of Jupiter.",
      "What does 'DNS' stand for?",
      "Give a one-line fact about penguins.",
      "What's the freezing point of water in Celsius?",
      "Name a famous bridge in San Francisco.",
      "What does 'RAM' stand for in computing?",
      "Give one fact about the Great Wall of China.",
      "What's a common ingredient in guacamole?",
    ];
    expect(fillerTopics.length).toBeGreaterThanOrEqual(20);

    for (const topic of fillerTopics) {
      const filler = await hermesChat(topic, { resume: sessionId });
      expect(filler.output).not.toMatch(
        /traceback|context.?length.*exceed|token limit exceeded|maximum context/i
      );
    }

    const recall = await hermesChat(
      "Without looking anything up, what did I tell you earlier was my lucky number and my favorite testing framework?",
      { resume: sessionId }
    );

    expect(recall.output).toMatch(new RegExp(String(luckyNumber)));
    expect(recall.output).toMatch(/playwright/i);
    expect(recall.output).not.toMatch(
      /traceback|context.?length.*exceed|token limit exceeded|maximum context/i
    );
  });
});

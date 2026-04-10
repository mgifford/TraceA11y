import test from "node:test";
import assert from "node:assert/strict";

import { buildManualAiReviewBatches } from "../src/ai-classifier.js";

test("buildManualAiReviewBatches groups issues and includes a reusable prompt", () => {
  process.env.AI_BATCH_SIZE = "2";

  const batches = buildManualAiReviewBatches([
    { url: "https://example.com/1", xpath: "/a", snippet: "<button>", ruleId: "button-name" },
    { url: "https://example.com/2", xpath: "/b", snippet: "<img>", ruleId: "image-alt" },
    { url: "https://example.com/3", xpath: "/c", snippet: "<input>", ruleId: "label" }
  ]);

  assert.equal(batches.length, 2);
  assert.equal(batches[0].issueCount, 2);
  assert.match(batches[0].prompt, /Issue 0:/);
  assert.match(batches[0].prompt, /Issue 1:/);
  assert.equal(batches[1].issueCount, 1);

  delete process.env.AI_BATCH_SIZE;
});

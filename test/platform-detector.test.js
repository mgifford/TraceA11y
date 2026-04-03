import test from "node:test";
import assert from "node:assert/strict";

import { detectSitePlatformForIssue } from "../src/platform-detector.js";

test("detects Drupal from strong signal", () => {
  const result = detectSitePlatformForIssue({
    url: "https://example.gov/search",
    xpath: "//*[@data-drupal-selector='edit-search-block-form']",
    snippet: "<input data-drupal-selector='edit-search-block-form'>"
  });

  assert.equal(result.platform, "Drupal");
  assert.ok(result.confidence > 0);
  assert.ok(result.signals.includes("data-drupal-selector attribute"));
});

test("does not classify low-signal non-Drupal pages as Drupal", () => {
  const result = detectSitePlatformForIssue({
    url: "https://example.com",
    xpath: "div.paragraph--type-card",
    snippet: "<div class='paragraph--type-card'>"
  });

  assert.equal(result.platform, "Unknown");
  assert.equal(result.confidence, 0);
  assert.deepEqual(result.signals, []);
});

test("classifies Drupal when medium signals combine above threshold", () => {
  const result = detectSitePlatformForIssue({
    url: "https://example.gov/content",
    xpath: "div.layout-builder article.node-content",
    snippet: "<div class='layout-builder'><article class='node-content'>"
  });

  assert.equal(result.platform, "Drupal");
  assert.ok(result.signals.includes("Drupal layout builder classes"));
  assert.ok(result.signals.includes("Drupal node content class"));
});

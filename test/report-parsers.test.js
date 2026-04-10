import test from "node:test";
import assert from "node:assert/strict";

import { parsePlainTextReport, parseReportContent } from "../src/report-parsers.js";

test("parseReportContent reads JSON reports with issues arrays", () => {
  const issues = parseReportContent(
    JSON.stringify({
      issues: [
        {
          url: "https://example.com/node/1",
          xpath: "/html/body/main/article/img",
          snippet: "<img src='hero.jpg'>",
          ruleId: "image-alt"
        }
      ]
    }),
    "report.json"
  );

  assert.equal(issues.length, 1);
  assert.equal(issues[0].ruleId, "image-alt");
});

test("parseReportContent reads YAML issue lists", () => {
  const issues = parseReportContent(
    `
issues:
  - url: https://example.com/news
    xpath: /html/body/main/article/h2
    snippet: "<h2></h2>"
    ruleId: heading-order
`,
    "report.yaml"
  );

  assert.equal(issues.length, 1);
  assert.equal(issues[0].url, "https://example.com/news");
  assert.equal(issues[0].ruleId, "heading-order");
});

test("parsePlainTextReport reads labeled issue blocks", () => {
  const issues = parsePlainTextReport(`
URL: https://example.com/form
XPath: /html/body/main/form/input[1]
Snippet: <input aria-expanded="false">
Rule ID: aria-allowed-attr

URL: https://example.com/page
XPath: /html/body/main/article/img
Snippet: <img src="x.jpg">
Rule ID: image-alt
`);

  assert.equal(issues.length, 2);
  assert.equal(issues[0].ruleId, "aria-allowed-attr");
  assert.equal(issues[1].url, "https://example.com/page");
});

import { readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";

/**
 * Parse Deque University axe 4.11 rules HTML page
 * Extracts: rule ID, description, impact, categories, pass/fail types
 * Output: JSON map for dashboard enhancement
 */

function decodeHtmlEntities(text) {
  const entities = {
    "&nbsp;": " ",
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'"
  };
  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => entities[entity] || entity);
}

function extractRulesFromHtml(htmlContent) {
  const rules = {};

  // Find all table rows containing rule data
  // Pattern: <tr>...<a href="/rules/axe/4.11/RULE-ID">RULE-ID</a>...</tr>
  const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  const rows = htmlContent.match(rowPattern) || [];

  for (const row of rows) {
    // Extract rule ID from first link (e.g., /rules/axe/4.11/heading-order)
    const ruleMatch = row.match(/\/rules\/axe\/4\.11\/([a-z0-9-]+)/);
    if (!ruleMatch) continue;

    const ruleId = ruleMatch[1];

    // Split row into <td> cells
    const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/g) || [];
    if (cells.length < 4) continue;

    // Extract description from second cell
    const descText = cells[1]?.replace(/<[^>]*>/g, "").trim() || "";
    const description = decodeHtmlEntities(descText);

    // Extract impact from third cell
    const impactText = cells[2]?.match(/(Critical|Serious|Moderate|Minor)/i)?.[1]?.toLowerCase() || "unknown";

    // Extract standards from fourth cell (can have cat.* and wcag codes)
    const stdText = cells[3]?.replace(/<[^>]*>/g, "").trim() || "";
    const standards = stdText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("cat."));

    // Extract categories from standards text
    const categories = standards.filter((s) => s.startsWith("cat.")).map((s) => s.replace("cat.", ""));

    // Extract ACT rule link if present
    const actMatch = row.match(/https:\/\/act-rules\.github\.io\/rules\/([a-z0-9]+)/);
    const actRule = actMatch ? actMatch[1] : null;

    if (ruleId && description) {
      rules[ruleId] = {
        id: ruleId,
        description,
        impact: impactText,
        categories,
        standards: standards.filter((s) => !s.startsWith("cat.")),
        actRule,
        source: "axe-core 4.11",
        sourceUrl: `https://dequeuniversity.com/rules/axe/4.11/${ruleId}`
      };
    }
  }

  return rules;
}

async function main() {
  const htmlPath = "./data/reference/axe-rules-4.11.html";
  const jsonPath = "./data/reference/axe-rules-4.11.json";

  console.log("🔍 Parsing axe 4.11 rules HTML...");

  try {
    const htmlContent = await readFile(htmlPath, "utf8");
    console.log(`   Read ${htmlContent.length} bytes from ${htmlPath}`);

    const rules = extractRulesFromHtml(htmlContent);
    console.log(`   Extracted ${Object.keys(rules).length} rules`);

    // Create output directory
    await mkdir("./data/reference", { recursive: true });

    // Write JSON
    const output = {
      version: "4.11",
      source: "Deque University",
      sourceUrl: "https://dequeuniversity.com/rules/axe/4.11/",
      generatedAt: new Date().toISOString(),
      totalRules: Object.keys(rules).length,
      rules
    };

    await writeFile(jsonPath, JSON.stringify(output, null, 2), "utf8");
    console.log(`✅ Wrote ${Object.keys(rules).length} rules to ${jsonPath}`);

    // Print summary by impact
    const impactCounts = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    };

    for (const rule of Object.values(rules)) {
      impactCounts[rule.impact] = (impactCounts[rule.impact] || 0) + 1;
    }

    console.log("\n📊 Rules by impact level:");
    console.log(`   🚨 Critical: ${impactCounts.critical}`);
    console.log(`   ⚠️  Serious: ${impactCounts.serious}`);
    console.log(`   ⚡ Moderate: ${impactCounts.moderate}`);
    console.log(`   ℹ️  Minor: ${impactCounts.minor}`);

    // Print sample rules
    console.log("\n📋 Sample rules:");
    const sampleIds = ["heading-order", "image-alt", "aria-allowed-attr", "color-contrast"];
    for (const id of sampleIds) {
      if (rules[id]) {
        console.log(`   • ${id}: ${rules[id].description}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  ROLE_ORDER,
  ROLE_REMEDIATION_PATHS,
  ROLE_SIGNATURES
} from "./signatures.js";
import { classifyAmbiguousWithAi } from "./ai-classifier.js";
import {
  findRelatedArrmTasks,
  getArrmOwnerSignals,
  loadArrmTasks
} from "./arrm-map.js";

const REPORTS_DIR = "./reports";
const OUTPUT_DIR = "./dist/data";
const OUTPUT_FILE = "./dist/data/attributed-report.json";

function parseArgs(argv) {
  const args = { input: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--input") {
      args.input = argv[index + 1] || null;
    }
  }
  return args;
}

function scoreIssueAgainstRole(issue, roleSignature) {
  const haystack = `${issue.xpath || ""} ${issue.snippet || ""}`;
  let score = 0;
  const matchedSignals = [];

  for (const pattern of roleSignature.xpathOrSnippetPatterns) {
    if (pattern.test(haystack)) {
      score += 2;
      matchedSignals.push(`pattern:${pattern}`);
    }
  }

  if (roleSignature.ruleHints.includes(issue.ruleId)) {
    score += 2;
    matchedSignals.push(`rule:${issue.ruleId}`);
  }

  return { score, matchedSignals };
}

function applyStepOneOverride(issue) {
  const articleContext = /\/article\b/i.test(issue.xpath || "") || /<article\b/i.test(issue.snippet || "");
  if (articleContext && issue.ruleId === "image-alt") {
    return {
      owner: "Content Author",
      confidence: 0.95,
      rationale: "Step 1 override: image-alt inside article context maps to Content Author"
    };
  }

  return null;
}

async function classifyIssue(issue, arrmTasks) {
  const override = applyStepOneOverride(issue);
  if (override) {
    return override;
  }

  const arrmOwnerSignals = getArrmOwnerSignals(issue, arrmTasks);

  const scoredRoles = ROLE_SIGNATURES.map((signature) => {
    const heuristic = scoreIssueAgainstRole(issue, signature);
    const arrmSignalCount = arrmOwnerSignals[signature.owner] || 0;
    const arrmBonus = Math.min(arrmSignalCount * 0.35, 1.5);

    return {
      owner: signature.owner,
      heuristicScore: heuristic.score,
      arrmSignalCount,
      arrmBonus,
      score: heuristic.score + arrmBonus,
      matchedSignals: heuristic.matchedSignals
    };
  });

  scoredRoles.sort((a, b) => b.score - a.score);
  const top = scoredRoles[0];
  const second = scoredRoles[1];
  const tied = second && Math.abs(top.score - second.score) < 0.01;

  if (!top || top.score === 0 || tied) {
    const aiResult = await classifyAmbiguousWithAi(issue);
    return {
      owner: aiResult.owner,
      confidence: aiResult.confidence,
      rationale: aiResult.rationale,
      arrmOwnerSignals
    };
  }

  const confidence = Math.min(0.6 + top.score * 0.08, 0.95);
  const signalSummary = [
    top.matchedSignals.length > 0 ? `heuristics=${top.matchedSignals.join("|")}` : null,
    top.arrmSignalCount > 0
      ? `arrm-support=${top.arrmSignalCount} (bonus=${top.arrmBonus.toFixed(2)})`
      : null
  ]
    .filter(Boolean)
    .join("; ");

  return {
    owner: top.owner,
    confidence,
    rationale: `Weighted match: ${signalSummary || "signature score"}`,
    arrmOwnerSignals
  };
}

function mapFixLocation(owner) {
  return ROLE_REMEDIATION_PATHS[owner] || ROLE_REMEDIATION_PATHS.Ambiguous;
}

async function readInputReports(inputFile) {
  if (inputFile) {
    const content = await readFile(inputFile, "utf8");
    return [{ file: inputFile, issues: JSON.parse(content) }];
  }

  const entries = await readdir(REPORTS_DIR, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => path.join(REPORTS_DIR, entry.name));

  const reports = [];
  for (const file of jsonFiles) {
    const content = await readFile(file, "utf8");
    reports.push({ file, issues: JSON.parse(content) });
  }

  return reports;
}

function initializeOwnerBuckets() {
  return ROLE_ORDER.reduce((accumulator, role) => {
    accumulator[role] = [];
    return accumulator;
  }, {});
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reports = await readInputReports(args.input);
  const arrmTasks = await loadArrmTasks();

  const owners = initializeOwnerBuckets();
  const allAttributedIssues = [];

  for (const report of reports) {
    for (const issue of report.issues) {
      const attribution = await classifyIssue(issue, arrmTasks);
      const owner = attribution.owner;
      const relatedArrmTasks = findRelatedArrmTasks(issue, owner, arrmTasks);
      const attributedIssue = {
        ...issue,
        sourceFile: report.file,
        owner,
        confidence: attribution.confidence,
        rationale: attribution.rationale,
        suggestedFixLocation: mapFixLocation(owner),
        arrmOwnerSignals: attribution.arrmOwnerSignals || {},
        arrmTaskIds: relatedArrmTasks.map((task) => task.id),
        arrmReferences: relatedArrmTasks.map((task) => ({
          id: task.id,
          wcagSc: task.wcagSc,
          level: task.level,
          task: task.task,
          mainRole: task.mainRole,
          primaryOwnership: task.primaryOwnership,
          secondaryOwnership: task.secondaryOwnership
        }))
      };

      if (!owners[owner]) {
        owners.Ambiguous.push(attributedIssue);
      } else {
        owners[owner].push(attributedIssue);
      }

      allAttributedIssues.push(attributedIssue);
    }
  }

  const remediationPaths = Object.entries(owners).map(([owner, issues]) => ({
    owner,
    path: mapFixLocation(owner),
    count: issues.length
  }));

  const output = {
    generatedAt: new Date().toISOString(),
    arrm: {
      source: "./data/reference/arrm-all-tasks.csv",
      loadedTaskCount: arrmTasks.length
    },
    totals: {
      totalIssues: allAttributedIssues.length,
      byOwner: Object.fromEntries(
        Object.entries(owners).map(([owner, issues]) => [owner, issues.length])
      )
    },
    inputs: reports.map((report) => report.file),
    byOwner: owners,
    remediationPaths,
    issues: allAttributedIssues
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote ${OUTPUT_FILE} with ${allAttributedIssues.length} attributed issues.`);
}

main().catch((error) => {
  console.error("Attribution engine failed:", error);
  process.exitCode = 1;
});

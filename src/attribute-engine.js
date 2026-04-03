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
import {
  findWcagSpineMatches,
  getWcagSpineOwnerSignals,
  loadWcagSpineData,
  summarizeWcagSpineMatches
} from "./wcag-spine-map.js";
import {
  appendCandidatePatterns,
  loadTrustedPatterns,
  trustedPatternsToSignatures
} from "./learning-registry.js";
import { detectSitePlatformForIssue } from "./platform-detector.js";

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

function scoreIssueAgainstRole(issue, roleSignature, options = {}) {
  const enablePatternMatching = options.enablePatternMatching !== false;
  const enableRuleHints = options.enableRuleHints !== false;
  const haystack = `${issue.xpath || ""} ${issue.snippet || ""}`;
  let score = 0;
  const matchedSignals = [];

  if (enablePatternMatching) {
    for (const pattern of roleSignature.xpathOrSnippetPatterns) {
      if (pattern.test(haystack)) {
        score += 2;
        matchedSignals.push(`pattern:${pattern}`);
      }
    }
  }

  if (enableRuleHints && roleSignature.ruleHints.includes(issue.ruleId)) {
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

function buildOwnerProbabilities(scoredRoles) {
  const positive = scoredRoles.map((item) => ({
    owner: item.owner,
    score: Math.max(Number(item.score || 0), 0)
  }));
  const total = positive.reduce((sum, item) => sum + item.score, 0);

  if (total <= 0) {
    return [];
  }

  return positive
    .map((item) => ({
      owner: item.owner,
      probability: Number((item.score / total).toFixed(3))
    }))
    .sort((a, b) => b.probability - a.probability);
}

function detectAttributionUncertainty(issue) {
  const url = String(issue?.url || "");
  const xpath = String(issue?.xpath || "");
  const snippet = String(issue?.snippet || "");
  const haystack = `${url} ${xpath} ${snippet}`.toLowerCase();
  const flags = [];

  if (
    /accessibe|accessi\.be|userway|equalweb|audioeye|reciteme|facil-iti|maxaccess|allaccessibility/i.test(
      haystack
    )
  ) {
    flags.push("known-accessibility-overlay");
  }

  if (/accessibility\s*(toolbar|widget)|a11y\s*widget|widget[-_ ]trigger/i.test(haystack)) {
    flags.push("accessibility-widget-detected");
  }

  if (/script\b[^>]+src=["']https?:\/\//i.test(snippet) || /iframe\b[^>]+src=["']https?:\/\//i.test(snippet)) {
    flags.push("third-party-embed-detected");
  }

  return [...new Set(flags)];
}

async function classifyIssue(issue, signatures, arrmTasks, wcagSpineData) {
  const platformProfile = detectSitePlatformForIssue(issue);
  const uncertaintyFlags = detectAttributionUncertainty(issue);
  const uncertaintyPenalty = uncertaintyFlags.length > 0 ? 0.08 : 0;
  const override = applyStepOneOverride(issue);
  if (override) {
    return {
      ...override,
      confidence: Math.max(0, Number((override.confidence - uncertaintyPenalty).toFixed(3))),
      ownerProbabilities: [{ owner: override.owner, probability: 1 }],
      contributingOwners: [override.owner],
      uncertaintyFlags,
      usedAiFallback: false,
      platformProfile
    };
  }

  const arrmOwnerSignals = getArrmOwnerSignals(issue, arrmTasks);
  const wcagSpineOwnerSignals = getWcagSpineOwnerSignals(issue, wcagSpineData);

  const scoredRoles = signatures.map((signature) => {
    const shouldUseDrupalPatterns =
      platformProfile.platform === "Drupal" || signature.signatureSource === "learned";
    const heuristic = scoreIssueAgainstRole(issue, signature, {
      enablePatternMatching: shouldUseDrupalPatterns,
      enableRuleHints: true
    });
    const arrmSignalCount = arrmOwnerSignals[signature.owner] || 0;
    const wcagSpineSignalCount = wcagSpineOwnerSignals[signature.owner] || 0;
    const arrmBonus = Math.min(arrmSignalCount * 0.35, 1.5);
    const wcagSpineBonus = Math.min(wcagSpineSignalCount * 0.3, 1.2);

    return {
      owner: signature.owner,
      heuristicScore: heuristic.score,
      arrmSignalCount,
      wcagSpineSignalCount,
      arrmBonus,
      wcagSpineBonus,
      score: heuristic.score + arrmBonus + wcagSpineBonus,
      matchedSignals: heuristic.matchedSignals
    };
  });

  scoredRoles.sort((a, b) => b.score - a.score);
  const ownerProbabilities = buildOwnerProbabilities(scoredRoles);
  const contributingOwners = ownerProbabilities
    .filter((entry) => entry.probability >= 0.2)
    .map((entry) => entry.owner);
  const top = scoredRoles[0];
  const second = scoredRoles[1];
  const tied = second && Math.abs(top.score - second.score) < 0.01;

  if (!top || top.score === 0 || tied) {
    const aiResult = await classifyAmbiguousWithAi(issue);
    const fallbackProbabilities =
      ownerProbabilities.length > 0
        ? ownerProbabilities
        : [
            { owner: aiResult.owner, probability: Number(aiResult.confidence.toFixed(3)) },
            { owner: "Ambiguous", probability: Number((1 - aiResult.confidence).toFixed(3)) }
          ];
    return {
      owner: aiResult.owner,
      confidence: Math.max(0, Number((aiResult.confidence - uncertaintyPenalty).toFixed(3))),
      rationale: aiResult.rationale,
      ownerProbabilities: fallbackProbabilities,
      contributingOwners:
        contributingOwners.length > 0
          ? contributingOwners
          : fallbackProbabilities
              .filter((entry) => entry.probability >= 0.2)
              .map((entry) => entry.owner),
      uncertaintyFlags,
      arrmOwnerSignals,
      wcagSpineOwnerSignals,
      usedAiFallback: true,
      platformProfile
    };
  }

  const confidence = Math.max(0, Math.min(0.6 + top.score * 0.08, 0.95) - uncertaintyPenalty);
  const signalSummary = [
    top.matchedSignals.length > 0 ? `heuristics=${top.matchedSignals.join("|")}` : null,
    top.arrmSignalCount > 0
      ? `arrm-support=${top.arrmSignalCount} (bonus=${top.arrmBonus.toFixed(2)})`
      : null,
    top.wcagSpineSignalCount > 0
      ? `wcag-spine-support=${top.wcagSpineSignalCount} (bonus=${top.wcagSpineBonus.toFixed(2)})`
      : null
  ]
    .filter(Boolean)
    .join("; ");

  return {
    owner: top.owner,
    confidence,
    rationale: `Weighted match: ${signalSummary || "signature score"}`,
    ownerProbabilities,
    contributingOwners,
    uncertaintyFlags,
    arrmOwnerSignals,
    wcagSpineOwnerSignals,
    usedAiFallback: false,
    platformProfile
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
  const wcagSpineData = await loadWcagSpineData();
  const trustedPatterns = await loadTrustedPatterns();
  const learnedSignatures = trustedPatternsToSignatures(trustedPatterns).map((signature) => ({
    ...signature,
    signatureSource: "learned"
  }));
  const signatures = [
    ...ROLE_SIGNATURES.map((signature) => ({ ...signature, signatureSource: "core-drupal" })),
    ...learnedSignatures
  ];

  const owners = initializeOwnerBuckets();
  const allAttributedIssues = [];

  for (const report of reports) {
    for (const issue of report.issues) {
      const attribution = await classifyIssue(issue, signatures, arrmTasks, wcagSpineData);
      const owner = attribution.owner;
      const relatedArrmTasks = findRelatedArrmTasks(issue, owner, arrmTasks);
      const wcagSpineMatches = findWcagSpineMatches(issue, wcagSpineData);
      const wcagSpineSummary = summarizeWcagSpineMatches(wcagSpineMatches);
      const attributedIssue = {
        ...issue,
        sourceFile: report.file,
        platform: attribution.platformProfile?.platform || "Unknown",
        platformConfidence: attribution.platformProfile?.confidence || 0,
        platformSignals: attribution.platformProfile?.signals || [],
        owner,
        confidence: attribution.confidence,
        ownerProbabilities: attribution.ownerProbabilities || [],
        contributingOwners: attribution.contributingOwners || [owner],
        uncertaintyFlags: attribution.uncertaintyFlags || [],
        rationale: attribution.rationale,
        usedAiFallback: attribution.usedAiFallback,
        suggestedFixLocation: mapFixLocation(owner),
        arrmOwnerSignals: attribution.arrmOwnerSignals || {},
        wcagSpineOwnerSignals: attribution.wcagSpineOwnerSignals || {},
        wcagSc: wcagSpineSummary.wcagSc,
        wcagSpineManualRoles: wcagSpineSummary.manualRoles,
        trustedTesterSteps: wcagSpineSummary.trustedTesterSteps,
        arrmTaskIds: relatedArrmTasks.map((task) => task.id),
        arrmReferences: relatedArrmTasks.map((task) => ({
          id: task.id,
          wcagSc: task.wcagSc,
          level: task.level,
          task: task.task,
          mainRole: task.mainRole,
          primaryOwnership: task.primaryOwnership,
          secondaryOwnership: task.secondaryOwnership
        })),
        wcagSpineReferences: wcagSpineMatches.map((match) => ({
          sc: match.scId,
          title: match.title,
          level: match.level,
          principle: match.principle,
          url: match.url,
          manualRoles: match.manualRoles
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

  const learningCandidates = allAttributedIssues.filter(
    (issue) => issue.owner === "Ambiguous" || Number(issue.confidence || 0) < 0.8 || issue.usedAiFallback
  );

  await appendCandidatePatterns(learningCandidates, {
    source: "attribute-engine"
  });

  const output = {
    generatedAt: new Date().toISOString(),
    arrm: {
      source: "./data/reference/arrm-all-tasks.csv",
      loadedTaskCount: arrmTasks.length
    },
    wcagSpine: {
      source: "./data/reference/wcag-spine-master.json",
      loadedScCount: Object.keys(wcagSpineData.successCriteria || {}).length,
      generatedAt: wcagSpineData.meta?.generated || null,
      wcagVersion: wcagSpineData.meta?.wcag_version || null,
      axeVersion: wcagSpineData.meta?.axe_version || null
    },
    learning: {
      trustedPatternsLoaded: trustedPatterns.length,
      learningCandidateCount: learningCandidates.length,
      candidateStore: "./data/learning/candidate-patterns.json",
      trustedStore: "./data/learning/trusted-patterns.json",
      decisionLogStore: "./data/learning/decision-log.json"
    },
    totals: {
      totalIssues: allAttributedIssues.length,
      byOwner: Object.fromEntries(
        Object.entries(owners).map(([owner, issues]) => [owner, issues.length])
      )
    },
    platformDetection: {
      mode: "issue-level",
      byPlatform: Object.fromEntries(
        allAttributedIssues.reduce((accumulator, issue) => {
          const key = issue.platform || "Unknown";
          accumulator.set(key, (accumulator.get(key) || 0) + 1);
          return accumulator;
        }, new Map())
      )
    },
    attributionUncertainty: {
      byFlag: Object.fromEntries(
        allAttributedIssues.reduce((accumulator, issue) => {
          for (const flag of issue.uncertaintyFlags || []) {
            accumulator.set(flag, (accumulator.get(flag) || 0) + 1);
          }
          return accumulator;
        }, new Map())
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

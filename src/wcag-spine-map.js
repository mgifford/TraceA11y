import { readFile } from "node:fs/promises";

const DEFAULT_WCAG_SPINE_PATH = "./data/reference/wcag-spine-master.json";

function normalizeOwnerToken(token) {
  const value = (token || "").trim().toLowerCase();

  if (!value || value === "none") {
    return null;
  }

  if (value.includes("content author")) {
    return "Content Author";
  }

  if (value.includes("ux") || value.includes("visual") || value.includes("design")) {
    return "Themer / Visual Designer";
  }

  if (value.includes("front-end") || value.includes("development") || value.includes("developer")) {
    return "Developer";
  }

  if (value.includes("site builder") || value.includes("configuration")) {
    return "Site Builder";
  }

  return null;
}

function normalizeRuleId(ruleId) {
  return String(ruleId || "")
    .trim()
    .toLowerCase();
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

export async function loadWcagSpineData(filePath = DEFAULT_WCAG_SPINE_PATH) {
  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content);
    const successCriteria = parsed?.success_criteria || {};

    const ruleToSc = new Map();

    for (const [scId, sc] of Object.entries(successCriteria)) {
      const axeRules = sc?.automation?.axe || [];
      for (const rule of axeRules) {
        const key = normalizeRuleId(rule);
        if (!key) {
          continue;
        }

        if (!ruleToSc.has(key)) {
          ruleToSc.set(key, []);
        }

        ruleToSc.get(key).push({
          scId,
          title: sc?.title || "",
          level: sc?.level || "",
          principle: sc?.principle || "",
          url: sc?.url || "",
          manualRoles: sc?.manual?.roles || [],
          trustedTesterSteps: sc?.manual?.tt_steps || []
        });
      }
    }

    return {
      meta: parsed?.meta || {},
      successCriteria,
      ruleToSc
    };
  } catch {
    return {
      meta: {},
      successCriteria: {},
      ruleToSc: new Map()
    };
  }
}

export function findWcagSpineMatches(issue, wcagSpineData, maxItems = 5) {
  const key = normalizeRuleId(issue?.ruleId || "");
  if (!key || !wcagSpineData?.ruleToSc) {
    return [];
  }

  const matches = wcagSpineData.ruleToSc.get(key) || [];
  return matches.slice(0, maxItems);
}

export function getWcagSpineOwnerSignals(issue, wcagSpineData) {
  const matches = findWcagSpineMatches(issue, wcagSpineData, 20);
  const signals = {};

  for (const match of matches) {
    for (const role of match.manualRoles || []) {
      const owner = normalizeOwnerToken(role);
      if (!owner) {
        continue;
      }

      signals[owner] = (signals[owner] || 0) + 1;
    }
  }

  return signals;
}

export function summarizeWcagSpineMatches(matches) {
  const wcagSc = unique(matches.map((match) => match.scId));
  const trustedTesterSteps = unique(matches.flatMap((match) => match.trustedTesterSteps || []));
  const manualRoles = unique(matches.flatMap((match) => match.manualRoles || []));

  return {
    wcagSc,
    trustedTesterSteps,
    manualRoles
  };
}

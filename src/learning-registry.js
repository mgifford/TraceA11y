import { mkdir, readFile, writeFile } from "node:fs/promises";

const LEARNING_DIR = "./data/learning";
const TRUSTED_PATTERNS_FILE = `${LEARNING_DIR}/trusted-patterns.json`;
const CANDIDATE_PATTERNS_FILE = `${LEARNING_DIR}/candidate-patterns.json`;
const DECISION_LOG_FILE = `${LEARNING_DIR}/decision-log.json`;

const DEFAULT_TRUSTED = {
  version: 1,
  updatedAt: null,
  patterns: []
};

const DEFAULT_CANDIDATES = {
  version: 1,
  updatedAt: null,
  candidates: []
};

const DEFAULT_DECISIONS = {
  version: 1,
  updatedAt: null,
  decisions: []
};

function nowIso() {
  return new Date().toISOString();
}

async function ensureDir() {
  await mkdir(LEARNING_DIR, { recursive: true });
}

async function readJsonOrDefault(filePath, defaultData) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return structuredClone(defaultData);
  }
}

async function writeJson(filePath, data) {
  await ensureDir();
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function normalizeRuleId(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function extractSelectorCandidates(issue) {
  const xpath = String(issue?.xpath || "");
  const snippet = String(issue?.snippet || "");
  const set = new Set();

  const classMatches = xpath.match(/\.[a-z0-9_-]+/gi) || [];
  classMatches.forEach((match) => set.add(match));

  const tagMatches = snippet.match(/<\s*([a-z0-9-]+)/gi) || [];
  for (const match of tagMatches) {
    const tag = match.replace(/<\s*/g, "").toLowerCase();
    if (tag) {
      set.add(`<${tag}>`);
    }
  }

  const ariaMatches = snippet.match(/aria-[a-z-]+/gi) || [];
  ariaMatches.forEach((match) => set.add(match.toLowerCase()));

  return [...set].slice(0, 8);
}

function toTrustedSignature(pattern) {
  const selectorPatterns = (pattern.selectors || [])
    .filter(Boolean)
    .map((selector) => ({
      source: selector,
      flags: "i"
    }));

  return {
    id: pattern.id,
    owner: pattern.owner,
    source: pattern.source,
    confidence: pattern.confidence,
    ruleHints: [normalizeRuleId(pattern.ruleId)].filter(Boolean),
    selectorPatterns,
    firstSeenAt: pattern.firstSeenAt,
    promotedAt: nowIso(),
    promotedBy: "manual-review"
  };
}

export async function loadTrustedPatterns() {
  const data = await readJsonOrDefault(TRUSTED_PATTERNS_FILE, DEFAULT_TRUSTED);
  return data.patterns || [];
}

export function trustedPatternsToSignatures(patterns) {
  return (patterns || [])
    .filter((pattern) => pattern && pattern.owner)
    .map((pattern) => ({
      owner: pattern.owner,
      xpathOrSnippetPatterns: (pattern.selectorPatterns || []).map((selector) =>
        new RegExp(selector.source, selector.flags || "i")
      ),
      ruleHints: (pattern.ruleHints || []).map((rule) => normalizeRuleId(rule))
    }));
}

export async function appendCandidatePatterns(issues, context = {}) {
  const data = await readJsonOrDefault(CANDIDATE_PATTERNS_FILE, DEFAULT_CANDIDATES);
  const candidates = data.candidates || [];
  const now = nowIso();

  for (const issue of issues) {
    const ruleId = normalizeRuleId(issue.ruleId);
    if (!ruleId) {
      continue;
    }

    const selectors = extractSelectorCandidates(issue);
    if (selectors.length === 0) {
      continue;
    }

    const key = `${ruleId}::${selectors[0]}::${issue.owner || "Ambiguous"}`;
    const existing = candidates.find((candidate) => candidate.key === key);

    if (existing) {
      existing.lastSeenAt = now;
      existing.matchCount = (existing.matchCount || 0) + 1;
      if (issue.url && !existing.exampleUrls.includes(issue.url)) {
        existing.exampleUrls.push(issue.url);
      }
      continue;
    }

    candidates.push({
      id: `cand-${now.replace(/[^0-9]/g, "").slice(0, 14)}-${candidates.length + 1}`,
      key,
      status: "candidate",
      source: context.source || "engine",
      owner: issue.owner || "Ambiguous",
      confidence: issue.confidence || 0,
      ruleId,
      selectors,
      rationale: issue.rationale || "",
      firstSeenAt: now,
      lastSeenAt: now,
      matchCount: 1,
      exampleUrls: issue.url ? [issue.url] : [],
      falsePositiveCount: 0,
      truePositiveCount: 0
    });
  }

  data.updatedAt = now;
  data.candidates = candidates;
  await writeJson(CANDIDATE_PATTERNS_FILE, data);

  return candidates;
}

export async function promoteCandidateToTrusted(candidateId, ownerOverride) {
  const candidatesData = await readJsonOrDefault(CANDIDATE_PATTERNS_FILE, DEFAULT_CANDIDATES);
  const trustedData = await readJsonOrDefault(TRUSTED_PATTERNS_FILE, DEFAULT_TRUSTED);
  const decisionsData = await readJsonOrDefault(DECISION_LOG_FILE, DEFAULT_DECISIONS);

  const candidate = (candidatesData.candidates || []).find((item) => item.id === candidateId);
  if (!candidate) {
    throw new Error(`Candidate ${candidateId} not found`);
  }

  const owner = ownerOverride || candidate.owner;
  const trusted = toTrustedSignature({ ...candidate, owner });
  trustedData.patterns.push(trusted);

  candidate.status = "promoted";
  candidate.promotedAt = nowIso();
  candidate.promotedOwner = owner;

  decisionsData.decisions.push({
    id: `decision-${Date.now()}`,
    candidateId,
    action: "promote",
    owner,
    timestamp: nowIso(),
    note: "Promoted candidate to trusted pattern library"
  });

  trustedData.updatedAt = nowIso();
  candidatesData.updatedAt = nowIso();
  decisionsData.updatedAt = nowIso();

  await writeJson(TRUSTED_PATTERNS_FILE, trustedData);
  await writeJson(CANDIDATE_PATTERNS_FILE, candidatesData);
  await writeJson(DECISION_LOG_FILE, decisionsData);

  return trusted;
}

export async function rejectCandidate(candidateId, note = "Rejected during manual review") {
  const candidatesData = await readJsonOrDefault(CANDIDATE_PATTERNS_FILE, DEFAULT_CANDIDATES);
  const decisionsData = await readJsonOrDefault(DECISION_LOG_FILE, DEFAULT_DECISIONS);

  const candidate = (candidatesData.candidates || []).find((item) => item.id === candidateId);
  if (!candidate) {
    throw new Error(`Candidate ${candidateId} not found`);
  }

  candidate.status = "rejected";
  candidate.rejectedAt = nowIso();

  decisionsData.decisions.push({
    id: `decision-${Date.now()}`,
    candidateId,
    action: "reject",
    owner: candidate.owner,
    timestamp: nowIso(),
    note
  });

  candidatesData.updatedAt = nowIso();
  decisionsData.updatedAt = nowIso();

  await writeJson(CANDIDATE_PATTERNS_FILE, candidatesData);
  await writeJson(DECISION_LOG_FILE, decisionsData);

  return candidate;
}

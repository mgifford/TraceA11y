import { readFile } from "node:fs/promises";

const DEFAULT_ARRM_CSV_PATH = "./data/reference/arrm-all-tasks.csv";

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let index = 0;
  let inQuotes = false;

  while (index < line.length) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 2;
        continue;
      }

      inQuotes = !inQuotes;
      index += 1;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  values.push(current);
  return values;
}

function normalizeOwnerToken(token) {
  const value = (token || "").trim().toLowerCase();

  if (!value || value === "none") {
    return null;
  }

  if (value.includes("author")) {
    return "Content Author";
  }

  if (value.includes("ux") || value.includes("design") || value.includes("visual")) {
    return "Themer / Visual Designer";
  }

  if (value.includes("develop") || value.includes("front-end") || value.includes("back-end")) {
    return "Developer";
  }

  if (value.includes("site build") || value.includes("configuration")) {
    return "Site Builder";
  }

  return null;
}

function deriveRoleCandidates(row) {
  return [row.mainRole, row.primaryOwnership, row.secondaryOwnership, row.contributor]
    .map(normalizeOwnerToken)
    .filter(Boolean);
}

function mapRuleToPrefixes(ruleId) {
  const rule = (ruleId || "").toLowerCase();

  if (!rule) {
    return [];
  }

  const prefixes = new Set();

  if (rule.includes("image") || rule.includes("img") || rule.includes("alt")) {
    prefixes.add("IMG");
  }
  if (rule.includes("color") || rule.includes("contrast")) {
    prefixes.add("CSS");
  }
  if (rule.includes("heading") || rule.includes("semantic") || rule.includes("landmark")) {
    prefixes.add("SEM");
  }
  if (rule.includes("nav") || rule.includes("link") || rule.includes("keyboard") || rule.includes("focus")) {
    prefixes.add("NAV");
  }
  if (rule.includes("aria") || rule.includes("form") || rule.includes("label") || rule.includes("input")) {
    prefixes.add("FRM");
    prefixes.add("INP");
  }
  if (rule.includes("motion") || rule.includes("animation") || rule.includes("trap")) {
    prefixes.add("ANM");
  }
  if (rule.includes("table")) {
    prefixes.add("TAB");
  }

  return [...prefixes];
}

function toArrmRow(headers, values) {
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] ?? "";
  });

  const id = row.ID || "";
  const idPrefix = id.includes("-") ? id.split("-")[0] : id;
  const owners = deriveRoleCandidates({
    mainRole: row["Main Role"],
    primaryOwnership: row["Primary Ownership"],
    secondaryOwnership: row["Secondary Ownership"],
    contributor: row.Contributor
  });

  return {
    id,
    idPrefix,
    wcagSc: row["WCAG SC"] || "",
    level: row.Level || "",
    task: row.Task || "",
    mainRole: row["Main Role"] || "",
    primaryOwnership: row["Primary Ownership"] || "",
    secondaryOwnership: row["Secondary Ownership"] || "",
    contributor: row.Contributor || "",
    mappedOwners: owners
  };
}

export async function loadArrmTasks(csvPath = DEFAULT_ARRM_CSV_PATH) {
  try {
    const content = await readFile(csvPath, "utf8");
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      return [];
    }

    const headers = parseCsvLine(lines[0]);
    const tasks = [];

    for (const line of lines.slice(1)) {
      const values = parseCsvLine(line);
      tasks.push(toArrmRow(headers, values));
    }

    return tasks;
  } catch {
    return [];
  }
}

export function findRelatedArrmTasks(issue, owner, arrmTasks, maxItems = 5) {
  if (!Array.isArray(arrmTasks) || arrmTasks.length === 0) {
    return [];
  }

  const targetPrefixes = mapRuleToPrefixes(issue.ruleId);
  if (targetPrefixes.length === 0) {
    return [];
  }

  const strict = arrmTasks.filter(
    (task) =>
      targetPrefixes.includes(task.idPrefix) &&
      (!owner || task.mappedOwners.length === 0 || task.mappedOwners.includes(owner))
  );

  const fallback = arrmTasks.filter((task) => targetPrefixes.includes(task.idPrefix));
  const selected = strict.length > 0 ? strict : fallback;

  return selected.slice(0, maxItems);
}

export function getArrmOwnerSignals(issue, arrmTasks, maxTasks = 40) {
  if (!Array.isArray(arrmTasks) || arrmTasks.length === 0) {
    return {};
  }

  const targetPrefixes = mapRuleToPrefixes(issue.ruleId);
  if (targetPrefixes.length === 0) {
    return {};
  }

  const candidates = arrmTasks
    .filter((task) => targetPrefixes.includes(task.idPrefix))
    .slice(0, maxTasks);

  const signals = {};
  for (const task of candidates) {
    for (const owner of task.mappedOwners) {
      signals[owner] = (signals[owner] || 0) + 1;
    }
  }

  return signals;
}

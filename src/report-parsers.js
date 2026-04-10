function normalizeString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function unquote(value) {
  const trimmed = normalizeString(value);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function normalizeIssueRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const url = normalizeString(record.url || record.page || record.pageUrl || record.location);
  const xpath = normalizeString(record.xpath || record.selector || record.path);
  const snippet = normalizeString(record.snippet || record.html || record.context || record.element);
  const ruleId = normalizeString(
    record.ruleId || record.rule || record.rule_id || record.id || record.check
  );
  const error = normalizeString(record.error || record.message || record.description);

  if (!url && !xpath && !snippet && !ruleId && !error) {
    return null;
  }

  return {
    ...record,
    url,
    xpath,
    snippet,
    ruleId,
    error
  };
}

function parseJsonReport(content) {
  const parsed = JSON.parse(content);

  if (Array.isArray(parsed)) {
    return parsed.map(normalizeIssueRecord).filter(Boolean);
  }

  if (Array.isArray(parsed?.issues)) {
    return parsed.issues.map(normalizeIssueRecord).filter(Boolean);
  }

  throw new Error("JSON report must contain an array or an issues array");
}

function splitYamlDocuments(content) {
  return content
    .split(/^---\s*$/m)
    .map((section) => section.trim())
    .filter(Boolean);
}

function parseYamlScalar(value) {
  const trimmed = normalizeString(value);
  if (trimmed === "null" || trimmed === "~") {
    return "";
  }

  return unquote(trimmed);
}

function parseYamlBlock(lines, startIndex) {
  const records = [];
  let current = null;
  let index = startIndex;
  let inIssuesBlock = false;

  const flushCurrent = () => {
    if (current) {
      records.push(current);
      current = null;
    }
  };

  while (index < lines.length) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      index += 1;
      continue;
    }

    if (/^issues:\s*$/i.test(trimmed)) {
      inIssuesBlock = true;
      index += 1;
      continue;
    }

    if (!inIssuesBlock && /^[A-Za-z0-9_-]+\s*:\s*/.test(trimmed)) {
      throw new Error("Top-level YAML objects must be provided as a list or an issues block");
    }

    const listItemMatch = rawLine.match(/^\s*-\s*(.*)$/);
    if (listItemMatch) {
      flushCurrent();
      current = {};
      const remainder = listItemMatch[1].trim();
      if (remainder) {
        const inlineMatch = remainder.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
        if (inlineMatch) {
          current[inlineMatch[1]] = parseYamlScalar(inlineMatch[2]);
        }
      }
      index += 1;
      continue;
    }

    const fieldMatch = rawLine.match(/^\s+([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (fieldMatch && current) {
      const [, key, initialValue] = fieldMatch;
      const value = initialValue.trim();

      if (value === "|" || value === ">") {
        const blockLines = [];
        const folded = value === ">";
        const fieldIndent = rawLine.match(/^(\s*)/)?.[1].length || 0;
        index += 1;

        while (index < lines.length) {
          const candidate = lines[index];
          const candidateIndent = candidate.match(/^(\s*)/)?.[1].length || 0;
          if (candidate.trim() && candidateIndent <= fieldIndent) {
            break;
          }

          blockLines.push(candidate.slice(Math.min(candidate.length, fieldIndent + 2)));
          index += 1;
        }

        current[key] = folded
          ? blockLines.map((line) => line.trim()).join(" ").trim()
          : blockLines.join("\n").trim();
        continue;
      }

      current[key] = parseYamlScalar(value);
      index += 1;
      continue;
    }

    index += 1;
  }

  flushCurrent();
  return records;
}

function parseYamlReport(content) {
  const records = splitYamlDocuments(content).flatMap((documentContent) =>
    parseYamlBlock(documentContent.split(/\r?\n/), 0)
  );

  if (records.length === 0) {
    throw new Error("YAML report did not contain any issue records");
  }

  return records.map(normalizeIssueRecord).filter(Boolean);
}

export function parsePlainTextReport(content) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized.split(/\n\s*\n+/);
  const records = [];

  for (const block of blocks) {
    const record = {};

    for (const line of block.split("\n")) {
      const match = line.match(/^\s*([A-Za-z][A-Za-z0-9 _-]+)\s*:\s*(.+)\s*$/);
      if (!match) {
        continue;
      }

      const rawKey = match[1].trim().toLowerCase();
      const value = match[2];
      const keyMap = {
        url: "url",
        page: "url",
        location: "url",
        xpath: "xpath",
        selector: "xpath",
        path: "xpath",
        snippet: "snippet",
        html: "snippet",
        context: "snippet",
        "rule id": "ruleId",
        rule: "ruleId",
        ruleid: "ruleId",
        id: "ruleId",
        error: "error",
        message: "error",
        description: "error"
      };

      const mappedKey = keyMap[rawKey];
      if (mappedKey) {
        record[mappedKey] = value.trim();
      }
    }

    const normalizedRecord = normalizeIssueRecord(record);
    if (normalizedRecord) {
      records.push(normalizedRecord);
    }
  }

  if (records.length === 0) {
    throw new Error(
      "Text report must contain blank-line separated issue blocks with labeled fields such as URL, XPath, Snippet, and Rule ID"
    );
  }

  return records;
}

function inferContentFormat(content, sourcePath = "") {
  const lowerPath = normalizeString(sourcePath).toLowerCase();
  const trimmed = content.trim();

  if (lowerPath.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json";
  }

  if (lowerPath.endsWith(".yaml") || lowerPath.endsWith(".yml")) {
    return "yaml";
  }

  if (trimmed.startsWith("---") || /^issues:\s*$/im.test(trimmed) || /^\s*-\s+[A-Za-z0-9_-]+\s*:/m.test(trimmed)) {
    return "yaml";
  }

  return "text";
}

export function parseReportContent(content, sourcePath = "") {
  const format = inferContentFormat(content, sourcePath);

  if (format === "json") {
    return parseJsonReport(content);
  }

  if (format === "yaml") {
    return parseYamlReport(content);
  }

  return parsePlainTextReport(content);
}

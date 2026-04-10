const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";
const DEFAULT_GITHUB_MODEL = "openai/gpt-4o-mini";
const DEFAULT_BATCH_SIZE = 25;

function clampBatchSize(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.min(parsed, 50);
}

function buildPrompt(issue) {
  return [
    "Classify this accessibility issue owner into one of:",
    "Content Author, Site Builder, Themer / Visual Designer, Developer.",
    "Return strict JSON: {\"owner\": string, \"confidence\": number, \"rationale\": string}.",
    "Consider Drupal context and ARRM/FAS role boundaries.",
    `Issue URL: ${issue.url || ""}`,
    `XPath: ${issue.xpath || ""}`,
    `Snippet: ${issue.snippet || ""}`,
    `Rule ID: ${issue.ruleId || ""}`
  ].join("\n");
}

function buildBatchPrompt(issues) {
  const issueLines = issues.map((issue, index) =>
    [
      `Issue ${index}:`,
      `URL: ${issue.url || ""}`,
      `XPath: ${issue.xpath || ""}`,
      `Snippet: ${issue.snippet || ""}`,
      `Rule ID: ${issue.ruleId || ""}`
    ].join("\n")
  );

  return [
    "Classify each accessibility issue owner into one of:",
    "Content Author, Site Builder, Themer / Visual Designer, Developer.",
    "Return strict JSON as an array of objects with this shape:",
    '[{"index": number, "owner": string, "confidence": number, "rationale": string}]',
    "Use the provided issue index values in your response.",
    "Consider Drupal context and ARRM/FAS role boundaries.",
    ...issueLines
  ].join("\n\n");
}

function normalizeResult(parsed) {
  const owner = parsed?.owner;
  const allowed = new Set([
    "Content Author",
    "Site Builder",
    "Themer / Visual Designer",
    "Developer"
  ]);

  if (!allowed.has(owner)) {
    return {
      owner: "Ambiguous",
      confidence: 0,
      rationale: "LLM response did not contain a supported owner value"
    };
  }

  return {
    owner,
    confidence: Number(parsed.confidence) || 0.5,
    rationale: parsed.rationale || "Classified by LLM"
  };
}

function normalizeBatchResults(parsed, expectedLength) {
  const normalized = Array.from({ length: expectedLength }, () => ({
    owner: "Ambiguous",
    confidence: 0,
    rationale: "Batch AI response did not contain a supported owner value"
  }));

  if (!Array.isArray(parsed)) {
    return normalized;
  }

  for (const item of parsed) {
    const index = Number(item?.index);
    if (!Number.isInteger(index) || index < 0 || index >= expectedLength) {
      continue;
    }

    normalized[index] = normalizeResult(item);
  }

  return normalized;
}

async function classifyWithGemini(prompt, apiKey, expectedLength = 1) {
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse(text);
  return expectedLength === 1
    ? normalizeResult(parsed)
    : normalizeBatchResults(parsed, expectedLength);
}

async function classifyWithGitHubModels(prompt, token, expectedLength = 1) {
  const model = process.env.GITHUB_MODEL || DEFAULT_GITHUB_MODEL;
  const endpoint = "https://models.inference.ai.azure.com/chat/completions";

  const payload = {
    model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          expectedLength === 1
            ? "You classify Drupal accessibility issues into a single responsible role. Return JSON only."
            : "You classify Drupal accessibility issues into responsible roles in batches. Return JSON only."
      },
      { role: "user", content: prompt }
    ]
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`GitHub Models request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  const parsed = JSON.parse(text);
  return expectedLength === 1
    ? normalizeResult(parsed)
    : normalizeBatchResults(parsed, expectedLength);
}

function manualBatchResult(issue) {
  return {
    owner: "Ambiguous",
    confidence: 0,
    rationale: `Manual AI review required for ${issue.ruleId || "unknown rule"}`
  };
}

function getProvider() {
  return String(process.env.AI_PROVIDER || "auto").trim().toLowerCase();
}

async function classifyBatchWithProvider(issues) {
  const provider = getProvider();
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const githubToken = process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN;
  const prompt = buildBatchPrompt(issues);

  if (provider === "manual" || provider === "browser") {
    return issues.map((issue) => manualBatchResult(issue));
  }

  if ((provider === "gemini" || provider === "auto") && geminiApiKey) {
    return classifyWithGemini(prompt, geminiApiKey, issues.length);
  }

  if ((provider === "github" || provider === "copilot" || provider === "auto") && githubToken) {
    return classifyWithGitHubModels(prompt, githubToken, issues.length);
  }

  return issues.map((issue) => manualBatchResult(issue));
}

export function buildManualAiReviewBatches(issues) {
  const batchSize = clampBatchSize(process.env.AI_BATCH_SIZE);
  const batches = [];

  for (let index = 0; index < issues.length; index += batchSize) {
    const slice = issues.slice(index, index + batchSize);
    batches.push({
      batchNumber: batches.length + 1,
      issueCount: slice.length,
      prompt: buildBatchPrompt(slice),
      issues: slice.map((issue) => ({
        url: issue.url || "",
        xpath: issue.xpath || "",
        snippet: issue.snippet || "",
        ruleId: issue.ruleId || ""
      }))
    });
  }

  return batches;
}

export async function classifyAmbiguousWithAi(issue) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const githubToken = process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN;

  try {
    if (geminiApiKey) {
      return await classifyWithGemini(buildPrompt(issue), geminiApiKey);
    }

    if (githubToken) {
      return await classifyWithGitHubModels(buildPrompt(issue), githubToken);
    }

    return {
      owner: "Ambiguous",
      confidence: 0,
      rationale: "No AI credentials configured"
    };
  } catch (error) {
    return {
      owner: "Ambiguous",
      confidence: 0,
      rationale: `AI classification failed: ${error.message}`
    };
  }
}

export async function classifyAmbiguousWithAiBatch(issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return [];
  }

  const batchSize = clampBatchSize(process.env.AI_BATCH_SIZE);
  const results = [];

  for (let index = 0; index < issues.length; index += batchSize) {
    const slice = issues.slice(index, index + batchSize);

    try {
      const batchResults = await classifyBatchWithProvider(slice);
      results.push(...batchResults);
    } catch (error) {
      results.push(
        ...slice.map(() => ({
          owner: "Ambiguous",
          confidence: 0,
          rationale: `AI classification failed: ${error.message}`
        }))
      );
    }
  }

  return results;
}

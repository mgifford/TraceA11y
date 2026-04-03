const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";
const DEFAULT_GITHUB_MODEL = "openai/gpt-4o-mini";

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

async function classifyWithGemini(issue, apiKey) {
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: buildPrompt(issue) }] }],
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
  return normalizeResult(JSON.parse(text));
}

async function classifyWithGitHubModels(issue, token) {
  const model = process.env.GITHUB_MODEL || DEFAULT_GITHUB_MODEL;
  const endpoint = "https://models.inference.ai.azure.com/chat/completions";

  const payload = {
    model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You classify Drupal accessibility issues into a single responsible role. Return JSON only."
      },
      { role: "user", content: buildPrompt(issue) }
    ],
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
  return normalizeResult(JSON.parse(text));
}

export async function classifyAmbiguousWithAi(issue) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const githubToken = process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN;

  try {
    if (geminiApiKey) {
      return await classifyWithGemini(issue, geminiApiKey);
    }

    if (githubToken) {
      return await classifyWithGitHubModels(issue, githubToken);
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

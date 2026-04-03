function normalizeText(value) {
  return String(value || "").toLowerCase();
}

const DETECTION_POLICY = {
  highScoreThreshold: 0.95,
  mediumScoreThreshold: 0.7,
  multiSignalThreshold: 1.2
};

function scoreDrupalSignals(issue) {
  const haystack = [issue?.url, issue?.xpath, issue?.snippet].map(normalizeText).join(" ");
  const signals = [];
  let score = 0;

  const tests = [
    {
      weight: 0.95,
      reason: "data-drupal-selector attribute",
      strength: "high",
      pattern: /data-drupal-selector/
    },
    {
      weight: 0.95,
      reason: "drupal settings payload",
      strength: "high",
      pattern: /drupal-settings-json|drupalsettings|window\.drupal/
    },
    {
      weight: 0.75,
      reason: "Drupal field class naming",
      strength: "high",
      pattern: /\.field--name-[a-z0-9_-]+/
    },
    {
      weight: 0.7,
      reason: "Drupal paragraph type class",
      strength: "low",
      pattern: /\.paragraph--type-[a-z0-9_-]+/
    },
    {
      weight: 0.7,
      reason: "Drupal Views classes",
      strength: "high",
      pattern: /\.view-id-|\.view-display-id-/
    },
    {
      weight: 0.65,
      reason: "Drupal layout builder classes",
      strength: "medium",
      pattern: /\.layout-builder|\.block-system-main-block/
    },
    {
      weight: 0.65,
      reason: "Drupal node content class",
      strength: "medium",
      pattern: /\.node-content|\.path-node/
    },
    {
      weight: 0.6,
      reason: "Drupal webform class",
      strength: "medium",
      pattern: /\.webform-client-form/
    },
    {
      weight: 0.6,
      reason: "Drupal node URL path",
      strength: "low",
      pattern: /\/node\/[0-9]+/
    },
    {
      weight: 0.55,
      reason: "Drupal files directory path",
      strength: "low",
      pattern: /\/sites\/default\/files\//
    }
  ];

  const matchedStrengths = [];

  for (const test of tests) {
    if (test.pattern.test(haystack)) {
      score += test.weight;
      signals.push(test.reason);
      matchedStrengths.push(test.strength || "low");
    }
  }

  return {
    score,
    signals,
    matchedStrengths
  };
}

export function detectSitePlatformForIssue(issue) {
  const drupal = scoreDrupalSignals(issue);

  const hasHighSignal = drupal.matchedStrengths.includes("high");
  const hasMediumSignal = drupal.matchedStrengths.includes("medium");
  const shouldClassifyDrupal =
    drupal.score >= DETECTION_POLICY.highScoreThreshold ||
    (drupal.score >= DETECTION_POLICY.mediumScoreThreshold && hasHighSignal) ||
    (drupal.score >= DETECTION_POLICY.multiSignalThreshold && hasMediumSignal);

  if (shouldClassifyDrupal) {
    return {
      platform: "Drupal",
      confidence: Math.min(drupal.score / 2, 0.99),
      signals: drupal.signals
    };
  }

  return {
    platform: "Unknown",
    confidence: 0,
    signals: []
  };
}

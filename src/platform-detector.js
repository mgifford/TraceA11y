function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function scoreDrupalSignals(issue) {
  const haystack = [issue?.url, issue?.xpath, issue?.snippet].map(normalizeText).join(" ");
  const signals = [];
  let score = 0;

  const tests = [
    {
      weight: 0.95,
      reason: "data-drupal-selector attribute",
      pattern: /data-drupal-selector/
    },
    {
      weight: 0.95,
      reason: "drupal settings payload",
      pattern: /drupal-settings-json|drupalsettings|window\.drupal/
    },
    {
      weight: 0.75,
      reason: "Drupal field class naming",
      pattern: /\.field--name-[a-z0-9_-]+/
    },
    {
      weight: 0.7,
      reason: "Drupal paragraph type class",
      pattern: /\.paragraph--type-[a-z0-9_-]+/
    },
    {
      weight: 0.7,
      reason: "Drupal Views classes",
      pattern: /\.view-id-|\.view-display-id-/
    },
    {
      weight: 0.65,
      reason: "Drupal layout builder classes",
      pattern: /\.layout-builder|\.block-system-main-block/
    },
    {
      weight: 0.65,
      reason: "Drupal node content class",
      pattern: /\.node-content|\.path-node/
    },
    {
      weight: 0.6,
      reason: "Drupal webform class",
      pattern: /\.webform-client-form/
    },
    {
      weight: 0.6,
      reason: "Drupal node URL path",
      pattern: /\/node\/[0-9]+/
    },
    {
      weight: 0.55,
      reason: "Drupal files directory path",
      pattern: /\/sites\/default\/files\//
    }
  ];

  for (const test of tests) {
    if (test.pattern.test(haystack)) {
      score += test.weight;
      signals.push(test.reason);
    }
  }

  return {
    score,
    signals
  };
}

export function detectSitePlatformForIssue(issue) {
  const drupal = scoreDrupalSignals(issue);

  if (drupal.score >= 0.7) {
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

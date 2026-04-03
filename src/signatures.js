export const ROLE_ORDER = [
  "Content Author",
  "Site Builder",
  "Themer / Visual Designer",
  "Developer",
  "Ambiguous"
];

export const ROLE_REMEDIATION_PATHS = {
  "Content Author": "CMS content editing workflow (node/paragraph/field content)",
  "Site Builder": "Drupal configuration (Views, Layout Builder, Blocks)",
  "Themer / Visual Designer": "Theme and design system layer (global CSS/components)",
  "Developer": "Custom code/module fixes (templates, JS, backend forms)",
  "Ambiguous": "Manual triage needed (run AI classifier or human review)"
};

export const ROLE_SIGNATURES = [
  {
    owner: "Content Author",
    xpathOrSnippetPatterns: [
      /\.field--name-field-/i,
      /\.paragraph--type-/i,
      /\.node-content/i,
      /\.ck-content/i,
      /\/article\b/i
    ],
    ruleHints: ["image-alt", "heading-order", "empty-link", "color-contrast"]
  },
  {
    owner: "Site Builder",
    xpathOrSnippetPatterns: [
      /\.view-id-/i,
      /\.view-display-id-/i,
      /\.block-system-main-block/i,
      /\.layout-builder/i
    ],
    ruleHints: ["duplicate-id", "landmark-one-main", "landmark-no-duplicate-main"]
  },
  {
    owner: "Themer / Visual Designer",
    xpathOrSnippetPatterns: [
      /header\.site-header/i,
      /<footer\b/i,
      /\.nav-primary/i,
      /\.ds-/i
    ],
    ruleHints: ["color-contrast", "focus-visible", "meta-viewport"]
  },
  {
    owner: "Developer",
    xpathOrSnippetPatterns: [
      /\.form-item/i,
      /aria-[a-z-]+/i,
      /<input\b/i,
      /<button\b/i,
      /\.webform-client-form/i
    ],
    ruleHints: [
      "aria-allowed-attr",
      "aria-valid-attr",
      "keyboard",
      "label",
      "form-field-multiple-labels"
    ]
  }
];

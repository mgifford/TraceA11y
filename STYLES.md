# STYLES.md: TraceA11y style standard

This file defines writing, design, and interaction standards for TraceA11y so humans and AI agents can produce consistent, accessible output.

## 1. Scope and precedence

1. This file governs style decisions for:
- The GitHub Pages dashboard in [index.html](index.html)
- Repository documentation in [README.md](README.md), [ACCESSIBILITY.md](ACCESSIBILITY.md), and [AGENTS.md](AGENTS.md)
2. Accessibility rules in [ACCESSIBILITY.md](ACCESSIBILITY.md) always take precedence.
3. Engineering constraints in [AGENTS.md](AGENTS.md) always apply.
4. This style standard builds on CivicActions-aligned guidance from:
- https://github.com/mgifford/top-task-finder/blob/main/STYLES.md
- https://mgifford.github.io/STYLES.md/

## 2. Voice and content

1. Use plain language and active voice.
2. Use sentence case for headings, labels, and button text.
3. Use American English spelling.
4. Prefer short, direct wording over internal shorthand.
5. Expand abbreviations on first mention in user-facing content.

## 3. Design tokens

Use these tokens as the default palette for TraceA11y UI work.

| Token | Value | Use |
| :--- | :--- | :--- |
| --ta-navy | #0b1f3a | Hero backgrounds, strong text surfaces |
| --ta-blue | #1f4f99 | Primary actions, links, chart accents |
| --ta-sky | #54a8ff | Secondary accents, chart series |
| --ta-orange | #f28f3b | Emphasis, secondary data highlights |
| --ta-gold | #f5b700 | Caution/emphasis accents |
| --ta-ink | #122033 | Primary text color |

## 4. Layout and visual rules

1. Keep semantic HTML structure: main, header, section, table.
2. Use strong contrast and clear hierarchy, not decorative color alone.
3. Prefer subtle gradients and section tinting over flat monochrome backgrounds.
4. Keep spacing consistent with existing Tailwind utility rhythm.
5. Charts must use role-based color mapping that remains distinguishable.

## 5. Interaction rules

1. Keyboard users must be able to reach every control.
2. Tooltip and popover content must be available on focus and not only on hover.
3. Interactive elements must include visible focus states.
4. Never rely on color alone to communicate state.

## 6. ARRM task presentation

1. Do not present ARRM IDs as unexplained shorthand in UI.
2. Show ARRM IDs with supporting context:
- Task description
- Related WCAG SC when available
- Ownership fields when available
3. Prefer accessible tooltip disclosure for dense tables.
4. If tooltip content is unavailable, provide a clear fallback label.

## 7. Agent implementation rules

1. When editing UI, keep changes small and commit by concern (visual, behavior, docs).
2. Reuse existing tokens and patterns before adding new ones.
3. Validate with local error checks before commit.
4. When uncertain, choose accessibility and readability over visual novelty.

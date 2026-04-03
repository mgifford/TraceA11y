# TraceA11y: Product Roadmap

## Current Phase: Drupal-First Foundation ✅

**Status:** MVP Complete
**Platform Focus:** Drupal 8/9/10
**Scope:** Single-platform optimization, learning registry, GitHub Pages deployment

### Completed in Phase 1:
- Attribution engine with 3-tier classification (signature → heuristic → AI)
- Drupal platform detector (10 signal tests)
- W3C ARRM integration (264 tasks)
- WCAG Spine mapping (86 success criteria)
- JSON learning registry (trusted patterns, candidates, decision log)
- GitHub Pages static dashboard
- GitHub Actions CI/CD pipeline (attribute → export → deploy)
- Axe-core 4.11 rule extraction (104 rules)

---

## Future Phase: Multi-Platform Support (Lower Priority)

### Phase 2: WordPress Support _(Timeline: TBD, post-Phase 1 validation)_

**Rationale:** WordPress is the largest CMS. Natural second target after Drupal dominance is proven.

**Planned Detective Signals:**
- CSS class prefixes: `.wp-`, `.post`, `.page`, `.wp-block-*` 
- Theme fingerprints: WP core classes (`.wp-block-*`, `.wp-element-*`)
- Plugin detection: `.gravity-form`, `.elementor-*`, `.divi-*`
- Admin URLs: `/wp-admin/`, `/wp-json/`
- XPath patterns: `/wp-content/`, `data-wp-*`

**Role Mapping:**
- **Content Editor** → WordPress post/page meta, block content
- **Site Builder** → Reusable blocks, custom post types
- **Theme Developer** → CSS, design system classes, WP theme files
- **Plugin Developer** → Plugin-specific form classes, custom ARIA attributes

**Success Metrics:**
- Platform detection accuracy: ≥85% on WordPress-only sites
- Attribution confidence baseline: ≥75% average
- Learning pattern reuse: ≥30% of Drupal patterns applicable

---

### Phase 3: Next.js / Modern Static Frameworks _(Timeline: TBD, post-Phase 2 validation)_

**Rationale:** Growing adoption in accessibility-conscious orgs (gov, enterprise); different architecture requires new signal set.

**Planned Detective Signals:**
- Component library patterns: `data-testid`, `className` with unique prefixes
- Build artifacts: `.next/`, `_app.tsx`, `src/components/`
- Framework classes: CSS Modules (`.module.css`), Tailwind patterns
- TypeScript/JSX metadata: `aria-component`, `data-component`
- Routing: `/pages/`, `/app/` Next.js folder structures

**Role Mapping:**
- **UX/Content** → Page metadata, MDX content, `_document.tsx` globals
- **Component Developer** → React component props, `aria-*` attribute definitions
- **Design System Owner** → Tailwind config, CSS variable usage, component library
- **Platform Engineer** → Build config, middleware, data fetching patterns

**Success Metrics:**
- Platform detection accuracy: ≥85% on Next.js-only sites
- Attribution confidence: ≥75% average
- Pattern portability: Evaluate transfer of heuristics from Drupal/WordPress

---

## Conditional Support (Not Planned)

**Symfony, Laravel, Ruby on Rails:** Will evaluate IF user demand demonstrates significant adoption in accessibility auditing.

**Custom/Proprietary CMS:** Extensible architecture allows user-supplied platform detectors via `user-signatures.json`.

---

## Learning Registry Expansion

As platforms multiply, the learning registry becomes more valuable:

- **Cross-Platform Pattern Library** → Identify universal patterns (e.g., "missing alt text always = Content Author")
- **Platform-Specific Learnings** → Store WordPress-only and Next.js-only patterns separately (future: `data/learning/wordpress/` subdirectory)
- **Transfer Learning** → Measure which Drupal patterns transfer to new platforms vs. need retraining

---

## Evaluation Criteria for New Platforms

Before committing to Phase 2 or 3, validate:

1. **User Base:** ≥5 organizations requesting platform support
2. **Audit Data Available:** ≥100 real accessibility scan reports from that platform
3. **Signal Richness:** ≥8 reliable platform fingerprints exist (test with pilot data)
4. **ROI:** Platform-specific learning worth the maintenance burden (test on pilot batch)

---

## Non-Goals

- **Backend Database:** Static JSON only, Git-based audit trail
- **Real-Time Scanning:** No web crawler. Process existing reports only
- **SaaS Hosting:** GitHub Pages + GitHub Actions only, zero cloud infrastructure
- **IDE Plugins:** JavaScript-only, no language-specific plugins

---

## Next Validation Gates

**Before Phase 2 Initiation:**
1. Run real-world scale test (50-100 issues, multi-site)
2. Measure learning registry impact (promote candidates → confidence lift)
3. Validate Drupal detector thresholds (zero false positives on non-Drupal sites)
4. Document platform detector extensibility API for community contributions

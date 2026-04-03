# Accessibility Statement for TraceA11y

TraceA11y is a digital forensics engine designed to map accessibility errors to organizational roles. We are committed to ensuring that TraceA11y itself meets or exceeds **WCAG 2.2 AA** standards and serves as an accessibility-first tool.

## Conformance Status

**TraceA11y Dashboard:** Conformant with **WCAG 2.2 Level AA**

The static dashboard (`index.html`) is built with accessibility as a core design principle:

- **Semantic HTML5:** Uses proper heading hierarchy (`<h1>`, `<h2>`), semantic landmarks (`<main>`, `<header>`), and data tables with proper headers
- **Keyboard Navigation:** All functionality is accessible via keyboard (Tab, Enter, Arrow keys)
- **Screen Reader Optimized:** ARIA labels, roles, and descriptions are implemented correctly
- **Color Contrast:** All text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- **Focus Management:** Focus indicators are visible and logical
- **Responsive Design:** Works on desktop, tablet, and mobile viewports
- **No Flashing:** No content flashes at frequencies that could trigger photosensitivity

### Standards & Frameworks Used

- **W3C WCAG 2.2** - Web Content Accessibility Guidelines, Level AA
- **ARIA 1.2** - Accessible Rich Internet Applications specification
- **HTML 5.3** - Semantic markup
- **DHS Trusted Tester v5** - Manual testing procedures

## Features & Accessibility

### Dashboard Upload Interface

- **File Input:** Native HTML file input with clear label and error messaging
- **Feedback:** Loading states and success/error messages announced to screen readers
- **Error Handling:** Validation errors are displayed inline with associated form controls

### Data Table

- **Headers:** Proper `<th>` elements with `scope="col"`/`scope="row"` attributes
- **Reading Order:** DOM order matches visual/logical reading order
- **Sortability:** No JavaScript-only behaviors; table can be viewed without enhancement

### Data Visualization (Chart)

- **Fallback:** Table representation provided alongside chart
- **Labels:** Chart values labeled with alt text and data table option
- **Color:** Chart colors are distinct (not relying on color alone to convey meaning)

### Filter Controls

- **Label Association:** Select dropdown is properly associated with its label
- **Keyboard Accessible:** Full keyboard navigation of dropdown options
- **ARIA Live Region:** Results update announced to screen reader users

## Known Limitations

### Axe-core Library

TraceA11y's attribution engine relies on **axe-core 4.11** for rule definitions. Axe test results are as reliable as the underlying scanner.

### Learning Registry (JSON Files)

The learning registry (`data/learning/`) is a backend data structure not directly exposed to end users via the dashboard. Contributors working with learning files should ensure:
- Valid JSON formatting
- No UI accessibility impact from internal data structures

## How to Test Accessibility

### Manual Testing

1. **Keyboard Navigation:**
   ```bash
   # Open index.html in your browser
   # Tab through all interactive elements
   # Verify Tab order is logical (top-to-bottom, left-to-right)
   # Press Enter/Space on buttons and form controls
   ```

2. **Screen Reader Testing:**
   - **Windows:** NVDA (free) or JAWS
   - **macOS:** VoiceOver (built-in)
   - **Mobile:** TalkBack (Android) or VoiceOver (iOS)

3. **Color Contrast:**
   - Use WebAIM Contrast Checker
   - Minimum 4.5:1 for normal text, 3:1 for large text

4. **Automated Testing:**
   ```bash
   # Install axe DevTools browser extension
   # Open index.html
   # Run axe scan in browser console
   ```

### Accessibility Insights for Web

Use [Accessibility Insights for Web](http://aka.ms/AccessibilityInsights) (axe-core powered):
1. Install the extension
2. Open index.html
3. Run "FastPass" or "Assessment"
4. Fix any reported issues

## Reporting Accessibility Issues

Found an accessibility issue with TraceA11y? Please report it:

1. **GitHub Issues:** Open a new issue with the label `accessibility`
2. **Include:**
   - WCAG Success Criterion affected (e.g., 1.3.1, 2.1.1)
   - Steps to reproduce
   - Your assistive technology (screen reader, voice control, etc.)
   - Browser and OS
   - Screenshot or video if helpful

### Example Issue Template

```
Title: [WCAG SC] Brief description of accessibility issue

WCAG Success Criterion: 2.1.1 Keyboard
Rule ID: keyboard
Impact: Major

Steps to reproduce:
1. Open the dashboard
2. Tab to the file upload button
3. Observe that... [describe the issue]

Expected behavior:
[What should happen instead]

Environment:
- Browser: Chrome 146
- OS: macOS 14.6
- Assistive Tech: NVDA 2024.1
```

## Development Practices

### When Contributing to the Dashboard

1. **Semantic HTML First:** Use native HTML elements before ARIA
2. **Test Keyboard Access:** Every new button/input must work via keyboard
3. **Check Contrast:** At least 4.5:1 ratio for normal text
4. **Add ARIA Only When Needed:** Use aria-label, aria-describedby, roles carefully—native semantics are preferred
5. **Test with a Screen Reader:** Run at least one manual test with NVDA or VoiceOver

### Code Review Checklist

- [ ] No keyboard traps (can tab away from all elements)
- [ ] Headings are sequential (no skip from h2 to h4)
- [ ] Form labels are properly associated with inputs
- [ ] Color is never the only way to convey information
- [ ] Interactive elements have visible focus indicators
- [ ] Images have alt text (or are marked decorative with `alt=""`)
- [ ] Links have descriptive text (avoid "click here")

## Engine Accessibility (Node.js)

The attribution engine (`src/attribute-engine.js`) is a command-line tool. Accessibility considerations:

- **Error Messages:** Clear, actionable CLI output
- **File I/O:** Graceful handling of missing or malformed input files
- **Logging:** Structured output that can be parsed by automation

## Resources

- [W3C Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/WAI/WCAG22/quickref/)
- [Accessibility Insights for Web](http://aka.ms/AccessibilityInsights)
- [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Web Docs - Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM - Web Accessibility In Mind](https://webaim.org/)
- [DHS Trusted Tester Handbook](https://section508coordinators.github.io/TrustedTester/)

## Continuous Improvement

This project is committed to ongoing accessibility improvements:

1. **Version Updates:** WCAG standards, ARIA specs, and best practices are regularly reviewed
2. **Issue Tracking:** Reported accessibility issues are prioritized and fixed
3. **Automated Testing:** CI/CD pipeline includes accessibility checks
4. **Community Feedback:** Contributions from users with diverse assistive technology are valued

## Contact

For accessibility questions or concerns, open an issue or contact the project maintainers.

---

**Last Updated:** April 3, 2026  
**WCAG Version:** 2.2  
**Axe-core Version:** 4.11  
**ARIA Version:** 1.2

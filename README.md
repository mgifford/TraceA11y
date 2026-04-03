# TraceA11y

### **Digital Forensics for Accessibility: Tracing the DNA of every error to its rightful owner.**

**TraceA11y** is a lightweight, sustainable "post-processing" engine designed to solve the hardest problem in digital inclusion: **Accountability**.

Most scanners tell you *what* is broken. **TraceA11y** tells you *who* needs to fix it. By analyzing the "fingerprints" left in your existing accessibility reports—XPaths, HTML snippets, and Drupal-specific signatures—it reverse-engineers responsibility, turning a mountain of technical debt into a targeted, departmental roadmap.

-----

## 🔍 The Forensic Approach

The first half of the battle for accessibility is figuring out who owns the error. **TraceA11y** eliminates the "blame game" by running your existing reports through a three-tier attribution pipeline:

1.  **Signature Detection (Heuristics):** Identifying Drupal-isms (like `.field--name-body` or `.view-id-`) to instantly tag Content Authors or Site Builders.
2.  **Role Mapping:** Applying the **W3C ARRM** (Accessibility Roles and Responsibilities Mapping) to distinguish between Design, Engineering, and UX failures.
3.  **Contextual AI Analysis:** Using high-efficiency LLM models to analyze ambiguous snippets and determine if a failure is a template error (Themer) or a choice made in the editor (Author).

-----

## 🍃 Sustainable by Design

We believe digital inclusion shouldn't come at the cost of environmental impact. TraceA11y is built on "Green Code" principles:

  * **No Redundant Scanning:** We do not crawl your site. We process data you already have, saving massive amounts of CPU and network energy.
  * **Heuristics-First:** We use lightweight Regex for 80% of the work, only calling AI for the complex "cold cases."
  * **Static Infrastructure:** The entire dashboard runs on GitHub Pages with zero server-side overhead.

-----

## 🏗️ How it Works

### 1\. Ingest

Upload your structured reports (JSON/YAML) from Axe, Alpha, or ACT-rule scanners into the `/reports` directory.

### 2\. Attribute

A GitHub Action triggers the **TraceA11y Engine**. It parses the XPaths and snippets, comparing them against your organization's `signatures.json` dictionary.

### 3\. Dashboard

The engine generates a "Responsibility Heatmap" hosted on GitHub Pages. Instead of a list of URLs, your teams see:

  * **Content Team:** 45 Errors (Mostly missing alt-text and heading skips).
  * **Design Team:** 12 Errors (Mostly color contrast and focus indicators).
  * **Engineering Team:** 8 Errors (Mostly ARIA syntax and keyboard traps).

-----

## 🚀 Quick Start

1.  **Fork this Repository.**
2.  **Define your Signatures:** Update `src/signatures.js` with the CSS classes and IDs specific to your Drupal theme or Design System.
3.  **Drop a Report:** Push an accessibility JSON report to the `reports/` folder.
4.  **Generate Attribution Data:** Run `npm run attribute` or `node src/attribute-engine.js --input ./reports/sample-report.json`.
5.  **View Results:** Open `index.html` via static hosting (for example GitHub Pages) to see your targeted remediation list.

-----

## ⚙️ Current Implementation Notes

The first development iteration now includes:

  * **Engine:** `src/attribute-engine.js`
  * **ARRM Relationship Mapper:** `src/arrm-map.js`
  * **Signature Dictionary:** `src/signatures.js`
  * **AI Ambiguity Module:** `src/ai-classifier.js`
  * **Workflow Dispatch Action:** `.github/workflows/attribution-engine.yml`
  * **Generated Output:** `dist/data/attributed-report.json`
  * **ARRM Source Data:** `data/reference/arrm-all-tasks.csv`

The Step 1 example (`article` + `image-alt`) is explicitly mapped to **Content Author** in the engine logic.

When ARRM data is present, each issue is enriched with:

  * `arrmTaskIds`
  * `arrmReferences` (task-level context)

-----

## 📜 Principles & Standards

TraceA11y is built to support the **Functional Accessibility Specifications (FAS)** and ensures that every remediation step is mapped to the correct professional competency. We aim for 100% transparency in accessibility debt.

-----

*“Accessibility is a team sport. TraceA11y just makes sure everyone knows which position they’re playing.”*
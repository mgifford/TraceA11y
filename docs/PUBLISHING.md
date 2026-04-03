# Publishing & Distribution: GitHub Pages Dashboard Only

## Distribution Model

**TraceA11y is a GitHub Pages static site + GitHub Actions CI/CD pipeline.**

Users do NOT:
- Run a backend server
- Deploy to a SaaS platform
- Install npm dependencies on their systems (optional, only for local development/customization)

Users DO:
- Fork the repository on GitHub
- Enable GitHub Pages in their repo settings
- Push accessibility reports to the `/reports/` directory
- View the live dashboard at `https://<username>.github.io/TraceA11y/`

---

## Architecture: GitHub-Native

### 1. **No Backend**
- Dashboard is pure JavaScript (Vanilla JS + Chart.js)
- All processing happens in GitHub Actions (Node.js)
- Output is static JSON served from GitHub Pages

### 2. **Single Distribution Channel: GitHub Pages**

| Component | Host | Access |
|-----------|------|--------|
| **Dashboard (UI)** | GitHub Pages | Public or Private repo (access via GH Pages URL) |
| **Attribution Data** | GitHub Pages `dist/site/dist/data/attributed-report.json` | Same as dashboard access |
| **Source Code** | GitHub Repository | Public (fork-friendly) or Private (enterprise) |
| **Reports** | GitHub Repository `/reports/` | Contributors can push via git |

### 3. **Workflow: Push → Attribute → Deploy**

```
User pushes report to /reports/
         ↓
GitHub Actions triggers attribution-engine.yml
         ↓
Node.js engine processes (no external services, local only)
         ↓
Export script bundles dashboard + JSON
         ↓
Auto-commit refreshed data to main (optional, configurable)
         ↓
GitHub Pages deploys from dist/site/
         ↓
Dashboard live at https://<username>.github.io/TraceA11y/
```

---

## Installation for Users

### Step 1: Fork the Repository
```bash
# On GitHub.com, click "Fork" on https://github.com/mgifford/TraceA11y
```

### Step 2: Enable GitHub Pages
1. Go to **Settings** → **Pages**
2. Build and deployment → **Deploy from a branch**
3. Select branch: `main`, folder: `/(root)` 
4. **Save**

*Alternative: Deploy from `dist/site/` if you customize source structure*

### Step 3: Customize (Optional)
- Edit `src/signatures.js` with your Drupal theme classes/IDs
- Add your org name to `index.html` title
- Configure environment variables in GitHub Actions (API keys for AI classifier)

### Step 4: Push Your First Report
```bash
# Add your axe/Alpha/ACT report to /reports/
git add reports/my-site-scan.json
git commit -m "Add accessibility report"
git push origin main
```

### Step 5: View Dashboard
Open: `https://<your-username>.github.io/TraceA11y/`

---

## Hosting & Scalability

### GitHub Pages Limits
- **Storage:** ≤100MB per page (plenty for JSON + static assets)
- **Build Time:** ≤10 minutes per workflow run
- **Frequency:** No limit on pushes; workflow runs per trigger

### Concurrent Users
- **Dashboard:** Unlimited (CDN-backed via GitHub Pages)
- **Concurrent Editors:** Limited by git (merge conflicts on push, managed via `.gitignore` data files)

### For Enterprise/Large Org Deployment
- **Option A:** Use GitHub Enterprise with Pages
- **Option B:** Deploy `dist/site/` to your own static host (S3, Netlify, etc.)

---

## Customization without Forking

Users can customize WITHOUT branching:

### Scenario 1: Keep Using Upstream Code
```bash
# Keep your main branch up-to-date
git remote add upstream https://github.com/mgifford/TraceA11y.git
git pull upstream main

# Your customizations in separate files:
# - data/learning/trusted-patterns.json (already in .gitignore)
# - data/learning/candidate-patterns.json (already in .gitignore)
# - reports/* (tracked, your data)
```

### Scenario 2: Customized Signatures
```bash
# Add your org-specific signatures in:
src/user-signatures.js

# Engine automatically merges:
// In attribute-engine.js
const coreSignatures = require('./signatures.js');
const userSignatures = require('./user-signatures.js');
const allSignatures = [...coreSignatures, ...userSignatures];
```

---

## Data Ownership & Privacy

### What Gets Committed to Git
- ✅ `dist/data/attributed-report.json` (GitHub Actions auto-commit)
- ✅ `data/learning/` files (learning registry decisions)
- ✅ Reports in `/reports/` (your audit data)

### What Stays Private (Not Committed)
- Environment variables (GitHub Secrets, never in git)
- `.env.local` files (add to `.gitignore`)

### For Private Repos
- GitHub Pages can be restricted to org members
- Reports stay in private repo
- Dashboard accessible only via authenticated GH Pages link

---

## Deployment Variations

### Standard (Recommended)
- GitHub Pages from `main` branch root
- GitHub Actions on push
- Public repo, public dashboard

### Enterprise Internal
- Private GitHub Enterprise repo
- Pages restricted to org members
- Reports contain internal client data

### Custom Hosting
```bash
# Build locally or in custom CI:
npm run attribute  # Generates dist/data/attributed-report.json
npm run export:dashboard  # Generates dist/site/, ready to upload

# Deploy dist/site/ to your host:
# - AWS S3 + CloudFront
# - Netlify (connect to GitHub repo)
# - Your web server
```

---

## CI/CD Pipeline Triggers

Default triggers (edit `.github/workflows/attribution-engine.yml`):

1. **Manual Trigger (Workflow Dispatch)**
   - Go to **Actions** → **attribution-engine** → **Run workflow**
   - Optional: Specify `reportFile` path to process one report

2. **Automatic Trigger (Push to /reports/)**
   - Any push to `/reports/**/*.json` triggers attribution
   - Skipped if only `.json` changed (can add skip logic)

3. **Scheduled (Not Default, but Possible)**
   - Add `schedule` trigger to run nightly if desired
   - Useful for periodic re-attribution with new learning

---

## Future Distribution Options (Not Currently Planned)

- **NPM Package:** To allow `npm install @tracea11y/engine` (low priority; git-based distribution preferred)
- **Docker Image:** To package Node runtime + engine (only if users request deployment beyond GH Pages)
- **GitHub Marketplace Action:** Publish `attribution-engine.yml` as reusable workflow (future enhancement)

---

## Support & Community

**Users can:**
- Fork → Customize → Keep Synced
- Submit PRs for upstream improvements
- Report issues in GitHub Issues
- Share learning patterns in discussions

**Governance:**
- Core repo: Maintained by accessibility.org team
- Community: User-contributed platform detectors welcome (via PRs + testing)

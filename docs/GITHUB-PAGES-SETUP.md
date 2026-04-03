# GitHub Pages Setup & Verification

## Step 1: Enable GitHub Pages

1. Go to your repository on GitHub.com: `https://github.com/YOUR_USERNAME/TraceA11y`
2. Click **Settings** (top right)
3. On the left sidebar, click **Pages**
4. Under "Build and deployment":
   - **Source:** Select "Deploy from a branch"
   - **Branch:** Select `main`
   - **Folder:** Select `/ (root)`
5. Click **Save**

> **Note:** GitHub will now deploy from the repository root. The `dist/site/` folder contains your dashboard files.

---

## Step 2: Verify Permissions

Your workflow requires these GitHub Actions permissions (already configured in `.github/workflows/attribution-engine.yml`):

- ✅ `contents: write` — To auto-commit updated attribution reports
- ✅ `pages: write` — To deploy to GitHub Pages
- ✅ `id-token: write` — For OIDC token authentication

**Check Permissions:**
1. Go to repo **Settings** → **Actions** → **General**
2. Under "Workflow permissions":
   - ✅ "Read and write permissions" is selected
   - ✅ "Allow GitHub Actions to create and approve pull requests" (optional)

---

## Step 3: Trigger a Test Workflow Run

### Option A: Manual Trigger (Fastest)
1. Go to **Actions** tab in your GitHub repo
2. Click **"Accessibility Forensic Attribution"** workflow
3. Click **"Run workflow"** button (top right)
4. Leave inputs blank (it will process existing reports or create sample data)
5. Click **"Run workflow"**

### Option B: Automatic Trigger (Via Push)
Push a test report to the `/reports/` folder:

```bash
# Create a test report
echo '{"issues":[{"url":"https://example.com","ruleId":"image-alt","error":"Missing alt text","xpath":"//img[1]","snippet":"<img src=\"test.jpg\">"}]}' > reports/test-report.json

# Push to trigger workflow
git add reports/test-report.json
git commit -m "test: add sample report"
git push origin main
```

---

## Step 4: Monitor Workflow Execution

1. Go to **Actions** tab
2. Click the workflow run (should show name: "Accessibility Forensic Attribution")
3. Wait for both jobs to complete:
   - ✅ **attribute** job: Processes report, exports dashboard
   - ✅ **deploy-pages** job: Deploys to GitHub Pages

**Expected Output:**
```
attribute job: ✅ Passed
  - Checkout
  - Setup Node.js
  - Run attribution engine
  - Export dashboard site bundle
  - Commit refreshed attributed report (if changed)
  - Setup Pages
  - Upload GitHub Pages artifact
  - Upload attributed report

deploy-pages job: ✅ Passed
  - Deploy to GitHub Pages
  - Output: https://YOUR_USERNAME.github.io/TraceA11y/
```

---

## Step 5: Access Your Live Dashboard

Once the workflow completes and Pages deployment succeeds:

**Dashboard URL:**
```
https://YOUR_USERNAME.github.io/TraceA11y/
```

**What You'll See:**
- Interactive dashboard with upload field
- Table of attributed errors (by owner: Content Author, Themer, Developer, Site Builder)
- Chart showing error distribution by role
- Filter controls (by owner, error type, confidence)

---

## Troubleshooting

### "Pages not publishing" or "404 error"

**Check 1: Pages source is set to `main` branch**
- Settings → Pages → Source should be "Deploy from a branch: main /(root)"

**Check 2: Workflow permissions**
- Settings → Actions → General → "Read and write permissions" is ON

**Check 3: dist/site/ folder exists**
- The `export-dashboard` step creates `dist/site/` with `index.html`
- Verify in Actions tab: "Upload GitHub Pages artifact" shows `dist/site` path

### "Workflow failed at export-dashboard step"

**Common cause:** Missing `dist/data/attributed-report.json`

**Fix:** Ensure a report exists in `/reports/` before workflow runs. If not:
```bash
# Create minimal test report
mkdir -p dist/data
echo '{"summary":{"total":0,"byRole":{}},"issues":[]}' > dist/data/attributed-report.json
git add dist/data/attributed-report.json
git commit -m "chore: initialize empty attributed report"
git push origin main
```

### "Pages domain shows default GitHub Pages page"

**Cause:** Deploy happened before GitHub Pages was enabled

**Fix:** Re-trigger workflow after enabling Pages (Step 1 above)

---

## Monitoring & Alerts

### View Workflow Runs
- **Actions** tab → Select **"Accessibility Forensic Attribution"** workflow
- See all workflow runs with status, duration, and logs

### Set Up Failure Notifications (Optional)
- Go to **Settings** → **Notifications**
- Enable "Email on failed workflows" if desired

### View Live Pages Deployment
- After workflow completes, go to **Settings** → **Pages**
- See "Your site is live at: https://YOUR_USERNAME.github.io/TraceA11y/"

---

## What's Being Deployed?

| File | Source | Deployed To | Purpose |
|------|--------|-------------|---------|
| `index.html` | Root | `https://.../TraceA11y/index.html` | Dashboard UI |
| `attributed-report.json` | `dist/data/` | `https://.../TraceA11y/dist/data/attributed-report.json` | Attribution data |
| `.nojekyll` | Generated | `https://.../TraceA11y/.nojekyll` | Tell GitHub Pages to skip Jekyll processing |

---

## Next Steps

1. ✅ Enable GitHub Pages (Settings → Pages)
2. ✅ Verify permissions (Settings → Actions)
3. ✅ Trigger test workflow (Actions → Run workflow)
4. ✅ View live dashboard (https://YOUR_USERNAME.github.io/TraceA11y/)
5. ➡️ Upload real accessibility reports to `/reports/` to start attribution

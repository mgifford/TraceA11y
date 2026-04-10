import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const INPUT_INDEX = "./index.html";
const INPUT_REPORT = "./dist/data/attributed-report.json";
const INPUT_AI_BATCHES = "./dist/data/ai-review-batches.json";
const OUTPUT_DIR = "./dist/site";
const OUTPUT_DATA_DIR = "./dist/site/dist/data";

async function main() {
  await mkdir(OUTPUT_DATA_DIR, { recursive: true });

  // Copy dashboard app shell.
  await copyFile(INPUT_INDEX, `${OUTPUT_DIR}/index.html`);

  // Ensure attributed-report.json exists and is valid JSON before publishing.
  const reportContent = await readFile(INPUT_REPORT, "utf8");
  JSON.parse(reportContent);
  await writeFile(`${OUTPUT_DATA_DIR}/attributed-report.json`, reportContent, "utf8");

  try {
    const aiBatchContent = await readFile(INPUT_AI_BATCHES, "utf8");
    JSON.parse(aiBatchContent);
    await writeFile(`${OUTPUT_DATA_DIR}/ai-review-batches.json`, aiBatchContent, "utf8");
  } catch {
    // Skip optional AI batch export when the file has not been generated yet.
  }

  // Disable Jekyll so nested dist/data paths are served as-is on GitHub Pages.
  await writeFile(`${OUTPUT_DIR}/.nojekyll`, "", "utf8");

  console.log(`Prepared dashboard export at ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(`Dashboard export failed: ${error.message}`);
  process.exitCode = 1;
});

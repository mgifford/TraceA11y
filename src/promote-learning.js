import process from "node:process";
import { promoteCandidateToTrusted, rejectCandidate } from "./learning-registry.js";

function parseArgs(argv) {
  const args = {
    promote: null,
    reject: null,
    owner: null,
    note: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--promote") {
      args.promote = argv[i + 1] || null;
    }
    if (token === "--reject") {
      args.reject = argv[i + 1] || null;
    }
    if (token === "--owner") {
      args.owner = argv[i + 1] || null;
    }
    if (token === "--note") {
      args.note = argv[i + 1] || null;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.promote) {
    const result = await promoteCandidateToTrusted(args.promote, args.owner);
    console.log(`Promoted ${args.promote} to trusted patterns as ${result.owner}.`);
    return;
  }

  if (args.reject) {
    await rejectCandidate(args.reject, args.note || undefined);
    console.log(`Rejected ${args.reject}.`);
    return;
  }

  throw new Error("Usage: --promote <candidateId> [--owner <owner>] OR --reject <candidateId> [--note <reason>]");
}

main().catch((error) => {
  console.error("Learning promotion failed:", error.message);
  process.exitCode = 1;
});

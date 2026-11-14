import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// Reset the fictional demo businesses so every run starts from the same state.
export default function globalSetup() {
  execSync("npx tsx --env-file=.env scripts/seed.mts", { stdio: "inherit" });
  rmSync("test-results/e2e-emails.jsonl", { force: true });
}

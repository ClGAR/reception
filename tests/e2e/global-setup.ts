import { execSync } from "node:child_process";

// Reset the fictional demo businesses so every run starts from the same state.
export default function globalSetup() {
  execSync("npx tsx --env-file=.env scripts/seed.mts", { stdio: "inherit" });
}

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const runNodeScript = (scriptPath, args) => {
  const result = spawnSync(process.execPath, [resolve(scriptPath), ...args], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

if (process.env.VERCEL_ENV === "production") {
  console.log("Applying pending production database migrations...");
  runNodeScript("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
}

runNodeScript("node_modules/next/dist/bin/next", ["build"]);

import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("build:verify must be started through npm.");

const result = spawnSync(process.execPath, [npmCli, "run", "build"], {
  env: { ...process.env, TEE_TIME_BUILD_WITH_FIXTURES: "1" },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);

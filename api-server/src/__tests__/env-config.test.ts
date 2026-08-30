import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";

test("invalid boolean environment values fail closed at API startup", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--eval", "import './src/config/env.ts'"],
    {
      cwd: path.resolve(import.meta.dirname, "../.."),
      encoding: "utf8",
      timeout: 10_000,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PUBLIC_BETA: "treu",
      },
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /PUBLIC_BETA|boolean/i);
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appBundlePath = path.join(repositoryRoot, "api-server", "dist", "app.cjs");
const appBundleUrl = pathToFileURL(appBundlePath).href;
const source = await readFile(path.join(repositoryRoot, "api", "index.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const emittedSpecifier = JSON.stringify("../api-server/dist/app.cjs");
assert.equal(outputText.split(emittedSpecifier).length - 1, 1, "expected one lazy API bundle import");
const emittedEntry = outputText.replace(emittedSpecifier, JSON.stringify(appBundleUrl));

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "yor-vercel-runtime-init-"));
try {
  await writeFile(path.join(temporaryDirectory, "entry.mjs"), emittedEntry);
  const verification = `
    import assert from "node:assert/strict";
    import { EventEmitter } from "node:events";

    let initializationError;
    try {
      await import(${JSON.stringify(appBundleUrl)});
      assert.fail("the deliberately invalid production configuration unexpectedly loaded");
    } catch (error) {
      initializationError = error;
    }
    assert.match(initializationError?.message ?? "", /Production requires unique JWT secrets/);

    const logs = [];
    console.error = (...parts) => logs.push(parts.map(String).join(" "));
    const { default: handler } = await import("./entry.mjs");
    const response = new EventEmitter();
    response.headersSent = false;
    response.statusCode = 200;
    response.status = function (status) { this.statusCode = status; return this; };
    response.json = function (body) {
      this.body = body;
      this.headersSent = true;
      this.emit("finish");
      return this;
    };
    response.setHeader = () => {};
    response.end = function (body) {
      this.body = body;
      this.headersSent = true;
      this.emit("finish");
    };

    await handler({}, response);
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.body, {
      success: false,
      message: "API runtime is unavailable",
      data: null,
      errors: ["Service unavailable"],
    });
    assert.doesNotMatch(JSON.stringify(response.body), /vercel-init-sentinel/);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /API runtime initialization unavailable/);
    assert.doesNotMatch(logs.join(" "), /vercel-init-sentinel/);
  `;
  execFileSync(process.execPath, ["--input-type=module", "-e", verification], {
    cwd: temporaryDirectory,
    timeout: 15_000,
    stdio: "pipe",
    env: {
      ...process.env,
      VERCEL: "1",
      NODE_ENV: "production",
      JWT_SECRET: "vercel-init-sentinel-short",
      JWT_REFRESH_SECRET: "vercel-init-sentinel-refresh",
      CONTACT_SHIELD_SECRET: "vercel-init-sentinel-contact",
      TOTP_ENCRYPTION_KEY: "vercel-init-sentinel-totp",
    },
  });
  process.stdout.write("Vercel API runtime initialization failure returned a generic 503.\n");
} finally {
  assert.equal(path.dirname(path.resolve(temporaryDirectory)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporaryDirectory).startsWith("yor-vercel-runtime-init-"));
  await rm(temporaryDirectory, { recursive: true });
}

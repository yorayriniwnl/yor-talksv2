#!/usr/bin/env node
/**
 * ops/validate-deployment-config.mjs
 *
 * Validates deployment environment and secret configuration WITHOUT exposing secrets.
 * Ensures:
 * 1. All mandatory Compose variables are present and non-empty.
 * 2. No placeholder values ("CHANGE_ME*") remain.
 * 3. Independent 32+ character entropy for all encryption keys.
 * 4. Mutual uniqueness among JWT, refresh, contact-shield, and TOTP keys.
 * 5. Secret files exist, are readable, and satisfy size requirements.
 * 6. Correct origin and URL formatting (HTTPS enforcement).
 * 7. Port integrity and non-collision.
 *
 * Usage:
 *   node ops/validate-deployment-config.mjs --env-file /etc/yor-talks/.env.production
 *   node ops/validate-deployment-config.mjs --env-file ops/.env.staging.example --check-placeholders=false
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(args) {
  const options = {
    envFile: null,
    checkPlaceholders: true,
    checkFiles: true,
    target: "production",
  };

  for (const arg of args) {
    if (arg.startsWith("--env-file=")) {
      options.envFile = arg.slice("--env-file=".length);
    } else if (arg === "--no-check-placeholders" || arg === "--check-placeholders=false") {
      options.checkPlaceholders = false;
    } else if (arg === "--no-check-files" || arg === "--check-files=false") {
      options.checkFiles = false;
    } else if (arg.startsWith("--target=")) {
      options.target = arg.slice("--target=".length);
    }
  }

  return options;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Environment file not found at: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

export function validateConfig(env, options = {}) {
  const { checkPlaceholders = true, checkFiles = true, target = "production" } = options;
  const errors = [];
  const warnings = [];
  const passed = [];

  const requiredKeys = [
    "POSTGRES_PASSWORD",
    "DATABASE_URL",
    "REDIS_PASSWORD",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "CONTACT_SHIELD_SECRET",
    "TOTP_ENCRYPTION_KEY",
    "TERMS_VERSION",
    "CLIENT_ORIGIN",
    "CORS_ORIGINS",
    "LEGAL_OPERATOR_NAME",
    "LEGAL_OPERATOR_ADDRESS",
    "LEGAL_EFFECTIVE_DATE",
    "LEGAL_GOVERNING_LAW",
    "PRIVACY_CONTACT_EMAIL",
    "SUPPORT_EMAIL",
    "GRIEVANCE_OFFICER_NAME",
    "GRIEVANCE_CONTACT_EMAIL",
    "METRICS_BEARER_TOKEN_FILE",
    "RCLONE_CONFIG_FILE",
    "BACKUP_AGE_RECIPIENT",
    "BACKUP_REMOTE",
    "ALERTMANAGER_WEBHOOK_URL",
    "ALERTMANAGER_WEBHOOK_USER",
    "ALERTMANAGER_WEBHOOK_PASSWORD_FILE",
  ];

  if (target === "staging") {
    requiredKeys.push("ALLOWED_EMAIL_DOMAINS");
  }

  // 1. Required keys presence
  for (const key of requiredKeys) {
    if (!env[key] || env[key].trim() === "") {
      errors.push(`Missing or empty required variable: ${key}`);
    }
  }

  // 2. Placeholder checks
  if (checkPlaceholders) {
    for (const [key, val] of Object.entries(env)) {
      if (/CHANGE_ME/i.test(val)) {
        errors.push(`Variable ${key} contains unreplaced placeholder`);
      }
    }
  }

  // 3. Secret entropy & length
  const secretKeys = ["JWT_SECRET", "JWT_REFRESH_SECRET", "CONTACT_SHIELD_SECRET", "TOTP_ENCRYPTION_KEY"];
  for (const key of secretKeys) {
    const val = env[key];
    if (val) {
      if (val.length < 32) {
        errors.push(`Secret ${key} length is insufficient (${val.length} chars, must be >= 32)`);
      } else {
        passed.push(`Secret ${key} length verified (>= 32 chars)`);
      }
    }
  }

  // 4. Mutual key uniqueness
  const keyValues = secretKeys.map((k) => ({ key: k, val: env[k] })).filter((x) => Boolean(x.val));
  for (let i = 0; i < keyValues.length; i++) {
    for (let j = i + 1; j < keyValues.length; j++) {
      if (keyValues[i].val === keyValues[j].val) {
        errors.push(`Security violation: ${keyValues[i].key} and ${keyValues[j].key} reuse the same secret value`);
      }
    }
  }
  if (keyValues.length === secretKeys.length && errors.every((e) => !e.includes("reuse the same secret"))) {
    passed.push("Mutual key uniqueness verified across all core cryptographic secrets");
  }

  // 5. Database URL structure
  if (env.DATABASE_URL) {
    try {
      const parsed = new URL(env.DATABASE_URL);
      if (!["postgresql:", "postgres:"].includes(parsed.protocol)) {
        errors.push(`DATABASE_URL protocol must be postgresql:, got ${parsed.protocol}`);
      } else {
        passed.push("DATABASE_URL protocol and syntax verified");
      }
    } catch {
      errors.push("DATABASE_URL is not a valid URL structure");
    }
  }

  // 6. Origins and URLs
  if (env.CLIENT_ORIGIN) {
    try {
      const parsed = new URL(env.CLIENT_ORIGIN);
      if (target === "production" && parsed.protocol !== "https:") {
        errors.push(`CLIENT_ORIGIN must use HTTPS in production, got ${parsed.protocol}`);
      } else if (parsed.pathname !== "/" && parsed.pathname !== "") {
        errors.push(`CLIENT_ORIGIN must not contain a path, got ${parsed.pathname}`);
      } else {
        passed.push("CLIENT_ORIGIN origin syntax verified");
      }
    } catch {
      errors.push("CLIENT_ORIGIN is not a valid URL");
    }
  }

  if (env.CORS_ORIGINS) {
    const origins = env.CORS_ORIGINS.split(",").map((s) => s.trim());
    for (const origin of origins) {
      try {
        const parsed = new URL(origin);
        if (target === "production" && parsed.protocol !== "https:") {
          errors.push(`CORS origin ${parsed.host} must use HTTPS in production`);
        }
      } catch {
        errors.push(`Invalid CORS origin entry: ${origin}`);
      }
    }
    passed.push(`CORS_ORIGINS syntax verified (${origins.length} origin(s))`);
  }

  // 7. Port allocations
  const webPort = parseInt(env.WEB_PORT || "8080", 10);
  const apiPort = parseInt(env.API_HOST_PORT || "4000", 10);
  if (isNaN(webPort) || webPort <= 0 || webPort > 65535) {
    errors.push(`WEB_PORT invalid: ${env.WEB_PORT}`);
  }
  if (isNaN(apiPort) || apiPort <= 0 || apiPort > 65535) {
    errors.push(`API_HOST_PORT invalid: ${env.API_HOST_PORT}`);
  }
  if (webPort === apiPort) {
    errors.push(`Port collision: WEB_PORT and API_HOST_PORT cannot be identical (${webPort})`);
  } else if (!errors.some((e) => e.includes("PORT"))) {
    passed.push(`Port allocation verified: Web=${webPort}, API=${apiPort}`);
  }

  // 8. File-backed secrets
  if (checkFiles) {
    const fileChecks = [
      { key: "METRICS_BEARER_TOKEN_FILE", minLength: 32 },
      { key: "ALERTMANAGER_WEBHOOK_PASSWORD_FILE", minLength: 8 },
      { key: "RCLONE_CONFIG_FILE", minLength: 10 },
    ];
    for (const { key, minLength } of fileChecks) {
      const filePath = env[key];
      if (filePath) {
        if (!fs.existsSync(filePath)) {
          errors.push(`Secret file not found: ${key}=${filePath}`);
        } else {
          try {
            const stat = fs.statSync(filePath);
            if (stat.size < minLength) {
              errors.push(`Secret file ${key} is too small (${stat.size} bytes < ${minLength} bytes required)`);
            } else {
              passed.push(`Secret file accessible and sized: ${key}`);
            }
          } catch (err) {
            errors.push(`Cannot read secret file ${key}: ${err.message}`);
          }
        }
      }
    }
  } else {
    warnings.push("File-backed secret checks were skipped by option flag");
  }

  return { ok: errors.length === 0, errors, warnings, passed };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const envFile = options.envFile || (options.target === "staging" ? ".env.staging" : ".env.production");

  console.log(`[deployment-config-check] Validating target=${options.target} from ${envFile}`);
  let env;
  try {
    env = parseEnvFile(envFile);
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    process.exit(1);
  }

  const result = validateConfig(env, options);

  for (const item of result.passed) {
    console.log(`  [PASS] ${item}`);
  }
  for (const item of result.warnings) {
    console.log(`  [WARN] ${item}`);
  }
  for (const item of result.errors) {
    console.error(`  [FAIL] ${item}`);
  }

  if (!result.ok) {
    console.error(`\n[deployment-config-check] FAILED: ${result.errors.length} configuration error(s) found.`);
    process.exit(1);
  }

  console.log(`\n[deployment-config-check] SUCCESS: All deployment configuration requirements satisfied.`);
  process.exit(0);
}

import { pathToFileURL } from "node:url";

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}

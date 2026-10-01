import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";

export function metricsTokenMatches(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length >= 32
    && providedBytes.length === expectedBytes.length
    && timingSafeEqual(providedBytes, expectedBytes);
}

export async function readMetricsToken(filePath: string): Promise<string> {
  const value = (await readFile(filePath, "utf8")).trim();
  if (value.length < 32 || value.includes("\n") || value.includes("\r")) {
    throw new Error("Metrics bearer token must contain at least 32 characters on one line");
  }
  return value;
}

export async function assertMetricsTokenFile(filePath: string): Promise<void> {
  try {
    await readMetricsToken(filePath);
  } catch {
    throw new Error("Production requires a readable, high-entropy metrics bearer token secret file");
  }
}
// src/config.ts
// PatchGate — Config file auto-loader
// Reads patchgate.config.json from project root automatically.

import * as fs from "fs";
import * as path from "path";

/**
 * Config interface as defined in ARCHITECTURE.md.
 * Loaded from patchgate.config.json in project root.
 */
export interface Config {
  /** Project root directory (default: process.cwd()) */
  rootDir?: string;
  /** Additional glob patterns to block */
  blocklist?: string[];
  /** Patterns to always allow */
  allowlist?: string[];
  /** Snapshot directory (default: .patchgate/snapshots) */
  snapshotDir?: string;
  /** Audit log path (default: .patchgate/audit.log) */
  auditLog?: string;
  /** Fail when patches are blocked (default: false) */
  failOnBlocked?: boolean;
  /** Run without writing (default: false) */
  dryRun?: boolean;
}

/**
 * Default configuration values.
 */
export const DEFAULT_USER_CONFIG: Required<Config> = {
  rootDir: process.cwd(),
  blocklist: [],
  allowlist: [],
  snapshotDir: ".patchgate/snapshots",
  auditLog: ".patchgate/audit.log",
  failOnBlocked: false,
  dryRun: false,
};

/**
 * Attempts to load patchgate.config.json from the specified directory.
 * Returns null if the file does not exist or cannot be parsed.
 */
export function loadConfigFile(configDir: string = process.cwd()): Config | null {
  const configPath = path.join(configDir, "patchgate.config.json");

  // Check if file exists first
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as Config;

    // Basic validation: ensure it's an object
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    return parsed;
  } catch (err) {
    // Invalid JSON or other read errors — return null to use defaults
    if (err instanceof Error) {
      // Check for JSON parse errors
      if (err.message.includes("JSON") || err.message.includes("Unexpected token")) {
        return null;
      }
    }
    throw err;
  }
}

/**
 * Loads config from file and merges with defaults.
 * File config takes precedence over defaults.
 */
export function loadConfig(configDir: string = process.cwd()): Required<Config> {
  const fileConfig = loadConfigFile(configDir);

  return {
    ...DEFAULT_USER_CONFIG,
    ...fileConfig,
  };
}

/**
 * Merges multiple config sources: defaults < file < runtime overrides.
 * Runtime overrides take highest precedence.
 */
export function mergeConfig(
  fileDir: string = process.cwd(),
  runtimeOverrides?: Partial<Config>
): Required<Config> {
  const fileConfig = loadConfigFile(fileDir);

  return {
    ...DEFAULT_USER_CONFIG,
    ...fileConfig,
    ...runtimeOverrides,
  };
}

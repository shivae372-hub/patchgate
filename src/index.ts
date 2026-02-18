// src/index.ts
// PatchGate — Public API
// One function: run(patchSet). That's 90% of the usage.

import { randomUUID } from "crypto";
import {
  PatchSet,
  PatchGateConfig,
  ApplyResult,
  DEFAULT_CONFIG,
  FilePatch,
} from "./types";
import { enforcePolicy } from "./policy";
import { applyPatches, generateDiff } from "./executor";
import { buildLogEntry, writeLog } from "./logger";

export * from "./types";
export { enforcePolicy } from "./policy";
export { applyPatches, rollback, generateDiff, saveSnapshot } from "./executor";
export { readLog, printHistory } from "./logger";
export { createPatchGateFileTools } from "./adapters/openai/fileTools";
export * from "./adapters/openai/types";


export interface RunOptions {
  /** Working directory (defaults to process.cwd()) */
  workdir?: string;
  /** Override default config */
  config?: Partial<PatchGateConfig>;
  /** Called before applying — return false to cancel */
  onPreview?: (diffs: string[]) => Promise<boolean>;
}

/**
 * THE MAIN FUNCTION.
 *
 * Give it patches from your AI agent.
 * It will: check policy → preview → snapshot → apply → log.
 *
 * ```ts
 * import { run } from "patchgate";
 *
 * const result = await run({
 *   source: "claude-3-5-sonnet",
 *   patches: [
 *     { op: "update", path: "src/index.ts", content: "...", reason: "Fix null check" }
 *   ]
 * });
 *
 * console.log(result.applied);  // ["src/index.ts"]
 * console.log(result.blocked);  // anything policy blocked
 * ```
 */
export async function run(
  patchSet: Omit<PatchSet, "id" | "createdAt"> & { id?: string },
  options: RunOptions = {}
): Promise<ApplyResult & { blocked: { path: string; reason: string }[] }> {
  const startTime = Date.now();
  const workdir = options.workdir ?? process.cwd();
  const config: PatchGateConfig = {
    ...DEFAULT_CONFIG,
    ...(options.config ?? {}),
  };

  const fullPatchSet: PatchSet = {
    id: patchSet.id ?? randomUUID(),
    createdAt: new Date().toISOString(),
    ...patchSet,
  };

  // 1. Policy check
  const { allowed, blocked } = enforcePolicy(
    fullPatchSet.patches,
    config,
    fullPatchSet.blocklist
  );

  // 2. Optional preview
  if (options.onPreview && allowed.length > 0) {
    const diffs = allowed.map((p) => generateDiff(p, workdir));
    const approved = await options.onPreview(diffs);
    if (!approved) {
      const cancelled: ApplyResult = {
        success: false,
        applied: [],
        skipped: allowed.map((p) => ({
          path: p.path,
          reason: "Cancelled by user",
        })),
        errors: [],
      };
      return {
        ...cancelled,
        blocked: blocked.map((b) => ({
          path: b.patch.path,
          reason: b.reason,
        })),
      };
    }
  }

  // 3. Apply
  const result = applyPatches(allowed, workdir, config.enableSnapshot);

  // 4. Log
  const logEntry = buildLogEntry(
    fullPatchSet,
    result,
    blocked.map((b) => ({ path: b.patch.path, reason: b.reason })),
    startTime
  );
  writeLog(logEntry, workdir);

  return {
    ...result,
    blocked: blocked.map((b) => ({ path: b.patch.path, reason: b.reason })),
  };
}

/**
 * Helper: build a PatchSet from simple { path, content } pairs.
 * Useful when parsing LLM responses.
 */
export function createPatchSet(
  files: { path: string; content: string; reason?: string }[],
  source?: string
): PatchSet {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    source,
    patches: files.map(
      (f): FilePatch => ({
        op: "update",
        path: f.path,
        content: f.content,
        reason: f.reason,
      })
    ),
  };
}

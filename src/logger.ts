// src/logger.ts
// PatchGate — Audit Logger
// Every action gets written to .patchgate/audit.log
// This is what enterprises care about: "What did the AI do, and when?"

import fs from "fs";
import path from "path";
import { PatchSet, ApplyResult } from "./types";

export interface LogEntry {
  timestamp: string;
  patchSetId: string;
  source?: string;
  totalPatches: number;
  applied: string[];
  blocked: { path: string; reason: string }[];
  errors: { path: string; message: string }[];
  snapshotPath?: string;
  durationMs: number;
}

/**
 * Write a log entry to .patchgate/audit.log (JSONL format).
 * One JSON object per line — easy to grep, parse, or stream into any log tool.
 */
export function writeLog(
  entry: LogEntry,
  workdir: string = process.cwd()
): void {
  const logDir = path.join(workdir, ".patchgate");
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, "audit.log");
  fs.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
}

/**
 * Build a log entry from a PatchSet + ApplyResult.
 */
export function buildLogEntry(
  patchSet: PatchSet,
  result: ApplyResult,
  blocked: { path: string; reason: string }[],
  startTime: number
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    patchSetId: patchSet.id,
    source: patchSet.source,
    totalPatches: patchSet.patches.length,
    applied: result.applied,
    blocked,
    errors: result.errors,
    snapshotPath: result.snapshotPath,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Read all log entries from the audit log.
 */
export function readLog(workdir: string = process.cwd()): LogEntry[] {
  const logPath = path.join(workdir, ".patchgate", "audit.log");
  if (!fs.existsSync(logPath)) return [];

  return fs
    .readFileSync(logPath, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as LogEntry;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as LogEntry[];
}

/**
 * Print a summary of the last N log entries to the terminal.
 */
export function printHistory(entries: LogEntry[], limit = 10): void {
  const recent = entries.slice(-limit).reverse();
  console.log(`\n📋 PatchGate Audit History (last ${recent.length} runs)\n`);
  for (const e of recent) {
    const status =
      e.errors.length > 0 ? "❌" : e.blocked.length > 0 ? "⚠️ " : "✅";
    console.log(
      `${status} [${e.timestamp}] id:${e.patchSetId.slice(0, 8)} ` +
        `applied:${e.applied.length} blocked:${e.blocked.length} ` +
        `errors:${e.errors.length} (${e.durationMs}ms)`
    );
  }
  console.log();
}

"use strict";
// src/logger.ts
// PatchGate — Audit Logger
// Every action gets written to .patchgate/audit.log
// This is what enterprises care about: "What did the AI do, and when?"
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeLog = writeLog;
exports.buildLogEntry = buildLogEntry;
exports.readLog = readLog;
exports.printHistory = printHistory;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Write a log entry to .patchgate/audit.log (JSONL format).
 * One JSON object per line — easy to grep, parse, or stream into any log tool.
 */
function writeLog(entry, workdir = process.cwd()) {
    const logDir = path_1.default.join(workdir, ".patchgate");
    fs_1.default.mkdirSync(logDir, { recursive: true });
    const logPath = path_1.default.join(logDir, "audit.log");
    fs_1.default.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
}
/**
 * Build a log entry from a PatchSet + ApplyResult.
 */
function buildLogEntry(patchSet, result, blocked, startTime) {
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
function readLog(workdir = process.cwd()) {
    const logPath = path_1.default.join(workdir, ".patchgate", "audit.log");
    if (!fs_1.default.existsSync(logPath))
        return [];
    return fs_1.default
        .readFileSync(logPath, "utf-8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    })
        .filter(Boolean);
}
/**
 * Print a summary of the last N log entries to the terminal.
 */
function printHistory(entries, limit = 10) {
    const recent = entries.slice(-limit).reverse();
    console.log(`\n📋 PatchGate Audit History (last ${recent.length} runs)\n`);
    for (const e of recent) {
        const status = e.errors.length > 0 ? "❌" : e.blocked.length > 0 ? "⚠️ " : "✅";
        console.log(`${status} [${e.timestamp}] id:${e.patchSetId.slice(0, 8)} ` +
            `applied:${e.applied.length} blocked:${e.blocked.length} ` +
            `errors:${e.errors.length} (${e.durationMs}ms)`);
    }
    console.log();
}
//# sourceMappingURL=logger.js.map
import { PatchSet, ApplyResult } from "./types";
export interface LogEntry {
    timestamp: string;
    patchSetId: string;
    source?: string;
    totalPatches: number;
    applied: string[];
    blocked: {
        path: string;
        reason: string;
    }[];
    errors: {
        path: string;
        message: string;
    }[];
    snapshotPath?: string;
    durationMs: number;
}
/**
 * Write a log entry to .patchgate/audit.log (JSONL format).
 * One JSON object per line — easy to grep, parse, or stream into any log tool.
 */
export declare function writeLog(entry: LogEntry, workdir?: string): void;
/**
 * Build a log entry from a PatchSet + ApplyResult.
 */
export declare function buildLogEntry(patchSet: PatchSet, result: ApplyResult, blocked: {
    path: string;
    reason: string;
}[], startTime: number): LogEntry;
/**
 * Read all log entries from the audit log.
 */
export declare function readLog(workdir?: string): LogEntry[];
/**
 * Print a summary of the last N log entries to the terminal.
 */
export declare function printHistory(entries: LogEntry[], limit?: number): void;
//# sourceMappingURL=logger.d.ts.map
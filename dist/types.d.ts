export type PatchOperation = "create" | "update" | "delete" | "rename";
export interface FilePatch {
    /** What kind of change is this? */
    op: PatchOperation;
    /** The file being changed (relative path, e.g. "src/index.ts") */
    path: string;
    /** For renames: where the file moves to */
    newPath?: string;
    /** The new full content of the file (for create/update) */
    content?: string;
    /** Human-readable reason the AI gave for this change */
    reason?: string;
}
export interface PatchSet {
    /** Unique ID for this batch of changes */
    id: string;
    /** When this patch was created (ISO string) */
    createdAt: string;
    /** Which AI/agent produced this patch (e.g. "claude-3-5-sonnet", "gpt-4o") */
    source?: string;
    /** All the file changes in this batch */
    patches: FilePatch[];
    /** Optional: which files are off-limits (PatchGate will refuse to touch these) */
    blocklist?: string[];
}
export interface ApplyResult {
    /** Did everything succeed? */
    success: boolean;
    /** Which files were actually changed */
    applied: string[];
    /** Which files were skipped and why */
    skipped: {
        path: string;
        reason: string;
    }[];
    /** Any errors that occurred */
    errors: {
        path: string;
        message: string;
    }[];
    /** Path to the rollback snapshot (so you can undo everything) */
    snapshotPath?: string;
}
export interface PatchGateConfig {
    blocklist: string[];
    requireApproval: boolean;
    enableSnapshot: boolean;
    runTypecheck: boolean;
    /**
     * CI mode: if true, PatchGate fails the run
     * when ANY patch is blocked.
     *
     * Default: false
     */
    failOnBlocked?: boolean;
}
export declare const DEFAULT_CONFIG: PatchGateConfig;
//# sourceMappingURL=types.d.ts.map
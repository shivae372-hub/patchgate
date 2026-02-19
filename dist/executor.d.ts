import { FilePatch, ApplyResult } from "./types";
/**
 * Save a snapshot of files BEFORE changes.
 */
export declare function saveSnapshot(patches: FilePatch[], workdir?: string): string;
/**
 * Rollback all changes from a snapshot.
 */
export declare function rollback(snapshotDir: string, workdir?: string): void;
/**
 * Apply already-approved patches.
 */
export declare function applyPatches(patches: FilePatch[], workdir?: string, enableSnapshot?: boolean): ApplyResult;
/**
 * Generate readable diff preview.
 */
export declare function generateDiff(patch: FilePatch, workdir?: string): string;
//# sourceMappingURL=executor.d.ts.map
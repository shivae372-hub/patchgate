import { FilePatch, ApplyResult } from "./types";
/**
 * Save a snapshot of all files that are about to be changed.
 * Returns the snapshot directory path.
 */
export declare function saveSnapshot(patches: FilePatch[], workdir?: string): string;
/**
 * Restore all files from a snapshot directory.
 * Your "undo" button.
 */
export declare function rollback(snapshotDir: string, workdir?: string): void;
/**
 * Apply a list of already-approved patches to the filesystem.
 * Saves a snapshot before doing anything.
 */
export declare function applyPatches(patches: FilePatch[], workdir?: string, enableSnapshot?: boolean): ApplyResult;
/**
 * Generate a human-readable diff for a single patch.
 * Shown in terminal before asking "Apply this? [y/n]"
 */
export declare function generateDiff(patch: FilePatch, workdir?: string): string;
//# sourceMappingURL=executor.d.ts.map
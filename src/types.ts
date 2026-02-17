// src/types.ts
// PatchGate — Core Type Definitions
// Defines what a "patch" looks like — the contract every other file depends on.

export type PatchOperation =
  | "create"   // AI wants to create a new file
  | "update"   // AI wants to edit an existing file
  | "delete"   // AI wants to delete a file
  | "rename";  // AI wants to rename/move a file

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
  skipped: { path: string; reason: string }[];

  /** Any errors that occurred */
  errors: { path: string; message: string }[];

  /** Path to the rollback snapshot (so you can undo everything) */
  snapshotPath?: string;
}

export interface PatchGateConfig {
  /** Files/patterns the AI is NEVER allowed to touch */
  blocklist: string[];

  /** If true, ask the user before applying each change */
  requireApproval: boolean;

  /** If true, save a snapshot before applying (enables rollback) */
  enableSnapshot: boolean;

  /** If true, run `tsc --noEmit` after applying to catch type errors */
  runTypecheck: boolean;

  /** Custom command to run after applying (e.g. "npm test") */
  validateCommand?: string;
}

export const DEFAULT_CONFIG: PatchGateConfig = {
  blocklist: [
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "*.secret",
    "node_modules/**",
    ".git/**",
  ],
  requireApproval: false,
  enableSnapshot: true,
  runTypecheck: false,
};

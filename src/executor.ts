// src/executor.ts
// PatchGate — Patch Executor
// Only runs AFTER policy has approved each patch.
// Always saves a snapshot first so you can roll back.

import fs from "fs";
import path from "path";
import { createPatch } from "diff";
import { FilePatch, ApplyResult } from "./types";

/**
 * Save a snapshot of all files that are about to be changed.
 * Returns the snapshot directory path.
 */
export function saveSnapshot(
  patches: FilePatch[],
  workdir: string = process.cwd()
): string {
  const snapshotId = `patchgate-snapshot-${Date.now()}`;
  const snapshotDir = path.join(workdir, ".patchgate", "snapshots", snapshotId);
  fs.mkdirSync(snapshotDir, { recursive: true });

  for (const patch of patches) {
    if (patch.op === "update" || patch.op === "delete" || patch.op === "rename") {
      const fullPath = path.join(workdir, patch.path);
      if (fs.existsSync(fullPath)) {
        const destPath = path.join(snapshotDir, patch.path);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(fullPath, destPath);
      }
    }
  }

  const manifest = {
    id: snapshotId,
    createdAt: new Date().toISOString(),
    files: patches.map((p) => ({ op: p.op, path: p.path })),
  };
  fs.writeFileSync(
    path.join(snapshotDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  return snapshotDir;
}

/**
 * Restore all files from a snapshot directory.
 * Your "undo" button.
 */
export function rollback(
  snapshotDir: string,
  workdir: string = process.cwd()
): void {
  const manifestPath = path.join(snapshotDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No manifest found at ${snapshotDir}. Cannot rollback.`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  for (const entry of manifest.files) {
    const snapshotFile = path.join(snapshotDir, entry.path);
    const targetFile = path.join(workdir, entry.path);

    if (entry.op === "create") {
      if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    } else if (fs.existsSync(snapshotFile)) {
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.copyFileSync(snapshotFile, targetFile);
    }
  }
}

/**
 * Apply a list of already-approved patches to the filesystem.
 * Saves a snapshot before doing anything.
 */
export function applyPatches(
  patches: FilePatch[],
  workdir: string = process.cwd(),
  enableSnapshot: boolean = true
): ApplyResult {
  const result: ApplyResult = {
    success: false,
    applied: [],
    skipped: [],
    errors: [],
  };

  if (enableSnapshot && patches.length > 0) {
    try {
      result.snapshotPath = saveSnapshot(patches, workdir);
    } catch (err: any) {
      result.errors.push({ path: "__snapshot__", message: err.message });
      return result;
    }
  }

  for (const patch of patches) {
    try {
      applyOne(patch, workdir);
      result.applied.push(patch.path);
    } catch (err: any) {
      result.errors.push({ path: patch.path, message: err.message });
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

function applyOne(patch: FilePatch, workdir: string): void {
  const fullPath = path.join(workdir, patch.path);

  switch (patch.op) {
    case "create":
    case "update": {
      if (patch.content === undefined) {
        throw new Error(`Patch for "${patch.path}" has no content.`);
      }
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      // ATOMIC WRITE: temp file then rename — never corrupts originals
      const tmpPath = `${fullPath}.pg-tmp-${process.pid}`;
      try {
        fs.writeFileSync(tmpPath, patch.content, "utf-8");
        fs.renameSync(tmpPath, fullPath);
      } catch (err) {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        throw err;
      }
      break;
    }

    case "delete": {
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Cannot delete "${patch.path}" — file does not exist.`);
      }
      fs.unlinkSync(fullPath);
      break;
    }

    case "rename": {
      if (!patch.newPath) {
        throw new Error(`Rename patch for "${patch.path}" has no newPath.`);
      }
      const newFullPath = path.join(workdir, patch.newPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Cannot rename "${patch.path}" — file does not exist.`);
      }
      fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
      fs.renameSync(fullPath, newFullPath);
      break;
    }

    default:
      throw new Error(`Unknown patch operation: "${(patch as any).op}"`);
  }
}

/**
 * Generate a human-readable diff for a single patch.
 * Shown in terminal before asking "Apply this? [y/n]"
 */
export function generateDiff(
  patch: FilePatch,
  workdir: string = process.cwd()
): string {
  if (patch.op === "delete") return `[-] DELETE  ${patch.path}`;
  if (patch.op === "rename") return `[~] RENAME  ${patch.path} → ${patch.newPath}`;
  if (patch.op === "create") {
    const lines = (patch.content ?? "").split("\n").length;
    return `[+] CREATE  ${patch.path}  (${lines} lines)`;
  }

  const fullPath = path.join(workdir, patch.path);
  const before = fs.existsSync(fullPath)
    ? fs.readFileSync(fullPath, "utf-8")
    : "";
  const after = patch.content ?? "";

  return createPatch(patch.path, before, after, "before", "after");
}

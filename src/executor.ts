// src/executor.ts
// PatchGate — Patch Executor

import fs from "fs";
import path from "path";
import { createPatch } from "diff";
import { FilePatch, ApplyResult } from "./types";

/**
 * Save a snapshot of files BEFORE changes.
 */
export function saveSnapshot(
  patches: FilePatch[],
  workdir: string = process.cwd()
): string {
  const snapshotId = `patchgate-snapshot-${Date.now()}`;
  const snapshotDir = path.join(workdir, ".patchgate", "snapshots", snapshotId);

  fs.mkdirSync(snapshotDir, { recursive: true });

  // Copy originals
  for (const patch of patches) {
    if (
      patch.op === "update" ||
      patch.op === "delete" ||
      patch.op === "rename"
    ) {
      const fullPath = path.join(workdir, patch.path);

      if (fs.existsSync(fullPath)) {
        const destPath = path.join(snapshotDir, patch.path);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(fullPath, destPath);
      }
    }
  }

  // Write manifest.json
  const manifest = {
    id: snapshotId,
    createdAt: new Date().toISOString(),
    files: patches.map((p) => ({
      op: p.op,
      path: p.path,
      newPath: p.op === "rename" ? p.newPath : undefined,
    })),
  };

  fs.writeFileSync(
    path.join(snapshotDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );

  return snapshotDir;
}

/**
 * Rollback all changes from a snapshot.
 */
export function rollback(snapshotDir: string, workdir: string = process.cwd()) {
  const manifestPath = path.join(snapshotDir, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error("No manifest.json found — cannot rollback.");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  for (const entry of manifest.files) {
    const snapshotFile = path.join(snapshotDir, entry.path);
    const targetFile = path.join(workdir, entry.path);

    if (entry.op === "create") {
      if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    } else {
      if (fs.existsSync(snapshotFile)) {
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        fs.copyFileSync(snapshotFile, targetFile);
      }
    }
  }
}

/**
 * Apply already-approved patches.
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
    result.snapshotPath = saveSnapshot(patches, workdir);
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

/**
 * Apply one patch atomically.
 */
function applyOne(patch: FilePatch, workdir: string) {
  const fullPath = path.join(workdir, patch.path);

  switch (patch.op) {
    case "create":
    case "update": {
      if (patch.content === undefined) {
        throw new Error("Missing content for write patch.");
      }

      fs.mkdirSync(path.dirname(fullPath), { recursive: true });

      const tmpPath = `${fullPath}.pg-tmp-${process.pid}`;
      fs.writeFileSync(tmpPath, patch.content, "utf-8");
      fs.renameSync(tmpPath, fullPath);
      break;
    }

    case "delete": {
      if (!fs.existsSync(fullPath)) {
        throw new Error("Cannot delete missing file.");
      }
      fs.unlinkSync(fullPath);
      break;
    }

    case "rename": {
      if (!patch.newPath) throw new Error("Missing newPath for rename.");

      const newFullPath = path.join(workdir, patch.newPath);

      fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
      fs.renameSync(fullPath, newFullPath);
      break;
    }

    default:
      throw new Error("Unknown patch operation.");
  }
}

/**
 * Generate readable diff preview.
 */
export function generateDiff(
  patch: FilePatch,
  workdir: string = process.cwd()
): string {
  if (patch.op === "delete") return `[-] DELETE  ${patch.path}`;
  if (patch.op === "rename")
    return `[~] RENAME  ${patch.path} → ${patch.newPath}`;

  if (patch.op === "create") {
    return `[+] CREATE  ${patch.path}`;
  }

  const fullPath = path.join(workdir, patch.path);

  const before = fs.existsSync(fullPath)
    ? fs.readFileSync(fullPath, "utf-8")
    : "";

  return createPatch(patch.path, before, patch.content ?? "");
}

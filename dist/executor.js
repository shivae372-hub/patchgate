"use strict";
// src/executor.ts
// PatchGate — Patch Executor
// Only runs AFTER policy has approved each patch.
// Always saves a snapshot first so you can roll back.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSnapshot = saveSnapshot;
exports.rollback = rollback;
exports.applyPatches = applyPatches;
exports.generateDiff = generateDiff;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const diff_1 = require("diff");
/**
 * Save a snapshot of all files that are about to be changed.
 * Returns the snapshot directory path.
 */
function saveSnapshot(patches, workdir = process.cwd()) {
    const snapshotId = `patchgate-snapshot-${Date.now()}`;
    const snapshotDir = path_1.default.join(workdir, ".patchgate", "snapshots", snapshotId);
    fs_1.default.mkdirSync(snapshotDir, { recursive: true });
    for (const patch of patches) {
        if (patch.op === "update" || patch.op === "delete" || patch.op === "rename") {
            const fullPath = path_1.default.join(workdir, patch.path);
            if (fs_1.default.existsSync(fullPath)) {
                const destPath = path_1.default.join(snapshotDir, patch.path);
                fs_1.default.mkdirSync(path_1.default.dirname(destPath), { recursive: true });
                fs_1.default.copyFileSync(fullPath, destPath);
            }
        }
    }
    const manifest = {
        id: snapshotId,
        createdAt: new Date().toISOString(),
        files: patches.map((p) => ({ op: p.op, path: p.path })),
    };
    fs_1.default.writeFileSync(path_1.default.join(snapshotDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    return snapshotDir;
}
/**
 * Restore all files from a snapshot directory.
 * Your "undo" button.
 */
function rollback(snapshotDir, workdir = process.cwd()) {
    const manifestPath = path_1.default.join(snapshotDir, "manifest.json");
    if (!fs_1.default.existsSync(manifestPath)) {
        throw new Error(`No manifest found at ${snapshotDir}. Cannot rollback.`);
    }
    const manifest = JSON.parse(fs_1.default.readFileSync(manifestPath, "utf-8"));
    for (const entry of manifest.files) {
        const snapshotFile = path_1.default.join(snapshotDir, entry.path);
        const targetFile = path_1.default.join(workdir, entry.path);
        if (entry.op === "create") {
            if (fs_1.default.existsSync(targetFile))
                fs_1.default.unlinkSync(targetFile);
        }
        else if (fs_1.default.existsSync(snapshotFile)) {
            fs_1.default.mkdirSync(path_1.default.dirname(targetFile), { recursive: true });
            fs_1.default.copyFileSync(snapshotFile, targetFile);
        }
    }
}
/**
 * Apply a list of already-approved patches to the filesystem.
 * Saves a snapshot before doing anything.
 */
function applyPatches(patches, workdir = process.cwd(), enableSnapshot = true) {
    const result = {
        success: false,
        applied: [],
        skipped: [],
        errors: [],
    };
    if (enableSnapshot && patches.length > 0) {
        try {
            result.snapshotPath = saveSnapshot(patches, workdir);
        }
        catch (err) {
            result.errors.push({ path: "__snapshot__", message: err.message });
            return result;
        }
    }
    for (const patch of patches) {
        try {
            applyOne(patch, workdir);
            result.applied.push(patch.path);
        }
        catch (err) {
            result.errors.push({ path: patch.path, message: err.message });
        }
    }
    result.success = result.errors.length === 0;
    return result;
}
function applyOne(patch, workdir) {
    const fullPath = path_1.default.join(workdir, patch.path);
    switch (patch.op) {
        case "create":
        case "update": {
            if (patch.content === undefined) {
                throw new Error(`Patch for "${patch.path}" has no content.`);
            }
            fs_1.default.mkdirSync(path_1.default.dirname(fullPath), { recursive: true });
            // ATOMIC WRITE: temp file then rename — never corrupts originals
            const tmpPath = `${fullPath}.pg-tmp-${process.pid}`;
            try {
                fs_1.default.writeFileSync(tmpPath, patch.content, "utf-8");
                fs_1.default.renameSync(tmpPath, fullPath);
            }
            catch (err) {
                if (fs_1.default.existsSync(tmpPath))
                    fs_1.default.unlinkSync(tmpPath);
                throw err;
            }
            break;
        }
        case "delete": {
            if (!fs_1.default.existsSync(fullPath)) {
                throw new Error(`Cannot delete "${patch.path}" — file does not exist.`);
            }
            fs_1.default.unlinkSync(fullPath);
            break;
        }
        case "rename": {
            if (!patch.newPath) {
                throw new Error(`Rename patch for "${patch.path}" has no newPath.`);
            }
            const newFullPath = path_1.default.join(workdir, patch.newPath);
            if (!fs_1.default.existsSync(fullPath)) {
                throw new Error(`Cannot rename "${patch.path}" — file does not exist.`);
            }
            fs_1.default.mkdirSync(path_1.default.dirname(newFullPath), { recursive: true });
            fs_1.default.renameSync(fullPath, newFullPath);
            break;
        }
        default:
            throw new Error(`Unknown patch operation: "${patch.op}"`);
    }
}
/**
 * Generate a human-readable diff for a single patch.
 * Shown in terminal before asking "Apply this? [y/n]"
 */
function generateDiff(patch, workdir = process.cwd()) {
    if (patch.op === "delete")
        return `[-] DELETE  ${patch.path}`;
    if (patch.op === "rename")
        return `[~] RENAME  ${patch.path} → ${patch.newPath}`;
    if (patch.op === "create") {
        const lines = (patch.content ?? "").split("\n").length;
        return `[+] CREATE  ${patch.path}  (${lines} lines)`;
    }
    const fullPath = path_1.default.join(workdir, patch.path);
    const before = fs_1.default.existsSync(fullPath)
        ? fs_1.default.readFileSync(fullPath, "utf-8")
        : "";
    const after = patch.content ?? "";
    return (0, diff_1.createPatch)(patch.path, before, after, "before", "after");
}
//# sourceMappingURL=executor.js.map
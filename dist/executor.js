"use strict";
// src/executor.ts
// PatchGate — Patch Executor
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
 * Save a snapshot of files BEFORE changes.
 */
function saveSnapshot(patches, workdir = process.cwd()) {
    const snapshotId = `patchgate-snapshot-${Date.now()}`;
    const snapshotDir = path_1.default.join(workdir, ".patchgate", "snapshots", snapshotId);
    fs_1.default.mkdirSync(snapshotDir, { recursive: true });
    // Copy originals
    for (const patch of patches) {
        if (patch.op === "update" ||
            patch.op === "delete" ||
            patch.op === "rename") {
            const fullPath = path_1.default.join(workdir, patch.path);
            if (fs_1.default.existsSync(fullPath)) {
                const destPath = path_1.default.join(snapshotDir, patch.path);
                fs_1.default.mkdirSync(path_1.default.dirname(destPath), { recursive: true });
                fs_1.default.copyFileSync(fullPath, destPath);
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
    fs_1.default.writeFileSync(path_1.default.join(snapshotDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
    return snapshotDir;
}
/**
 * Rollback all changes from a snapshot.
 */
function rollback(snapshotDir, workdir = process.cwd()) {
    const manifestPath = path_1.default.join(snapshotDir, "manifest.json");
    if (!fs_1.default.existsSync(manifestPath)) {
        throw new Error("No manifest.json found — cannot rollback.");
    }
    const manifest = JSON.parse(fs_1.default.readFileSync(manifestPath, "utf-8"));
    for (const entry of manifest.files) {
        const snapshotFile = path_1.default.join(snapshotDir, entry.path);
        const targetFile = path_1.default.join(workdir, entry.path);
        if (entry.op === "create") {
            if (fs_1.default.existsSync(targetFile))
                fs_1.default.unlinkSync(targetFile);
        }
        else {
            if (fs_1.default.existsSync(snapshotFile)) {
                fs_1.default.mkdirSync(path_1.default.dirname(targetFile), { recursive: true });
                fs_1.default.copyFileSync(snapshotFile, targetFile);
            }
        }
    }
}
/**
 * Apply already-approved patches.
 */
function applyPatches(patches, workdir = process.cwd(), enableSnapshot = true) {
    const result = {
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
        }
        catch (err) {
            result.errors.push({ path: patch.path, message: err.message });
        }
    }
    result.success = result.errors.length === 0;
    return result;
}
/**
 * Apply one patch atomically.
 */
function applyOne(patch, workdir) {
    const fullPath = path_1.default.join(workdir, patch.path);
    switch (patch.op) {
        case "create":
        case "update": {
            if (patch.content === undefined) {
                throw new Error("Missing content for write patch.");
            }
            fs_1.default.mkdirSync(path_1.default.dirname(fullPath), { recursive: true });
            const tmpPath = `${fullPath}.pg-tmp-${process.pid}`;
            fs_1.default.writeFileSync(tmpPath, patch.content, "utf-8");
            fs_1.default.renameSync(tmpPath, fullPath);
            break;
        }
        case "delete": {
            if (!fs_1.default.existsSync(fullPath)) {
                throw new Error("Cannot delete missing file.");
            }
            fs_1.default.unlinkSync(fullPath);
            break;
        }
        case "rename": {
            if (!patch.newPath)
                throw new Error("Missing newPath for rename.");
            const newFullPath = path_1.default.join(workdir, patch.newPath);
            fs_1.default.mkdirSync(path_1.default.dirname(newFullPath), { recursive: true });
            fs_1.default.renameSync(fullPath, newFullPath);
            break;
        }
        default:
            throw new Error("Unknown patch operation.");
    }
}
/**
 * Generate readable diff preview.
 */
function generateDiff(patch, workdir = process.cwd()) {
    if (patch.op === "delete")
        return `[-] DELETE  ${patch.path}`;
    if (patch.op === "rename")
        return `[~] RENAME  ${patch.path} → ${patch.newPath}`;
    if (patch.op === "create") {
        return `[+] CREATE  ${patch.path}`;
    }
    const fullPath = path_1.default.join(workdir, patch.path);
    const before = fs_1.default.existsSync(fullPath)
        ? fs_1.default.readFileSync(fullPath, "utf-8")
        : "";
    return (0, diff_1.createPatch)(patch.path, before, patch.content ?? "");
}
//# sourceMappingURL=executor.js.map
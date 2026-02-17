"use strict";
// src/policy.ts
// PatchGate — Policy Engine
// Checks every patch before it's allowed to run.
// Nothing touches disk until this says yes.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforcePolicy = enforcePolicy;
const path_1 = __importDefault(require("path"));
const micromatch_1 = __importDefault(require("micromatch"));
const types_1 = require("./types");
/**
 * Check every patch against policy rules.
 * Returns which patches are allowed and which are blocked — and why.
 */
function enforcePolicy(patches, config = types_1.DEFAULT_CONFIG, extraBlocklist = []) {
    const allowed = [];
    const blocked = [];
    const fullBlocklist = [...config.blocklist, ...extraBlocklist];
    for (const patch of patches) {
        const violation = checkPatch(patch, fullBlocklist);
        if (violation) {
            blocked.push({ patch, reason: violation });
        }
        else {
            allowed.push(patch);
        }
    }
    return { allowed, blocked };
}
function checkPatch(patch, blocklist) {
    const targetPath = patch.path;
    const normalised = path_1.default.normalize(targetPath);
    // Block path traversal attacks (e.g. "../../etc/passwd")
    if (normalised.includes("..")) {
        return `Path traversal detected: "${targetPath}"`;
    }
    // Block absolute paths
    if (path_1.default.isAbsolute(targetPath)) {
        return `Absolute path not allowed: "${targetPath}"`;
    }
    // Check against blocklist patterns
    const matchedPattern = blocklist.find((pattern) => micromatch_1.default.isMatch(targetPath, pattern, { dot: true }) ||
        micromatch_1.default.isMatch(path_1.default.basename(targetPath), pattern, { dot: true }));
    if (matchedPattern) {
        return `Blocked by policy pattern "${matchedPattern}": "${targetPath}"`;
    }
    // For renames, also check the destination path
    if (patch.op === "rename" && patch.newPath) {
        const newNormalised = path_1.default.normalize(patch.newPath);
        if (newNormalised.includes("..")) {
            return `Path traversal in rename destination: "${patch.newPath}"`;
        }
        const newMatched = blocklist.find((pattern) => micromatch_1.default.isMatch(patch.newPath, pattern, { dot: true }) ||
            micromatch_1.default.isMatch(path_1.default.basename(patch.newPath), pattern, { dot: true }));
        if (newMatched) {
            return `Rename destination blocked by policy "${newMatched}": "${patch.newPath}"`;
        }
    }
    return null;
}
//# sourceMappingURL=policy.js.map
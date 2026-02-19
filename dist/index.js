"use strict";
// src/index.ts
// PatchGate — Public API
// One function: run(patchSet). That's 90% of the usage.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPatchGateFileTools = exports.printHistory = exports.readLog = exports.saveSnapshot = exports.generateDiff = exports.rollback = exports.applyPatches = exports.enforcePolicy = void 0;
exports.run = run;
exports.createPatchSet = createPatchSet;
const crypto_1 = require("crypto");
const types_1 = require("./types");
const policy_1 = require("./policy");
const executor_1 = require("./executor");
const logger_1 = require("./logger");
__exportStar(require("./types"), exports);
var policy_2 = require("./policy");
Object.defineProperty(exports, "enforcePolicy", { enumerable: true, get: function () { return policy_2.enforcePolicy; } });
var executor_2 = require("./executor");
Object.defineProperty(exports, "applyPatches", { enumerable: true, get: function () { return executor_2.applyPatches; } });
Object.defineProperty(exports, "rollback", { enumerable: true, get: function () { return executor_2.rollback; } });
Object.defineProperty(exports, "generateDiff", { enumerable: true, get: function () { return executor_2.generateDiff; } });
Object.defineProperty(exports, "saveSnapshot", { enumerable: true, get: function () { return executor_2.saveSnapshot; } });
var logger_2 = require("./logger");
Object.defineProperty(exports, "readLog", { enumerable: true, get: function () { return logger_2.readLog; } });
Object.defineProperty(exports, "printHistory", { enumerable: true, get: function () { return logger_2.printHistory; } });
var fileTools_1 = require("./adapters/openai/fileTools");
Object.defineProperty(exports, "createPatchGateFileTools", { enumerable: true, get: function () { return fileTools_1.createPatchGateFileTools; } });
__exportStar(require("./adapters/openai/types"), exports);
/**
 * THE MAIN FUNCTION.
 *
 * Give it patches from your AI agent.
 * It will: check policy → preview → snapshot → apply → log.
 *
 * ```ts
 * import { run } from "patchgate";
 *
 * const result = await run({
 *   source: "claude-3-5-sonnet",
 *   patches: [
 *     { op: "update", path: "src/index.ts", content: "...", reason: "Fix null check" }
 *   ]
 * });
 *
 * console.log(result.applied);  // ["src/index.ts"]
 * console.log(result.blocked);  // anything policy blocked
 * ```
 */
async function run(patchSet, options = {}) {
    const startTime = Date.now();
    const workdir = options.workdir ?? process.cwd();
    const config = {
        ...types_1.DEFAULT_CONFIG,
        ...(options.config ?? {}),
    };
    const fullPatchSet = {
        id: patchSet.id ?? (0, crypto_1.randomUUID)(),
        createdAt: new Date().toISOString(),
        ...patchSet,
    };
    // 1. Policy check
    const { allowed, blocked } = (0, policy_1.enforcePolicy)(fullPatchSet.patches, config, fullPatchSet.blocklist);
    // 🚨 CI Strict Mode: fail immediately if anything is blocked
    if (config.failOnBlocked && blocked.length > 0) {
        return {
            success: false,
            applied: [],
            skipped: [],
            errors: [
                {
                    path: "__policy__",
                    message: `Blocked patches detected (${blocked.length}). CI strict mode enabled.`,
                },
            ],
            blocked: blocked.map((b) => ({
                path: b.patch.path,
                reason: b.reason,
            })),
        };
    }
    // 2. Optional preview
    if (options.onPreview && allowed.length > 0) {
        const diffs = allowed.map((p) => (0, executor_1.generateDiff)(p, workdir));
        const approved = await options.onPreview(diffs);
        if (!approved) {
            const cancelled = {
                success: false,
                applied: [],
                skipped: allowed.map((p) => ({
                    path: p.path,
                    reason: "Cancelled by user",
                })),
                errors: [],
            };
            return {
                ...cancelled,
                blocked: blocked.map((b) => ({
                    path: b.patch.path,
                    reason: b.reason,
                })),
            };
        }
    }
    // 3. Apply
    const result = (0, executor_1.applyPatches)(allowed, workdir, config.enableSnapshot);
    // 4. Log
    const logEntry = (0, logger_1.buildLogEntry)(fullPatchSet, result, blocked.map((b) => ({ path: b.patch.path, reason: b.reason })), startTime);
    (0, logger_1.writeLog)(logEntry, workdir);
    return {
        ...result,
        blocked: blocked.map((b) => ({ path: b.patch.path, reason: b.reason })),
    };
}
/**
 * Helper: build a PatchSet from simple { path, content } pairs.
 * Useful when parsing LLM responses.
 */
function createPatchSet(files, source) {
    return {
        id: (0, crypto_1.randomUUID)(),
        createdAt: new Date().toISOString(),
        source,
        patches: files.map((f) => ({
            op: "update",
            path: f.path,
            content: f.content,
            reason: f.reason,
        })),
    };
}
//# sourceMappingURL=index.js.map
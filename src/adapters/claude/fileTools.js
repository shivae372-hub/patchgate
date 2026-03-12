"use strict";
// src/adapters/claude/fileTools.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClaudeFileTools = createClaudeFileTools;
const index_1 = require("../../index");
function createClaudeFileTools(options) {
    const source = options?.source ?? "claude-agent";
    const workdir = options?.workdir;
    const requireApproval = options?.requireApproval ?? false;
    return [
        // ===============================
        // WRITE TOOL
        // ===============================
        {
            name: "patchgate_write_file",
            description: "Safely write/update a file with PatchGate enforcement.",
            input_schema: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Relative file path from project root" },
                    content: { type: "string", description: "Full file content to write" },
                },
                required: ["path", "content"],
            },
            execute: async (args) => {
                const result = await (0, index_1.run)({
                    source,
                    patches: [
                        {
                            op: "update",
                            path: args.path,
                            content: args.content,
                        },
                    ],
                }, {
                    workdir,
                    config: {
                        requireApproval,
                        enableSnapshot: true,
                    },
                });
                if (result.blocked.length > 0) {
                    return {
                        ok: false,
                        applied: [],
                        blocked: result.blocked,
                        snapshotPath: result.snapshotPath,
                        message: "Blocked by policy",
                    };
                }
                return {
                    ok: true,
                    applied: result.applied,
                    blocked: [],
                    snapshotPath: result.snapshotPath,
                    message: `Wrote ${args.path}`,
                };
            },
        },
        // ===============================
        // DELETE TOOL
        // ===============================
        {
            name: "patchgate_delete_file",
            description: "Safely delete a file with PatchGate enforcement.",
            input_schema: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Relative file path from project root to delete" },
                },
                required: ["path"],
            },
            execute: async (args) => {
                const result = await (0, index_1.run)({
                    source,
                    patches: [
                        {
                            op: "delete",
                            path: args.path,
                        },
                    ],
                }, {
                    workdir,
                    config: {
                        requireApproval,
                        enableSnapshot: true,
                    },
                });
                if (result.blocked.length > 0) {
                    return {
                        ok: false,
                        applied: [],
                        blocked: result.blocked,
                        message: "Blocked by policy",
                    };
                }
                return {
                    ok: true,
                    applied: result.applied,
                    blocked: [],
                    snapshotPath: result.snapshotPath,
                    message: `Deleted ${args.path}`,
                };
            },
        },
        // ===============================
        // RENAME TOOL
        // ===============================
        {
            name: "patchgate_rename_file",
            description: "Safely rename/move a file with PatchGate enforcement.",
            input_schema: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Current relative file path from project root" },
                    newPath: { type: "string", description: "New relative file path from project root" },
                },
                required: ["path", "newPath"],
            },
            execute: async (args) => {
                const result = await (0, index_1.run)({
                    source,
                    patches: [
                        {
                            op: "rename",
                            path: args.path,
                            newPath: args.newPath,
                        },
                    ],
                }, {
                    workdir,
                    config: {
                        requireApproval,
                        enableSnapshot: true,
                    },
                });
                if (result.blocked.length > 0) {
                    return {
                        ok: false,
                        applied: [],
                        blocked: result.blocked,
                        message: "Blocked by policy",
                    };
                }
                return {
                    ok: true,
                    applied: result.applied,
                    blocked: [],
                    snapshotPath: result.snapshotPath,
                    message: `Renamed ${args.path} → ${args.newPath}`,
                };
            },
        },
    ];
}

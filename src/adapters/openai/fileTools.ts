// src/adapters/openai/fileTools.ts
// PatchGate OpenAI Adapter — Tool Definitions
// Converts OpenAI function calls into PatchGate-protected filesystem operations

import { run } from "../../index";
import type {
  OpenAIWriteFileArgs,
  OpenAIDeleteFileArgs,
  OpenAIRenameFileArgs,
  PatchGateToolResult,
} from "./types";

export interface PatchGateToolOptions {
  /** Identifier for audit logs (default: "openai-agent") */
  source?: string;
  /** Working directory (default: process.cwd()) */
  workdir?: string;
  /** Require user approval for every change (default: false) */
  requireApproval?: boolean;
}

/**
 * Create OpenAI function tools that enforce PatchGate safety policies.
 * 
 * Usage:
 * ```typescript
 * import OpenAI from "openai";
 * import { createPatchGateFileTools } from "patchgate";
 * 
 * const client = new OpenAI();
 * const tools = createPatchGateFileTools();
 * 
 * const response = await client.chat.completions.create({
 *   model: "gpt-4o",
 *   messages: [{ role: "user", content: "Update src/index.ts" }],
 *   tools: tools.map(t => ({ type: t.type, function: t.function })),
 * });
 * ```
 */
export function createPatchGateFileTools(options?: PatchGateToolOptions) {
  const source = options?.source ?? "openai-agent";
  const workdir = options?.workdir;
  const requireApproval = options?.requireApproval ?? false;

  return [
    {
      type: "function" as const,
      function: {
        name: "patchgate_write_file",
        description:
          "Write or update a file with PatchGate safety enforcement. Blocks .env, secrets, and dangerous paths. Returns success status and any policy violations.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative file path (e.g., 'src/index.ts')",
            },
            content: {
              type: "string",
              description: "Complete file content to write",
            },
          },
          required: ["path", "content"],
        },
      },
      execute: async (args: OpenAIWriteFileArgs): Promise<PatchGateToolResult> => {
        try {
          const result = await run(
            {
              source,
              patches: [
                {
                  op: "update",
                  path: args.path,
                  content: args.content,
                  reason: "OpenAI write_file tool call",
                },
              ],
            },
            {
              workdir,
              config: { requireApproval, enableSnapshot: true },
            }
          );

          if (result.blocked.length > 0) {
            return {
              ok: false,
              applied: result.applied,
              blocked: result.blocked,
              snapshotPath: result.snapshotPath,
              message: `Blocked by policy: ${result.blocked.map(b => b.reason).join(", ")}`,
            };
          }

          return {
            ok: true,
            applied: result.applied,
            blocked: [],
            snapshotPath: result.snapshotPath,
            message: `Successfully wrote ${args.path}`,
          };
        } catch (error: any) {
          return {
            ok: false,
            applied: [],
            blocked: [],
            message: `Error: ${error.message}`,
          };
        }
      },
    },

    {
      type: "function" as const,
      function: {
        name: "patchgate_delete_file",
        description:
          "Delete a file with PatchGate safety enforcement. Blocks deletion of protected files. Saves snapshot for rollback.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative file path to delete",
            },
          },
          required: ["path"],
        },
      },
      execute: async (args: OpenAIDeleteFileArgs): Promise<PatchGateToolResult> => {
        try {
          const result = await run(
            {
              source,
              patches: [
                {
                  op: "delete",
                  path: args.path,
                  reason: "OpenAI delete_file tool call",
                },
              ],
            },
            {
              workdir,
              config: { requireApproval, enableSnapshot: true },
            }
          );

          if (result.blocked.length > 0) {
            return {
              ok: false,
              applied: [],
              blocked: result.blocked,
              message: `Blocked: ${result.blocked[0].reason}`,
            };
          }

          return {
            ok: true,
            applied: result.applied,
            blocked: [],
            snapshotPath: result.snapshotPath,
            message: `Successfully deleted ${args.path}`,
          };
        } catch (error: any) {
          return {
            ok: false,
            applied: [],
            blocked: [],
            message: `Error: ${error.message}`,
          };
        }
      },
    },

    {
      type: "function" as const,
      function: {
        name: "patchgate_rename_file",
        description:
          "Rename or move a file with PatchGate safety enforcement. Validates both source and destination paths.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Current file path",
            },
            newPath: {
              type: "string",
              description: "New file path",
            },
          },
          required: ["path", "newPath"],
        },
      },
      execute: async (args: OpenAIRenameFileArgs): Promise<PatchGateToolResult> => {
        try {
          const result = await run(
            {
              source,
              patches: [
                {
                  op: "rename",
                  path: args.path,
                  newPath: args.newPath,
                  reason: "OpenAI rename_file tool call",
                },
              ],
            },
            {
              workdir,
              config: { requireApproval, enableSnapshot: true },
            }
          );

          if (result.blocked.length > 0) {
            return {
              ok: false,
              applied: [],
              blocked: result.blocked,
              message: `Blocked: ${result.blocked[0].reason}`,
            };
          }

          return {
            ok: true,
            applied: result.applied,
            blocked: [],
            snapshotPath: result.snapshotPath,
            message: `Successfully renamed ${args.path} → ${args.newPath}`,
          };
        } catch (error: any) {
          return {
            ok: false,
            applied: [],
            blocked: [],
            message: `Error: ${error.message}`,
          };
        }
      },
    },
  ];
}

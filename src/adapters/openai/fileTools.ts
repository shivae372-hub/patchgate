// src/adapters/openai/fileTools.ts

import { run } from "../../index";
import type { PatchGateTool } from "./types";


import type {
  OpenAIWriteFileArgs,
  OpenAIDeleteFileArgs,
  OpenAIRenameFileArgs,
  PatchGateToolResult,
} from "./types";

export interface PatchGateToolOptions {
  source?: string;
  workdir?: string;
  requireApproval?: boolean;
}

export function createPatchGateFileTools(
  options?: PatchGateToolOptions
): PatchGateTool<any>[] {

  const source = options?.source ?? "openai-agent";
  const workdir = options?.workdir;
  const requireApproval = options?.requireApproval ?? false;

  return [
    // ===============================
    // WRITE TOOL
    // ===============================
    {
      type: "function" as const,
      function: {
        name: "patchgate_write_file",
        description:
          "Safely write/update a file with PatchGate enforcement.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
            content: { type: "string" },
          },
          required: ["path", "content"],
        },
      },

      execute: async (args: OpenAIWriteFileArgs): Promise<PatchGateToolResult> => {
        const result = await run(
          {
            source,
            patches: [
              {
                op: "update",
                path: args.path,
                content: args.content,
              },
            ],
          },
          {
            workdir,
            config: {
              requireApproval,
              enableSnapshot: true,
            },
          }
        );

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
      type: "function" as const,
      function: {
        name: "patchgate_delete_file",
        description: "Safely delete a file with PatchGate enforcement.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
          },
          required: ["path"],
        },
      },

      execute: async (
        args: OpenAIDeleteFileArgs
      ): Promise<PatchGateToolResult> => {
        const result = await run(
          {
            source,
            patches: [
              {
                op: "delete",
                path: args.path,
              },
            ],
          },
          {
            workdir,
            config: {
              requireApproval,
              enableSnapshot: true,
            },
          }
        );

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
      type: "function" as const,
      function: {
        name: "patchgate_rename_file",
        description: "Safely rename/move a file with PatchGate enforcement.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
            newPath: { type: "string" },
          },
          required: ["path", "newPath"],
        },
      },

      execute: async (
        args: OpenAIRenameFileArgs
      ): Promise<PatchGateToolResult> => {
        const result = await run(
          {
            source,
            patches: [
              {
                op: "rename",
                path: args.path,
                newPath: args.newPath,
              },
            ],
          },
          {
            workdir,
            config: {
              requireApproval,
              enableSnapshot: true,
            },
          }
        );

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

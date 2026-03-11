// src/adapters/claude/types.ts

export interface ClaudeWriteFileArgs {
  path: string;
  content: string;
}

export interface ClaudeDeleteFileArgs {
  path: string;
}

export interface ClaudeRenameFileArgs {
  path: string;
  newPath: string;
}

export interface ClaudePatchGateToolResult {
  ok: boolean;
  applied: string[];
  blocked: { path: string; reason: string }[];
  snapshotPath?: string;
  message: string;
}

/**
 * Claude tool_use input schema property
 */
export interface ClaudeToolSchemaProperty {
  type: string;
  description: string;
}

/**
 * Claude tool_use input schema
 */
export interface ClaudeToolInputSchema {
  type: "object";
  properties: Record<string, ClaudeToolSchemaProperty>;
  required: string[];
}

/**
 * A single Claude-compatible PatchGate tool definition
 */
export interface ClaudePatchGateTool<TArgs> {
  name: string;
  description: string;
  input_schema: ClaudeToolInputSchema;
  execute: (args: TArgs) => Promise<ClaudePatchGateToolResult>;
}

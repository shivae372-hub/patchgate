// src/adapters/openai/types.ts
// PatchGate OpenAI Adapter — Type Definitions

export interface OpenAIWriteFileArgs {
  path: string;
  content: string;
}

export interface OpenAIDeleteFileArgs {
  path: string;
}

export interface OpenAIRenameFileArgs {
  path: string;
  newPath: string;
}

export interface PatchGateToolResult {
  ok: boolean;
  applied: string[];
  blocked: { path: string; reason: string }[];
  snapshotPath?: string;
  message: string;
}

// src/adapters/openai/index.ts
// PatchGate OpenAI Adapter — Public API

export { createPatchGateFileTools } from "./fileTools";
export type {
  OpenAIWriteFileArgs,
  OpenAIDeleteFileArgs,
  OpenAIRenameFileArgs,
  PatchGateToolResult,
} from "./types";
export type { PatchGateToolOptions } from "./fileTools";

// src/adapters/openai/types.ts

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

/**
 * A single OpenAI-compatible PatchGate tool
 */
export interface PatchGateTool<TArgs> {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any;
  };
  execute: (args: TArgs) => Promise<PatchGateToolResult>;
}

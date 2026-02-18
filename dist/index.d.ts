import { PatchSet, PatchGateConfig, ApplyResult } from "./types";
export * from "./types";
export { enforcePolicy } from "./policy";
export { applyPatches, rollback, generateDiff, saveSnapshot } from "./executor";
export { readLog, printHistory } from "./logger";
export { createPatchGateFileTools } from "./adapters/openai/fileTools";
export * from "./adapters/openai/types";
export interface RunOptions {
    /** Working directory (defaults to process.cwd()) */
    workdir?: string;
    /** Override default config */
    config?: Partial<PatchGateConfig>;
    /** Called before applying — return false to cancel */
    onPreview?: (diffs: string[]) => Promise<boolean>;
}
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
export declare function run(patchSet: Omit<PatchSet, "id" | "createdAt"> & {
    id?: string;
}, options?: RunOptions): Promise<ApplyResult & {
    blocked: {
        path: string;
        reason: string;
    }[];
}>;
/**
 * Helper: build a PatchSet from simple { path, content } pairs.
 * Useful when parsing LLM responses.
 */
export declare function createPatchSet(files: {
    path: string;
    content: string;
    reason?: string;
}[], source?: string): PatchSet;
//# sourceMappingURL=index.d.ts.map
import { FilePatch, PatchGateConfig } from "./types";
export interface PolicyViolation {
    patch: FilePatch;
    reason: string;
}
export interface PolicyResult {
    allowed: FilePatch[];
    blocked: PolicyViolation[];
}
/**
 * Check every patch against policy rules.
 * Returns which patches are allowed and which are blocked — and why.
 */
export declare function enforcePolicy(patches: FilePatch[], config?: PatchGateConfig, extraBlocklist?: string[]): PolicyResult;
//# sourceMappingURL=policy.d.ts.map
// src/policy.ts
// PatchGate — Policy Engine
// Checks every patch before it's allowed to run.
// Nothing touches disk until this says yes.

import path from "path";
import micromatch from "micromatch";
import { FilePatch, PatchGateConfig, DEFAULT_CONFIG } from "./types";

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
export function enforcePolicy(
  patches: FilePatch[],
  config: PatchGateConfig = DEFAULT_CONFIG,
  extraBlocklist: string[] = []
): PolicyResult {
  const allowed: FilePatch[] = [];
  const blocked: PolicyViolation[] = [];

  const fullBlocklist = [...config.blocklist, ...extraBlocklist];

  for (const patch of patches) {
    const violation = checkPatch(patch, fullBlocklist);
    if (violation) {
      blocked.push({ patch, reason: violation });
    } else {
      allowed.push(patch);
    }
  }

  return { allowed, blocked };
}

function checkPatch(patch: FilePatch, blocklist: string[]): string | null {
  const targetPath = patch.path;
  const normalised = path.normalize(targetPath);

  // Block path traversal attacks (e.g. "../../etc/passwd")
  if (normalised.includes("..")) {
    return `Path traversal detected: "${targetPath}"`;
  }

  // Block absolute paths
  if (path.isAbsolute(targetPath)) {
    return `Absolute path not allowed: "${targetPath}"`;
  }

  // Check against blocklist patterns
  const matchedPattern = blocklist.find((pattern) =>
  micromatch.isMatch(targetPath, pattern, { dot: true }) ||
  micromatch.isMatch(path.basename(targetPath), pattern, { dot: true })
);
  if (matchedPattern) {
    return `Blocked by policy pattern "${matchedPattern}": "${targetPath}"`;
  }

  // For renames, also check the destination path
  if (patch.op === "rename" && patch.newPath) {
    const newNormalised = path.normalize(patch.newPath);
    if (newNormalised.includes("..")) {
      return `Path traversal in rename destination: "${patch.newPath}"`;
    }
    const newMatched = blocklist.find((pattern) =>
  micromatch.isMatch(patch.newPath!, pattern, { dot: true }) ||
  micromatch.isMatch(path.basename(patch.newPath!), pattern, { dot: true })
);
    if (newMatched) {
      return `Rename destination blocked by policy "${newMatched}": "${patch.newPath}"`;
    }
  }

  return null;
}

// src/helpers/pathUtils.ts
// PatchGate — Safe Path Resolution Utilities
// Centralized path helpers for internal use across the codebase

import path from "path";

/**
 * Error thrown when a path violates safety rules.
 */
export class UnsafePathError extends Error {
  constructor(
    public readonly path: string,
    public readonly reason: string
  ) {
    super(`Unsafe path "${path}": ${reason}`);
    this.name = "UnsafePathError";
  }
}

/**
 * Normalizes a path and validates it does not contain traversal sequences.
 * Throws UnsafePathError if the path is unsafe.
 */
export function normalizeAndValidate(
  targetPath: string,
  allowAbsolute: boolean = false
): string {
  const normalized = path.normalize(targetPath);

  // Block path traversal attacks (e.g. "../../etc/passwd")
  if (normalized.includes("..")) {
    throw new UnsafePathError(targetPath, "Path traversal detected");
  }

  // Block absolute paths unless explicitly allowed
  if (!allowAbsolute && path.isAbsolute(targetPath)) {
    throw new UnsafePathError(targetPath, "Absolute path not allowed");
  }

  return normalized;
}

/**
 * Checks if a path is safe (no traversal, not absolute).
 * Returns true if safe, false otherwise.
 */
export function isSafeRelativePath(targetPath: string): boolean {
  const normalized = path.normalize(targetPath);

  if (normalized.includes("..")) {
    return false;
  }

  if (path.isAbsolute(targetPath)) {
    return false;
  }

  return true;
}

/**
 * Safely resolves a relative path against a working directory.
 * Validates the path before joining to prevent traversal attacks.
 */
export function resolveRelativePath(
  relativePath: string,
  workdir: string = process.cwd()
): string {
  const normalized = normalizeAndValidate(relativePath, false);
  return path.join(workdir, normalized);
}

/**
 * Safely joins multiple path segments.
 * Validates that no intermediate segment contains traversal sequences.
 */
export function joinSafe(...paths: string[]): string {
  for (const segment of paths) {
    if (path.normalize(segment).includes("..")) {
      throw new UnsafePathError(segment, "Path segment contains traversal");
    }
  }
  return path.join(...paths);
}

/**
 * Gets the directory name of a path after validation.
 */
export function getSafeDirname(targetPath: string): string {
  normalizeAndValidate(targetPath, false);
  return path.dirname(targetPath);
}

/**
 * Gets the basename of a path after validation.
 */
export function getSafeBasename(targetPath: string): string {
  normalizeAndValidate(targetPath, false);
  return path.basename(targetPath);
}

/**
 * Validates a rename operation's destination path.
 * Returns null if safe, otherwise returns an error message.
 */
export function validateRenameDestination(
  newPath: string,
  blocklist: string[] = []
): string | null {
  try {
    normalizeAndValidate(newPath, false);
  } catch (err) {
    if (err instanceof UnsafePathError) {
      return err.reason;
    }
    return "Invalid destination path";
  }
  return null;
}

/**
 * Strips a working directory prefix from an absolute path to make it relative.
 * Returns null if the path is not within the working directory.
 */
export function makeRelativeToWorkdir(
  absolutePath: string,
  workdir: string = process.cwd()
): string | null {
  const resolvedWorkdir = path.resolve(workdir);
  const resolvedPath = path.resolve(absolutePath);

  // Check if path is within workdir
  if (
    !resolvedPath.startsWith(resolvedWorkdir + path.sep) &&
    resolvedPath !== resolvedWorkdir
  ) {
    return null;
  }

  return path.relative(resolvedWorkdir, resolvedPath);
}

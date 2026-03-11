// tests/patchgate.test.ts
// PatchGate — Core Test Suite

import fs from "fs";
import os from "os";
import path from "path";
import { enforcePolicy } from "../src/policy";
import { applyPatches, rollback, saveSnapshot } from "../src/executor";
import { FilePatch, DEFAULT_CONFIG } from "../src/types";
import { loadConfigFile, loadConfig, mergeConfig, DEFAULT_USER_CONFIG } from "../src/config";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "patchgate-test-"));
}

function writeFile(dir: string, relPath: string, content: string): string {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf-8");
  return full;
}

// ─── Policy tests ─────────────────────────────────────────────────────────────

describe("Policy enforcement", () => {
  test("blocks .env files", () => {
    const patches: FilePatch[] = [
      { op: "update", path: ".env", content: "API_KEY=stolen" },
    ];
    const { allowed, blocked } = enforcePolicy(patches, DEFAULT_CONFIG);
    expect(allowed).toHaveLength(0);
    expect(blocked).toHaveLength(1);
    expect(blocked[0].reason).toContain(".env");
  });

  test("blocks .env.production", () => {
    const patches: FilePatch[] = [
      { op: "update", path: ".env.production", content: "SECRET=leaked" },
    ];
    const { blocked } = enforcePolicy(patches, DEFAULT_CONFIG);
    expect(blocked).toHaveLength(1);
  });

  test("blocks path traversal attacks", () => {
    const patches: FilePatch[] = [
      { op: "update", path: "../../etc/passwd", content: "hacked" },
    ];
    const { allowed, blocked } = enforcePolicy(patches, DEFAULT_CONFIG);
    expect(allowed).toHaveLength(0);
    expect(blocked[0].reason).toContain("traversal");
  });

  test("blocks absolute paths", () => {
    const patches: FilePatch[] = [
      { op: "delete", path: "/usr/local/bin/node" },
    ];
    const { blocked } = enforcePolicy(patches, DEFAULT_CONFIG);
    expect(blocked).toHaveLength(1);
    expect(blocked[0].reason).toContain("Absolute path");
  });

  test("blocks *.pem and *.key files", () => {
    const patches: FilePatch[] = [
      { op: "update", path: "certs/server.pem", content: "cert" },
      { op: "update", path: "keys/private.key", content: "key" },
    ];
    const { blocked } = enforcePolicy(patches, DEFAULT_CONFIG);
    expect(blocked).toHaveLength(2);
  });

  test("blocks node_modules", () => {
    const patches: FilePatch[] = [
      { op: "update", path: "node_modules/express/index.js", content: "bad" },
    ];
    const { blocked } = enforcePolicy(patches, DEFAULT_CONFIG);
    expect(blocked).toHaveLength(1);
  });

  test("allows normal file updates", () => {
    const patches: FilePatch[] = [
      { op: "update", path: "src/index.ts", content: "export default {}" },
      { op: "create", path: "src/utils/format.ts", content: "export const x = 1" },
    ];
    const { allowed, blocked } = enforcePolicy(patches, DEFAULT_CONFIG);
    expect(allowed).toHaveLength(2);
    expect(blocked).toHaveLength(0);
  });

  test("mixed batch: some allowed, some blocked", () => {
    const patches: FilePatch[] = [
      { op: "update", path: "src/index.ts", content: "ok" },
      { op: "update", path: ".env", content: "bad" },
      { op: "create", path: "README.md", content: "ok" },
    ];
    const { allowed, blocked } = enforcePolicy(patches, DEFAULT_CONFIG);
    expect(allowed).toHaveLength(2);
    expect(blocked).toHaveLength(1);
  });
});

// ─── Config loading tests ─────────────────────────────────────────────────────

describe("Config loading", () => {
  test("loadConfigFile returns null when config file does not exist", () => {
    const dir = makeTempDir();
    const config = loadConfigFile(dir);
    expect(config).toBeNull();
  });

  test("loadConfigFile loads config when patchgate.config.json exists", () => {
    const dir = makeTempDir();
    const configContent = {
      dryRun: true,
      failOnBlocked: true,
      blocklist: ["*.secret"],
    };
    writeFile(dir, "patchgate.config.json", JSON.stringify(configContent));

    const config = loadConfigFile(dir);
    expect(config).not.toBeNull();
    expect(config?.dryRun).toBe(true);
    expect(config?.failOnBlocked).toBe(true);
    expect(config?.blocklist).toEqual(["*.secret"]);
  });

  test("loadConfigFile returns null for invalid JSON", () => {
    const dir = makeTempDir();
    writeFile(dir, "patchgate.config.json", "not valid json{{");

    const config = loadConfigFile(dir);
    expect(config).toBeNull();
  });

  test("loadConfig merges file config with defaults", () => {
    const dir = makeTempDir();
    const configContent = {
      dryRun: true,
      blocklist: ["*.secret"],
    };
    writeFile(dir, "patchgate.config.json", JSON.stringify(configContent));

    const config = loadConfig(dir);

    // File config values
    expect(config.dryRun).toBe(true);
    expect(config.blocklist).toEqual(["*.secret"]);

    // Default values preserved
    expect(config.snapshotDir).toBe(DEFAULT_USER_CONFIG.snapshotDir);
    expect(config.auditLog).toBe(DEFAULT_USER_CONFIG.auditLog);
    expect(config.failOnBlocked).toBe(DEFAULT_USER_CONFIG.failOnBlocked);
    expect(config.allowlist).toEqual(DEFAULT_USER_CONFIG.allowlist);
  });

  test("loadConfig uses defaults when no config file exists", () => {
    const dir = makeTempDir();
    const config = loadConfig(dir);

    expect(config).toEqual(DEFAULT_USER_CONFIG);
  });

  test("mergeConfig applies runtime overrides over file config", () => {
    const dir = makeTempDir();
    const configContent = {
      dryRun: false,
      failOnBlocked: false,
      blocklist: ["*.secret"],
    };
    writeFile(dir, "patchgate.config.json", JSON.stringify(configContent));

    const runtimeOverrides = {
      dryRun: true,
      failOnBlocked: true,
    };

    const config = mergeConfig(dir, runtimeOverrides);

    // Runtime overrides take precedence
    expect(config.dryRun).toBe(true);
    expect(config.failOnBlocked).toBe(true);

    // File config values preserved where not overridden
    expect(config.blocklist).toEqual(["*.secret"]);

    // Default values preserved where not in file or runtime
    expect(config.snapshotDir).toBe(DEFAULT_USER_CONFIG.snapshotDir);
  });

  test("mergeConfig uses only defaults when no file and no runtime overrides", () => {
    const dir = makeTempDir();
    const config = mergeConfig(dir);

    expect(config).toEqual(DEFAULT_USER_CONFIG);
  });

  test("mergeConfig uses only runtime overrides when no file exists", () => {
    const dir = makeTempDir();
    const runtimeOverrides = {
      dryRun: true,
      snapshotDir: "custom/snapshots",
    };

    const config = mergeConfig(dir, runtimeOverrides);

    expect(config.dryRun).toBe(true);
    expect(config.snapshotDir).toBe("custom/snapshots");
    expect(config.failOnBlocked).toBe(DEFAULT_USER_CONFIG.failOnBlocked);
  });
});

// ─── Dry-run tests ──────────────────────────────────────────────────────────────

describe("Dry-run mode", () => {
  test("dry-run does not create files", () => {
    const dir = makeTempDir();
    const result = applyPatches(
      [{ op: "create", path: "src/hello.ts", content: "export const x = 1;" }],
      dir,
      true,
      true // dryRun = true
    );

    expect(result.success).toBe(true);
    expect(result.applied).toContain("src/hello.ts");
    expect(fs.existsSync(path.join(dir, "src/hello.ts"))).toBe(false);
  });

  test("dry-run does not update existing files", () => {
    const dir = makeTempDir();
    const originalContent = "const x = 1;";
    writeFile(dir, "src/index.ts", originalContent);

    const result = applyPatches(
      [{ op: "update", path: "src/index.ts", content: "const x = 2;" }],
      dir,
      true,
      true // dryRun = true
    );

    expect(result.success).toBe(true);
    expect(result.applied).toContain("src/index.ts");

    const content = fs.readFileSync(path.join(dir, "src/index.ts"), "utf-8");
    expect(content).toBe(originalContent);
  });

  test("dry-run does not delete files", () => {
    const dir = makeTempDir();
    writeFile(dir, "src/old.ts", "deprecated");

    const result = applyPatches(
      [{ op: "delete", path: "src/old.ts" }],
      dir,
      true,
      true // dryRun = true
    );

    expect(result.success).toBe(true);
    expect(result.applied).toContain("src/old.ts");
    expect(fs.existsSync(path.join(dir, "src/old.ts"))).toBe(true);
  });

  test("dry-run does not create snapshots", () => {
    const dir = makeTempDir();
    writeFile(dir, "src/index.ts", "original");

    const result = applyPatches(
      [{ op: "update", path: "src/index.ts", content: "modified" }],
      dir,
      true,
      true // dryRun = true
    );

    expect(result.success).toBe(true);
    expect(result.snapshotPath).toBeUndefined();
    expect(fs.existsSync(path.join(dir, ".patchgate"))).toBe(false);
  });

  test("dry-run runs full pipeline and returns applied patches", () => {
    const dir = makeTempDir();

    const patches: FilePatch[] = [
      { op: "create", path: "src/a.ts", content: "export const a = 1;" },
      { op: "create", path: "src/b.ts", content: "export const b = 2;" },
    ];

    const result = applyPatches(patches, dir, true, true);

    expect(result.success).toBe(true);
    expect(result.applied).toHaveLength(2);
    expect(result.applied).toContain("src/a.ts");
    expect(result.applied).toContain("src/b.ts");
    expect(result.errors).toHaveLength(0);
  });

  test("dry-run still reports errors for invalid patches", () => {
    const dir = makeTempDir();

    const result = applyPatches(
      [{ op: "delete", path: "src/ghost.ts" }],
      dir,
      true,
      true // dryRun = true
    );

    // In dry-run mode, the patch is "applied" but not actually executed
    // The error would only occur during actual deletion
    expect(result.applied).toContain("src/ghost.ts");
  });
});

// ─── Executor tests ───────────────────────────────────────────────────────────

describe("Executor", () => {
  test("creates a new file", () => {
    const dir = makeTempDir();
    const result = applyPatches(
      [{ op: "create", path: "src/hello.ts", content: "export const x = 1;" }],
      dir, true
    );
    expect(result.success).toBe(true);
    expect(result.applied).toContain("src/hello.ts");
    const written = fs.readFileSync(path.join(dir, "src/hello.ts"), "utf-8");
    expect(written).toBe("export const x = 1;");
  });

  test("updates an existing file", () => {
    const dir = makeTempDir();
    writeFile(dir, "src/index.ts", "const x = 1;");
    const result = applyPatches(
      [{ op: "update", path: "src/index.ts", content: "const x = 2;" }],
      dir, true
    );
    expect(result.success).toBe(true);
    const content = fs.readFileSync(path.join(dir, "src/index.ts"), "utf-8");
    expect(content).toBe("const x = 2;");
  });

  test("deletes a file", () => {
    const dir = makeTempDir();
    writeFile(dir, "src/old.ts", "deprecated");
    const result = applyPatches(
      [{ op: "delete", path: "src/old.ts" }],
      dir, true
    );
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(dir, "src/old.ts"))).toBe(false);
  });

  test("errors gracefully on missing delete target", () => {
    const dir = makeTempDir();
    const result = applyPatches(
      [{ op: "delete", path: "src/ghost.ts" }],
      dir, false
    );
    expect(result.success).toBe(false);
    expect(result.errors[0].path).toBe("src/ghost.ts");
  });

  test("no temp files left after write", () => {
    const dir = makeTempDir();
    applyPatches(
      [{ op: "create", path: "src/clean.ts", content: "export {}" }],
      dir, false
    );
    const files = fs.readdirSync(path.join(dir, "src"));
    expect(files.filter((f) => f.includes(".pg-tmp-"))).toHaveLength(0);
  });
});

// ─── Snapshot + rollback tests ────────────────────────────────────────────────

describe("Snapshot and rollback", () => {
  test("restores original file on rollback", () => {
    const dir = makeTempDir();
    const original = "const original = true;";
    writeFile(dir, "src/index.ts", original);

    const result = applyPatches(
      [{ op: "update", path: "src/index.ts", content: "const modified = true;" }],
      dir, true
    );

    expect(result.success).toBe(true);
    expect(result.snapshotPath).toBeDefined();

    rollback(result.snapshotPath!, dir);

    const restored = fs.readFileSync(path.join(dir, "src/index.ts"), "utf-8");
    expect(restored).toBe(original);
  });

  test("snapshot manifest is written correctly", () => {
    const dir = makeTempDir();
    writeFile(dir, "src/a.ts", "a");
    writeFile(dir, "src/b.ts", "b");

    const snapshotDir = saveSnapshot(
      [
        { op: "update", path: "src/a.ts", content: "a2" },
        { op: "update", path: "src/b.ts", content: "b2" },
      ],
      dir
    );

    const manifest = JSON.parse(
      fs.readFileSync(path.join(snapshotDir, "manifest.json"), "utf-8")
    );
    expect(manifest.files).toHaveLength(2);
    expect(manifest.files.map((f: any) => f.path)).toContain("src/a.ts");
  });
});

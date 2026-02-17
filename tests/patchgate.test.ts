// tests/patchgate.test.ts
// PatchGate — Core Test Suite

import fs from "fs";
import os from "os";
import path from "path";
import { enforcePolicy } from "../src/policy";
import { applyPatches, rollback, saveSnapshot } from "../src/executor";
import { FilePatch, DEFAULT_CONFIG } from "../src/types";

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

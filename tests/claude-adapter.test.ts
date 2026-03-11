import fs from "fs";
import path from "path";
import { createClaudeFileTools } from "../src/adapters/claude/fileTools";

describe("Claude Adapter", () => {
  const testDir = path.join(__dirname, "tmp-claude");

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, ".env"), "SECRET=123");
    fs.mkdirSync(path.join(testDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(testDir, "src/index.ts"), "export const x = 1;");
    fs.writeFileSync(path.join(testDir, "delete-me.txt"), "delete this file");
    fs.writeFileSync(path.join(testDir, "rename-me.txt"), "rename this file");
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Reset test files before each test
    fs.writeFileSync(path.join(testDir, "src/index.ts"), "export const x = 1;");
    if (fs.existsSync(path.join(testDir, "delete-me.txt"))) {
      fs.writeFileSync(path.join(testDir, "delete-me.txt"), "delete this file");
    }
    if (!fs.existsSync(path.join(testDir, "rename-me.txt"))) {
      fs.writeFileSync(path.join(testDir, "rename-me.txt"), "rename this file");
    }
    // Clean up renamed file if it exists from previous test
    if (fs.existsSync(path.join(testDir, "renamed.txt"))) {
      fs.rmSync(path.join(testDir, "renamed.txt"));
    }
  });

  describe("patchgate_write_file", () => {
    test("blocks .env writes", async () => {
      const tools = createClaudeFileTools({ workdir: testDir });
      const writeTool = tools.find(t => t.name === "patchgate_write_file");
      expect(writeTool).toBeDefined();

      const result = await writeTool!.execute({
        path: ".env",
        content: "HACKED"
      });

      expect(result.ok).toBe(false);
      expect(result.blocked.length).toBeGreaterThan(0);
    });

    test("allows safe src writes", async () => {
      const tools = createClaudeFileTools({ workdir: testDir });
      const writeTool = tools.find(t => t.name === "patchgate_write_file");
      expect(writeTool).toBeDefined();

      const result = await writeTool!.execute({
        path: "src/index.ts",
        content: "export const x = 999;"
      });

      expect(result.ok).toBe(true);
      expect(result.applied).toContain("src/index.ts");
    });

    test("creates new files", async () => {
      const tools = createClaudeFileTools({ workdir: testDir });
      const writeTool = tools.find(t => t.name === "patchgate_write_file");
      expect(writeTool).toBeDefined();

      const newFilePath = "src/new-file.ts";
      const result = await writeTool!.execute({
        path: newFilePath,
        content: "export const newVar = 'hello';"
      });

      expect(result.ok).toBe(true);
      expect(result.applied).toContain(newFilePath);
      expect(fs.existsSync(path.join(testDir, newFilePath))).toBe(true);
      expect(fs.readFileSync(path.join(testDir, newFilePath), "utf-8")).toBe("export const newVar = 'hello';");

      // Cleanup
      fs.rmSync(path.join(testDir, newFilePath));
    });
  });

  describe("patchgate_delete_file", () => {
    test("blocks .env deletion", async () => {
      const tools = createClaudeFileTools({ workdir: testDir });
      const deleteTool = tools.find(t => t.name === "patchgate_delete_file");
      expect(deleteTool).toBeDefined();

      const result = await deleteTool!.execute({
        path: ".env"
      });

      expect(result.ok).toBe(false);
      expect(result.blocked.length).toBeGreaterThan(0);
      // File should still exist
      expect(fs.existsSync(path.join(testDir, ".env"))).toBe(true);
    });

    test("allows safe file deletion", async () => {
      const tools = createClaudeFileTools({ workdir: testDir });
      const deleteTool = tools.find(t => t.name === "patchgate_delete_file");
      expect(deleteTool).toBeDefined();

      const result = await deleteTool!.execute({
        path: "delete-me.txt"
      });

      expect(result.ok).toBe(true);
      expect(result.applied).toContain("delete-me.txt");
      expect(fs.existsSync(path.join(testDir, "delete-me.txt"))).toBe(false);
    });
  });

  describe("patchgate_rename_file", () => {
    test("blocks .env rename", async () => {
      const tools = createClaudeFileTools({ workdir: testDir });
      const renameTool = tools.find(t => t.name === "patchgate_rename_file");
      expect(renameTool).toBeDefined();

      const result = await renameTool!.execute({
        path: ".env",
        newPath: ".env.backup"
      });

      expect(result.ok).toBe(false);
      expect(result.blocked.length).toBeGreaterThan(0);
      // Original file should still exist
      expect(fs.existsSync(path.join(testDir, ".env"))).toBe(true);
    });

    test("allows safe file rename", async () => {
      const tools = createClaudeFileTools({ workdir: testDir });
      const renameTool = tools.find(t => t.name === "patchgate_rename_file");
      expect(renameTool).toBeDefined();

      const result = await renameTool!.execute({
        path: "rename-me.txt",
        newPath: "renamed.txt"
      });

      expect(result.ok).toBe(true);
      expect(result.applied.length).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(testDir, "rename-me.txt"))).toBe(false);
      expect(fs.existsSync(path.join(testDir, "renamed.txt"))).toBe(true);
      expect(fs.readFileSync(path.join(testDir, "renamed.txt"), "utf-8")).toBe("rename this file");
    });
  });

  describe("policy enforcement through adapter", () => {
    test("path traversal attempts are blocked", async () => {
      const tools = createClaudeFileTools({ workdir: testDir });
      const writeTool = tools.find(t => t.name === "patchgate_write_file");
      expect(writeTool).toBeDefined();

      const result = await writeTool!.execute({
        path: "../outside.txt",
        content: "malicious"
      });

      expect(result.ok).toBe(false);
      expect(result.blocked.length).toBeGreaterThan(0);
    });

    test("multiple operations in sequence respect policy", async () => {
      const tools = createClaudeFileTools({ workdir: testDir });
      const writeTool = tools.find(t => t.name === "patchgate_write_file");
      const deleteTool = tools.find(t => t.name === "patchgate_delete_file");
      expect(writeTool).toBeDefined();
      expect(deleteTool).toBeDefined();

      // Write a file
      const writeResult = await writeTool!.execute({
        path: "src/temp.txt",
        content: "temporary"
      });
      expect(writeResult.ok).toBe(true);

      // Try to write to .env (should be blocked)
      const blockedWriteResult = await writeTool!.execute({
        path: ".env",
        content: "blocked"
      });
      expect(blockedWriteResult.ok).toBe(false);

      // Delete the temp file (should succeed)
      const deleteResult = await deleteTool!.execute({
        path: "src/temp.txt"
      });
      expect(deleteResult.ok).toBe(true);

      // Cleanup if temp file still exists
      if (fs.existsSync(path.join(testDir, "src/temp.txt"))) {
        fs.rmSync(path.join(testDir, "src/temp.txt"));
      }
    });
  });
});

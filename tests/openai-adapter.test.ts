import fs from "fs";
import path from "path";
import { createPatchGateFileTools } from "../src/adapters/openai/fileTools";

describe("OpenAI Adapter", () => {
  const testDir = path.join(__dirname, "tmp-openai");

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, ".env"), "SECRET=123");
    fs.mkdirSync(path.join(testDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(testDir, "src/index.ts"), "export const x = 1;");
  });

  test("blocks .env writes", async () => {
    const tools = createPatchGateFileTools({ workdir: testDir });
    const writeTool = tools.find(t => t.function.name === "patchgate_write_file");

    const result = await writeTool!.execute({
      path: ".env",
      content: "HACKED"
    });

    expect(result.ok).toBe(false);
    expect(result.blocked.length).toBeGreaterThan(0);
  });

  test("allows safe src writes", async () => {
    const tools = createPatchGateFileTools({ workdir: testDir });
    const writeTool = tools.find(t => t.function.name === "patchgate_write_file");

    const result = await writeTool!.execute({
      path: "src/index.ts",
      content: "export const x = 999;"
    });

    expect(result.ok).toBe(true);
    expect(result.applied).toContain("src/index.ts");
  });
});

import fs from "fs";
import path from "path";
import { run } from "../src";

describe("Real-World Agent Simulation", () => {
  const tmpDir = path.join(__dirname, "tmp-agent");

  beforeEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    fs.writeFileSync(path.join(tmpDir, "src.txt"), "SAFE=1");
    fs.writeFileSync(path.join(tmpDir, ".env"), "SECRET=123");
  });

  test("Agent cannot overwrite .env", async () => {
    const result = await run(
      {
        source: "agent",
        patches: [
          {
            op: "update",
            path: ".env",
            content: "HACKED=YES",
          },
        ],
      },
      { workdir: tmpDir }
    );

    expect(result.blocked.length).toBe(1);
    expect(fs.readFileSync(path.join(tmpDir, ".env"), "utf8")).toContain(
      "SECRET=123"
    );
  });

  test("Agent can safely edit normal files", async () => {
    const result = await run(
      {
        source: "agent",
        patches: [
          {
            op: "update",
            path: "src.txt",
            content: "SAFE=999",
          },
        ],
      },
      { workdir: tmpDir }
    );

    expect(result.applied).toContain("src.txt");
    expect(fs.readFileSync(path.join(tmpDir, "src.txt"), "utf8")).toContain(
      "SAFE=999"
    );
  });

  test("CI mode fails if blocked patch exists", async () => {
    const result = await run(
      {
        source: "ci-agent",
        patches: [
          {
            op: "update",
            path: ".env",
            content: "BAD",
          },
        ],
      },
      {
        workdir: tmpDir,
        config: {
          failOnBlocked: true,
        },
      }
    );

    expect(result.success).toBe(false);
    expect(result.blocked.length).toBeGreaterThan(0);
  });
});

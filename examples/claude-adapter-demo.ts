// examples/claude-adapter-demo.ts
// PatchGate Claude Adapter — Usage Example
// This shows how to use PatchGate with Anthropic Claude tool_use format

import { createClaudeFileTools } from "../src/adapters/claude/fileTools";

// Example 1: Basic usage
async function basicExample() {
  const tools = createClaudeFileTools({
    source: "my-claude-agent",
  });

  console.log("Created Claude tools:", tools.map((t: { name: string }) => t.name));

  // Get the write tool
  const writeTool = tools.find((t: { name: string }) => t.name === "patchgate_write_file");
  if (!writeTool) {
    throw new Error("Write tool not found");
  }

  // Simulate a Claude tool_use call
  const writeResult = await writeTool.execute({
    path: "test-output-claude.txt",
    content: "Hello from PatchGate + Claude!",
  });

  console.log("Write result:", writeResult);
}

// Example 2: With user approval required
async function approvalExample() {
  const tools = createClaudeFileTools({
    source: "careful-claude-agent",
    requireApproval: true,  // User must approve each change
  });

  const writeTool = tools.find((t: { name: string }) => t.name === "patchgate_write_file");
  if (!writeTool) {
    throw new Error("Write tool not found");
  }

  // This will prompt the user before writing
  const result = await writeTool.execute({
    path: "src/index.ts",
    content: "export const x = 2;",
  });

  console.log("Result:", result);
}

// Example 3: Using all three tools
async function allToolsExample() {
  const tools = createClaudeFileTools({
    source: "claude-file-manager",
  });

  const writeTool = tools.find((t: { name: string }) => t.name === "patchgate_write_file");
  const deleteTool = tools.find((t: { name: string }) => t.name === "patchgate_delete_file");
  const renameTool = tools.find((t: { name: string }) => t.name === "patchgate_rename_file");

  if (!writeTool || !deleteTool || !renameTool) {
    throw new Error("Missing tools");
  }

  // Write a file
  console.log("\n--- Writing file ---");
  const writeResult = await writeTool.execute({
    path: "demo-file.txt",
    content: "This is a demo file created by Claude adapter.",
  });
  console.log("Write result:", writeResult);

  // Rename the file
  console.log("\n--- Renaming file ---");
  const renameResult = await renameTool.execute({
    path: "demo-file.txt",
    newPath: "renamed-demo-file.txt",
  });
  console.log("Rename result:", renameResult);

  // Delete the file
  console.log("\n--- Deleting file ---");
  const deleteResult = await deleteTool.execute({
    path: "renamed-demo-file.txt",
  });
  console.log("Delete result:", deleteResult);
}

// Example 4: Policy enforcement demo
async function policyEnforcementExample() {
  const tools = createClaudeFileTools({
    source: "claude-security-test",
  });

  const writeTool = tools.find((t: { name: string }) => t.name === "patchgate_write_file");
  if (!writeTool) {
    throw new Error("Write tool not found");
  }

  // Try to write to .env (should be blocked)
  console.log("\n--- Attempting to write to .env (should be blocked) ---");
  const blockedResult = await writeTool.execute({
    path: ".env",
    content: "SECRET_KEY=compromised",
  });
  console.log("Blocked result:", blockedResult);
  console.log("File was blocked:", !blockedResult.ok);

  // Write to a safe location (should succeed)
  console.log("\n--- Writing to safe location (should succeed) ---");
  const safeResult = await writeTool.execute({
    path: "src/safe-file.ts",
    content: "export const safe = true;",
  });
  console.log("Safe result:", safeResult);
  console.log("File was written:", safeResult.ok);
}

// Example 5: Integration with Anthropic SDK (pseudocode)
/*
import Anthropic from "@anthropic-ai/sdk";
import { createClaudeFileTools } from "patchgate";

const client = new Anthropic();
const tools = createClaudeFileTools();

// Format tools for Claude API
const claudeTools = tools.map(t => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema,
}));

const response = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Create a new file src/hello.ts with a greeting function" }
  ],
  tools: claudeTools,
});

// When Claude uses a tool, execute it through PatchGate:
if (response.content && response.content.length > 0) {
  for (const block of response.content) {
    if (block.type === "tool_use") {
      const tool = tools.find(t => t.name === block.name);
      if (tool) {
        const result = await tool.execute(block.input);
        console.log("PatchGate result:", result);
      }
    }
  }
}
*/

// Run examples
if (require.main === module) {
  console.log("=== PatchGate Claude Adapter Demo ===\n");

  basicExample()
    .then(() => allToolsExample())
    .then(() => policyEnforcementExample())
    .then(() => console.log("\n=== Demo complete ==="))
    .catch(console.error);
}

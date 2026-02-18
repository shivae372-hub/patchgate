// examples/openai-adapter-demo.ts
// PatchGate OpenAI Adapter — Usage Example
// This shows how to use PatchGate with OpenAI function calling

import { createPatchGateFileTools } from "../src/adapters/openai";

// Example 1: Basic usage
async function basicExample() {
  const tools = createPatchGateFileTools({
    source: "my-openai-agent",
  });

  console.log("Created tools:", tools.map(t => t.function.name));

  // Simulate an OpenAI function call
  const writeResult = await tools[0].execute({
    path: "test-output.txt",
    content: "Hello from PatchGate + OpenAI!",
  });

  console.log("Write result:", writeResult);
}

// Example 2: With user approval required
async function approvalExample() {
  const tools = createPatchGateFileTools({
    source: "careful-agent",
    requireApproval: true,  // User must approve each change
  });

  // This will prompt the user before writing
  const result = await tools[0].execute({
    path: "src/index.ts",
    content: "export const x = 2;",
  });

  console.log("Result:", result);
}

// Example 3: Integration with OpenAI SDK (pseudocode)
/*
import OpenAI from "openai";
import { createPatchGateFileTools } from "patchgate";

const client = new OpenAI();
const tools = createPatchGateFileTools();

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "user", content: "Create a new file src/hello.ts with a greeting function" }
  ],
  tools: tools.map(t => ({
    type: t.type,
    function: {
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }
  })),
});

// When OpenAI calls a tool, execute it through PatchGate:
if (response.choices[0].message.tool_calls) {
  for (const toolCall of response.choices[0].message.tool_calls) {
    const tool = tools.find(t => t.function.name === toolCall.function.name);
    if (tool) {
      const result = await tool.execute(JSON.parse(toolCall.function.arguments));
      console.log("PatchGate result:", result);
    }
  }
}
*/

// Run examples
if (require.main === module) {
  basicExample().catch(console.error);
}

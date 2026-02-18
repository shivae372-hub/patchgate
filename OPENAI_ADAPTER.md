# OpenAI Adapter — PatchGate Filesystem Firewall

PatchGate ships with a production-ready OpenAI function calling adapter.

This makes OpenAI agents safe by default:

- Blocks `.env`, secrets, traversal attacks  
- Applies writes atomically  
- Creates rollback snapshots  
- Logs everything to `.patchgate/audit.log`

---

## Quick Start

Install:

```
npm install patchgate
```
Create OpenAI Tools
```
import { createPatchGateFileTools } from "patchgate";

const tools = createPatchGateFileTools({
  source: "openai-agent"
});
```
This provides 3 safe filesystem tools:

patchgate_write_file

patchgate_delete_file

patchgate_rename_file

Using with OpenAI Function Calling
```
import OpenAI from "openai";
import { createPatchGateFileTools } from "patchgate";

const client = new OpenAI();
const patchgateTools = createPatchGateFileTools();

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "user", content: "Update src/index.ts but never touch .env" }
  ],
  tools: patchgateTools.map((t) => ({
    type: "function",
    function: {
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters
    }
  }))
});
```
Executing Tool Calls Safely
```
const toolCalls = response.choices[0].message.tool_calls;

if (toolCalls) {
  for (const call of toolCalls) {
    const tool = patchgateTools.find(
      (t) => t.function.name === call.function.name
    );

    if (!tool) continue;

    const args = JSON.parse(call.function.arguments);

    const result = await tool.function.execute(args);

    if (!result.ok) {
      console.log("🚫 Blocked:", result.blocked);
    } else {
      console.log("✅ Applied:", result.applied);
    }
  }
}
```
What Happens Internally
Every OpenAI filesystem tool call becomes a PatchGate patch:

Policy check

Diff preview

Atomic apply

Snapshot saved

Audit log written

PatchGate ensures the agent cannot:

Write .env

Escape the repo (../)

Touch system paths (C:\Windows\...)

Corrupt files with partial writes

Why This Matters
Without PatchGate:

Agents write files directly

No rollback

No audit

Secrets can be overwritten

With PatchGate:

Every write is policy-gated

Rollback is instant

Logs provide compliance

Agents become safe in CI and production

PatchGate is the open safety firewall for OpenAI filesystem writes.
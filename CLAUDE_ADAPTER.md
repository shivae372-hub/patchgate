# Claude Adapter — PatchGate Filesystem Firewall

PatchGate ships with a production-ready Anthropic Claude tool_use adapter.

This makes Claude agents safe by default:

- Blocks `.env`, secrets, traversal attacks  
- Applies writes atomically  
- Creates rollback snapshots  
- Logs everything to `.patchgate/audit.log`

---

## Quick Start

Install PatchGate:

```text
npm install patchgate
```

---

## Create Claude Tools

PatchGate provides Claude-compatible filesystem tools:

```ts
import { createClaudeFileTools } from "patchgate";

const tools = createClaudeFileTools({
  source: "claude-agent"
});
```

This creates three protected tools:

* `patchgate_write_file`
* `patchgate_delete_file`
* `patchgate_rename_file`

---

## Tool Definitions

The Claude adapter returns tools in Anthropic's tool_use format:

```json
{
  "name": "patchgate_write_file",
  "description": "Write or update a file safely through PatchGate policy enforcement",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "Relative file path from project root" },
      "content": { "type": "string", "description": "Full file content to write" }
    },
    "required": ["path", "content"]
  }
}
```

```json
{
  "name": "patchgate_delete_file",
  "description": "Delete a file safely through PatchGate policy enforcement",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "Relative file path from project root" }
    },
    "required": ["path"]
  }
}
```

```json
{
  "name": "patchgate_rename_file",
  "description": "Rename a file safely through PatchGate policy enforcement",
  "input_schema": {
    "type": "object",
    "properties": {
      "oldPath": { "type": "string", "description": "Current relative file path" },
      "newPath": { "type": "string", "description": "New relative file path" }
    },
    "required": ["oldPath", "newPath"]
  }
}
```

---

## Usage Example

Example integration with the Anthropic SDK:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { createClaudeFileTools } from "patchgate";

const client = new Anthropic();

const patchgateTools = createClaudeFileTools({
  source: "claude-agent"
});

const response = await client.messages.create({
  model: "claude-3-opus-20240229",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: "Update src/index.ts but never touch .env"
    }
  ],
  tools: patchgateTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }))
});
```

---

## Executing Tool Use Safely

Claude may return tool_use blocks like:

```json
{
  "type": "tool_use",
  "id": "toolu_01Abc123",
  "name": "patchgate_write_file",
  "input": {
    "path": "src/index.ts",
    "content": "..."
  }
}
```

Execute them through PatchGate:

```ts
const contentBlocks = response.content;

for (const block of contentBlocks) {
  if (block.type !== "tool_use") continue;

  const tool = patchgateTools.find((t) => t.name === block.name);

  if (!tool) continue;

  const result = await tool.execute(block.input);

  if (!result.ok) {
    console.log("🚫 Blocked:", result.blocked);
  } else {
    console.log("✅ Applied:", result.applied);
  }
}
```

---

## Error Handling

The Claude adapter returns structured results for every tool execution:

```ts
interface ToolResult {
  ok: boolean;           // true if all patches applied successfully
  applied: FilePatch[]; // patches that were applied
  blocked: BlockedPatch[]; // patches blocked by policy
  errors: ErrorInfo[];   // any errors during execution
}

interface BlockedPatch {
  path: string;
  reason: string;        // e.g., "Path is in blocklist", "Path traversal detected"
}

interface ErrorInfo {
  path: string;
  error: string;         // error message
}
```

Handle errors gracefully:

```ts
const result = await tool.execute({ path, content });

if (!result.ok) {
  if (result.blocked.length > 0) {
    console.error("Policy blocks:");
    for (const b of result.blocked) {
      console.error(`  ${b.path}: ${b.reason}`);
    }
  }
  
  if (result.errors.length > 0) {
    console.error("Execution errors:");
    for (const e of result.errors) {
      console.error(`  ${e.path}: ${e.error}`);
    }
  }
} else {
  console.log("✅ Successfully applied:", result.applied.map(p => p.path));
}
```

---

## What Happens Internally

Every Claude filesystem tool call becomes a PatchGate patch:

* Policy check
* Diff preview
* Atomic apply
* Snapshot saved
* Audit log written

PatchGate ensures the agent cannot:

* Write `.env`
* Escape the repo (`../`)
* Touch system paths (`C:\Windows\...`)
* Corrupt files with partial writes

---

## Why This Matters

Without PatchGate:

* Agents write files directly
* No rollback
* No audit trail
* Secrets can be overwritten

With PatchGate:

* Every write is policy-gated
* Rollback is instant
* Logs provide compliance
* Agents become safe in CI and production

---

PatchGate is the open safety firewall for Claude filesystem writes.

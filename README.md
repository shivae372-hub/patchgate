# PatchGate

Safety gate for AI agent filesystem writes — policy enforcement, atomic apply, rollback, audit log.

---

## The Problem

AI coding agents write directly to your filesystem. Real failure modes that happen today:

- **Agent overwrites `.env`** with hallucinated values and breaks production API keys
- **Agent deletes config files** it "thinks" are unused, taking down services
- **Agent writes outside project directory** (`../../../etc/passwd` style traversal)
- **Agent modifies `.git` internals** and corrupts the repository
- **Half-applied patches** leave code in a broken state when the agent crashes mid-write
- **No record** of what changed or why — debugging agent behavior is guesswork

Git helps after the damage. PatchGate prevents the damage before it hits disk.

---

## How It Works

```
AI Agent ──→ JSON Patch ──→ PatchGate
                                │
        ┌───────────────────────┼───────────────────────┐
        ↓                       ↓                       ↓
   Policy Check            Diff Preview           Atomic Apply
   (block .env,            (show exactly          (temp file +
    secrets,               what changes)          rename)
    traversal)
        │                       │                       ↓
        └───────────────────────┴──────────────→  Snapshot + Audit Log
                                                      │
                                                      ↓
                                               Filesystem
                                               (only if all
                                                checks pass)
```

**Data flow:**
1. Policy engine checks every path against blocklist (`.env`, `*.pem`, `../` traversal)
2. Unified diff preview shows exactly what will change
3. Atomic write to temp file, then rename (no partial writes ever)
4. Pre-change snapshot saved to `.patchgate/snapshots/`
5. JSONL audit log entry appended to `.patchgate/audit.log`
6. On failure: automatic rollback from snapshot

---

## Installation

```bash
npm install patchgate
```

CLI usage:
```bash
npx patchgate --help
```

Global install:
```bash
npm install -g patchgate
```

Requires Node.js ≥ 18.

---

## CLI Usage

### Apply patches with safety checks

```bash
patchgate apply examples/demo-patch.json
```

Output:
```
🔍 PatchGate — Applying 3 patch(es)

── Planned Changes ─────────────────────────────────
[~] UPDATE  src/utils.ts
[+] CREATE  src/helpers/format.ts
[~] UPDATE  .env

Apply these changes? [y/N] y

🚫 Blocked by policy:
   .env — Path is in blocklist

✅ Applied:
   src/utils.ts
   src/helpers/format.ts

💾 Snapshot saved: .patchgate/snapshots/patchgate-snapshot-abc123
   To undo: patchgate rollback ".patchgate/snapshots/patchgate-snapshot-abc123"

✓ Done.
```

### Preview without writing

```bash
patchgate preview examples/demo-patch.json
```

Shows unified diff of every change without touching the filesystem.

### Rollback to snapshot

```bash
patchgate rollback ".patchgate/snapshots/patchgate-snapshot-abc123"
```

Restores all files to their pre-change state.

### View history

```bash
patchgate history
```

Displays audit log of all PatchGate operations.

### Dry-run mode

```bash
patchgate apply examples/demo-patch.json --dry-run
```

Runs full pipeline including policy checks and diff preview, but skips actual filesystem writes.

---

## Library Usage

### Basic: apply patches from code

```typescript
import { run } from "patchgate";

const result = await run({
  source: "claude-3-5-sonnet",
  patches: [
    {
      op: "update",
      path: "src/utils.ts",
      content: "export function greet(name: string) { return `Hello, ${name}`; }",
      reason: "Add greeting utility"
    },
    {
      op: "create",
      path: "src/helpers/format.ts",
      content: "export const fmt = (d: Date) => d.toISOString();",
      reason: "Date formatter"
    }
  ]
});

console.log(result.applied);  // ["src/utils.ts", "src/helpers/format.ts"]
console.log(result.blocked);  // [] — paths that failed policy check
console.log(result.snapshotPath);  // ".patchgate/snapshots/..." for rollback
```

### With user approval callback

```typescript
import { run } from "patchgate";
import * as readline from "readline";

const result = await run(
  {
    source: "gpt-4o",
    patches: [{ op: "update", path: "src/index.ts", content: "..." }]
  },
  {
    onPreview: async (diffs: string[]) => {
      console.log("Changes:");
      diffs.forEach(d => console.log(d));
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      const answer = await new Promise<string>(resolve =>
        rl.question("Apply? [y/N] ", resolve)
      );
      rl.close();
      return answer.toLowerCase() === "y";
    }
  }
);
```

### Create patch set from AI response

```typescript
import { createPatchSet } from "patchgate";

// Parse LLM output into structured patches
const patchSet = createPatchSet(
  [
    { path: "src/index.ts", content: "export const x = 1;" },
    { path: "src/lib.ts", content: "export const y = 2;" }
  ],
  "my-ai-agent"
);

// patchSet = { id: "uuid", createdAt: "...", source: "my-ai-agent", patches: [...] }
```

### Manual operations (advanced)

```typescript
import { enforcePolicy, applyPatches, rollback, generateDiff } from "patchgate";
import type { FilePatch, PatchGateConfig } from "patchgate";

// Check policy without applying
const config: Partial<PatchGateConfig> = {
  blocklist: [".env", "*.secret"]
};

const patches: FilePatch[] = [
  { op: "update", path: "src/app.ts", content: "..." },
  { op: "update", path: ".env", content: "..." }  // blocked
];

const { allowed, blocked } = enforcePolicy(patches, config);
// allowed = [{ op: "update", path: "src/app.ts", ... }]
// blocked = [{ patch: { ... }, reason: "Path is in blocklist" }]

// Apply without the full run() wrapper
const result = applyPatches(allowed, process.cwd(), true, false);

// Rollback manually
rollback(".patchgate/snapshots/patchgate-snapshot-abc123");
```

---

## OpenAI Adapter

Drop-in function calling tools for OpenAI agents. See full docs in `OPENAI_ADAPTER.md`.

```typescript
import OpenAI from "openai";
import { createPatchGateFileTools } from "patchgate";

const client = new OpenAI();
const tools = createPatchGateFileTools({ source: "openai-agent" });

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Create src/hello.ts with a greet function" }],
  tools: tools.map(t => ({
    type: "function",
    function: {
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters
    }
  }))
});

// Execute tool calls through PatchGate
if (response.choices[0].message.tool_calls) {
  for (const call of response.choices[0].message.tool_calls) {
    const tool = tools.find(t => t.function.name === call.function.name);
    if (tool) {
      const result = await tool.function.execute(JSON.parse(call.function.arguments));
      console.log(result.ok ? "Applied" : "Blocked", result.applied, result.blocked);
    }
  }
}
```

Three tools provided:
- `patchgate_write_file` — create or update file
- `patchgate_delete_file` — delete file with snapshot
- `patchgate_rename_file` — rename/move file with snapshot

See `examples/openai-adapter-demo.ts` for complete example.

---

## Claude Adapter

Drop-in tool_use tools for Anthropic Claude agents. See full docs in `CLAUDE_ADAPTER.md`.

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createClaudeFileTools } from "patchgate";

const client = new Anthropic();
const tools = createClaudeFileTools({ source: "claude-agent" });

const response = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 4096,
  messages: [{ role: "user", content: "Update src/index.ts but never touch .env" }],
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }))
});

// Execute tool_use blocks through PatchGate
for (const block of response.content) {
  if (block.type !== "tool_use") continue;
  const tool = tools.find(t => t.name === block.name);
  if (tool) {
    const result = await tool.execute(block.input);
    console.log(result.ok ? "Applied" : "Blocked", result.applied, result.blocked);
  }
}
```

Three tools provided:
- `patchgate_write_file` — create or update file
- `patchgate_delete_file` — delete file with snapshot
- `patchgate_rename_file` — rename/move file with snapshot

See `examples/claude-adapter-demo.ts` for complete example.

---

## Config Reference

Create `patchgate.config.json` in project root:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `blocklist` | `string[]` | `[".env", ".env.*", "*.pem", "*.key", "node_modules/**", ".git/**"]` | Glob patterns for files PatchGate will never touch |
| `allowlist` | `string[]` | `[]` | Patterns to always allow (checked first) |
| `snapshotDir` | `string` | `.patchgate/snapshots` | Where snapshots are saved |
| `auditLog` | `string` | `.patchgate/audit.log` | Path to audit log file |
| `failOnBlocked` | `boolean` | `false` | CI mode: exit with error if any patch is blocked |
| `dryRun` | `boolean` | `false` | Simulate without writing to disk |

Example `patchgate.config.json`:

```json
{
  "blocklist": [".env", "*.secret", "credentials.json"],
  "failOnBlocked": true,
  "dryRun": false
}
```

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Policy engine | ✅ Working | Blocklist patterns, path traversal detection |
| Atomic writes | ✅ Working | Temp file + rename, never partial |
| Snapshot + rollback | ✅ Working | Full restore from any snapshot |
| Audit logging | ✅ Working | JSONL format with timestamps |
| Diff preview | ✅ Working | Unified diff before any write |
| CLI | ✅ Working | `apply`, `preview`, `rollback`, `history`, `--dry-run` |
| Config auto-loading | ✅ Working | Reads `patchgate.config.json` automatically |
| Dry-run mode | ✅ Working | Full pipeline simulation |
| OpenAI adapter | ✅ Working | Function calling tools |
| Claude adapter | ✅ Working | Tool_use tools |
| Directory operations | ❌ Not built | `mkdir`, `rmdir` planned for v0.5 |
| Plugin system | ❌ Not built | Custom policy rules planned for v0.6 |

---

## License

MIT


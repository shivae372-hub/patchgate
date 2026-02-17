# PatchGate

![CI](https://github.com/YOUR_USERNAME/patchgate/actions/workflows/ci.yml/badge.svg)
![npm](https://img.shields.io/npm/v/patchgate)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

**Policy enforcement and rollback for AI agent code edits.**

> Open patch approval layer for AI agent frameworks.
> Not a competitor to Cursor. The layer underneath everything.

---

## The Problem

Every AI coding tool — agents built on LangGraph, Claude, GPT, local LLMs —
eventually needs to write changes to your filesystem.

Most just do it. No policy check. No preview. No rollback.

One bad prompt, one hallucination, one prompt injection — and your `.env` is gone,
your `src/` is overwritten, or worse.

**PatchGate is the missing layer between your AI agent and your filesystem.**

---

## Demo

```bash
$ patchgate apply examples/demo-patch.json

🔍 PatchGate — Applying 3 patch(es)

── Planned Changes ──────────────────────────────────
[~] UPDATE  src/utils.ts
[+] CREATE  src/helpers/format.ts  (4 lines)
[~] UPDATE  .env
────────────────────────────────────────────────────

Apply these changes? [y/N] y

🚫 Blocked by policy:
   .env — Blocked by policy pattern ".env.*"

✅ Applied:
   src/utils.ts
   src/helpers/format.ts

💾 Snapshot saved: .patchgate/snapshots/patchgate-snapshot-xxx
   To undo: patchgate rollback ".patchgate/snapshots/patchgate-snapshot-xxx"

✓ Done.
```

**The .env file was never touched. Everything is logged.**

---

## Install

```bash
npm install patchgate
```

CLI:

```bash
npm install -g patchgate
```

---

## Usage

### As a library (in your agent)

```typescript
import { run } from "patchgate";

const result = await run({
  source: "my-agent",
  patches: [
    {
      op: "update",
      path: "src/index.ts",
      content: "// new content from AI",
      reason: "Fix null pointer exception"
    }
  ]
});

console.log(result.applied);  // ["src/index.ts"]
console.log(result.blocked);  // anything policy blocked
```

### As a CLI

```bash
# Preview what will change — no writes
patchgate preview my-patch.json

# Apply with policy check + snapshot
patchgate apply my-patch.json

# Undo the last apply
patchgate rollback .patchgate/snapshots/patchgate-snapshot-xxx

# See audit history
patchgate history
```

---

## What PatchGate Does

| Feature | Description |
|---|---|
| **Policy enforcement** | Blocks `.env`, secrets, `node_modules`, absolute paths, path traversal |
| **Diff preview** | Shows exactly what will change before writing anything |
| **Atomic writes** | Writes to temp file then renames — no partial corruption |
| **Snapshot + rollback** | Saves originals before every apply — full undo in one command |
| **Audit log** | Every apply written to `.patchgate/audit.log` (JSONL) |
| **CI-friendly** | Headless mode, correct exit codes, GitHub Action included |

---

## Configuration

Create `patchgate.config.json` in your project root:

```json
{
  "blocklist": [
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "node_modules/**",
    ".git/**"
  ],
  "requireApproval": false,
  "enableSnapshot": true,
  "runTypecheck": false
}
```

Or inline:

```typescript
await run(patchSet, {
  config: {
    blocklist: [".env", "*.secret"],
    requireApproval: true,
    enableSnapshot: true,
  }
});
```

---

## The Patch Format

```json
{
  "source": "my-agent",
  "patches": [
    { "op": "create", "path": "src/new.ts",      "content": "..." },
    { "op": "update", "path": "src/existing.ts", "content": "..." },
    { "op": "delete", "path": "src/old.ts" },
    { "op": "rename", "path": "src/a.ts", "newPath": "src/b.ts" }
  ]
}
```

Any agent that outputs JSON can use PatchGate.

---

## CI Integration

Add to your pipeline to validate AI-proposed patches before merge:

```yaml
- name: Validate agent patch
  run: patchgate apply proposed-patch.json
  env:
    CI: true
```

See `.github/workflows/agent-patch-validate.yml` for the full example.

---

## Audit Log

Every apply is logged to `.patchgate/audit.log`:

```jsonl
{"timestamp":"2026-02-17T10:23:01Z","patchSetId":"abc123","source":"claude","totalPatches":3,"applied":["src/utils.ts"],"blocked":[{"path":".env","reason":"Blocked by policy pattern \".env.*\""}],"errors":[],"durationMs":42}
```

---

## Integrations

PatchGate works with any agent framework:

- **Claude tool use** — wrap `write_file` calls
- **OpenAI function calling** — same pattern
- **LangGraph** — use as a node before filesystem writes
- **Custom agents** — if it outputs JSON, it works

---

## Status

| Component | Status |
|---|---|
| Core patch engine | ✅ Stable |
| Policy enforcement | ✅ Stable |
| Atomic writes | ✅ Stable |
| Snapshot + rollback | ✅ Stable |
| Audit logging | ✅ Stable |
| CLI | ✅ Stable |
| CI GitHub Action | ✅ Stable |
| Claude adapter | 🔜 Coming |
| OpenAI adapter | 🔜 Coming |
| LangGraph adapter | 🔜 Coming |

---

## License

MIT

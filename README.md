
# PatchGate

![CI](https://github.com/shivae372-hub/patchgate/actions/workflows/ci.yml/badge.svg)
![npm](https://img.shields.io/npm/v/patchgate)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

**Policy enforcement and rollback for AI agent code edits.**

PatchGate is an open patch approval + filesystem safety gate for AI agents.

> The layer underneath Cursor, LangGraph, Claude tool use, OpenAI function calling,
> and autonomous coding pipelines.

---

## The Problem

Every AI coding tool eventually needs to write changes to your filesystem.

Most tools just do it:

- No policy enforcement  
- No preview  
- No rollback  
- No audit trail  

One hallucination or prompt injection can overwrite your repo or leak secrets:

- `.env` touched  
- `src/` overwritten  
- `../../` traversal attacks  
- Absolute path writes  

**Git helps after the damage. PatchGate prevents the damage before it hits disk.**

---

## What PatchGate Is

PatchGate sits between your AI agent and your filesystem.

Instead of letting agents write files directly, agents output JSON patches:

- Preview diffs before applying  
- Block dangerous paths (`.env`, secrets, traversal)  
- Apply changes safely (atomic writes)  
- Save rollback snapshots  
- Log everything for audit  

---

## PatchGate vs Cursor / Copilot

Cursor protects inside the editor.

**PatchGate protects at the filesystem boundary.**

Even if the agent runs headless in CI, or as an autonomous runtime,
PatchGate still enforces safety policies before anything touches disk.

---

## Demo

```text
patchgate apply examples/demo-patch.json

🔍 PatchGate — Applying 3 patch(es)

── Planned Changes ───────────────────────────────
[~] UPDATE  src/utils.ts
[+] CREATE  src/helpers/format.ts
[~] UPDATE  .env

Apply these changes? [y/N] y

🚫 Blocked by policy:
   .env — Blocked by policy pattern ".env"

✅ Applied:
   src/utils.ts
   src/helpers/format.ts

💾 Snapshot saved: .patchgate/snapshots/patchgate-snapshot-xxx
   To undo: patchgate rollback ".patchgate/snapshots/patchgate-snapshot-xxx"

✓ Done.
````

The `.env` file was never touched. Everything is logged.

---

## Install

```text
npm install patchgate
```

CLI usage:

```text
npx patchgate --help
```

Or global install:

```text
npm install -g patchgate
```

---

## Usage

### As a Library (inside your agent)

```ts
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

console.log(result.applied);
console.log(result.blocked);
```

### As a CLI

```text
patchgate preview my-patch.json
patchgate apply my-patch.json
patchgate rollback .patchgate/snapshots/patchgate-snapshot-xxx
patchgate history
```

---

## OpenAI Adapter (NEW)

PatchGate ships with a drop-in OpenAI function calling adapter.

* Safe filesystem tools for OpenAI agents
* Blocks secrets and traversal
* Adds rollback + audit logging

Full documentation:

```text
OPENAI_ADAPTER.md
```

Example:

```text
examples/openai-adapter-demo.ts
```

---

## Patch Format

```json
{
  "source": "my-agent",
  "patches": [
    { "op": "create", "path": "src/new.ts", "content": "..." },
    { "op": "update", "path": "src/existing.ts", "content": "..." },
    { "op": "delete", "path": "src/old.ts" },
    { "op": "rename", "path": "src/a.ts", "newPath": "src/b.ts" }
  ]
}
```

Any AI agent that outputs JSON can use PatchGate.

---

## Configuration

Create `patchgate.config.json`:

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
  "requireApproval": true,
  "enableSnapshot": true
}
```

---

## Audit Log

Every apply is recorded in:

```text
.patchgate/audit.log
```

Example entry:

```jsonl
{"timestamp":"2026-02-17T10:23:01Z","source":"claude","totalPatches":3,"applied":["src/utils.ts"],"blocked":[{"path":".env","reason":"Blocked by policy pattern \".env\""}]}
```

---

## Status

| Component           | Status    |
| ------------------- | --------- |
| Core patch engine   | ✅ Stable  |
| Policy enforcement  | ✅ Stable  |
| Atomic writes       | ✅ Stable  |
| Snapshot + rollback | ✅ Stable  |
| Audit logging       | ✅ Stable  |
| CLI                 | ✅ Stable  |
| OpenAI adapter      | ✅ Stable  |
| LangGraph adapter   | 🔜 Coming |
| Claude adapter      | 🔜 Coming |

---

## License

MIT

PatchGate = the open safety primitive for AI filesystem writes.

````

---

# ✅ What You Must Do Now

1. Replace your GitHub `README.md` fully with this clean one  
2. Delete the garbage bottom part (“What this README fixes…”)
3. Commit:

```text
git add README.md
git commit -m "docs: clean README"
git push
````

---

If you want, I can also clean your `OPENAI_ADAPTER.md` the same way (it also needs formatting fixes).

# PatchGate

 HEAD
![CI](https://github.com/shivae372-hub/patchgate/actions/workflows/ci.yml/badge.svg)

![CI](https://github.com/shiva372-hub/patchgate/actions/workflows/ci.yml/badge.svg)
 646d963 (docs: finalize OpenAI adapter documentation)
![npm](https://img.shields.io/npm/v/patchgate)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

**Policy enforcement and rollback for AI agent code edits.**

> PatchGate is an open patch approval + safety gate for AI agents.  
> The layer underneath Cursor, LangGraph, Claude tool use, and autonomous coding pipelines.

---

## The Problem

Every AI coding tool — agents built on LangGraph, Claude, GPT, local LLMs —
eventually needs to write changes to your filesystem.

Most tools just do it:

- No policy check  
- No preview  
- No rollback  
- No audit trail  

One bad prompt, one hallucination, one prompt injection — and your `.env` is gone,
your `src/` is overwritten, or worse.

**Git helps after the damage. PatchGate prevents the damage before it hits disk.**

---

## What PatchGate Is

PatchGate sits between your AI agent and your filesystem.

Instead of letting agents write files directly, they output a JSON patch:

- PatchGate previews the diff
- Blocks dangerous paths (`.env`, secrets, traversal)
- Applies changes safely (atomic writes)
- Saves a rollback snapshot
- Logs everything for audit

---

## PatchGate vs Cursor / Copilot

Cursor protects inside the editor.

**PatchGate protects at the filesystem boundary.**

Even if the agent runs headless in CI, or as an autonomous runtime,
PatchGate still enforces safety policies before anything touches disk.

---

## Demo

```bash
patchgate apply examples/demo-patch.json

🔍 PatchGate — Applying 3 patch(es)

── Planned Changes ──────────────────────────────────
[~] UPDATE  src/utils.ts
[+] CREATE  src/helpers/format.ts  (4 lines)
[~] UPDATE  .env
────────────────────────────────────────────────────

Apply these changes? [y/N] y

🚫 Blocked by policy:
   .env — Blocked by policy pattern ".env": ".env"

✅ Applied:
   src/utils.ts
   src/helpers/format.ts

💾 Snapshot saved: .patchgate/snapshots/patchgate-snapshot-xxx
   To undo: patchgate rollback ".patchgate/snapshots/patchgate-snapshot-xxx"

✓ Done.
```
The .env file was never touched. Everything is logged.


HEAD
Install

---

## Install

 646d963 (docs: finalize OpenAI adapter documentation)
```
npm install patchgate
```

CLI usage:
 HEAD
```
npx patchgate --help
```

Or global install:
```
npm install -g patchgate
```
Usage
As a Library (inside your agent)

```
npx patchgate --help
```
Or global install

```
npm install -g patchgate
```

---

## Usage

### As a library (in your agent)

 646d963 (docs: finalize OpenAI adapter documentation)
```
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

console.log(result.applied); // ["src/index.ts"]
console.log(result.blocked); // anything policy blocked
```
 HEAD
As a CLI
```
# Preview changes (no writes)


### As a CLI

```
# Preview what will change — no writes
 646d963 (docs: finalize OpenAI adapter documentation)
patchgate preview my-patch.json

# Apply with policy + snapshot + audit log
patchgate apply my-patch.json

# Roll back instantly
patchgate rollback .patchgate/snapshots/patchgate-snapshot-xxx

# View audit history
patchgate history
```

What PatchGate Does
Feature	Description
Policy enforcement	Blocks .env, secrets, node_modules, absolute paths, traversal
Diff preview	Shows exactly what will change before writing anything
Atomic writes	Writes to temp file then renames — no partial corruption
Snapshot + rollback	Saves originals before apply — full undo in one command
Audit log	Every run written to .patchgate/audit.log (JSONL)
Framework-agnostic	Works with any agent that can output JSON patches
Configuration

Create patchgate.config.json in your project root:
```
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
  "enableSnapshot": true,
  "runTypecheck": false
}
```

Or inline:
```
await run(patchSet, {
  config: {
    blocklist: [".env", "*.secret"],
    requireApproval: true,
    enableSnapshot: true
  }
});
```
Patch Format
```
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

Any AI agent that outputs JSON can use PatchGate.

Real-World Use Cases

PatchGate is designed for:

Autonomous coding agents running in CI

Local LLM coding tools (Ollama agents)

LangGraph pipelines proposing file edits

Enterprise workflows requiring audit + rollback

Secure “AI pull request” patch validation

CI Integration

Validate AI-proposed patches before merge:
```
- name: Validate agent patch
  run: patchgate apply proposed-patch.json
  env:
    CI: true
```

See .github/workflows/agent-patch-validate.yml.

Audit Log

Every apply is recorded in .patchgate/audit.log:
```
{
  "timestamp": "2026-02-17T10:23:01Z",
  "source": "claude",
  "totalPatches": 3,
  "applied": ["src/utils.ts"],
  "blocked": [
    {
      "path": ".env",
      "reason": "Blocked by policy pattern \".env\""
    }
  ]
}
```
Integrations (Coming Next)

PatchGate works with any agent framework:

Claude tool use — wrap write_file

OpenAI function calling — same adapter pattern

LangGraph — run as a safety node before filesystem writes

 HEAD
Custom agents — JSON in, safe writes out

| Component | Status |
|---|---|
| Core patch engine | ✅ Stable |
| Policy enforcement | ✅ Stable |
| Atomic writes | ✅ Stable |
| Snapshot + rollback | ✅ Stable |
| Audit logging | ✅ Stable |
| CLI | ✅ Stable |
| CI GitHub Action | ✅ Stable |
| OpenAI adapter | ✅ Stable |
| Claude adapter | 🔜 Coming |
| LangGraph adapter | 🔜 Coming |
 646d963 (docs: finalize OpenAI adapter documentation)

Status
Component	Status
Core patch engine	✅ Stable
Policy enforcement	✅ Stable
Atomic writes	✅ Stable
Snapshot + rollback	✅ Stable
Audit logging	✅ Stable
CLI	✅ Stable
GitHub Action workflow	✅ Stable
Claude adapter	🔜 Coming
OpenAI adapter	🔜 Coming
LangGraph adapter	🔜 Coming
License

MIT

PatchGate = the open safety primitive for AI filesystem writes.

```
---

# ✅ What This Final README Fixes

- Badge username is correct  
- Demo output matches real behavior  
- Clear positioning vs Cursor  
- Adds the killer Git comparison  
- Real-world adoption framing  
- Enterprise-level seriousness

This is now a launch-grade OSS README.

---

# Next Step (Real Adoption)

Now the only thing that matters is:

## Ship ONE integration adapter

Example:

- `patchgate/openai-write-file-wrapper`

That’s how you go from “cool repo” → “standard primitive”.

---

If you want, I will write the **exact next file** that makes PatchGate instantly usable inside OpenAI tool calling:

✅ `patchgateOpenAIToolWrapper()`  
and you can post:

> “Drop-in filesystem firewall for OpenAI agents”

Just reply: **yes, build the OpenAI adapter next**.
```

# PatchGate – Project Plan

## The Problem

AI coding agents (Claude, GPT-4, Cursor, LangGraph) write directly to your filesystem.
They don't know what they shouldn't touch.

Real failure modes that happen today:
- Agent overwrites `.env` with hallucinated values
- Agent deletes config files it "thinks" are unused
- Agent writes files outside the project directory (path traversal)
- Agent modifies `.git` internals and corrupts the repo
- Agent applies a patch that half-succeeds, leaving the codebase broken
- No record of what the agent changed or why

There is no safety layer between AI intent and filesystem reality.

## What PatchGate Does

PatchGate is a policy enforcement and safety gate that sits between AI agents and the filesystem.

Instead of writing directly to disk, AI agents output structured JSON patches.
PatchGate intercepts every patch, enforces security policy, previews changes,
applies atomically with rollback capability, and logs everything to an audit trail.

```
AI Agent
   ↓
[JSON Patch]
   ↓
PatchGate
   ├── Policy Check    → block .env, secrets, path traversal, .git
   ├── Diff Preview    → show exactly what will change
   ├── Atomic Apply    → temp file + rename, never partial writes
   ├── Snapshot        → save pre-change state for rollback
   └── Audit Log       → JSONL record of every operation
   ↓
Filesystem (only if all checks pass)
```

## Core Features

### Already Working
- Policy engine — blocklist for `.env`, `*.pem`, `*.key`, `node_modules`, `.git`, path traversal
- Atomic writes — temp file + rename pattern, prevents corruption
- Snapshot + rollback — saves pre-change copies, full restore
- Audit logging — JSONL format, timestamped, complete history
- Diff preview — unified diff before any write
- CLI — `apply`, `preview`, `rollback`, `history` commands
- OpenAI adapter — drop-in function tools for OpenAI function calling
- CI strict mode — `failOnBlocked` for pipeline enforcement

### To Be Built (This Phase)
- Claude adapter — tool definitions for Claude tool_use API
- Config file auto-loading — read `patchgate.config.json` automatically
- Dry-run mode — simulate full pipeline without touching filesystem
- Directory operations — `mkdir`, `rmdir` patch types
- Plugin system — custom policy rules beyond built-in blocklist
- README overhaul — clear, accurate, professional documentation

## Target Users
1. Developers using AI coding agents (Cursor, Windsurf, Claude Code)
2. Teams running AI agents in CI/CD pipelines
3. Anyone who has lost files or had configs overwritten by an AI tool

## Technical Philosophy
- Every AI write must be auditable
- Every AI write must be reversible
- The AI must never touch what it is not supposed to touch
- Fail safe — if policy check fails, nothing is written

## Technology Stack
- Language: TypeScript 5.x
- Runtime: Node.js ≥ 18
- Build: tsc (CommonJS output)
- Test: Jest + ts-jest
- Key deps: `diff` (unified diffs), `micromatch` (glob policy matching)

## Entry Points
```bash
# CLI
npx patchgate apply <patch.json>
npx patchgate preview <patch.json>
npx patchgate rollback <snapshot-dir>
npx patchgate history

# Library
import { run, createPatchSet } from 'patchgate'

# OpenAI adapter
import { createPatchGateFileTools } from 'patchgate'

# Claude adapter (to be built)
import { createClaudeFileTools } from 'patchgate'
```

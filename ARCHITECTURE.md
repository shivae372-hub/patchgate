# PatchGate – Architecture

## Folder Structure

```
patchgate/
│
├── src/
│   ├── index.ts              # Public API — run(), createPatchSet(), re-exports
│   ├── types.ts              # Core interfaces — FilePatch, PatchSet, ApplyResult, Config
│   ├── policy.ts             # Policy engine — blocklist, path traversal detection
│   ├── executor.ts           # Patch apply, atomic write, snapshot, rollback, diff
│   ├── logger.ts             # Audit log — JSONL write/read
│   ├── cli.ts                # CLI — apply, preview, rollback, history commands
│   ├── config.ts             # [TO BUILD] Config file auto-loader
│   ├── helpers/              # Shared utilities (currently empty — to be filled)
│   │   └── pathUtils.ts      # [TO BUILD] Safe path resolution helpers
│   └── adapters/
│       ├── openai/
│       │   ├── fileTools.ts  # OpenAI function calling tools — COMPLETE
│       │   └── types.ts      # OpenAI adapter types — COMPLETE
│       └── claude/
│           ├── fileTools.ts  # [TO BUILD] Claude tool_use adapter
│           └── types.ts      # [TO BUILD] Claude adapter types
│
├── tests/
│   ├── patchgate.test.ts         # Core tests — policy, executor, snapshot/rollback
│   ├── openai-adapter.test.ts    # OpenAI adapter tests
│   ├── agent-realworld.test.ts   # Real-world agent simulation tests
│   ├── claude-adapter.test.ts    # [TO BUILD] Claude adapter tests
│   └── tmp-agent/                # Test fixtures
│
├── examples/
│   ├── demo-patch.json           # Sample patch for CLI testing
│   ├── openai-adapter-demo.ts    # OpenAI usage example
│   └── claude-adapter-demo.ts    # [TO BUILD] Claude usage example
│
├── .github/
│   └── workflows/                # CI configuration
│
├── dist/                         # Compiled output (gitignored)
├── package.json
├── tsconfig.json
├── README.md                     # [TO REWRITE] Main documentation
└── OPENAI_ADAPTER.md             # OpenAI adapter docs
```

---

## Data Flow

```
Input: FilePatch[]
  { op: "create"|"update"|"delete"|"rename", path, content? }
       ↓
policy.ts — enforcePolicy()
  checks each patch against blocklist + traversal rules
  returns: { allowed: FilePatch[], blocked: FilePatch[] }
       ↓
executor.ts — applyPatches()
  for each allowed patch:
    1. takeSnapshot() — save current file to .patchgate/snapshots/
    2. previewDiff() — generate unified diff string
    3. atomicWrite() — write to temp file, then rename
    4. on failure: rollback() — restore from snapshot
       ↓
logger.ts — writeAuditLog()
  append JSONL entry: { timestamp, op, path, status, snapshotPath }
       ↓
Output: ApplyResult
  { applied: FilePatch[], blocked: FilePatch[], errors: Error[] }
```

---

## Data Contracts

### FilePatch (input unit)
```typescript
{
  op: "create" | "update" | "delete" | "rename",
  path: string,           // relative path from project root
  content?: string,       // required for create/update
  newPath?: string        // required for rename
}
```

### PatchSet (full input)
```typescript
{
  patches: FilePatch[],
  meta?: {
    agent?: string,       // "claude" | "gpt-4" | "cursor"
    reason?: string       // why the agent made these changes
  }
}
```

### ApplyResult (output)
```typescript
{
  applied: FilePatch[],
  blocked: FilePatch[],
  errors: Array<{ patch: FilePatch, error: string }>,
  snapshotDir?: string
}
```

### AuditLog entry (JSONL)
```typescript
{
  timestamp: string,      // ISO 8601
  op: string,
  path: string,
  status: "applied" | "blocked" | "error",
  reason?: string,        // why blocked
  snapshotPath?: string,
  agent?: string
}
```

### Config (patchgate.config.json)
```typescript
{
  rootDir?: string,               // default: process.cwd()
  blocklist?: string[],           // additional glob patterns to block
  allowlist?: string[],           // patterns to always allow
  snapshotDir?: string,           // default: .patchgate/snapshots
  auditLog?: string,              // default: .patchgate/audit.log
  failOnBlocked?: boolean,        // default: false
  dryRun?: boolean                // default: false
}
```

---

## Claude Adapter Design

The Claude adapter must follow Anthropic's tool_use format exactly.

```typescript
// Tool definition format for Claude API
{
  name: "patchgate_write_file",
  description: "Write or update a file safely through PatchGate policy enforcement",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative file path from project root" },
      content: { type: "string", description: "Full file content to write" }
    },
    required: ["path", "content"]
  }
}
```

Three tools to implement:
- `patchgate_write_file` — create or update
- `patchgate_delete_file` — delete with snapshot
- `patchgate_rename_file` — rename with snapshot

---

## Module Rules
1. `policy.ts` must never import from `executor.ts` or `logger.ts`
2. `executor.ts` imports from `policy.ts` and `logger.ts` — never from adapters
3. `logger.ts` is standalone — no imports from other src files
4. Adapters import from `index.ts` only — never directly from internals
5. `types.ts` is imported by everyone — it imports nothing
6. Each adapter is fully self-contained in its own folder

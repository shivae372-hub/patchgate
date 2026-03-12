# PatchGate – Project State

**Current Version:** v0.4.0
**Project Phase:** Complete
**Last Updated:** Session 4

---

## Status Summary

| Area | Status | Notes |
|---|---|---|
| Core policy engine | ✅ Working | policy.ts — blocklist + traversal + dir protection |
| Atomic writes | ✅ Working | executor.ts — temp + rename |
| Snapshot + rollback | ✅ Working | .patchgate/snapshots/ |
| Audit logging | ✅ Working | JSONL format |
| Diff preview | ✅ Working | unified diff |
| CLI | ✅ Working | apply, preview, rollback, history |
| OpenAI adapter | ✅ Working | fileTools.ts |
| CI strict mode | ✅ Working | failOnBlocked option |
| Claude adapter | ✅ Working | fileTools.ts, types.ts, exported from index.ts |
| Config auto-loading | ✅ Working | patchgate.config.json auto-loads in run() |
| Dry-run mode | ✅ Working | simulate without write |
| Directory operations | ✅ Working | mkdir/rmdir with protected dir policy |
| helpers/ folder | ✅ Populated | pathUtils.ts now provides safe path resolution utilities |
| README | ✅ Complete | rewritten with architecture diagram, full examples, accurate feature table |
| package.json | ✅ Fixed | self-dependency removed |

---

## Known Bugs to Fix

1. ~~Self-dependency~~ — Fixed in Session 1
2. ~~Rename rollback incomplete~~ — Fixed in Session 1
3. ~~helpers/ empty~~ — Fixed in Session 1, pathUtils.ts added
4. ~~README~~ — Fixed in Session 3, complete rewrite with architecture diagram and full examples

---

## Completed This Phase

1. **README Rewrite** (Session 3):
   - Complete rewrite with 11 sections: Title/Description, Problem, Architecture, Installation, CLI, Library, OpenAI Adapter, Claude Adapter, Config, Feature Status, License
   - Text-based architecture diagram showing data flow
   - Real code examples for TypeScript library usage
   - Accurate feature status table showing what actually works

2. **Built Claude adapter** (Session 1):
   - Created `src/adapters/claude/types.ts` with Claude tool_use type definitions
   - Created `src/adapters/claude/fileTools.ts` with three tools: patchgate_write_file, patchgate_delete_file, patchgate_rename_file
   - Exported `createClaudeFileTools()` from `src/index.ts`
   - All 34 tests pass

2. **Completed Claude adapter artifacts** (Session 2):
   - Created `examples/claude-adapter-demo.ts` — working usage example with all 5 demos
   - Created `tests/claude-adapter.test.ts` — 9 comprehensive tests covering all three tools and policy enforcement
   - All 43 tests pass (9 new + 34 existing)

## Current Task

**Completed:** Phase 6 — Directory Operations (mkdir/rmdir)

**Directory Operations:**
- Added `mkdir` and `rmdir` to `PatchOperation` union type in `types.ts`
- Implemented `mkdir` case in `applyOne()` with `fs.mkdirSync` recursive option
- Implemented `rmdir` case in `applyOne()` with `fs.rmdirSync`
- Added diff preview strings for mkdir (`[+] MKDIR`) and rmdir (`[-] RMDIR`)
- Added `PROTECTED_DIRS` constant in `policy.ts` for `.git`, `node_modules`, `.patchgate`
- Added directory operation checks in `checkPatch()` to block protected directories
- Added 10 comprehensive tests for directory operations:
  - mkdir creates directory successfully
  - mkdir creates nested directories with recursive option
  - rmdir removes directory successfully
  - mkdir/rmdir blocked for .git/ (via blocklist)
  - mkdir/rmdir blocked for node_modules/ (via blocklist)
  - mkdir/rmdir blocked for .patchgate/ (via protected directory check)
  - path traversal blocked for directory operations

**Next Phase:** Phase 7 — Polish (already complete)

---

## Environment

- Runtime: Node.js ≥ 18
- Language: TypeScript 5.x
- Build: `npm run build` → outputs to `dist/`
- Test: `npm test` → Jest
- CLI: `npx patchgate` or `node dist/cli.js`
- Published: npm as `patchgate` v0.4.0

---

## Notes for AI Sessions

- Do NOT modify `executor.ts` unless explicitly told to — it is the most critical file
- Do NOT modify `policy.ts` blocklist without checking tests pass
- Build Claude adapter by copying OpenAI adapter structure exactly, then adapting format
- All new code must be TypeScript with proper types
- Run `npm test` after every module to verify nothing broke

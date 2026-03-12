# PatchGate – TODO

## PHASE 1 – Fixes (do these first, they are bugs)
- [x] Remove self-dependency from package.json
- [x] Fix rename rollback to properly reverse rename target
- [x] Remove or populate helpers/ folder

## PHASE 2 – Config Auto-Loading
- [x] Create `src/config.ts` — reads `patchgate.config.json` from project root
- [x] Integrate config loader into `src/index.ts` run() function
- [x] Write test for config loading

## PHASE 3 – Dry-Run Mode
- [x] Add `dryRun: boolean` to Config type in `types.ts`
- [x] Implement dry-run in `executor.ts` — run full pipeline, skip actual writes
- [x] Add `--dry-run` flag to CLI
- [x] Write test for dry-run mode

## PHASE 4 – Claude Adapter
- [x] Create `src/adapters/claude/types.ts` — Claude tool_use type definitions
- [x] Create `src/adapters/claude/fileTools.ts` — three tools: write, delete, rename
- [x] Export Claude adapter from `src/index.ts`
- [x] Create `examples/claude-adapter-demo.ts`
- [x] Write `tests/claude-adapter.test.ts`
- [x] Create `CLAUDE_ADAPTER.md` documentation

## PHASE 5 – README 
- [x] Rewrite README.md with:
  - [x] Clear problem statement (what goes wrong without PatchGate)
  - [x] Architecture diagram (text-based)
  - [x] Installation instructions
  - [x] CLI usage with real examples
  - [x] Library usage with real examples
  - [x] OpenAI adapter section (reference OPENAI_ADAPTER.md)
  - [x] Claude adapter section (reference CLAUDE_ADAPTER.md)
  - [x] Config reference table
  - [x] Accurate feature status table

## PHASE 6 – Directory Operations
- [x] Add `mkdir` and `rmdir` to FilePatch op types in `types.ts`
- [x] Implement mkdir/rmdir in `executor.ts`
- [x] Add policy checks for directory operations
- [x] Write tests for directory operations

## PHASE 7 – Polish
- [x] Add CHANGELOG.md
- [x] Verify all exports in index.ts are correct
- [x] Run full test suite — all 53 tests pass
- [x] Bump version to v0.4.0
- [x] Update npm publish

# PatchGate – Session Prompt

---

## Standard Session — paste this at the start of every Windsurf/Cursor session

```
You are helping me improve PatchGate — a policy enforcement and safety gate 
that sits between AI agents and the filesystem.

Before doing anything, read these files in order:
1. PROJECT_PLAN.md
2. ARCHITECTURE.md
3. PROJECT_STATE.md
4. TODO.md
5. MODULE_REGISTRY.md
6. AI_RULES.md

Then:
- Find the next unchecked task in TODO.md
- Implement ONLY that one task
- Follow all rules in AI_RULES.md — especially Rule ZERO
- Run npm test after finishing to confirm nothing broke

After finishing:
- Update PROJECT_STATE.md
- Check off the item in TODO.md  
- Update MODULE_REGISTRY.md
- Add entry to SESSION_LOG.md

If anything is unclear, ask before writing code.
Do not touch executor.ts, policy.ts, index.ts, or types.ts unless the task explicitly requires it.
```

---

## Recovery Session — use when something broke

```
You are helping me fix PatchGate.

Read PROJECT_PLAN.md, ARCHITECTURE.md, AI_RULES.md first.

Something broke. Run: git status and git diff to see what changed.

The broken file is: [FILE PATH]

Restore it: git checkout [FILE PATH]

Then reimplement only that module from scratch following ARCHITECTURE.md contracts.
Do not touch any other files.

Run npm test after to confirm all tests pass.
Update MODULE_REGISTRY.md after fixing.
```

---

## README Rewrite Session — use for Phase 5

```
You are helping me rewrite the README for PatchGate.

Read PROJECT_PLAN.md and ARCHITECTURE.md first to understand what PatchGate actually does.

Rewrite README.md completely with this structure:

1. Project title + one-line description
2. The Problem (what goes wrong without PatchGate — be specific and technical)
3. How PatchGate Works (text-based architecture diagram)
4. Installation
5. CLI Usage (real examples with output)
6. Library Usage (TypeScript examples)
7. OpenAI Adapter (with example)
8. Claude Adapter (with example)
9. Config Reference (table of all options)
10. Feature Status table
11. License

Write for a technical audience — developers who use AI coding tools.
Be direct. No marketing language. Show real code examples.
Do not include anything that is not yet implemented.
```

---

## Recommended Session Order

Session 1: Fix package.json self-dependency + run tests
Session 2: Fix rename rollback bug in executor.ts
Session 3: Build src/config.ts config auto-loader
Session 4: Add dry-run mode to types.ts + executor.ts + CLI
Session 5: Build src/adapters/claude/types.ts
Session 6: Build src/adapters/claude/fileTools.ts
Session 7: Build tests/claude-adapter.test.ts
Session 8: Build examples/claude-adapter-demo.ts + CLAUDE_ADAPTER.md
Session 9: Rewrite README.md
Session 10: Final cleanup — version bump, verify all exports, npm publish

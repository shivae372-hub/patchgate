# PatchGate – AI Coding Rules

## Before Writing Any Code

Read these files in this exact order:
1. PROJECT_PLAN.md — understand what PatchGate is and why it exists
2. ARCHITECTURE.md — understand folder structure and data contracts
3. PROJECT_STATE.md — understand what works, what is broken, what is next
4. TODO.md — find the next unchecked task
5. MODULE_REGISTRY.md — confirm module statuses

Do not write a single line of code before reading all five files.

---

## Critical Protection Rules

**Rule ZERO — Never touch these files without explicit instruction:**
- `src/executor.ts` — most critical file, handles all filesystem operations
- `src/policy.ts` — security rules, any mistake here creates vulnerabilities
- `src/index.ts` — public API, changing exports breaks downstream users
- `src/types.ts` — changing interfaces breaks everything that imports them
- Any existing test file — do not modify passing tests

**Rule 1 — One module per session**
Implement or fix exactly ONE module per session. Stop after that module works.

**Rule 2 — Run tests after every change**
After implementing any module, run `npm test`. If tests fail, fix them before proceeding.

**Rule 3 — Follow TypeScript strictly**
All new code must be TypeScript. No `any` types. No `// @ts-ignore`. Proper interfaces.

**Rule 4 — Follow data contracts**
All inputs and outputs must match the interfaces defined in ARCHITECTURE.md exactly.

**Rule 5 — Claude adapter must mirror OpenAI adapter structure**
When building the Claude adapter, use `src/adapters/openai/fileTools.ts` as the reference.
Same structure, same pattern, different API format.

**Rule 6 — Never add dependencies without asking**
The only approved external dependencies are: `diff`, `micromatch`.
Ask before adding anything else.

**Rule 7 — Do not refactor working code**
If it works and tests pass, do not touch it. Only add new modules.

**Rule 8 — Ask before touching executor.ts**
If you think you need to modify executor.ts, stop and ask first.

---

## After Completing a Module

Update all four files:
1. `PROJECT_STATE.md` — mark module done, set next task
2. `TODO.md` — check off `[x]` the completed item
3. `MODULE_REGISTRY.md` — change status to ✅ complete
4. `SESSION_LOG.md` — add session summary

---

## Recovery Rule

If you break something:
1. Run `git diff` to see what changed
2. Run `git checkout src/[broken-file].ts` to restore it
3. Start that module again from scratch
4. Never try to fix deeply broken TypeScript by patching — restore and redo

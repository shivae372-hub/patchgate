# PatchGate – Module Registry

| Module | File | Status | Notes |
|---|---|---|---|
| types | src/types.ts | ✅ complete | Core interfaces |
| policy | src/policy.ts | ✅ complete | Blocklist + traversal |
| executor | src/executor.ts | ✅ complete | Apply, snapshot, rollback, diff |
| logger | src/logger.ts | ✅ complete | JSONL audit log |
| index | src/index.ts | ✅ complete | Public API |
| cli | src/cli.ts | ✅ complete | CLI commands |
| openai/fileTools | src/adapters/openai/fileTools.ts | ✅ complete | OpenAI adapter |
| openai/types | src/adapters/openai/types.ts | ✅ complete | OpenAI types |
| config | src/config.ts | ✅ complete | Auto-load patchgate.config.json |
| helpers/pathUtils | src/helpers/pathUtils.ts | ✅ complete | Safe path resolution utilities |
| claude/types | src/adapters/claude/types.ts | ✅ complete | Claude adapter types with ClaudePatchGateToolResult |
| claude/fileTools | src/adapters/claude/fileTools.ts | ✅ complete | Claude tool_use adapter with createClaudeFileTools() |
| claude-adapter-demo | examples/claude-adapter-demo.ts | ✅ complete | Usage example with 5 demos |
| claude-adapter-test | tests/claude-adapter.test.ts | ✅ complete | 9 tests covering all tools and policy |
| CLAUDE_ADAPTER.md | CLAUDE_ADAPTER.md | ✅ complete | Documentation matching OPENAI_ADAPTER.md style |
| README | README.md | ✅ complete | rewritten with architecture diagram and full examples |

## Status Key
- ✅ complete — working and tested
- ⚠️ needs work — exists but broken or incomplete
- ❌ missing — not yet built
- 🔨 in progress — current session

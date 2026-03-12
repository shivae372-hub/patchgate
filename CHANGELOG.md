# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-03-11

### Added
- **Config Auto-Loading** — `patchgate.config.json` is automatically loaded from project root when using the `run()` function
- **Dry-Run Mode** — Simulate patch operations without actually writing files; enabled via `--dry-run` CLI flag or `dryRun: true` config option
- **Claude Adapter** — Full support for Anthropic Claude's tool_use format:
  - `createClaudeFileTools()` function for generating Claude-compatible tool definitions
  - Three tool types: `patchgate_write_file`, `patchgate_delete_file`, `patchgate_rename_file`
  - Proper `ClaudePatchGateToolResult` type definitions
  - Complete type safety for Claude integration
- **CLAUDE_ADAPTER.md** — Comprehensive documentation for Claude integration matching the style of OPENAI_ADAPTER.md
- **Helpers Module** — `src/helpers/pathUtils.ts` with safe path resolution utilities
- **Example Files** — `examples/claude-adapter-demo.ts` with 5 working demos showing Claude adapter usage
- **Claude Adapter Tests** — `tests/claude-adapter.test.ts` with 9 comprehensive tests covering all three tools and policy enforcement

### Fixed
- **Self-Dependency** — Removed erroneous self-dependency from `package.json`
- **Rename Rollback** — Fixed rollback to properly reverse rename operations (target file is now correctly restored)
- **README Rewrite** — Complete rewrite with:
  - Clear problem statement explaining real failure modes without PatchGate
  - Text-based architecture diagram showing data flow
  - Installation instructions
  - CLI usage with real examples
  - Library usage with TypeScript examples
  - OpenAI and Claude adapter sections with reference links
  - Accurate feature status table showing what actually works

### Changed
- **Version** — Bumped from 0.3.3 to 0.4.0 reflecting significant new features

## [0.3.3] - 2025-XX-XX

### Summary
Baseline release with core functionality:
- Policy enforcement with blocklist and directory traversal protection
- Atomic file writes using temp + rename pattern
- Snapshot and rollback system
- JSONL audit logging
- Unified diff preview
- CLI with apply, preview, rollback, and history commands
- OpenAI adapter with `createPatchGateFileTools()`
- CI strict mode with `failOnBlocked` option

---

[0.4.0]: https://github.com/shivae372-hub/patchgate/compare/v0.3.3...v0.4.0

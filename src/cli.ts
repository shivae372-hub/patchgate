#!/usr/bin/env node
// src/cli.ts
// PatchGate — Command Line Interface

import fs from "fs";
import path from "path";
import { run, rollback, readLog, printHistory } from "./index";
import { PatchSet } from "./types";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case "apply":
      await cmdApply();
      break;
    case "rollback":
      await cmdRollback();
      break;
    case "history":
      cmdHistory();
      break;
    case "preview":
      await cmdPreview();
      break;
    default:
      printHelp();
  }
}

// ─── patchgate apply <patch-file.json> ───────────────────────────────────────
async function cmdApply() {
  const patchFile = args[1];
  if (!patchFile) {
    console.error("❌ Usage: patchgate apply <patch-file.json>");
    process.exit(1);
  }

  const fullPath = path.resolve(patchFile);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    process.exit(1);
  }

  let patchSet: PatchSet;
  try {
    patchSet = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  } catch (e) {
    console.error(`❌ Could not parse patch file: ${e}`);
    process.exit(1);
  }

  console.log(
    `\n🔍 PatchGate — Applying ${patchSet.patches.length} patch(es)\n`
  );

  const result = await run(patchSet, {
    onPreview: async (diffs) => {
      console.log("── Planned Changes ─────────────────────────────────");
      for (const diff of diffs) {
        console.log(diff);
      }
      console.log("────────────────────────────────────────────────────\n");

      // CI mode: auto-approve
      if (!process.stdin.isTTY || process.env.CI) return true;

      const { createInterface } = await import("readline");
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const answer = await new Promise<string>((resolve) =>
        rl.question("Apply these changes? [y/N] ", resolve)
      );
      rl.close();
      return answer.toLowerCase() === "y";
    },
  });

  if (result.blocked.length > 0) {
    console.log("\n🚫 Blocked by policy:");
    for (const b of result.blocked) {
      console.log(`   ${b.path} — ${b.reason}`);
    }
  }

  if (result.applied.length > 0) {
    console.log("\n✅ Applied:");
    for (const f of result.applied) {
      console.log(`   ${f}`);
    }
  }

  if (result.errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const e of result.errors) {
      console.log(`   ${e.path}: ${e.message}`);
    }
  }

  if (result.snapshotPath) {
    console.log(`\n💾 Snapshot saved: ${result.snapshotPath}`);
    console.log(`   To undo: patchgate rollback "${result.snapshotPath}"`);
  }

  console.log(result.success ? "\n✓ Done.\n" : "\n⚠ Completed with errors.\n");
  process.exit(result.success ? 0 : 1);
}

// ─── patchgate rollback <snapshot-dir> ───────────────────────────────────────
async function cmdRollback() {
  const snapshotDir = args[1];
  if (!snapshotDir) {
    console.error('❌ Usage: patchgate rollback "<snapshot-dir>"');
    process.exit(1);
  }
  try {
    rollback(path.resolve(snapshotDir));
    console.log(`\n✅ Rolled back from: ${snapshotDir}\n`);
  } catch (e) {
    console.error(`❌ Rollback failed: ${e}`);
    process.exit(1);
  }
}

// ─── patchgate history ────────────────────────────────────────────────────────
function cmdHistory() {
  const entries = readLog();
  if (entries.length === 0) {
    console.log("\n📋 No history found.\n");
    return;
  }
  printHistory(entries);
}

// ─── patchgate preview <patch-file.json> ─────────────────────────────────────
async function cmdPreview() {
  const patchFile = args[1];
  if (!patchFile) {
    console.error("❌ Usage: patchgate preview <patch-file.json>");
    process.exit(1);
  }

  const { generateDiff } = await import("./executor");
  const patchSet: PatchSet = JSON.parse(
    fs.readFileSync(path.resolve(patchFile), "utf-8")
  );

  console.log(`\n🔍 Preview — ${patchSet.patches.length} patch(es)\n`);
  for (const patch of patchSet.patches) {
    console.log(`── ${patch.op.toUpperCase()}  ${patch.path}`);
    if (patch.reason) console.log(`   Reason: ${patch.reason}`);
    console.log(generateDiff(patch));
    console.log();
  }
}

// ─── Help ─────────────────────────────────────────────────────────────────────
function printHelp() {
  console.log(`
  PatchGate — Policy enforcement and rollback for AI agent code edits

  Usage:
    patchgate apply <patch.json>      Apply patches with policy check + snapshot
    patchgate preview <patch.json>    Preview diffs without writing anything
    patchgate rollback <snapshot>     Undo the last patch application
    patchgate history                 Show audit log of past runs

  Example patch.json:
    {
      "source": "my-agent",
      "patches": [
        {
          "op": "update",
          "path": "src/index.ts",
          "content": "// new content",
          "reason": "Fix null check"
        }
      ]
    }

  Docs: https://github.com/shiva372-hub/patchgate
  `);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

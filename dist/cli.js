#!/usr/bin/env node
"use strict";
// src/cli.ts
// PatchGate — Command Line Interface
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_1 = require("./index");
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
        console.error("❌ Usage: patchgate apply <patch-file.json> [--dry-run]");
        process.exit(1);
    }
    const dryRun = args.includes("--dry-run");
    const fullPath = path_1.default.resolve(patchFile);
    if (!fs_1.default.existsSync(fullPath)) {
        console.error(`❌ File not found: ${fullPath}`);
        process.exit(1);
    }
    let patchSet;
    try {
        patchSet = JSON.parse(fs_1.default.readFileSync(fullPath, "utf-8"));
    }
    catch (e) {
        console.error(`❌ Could not parse patch file: ${e}`);
        process.exit(1);
    }
    console.log(`\n🔍 PatchGate — Applying ${patchSet.patches.length} patch(es)${dryRun ? " (DRY RUN)" : ""}\n`);
    const result = await (0, index_1.run)(patchSet, {
        config: { dryRun },
        onPreview: async (diffs) => {
            console.log("── Planned Changes ─────────────────────────────────");
            for (const diff of diffs) {
                console.log(diff);
            }
            console.log("────────────────────────────────────────────────────\n");
            // CI mode: auto-approve
            if (!process.stdin.isTTY || process.env.CI)
                return true;
            const { createInterface } = await Promise.resolve().then(() => __importStar(require("readline")));
            const rl = createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            const answer = await new Promise((resolve) => rl.question("Apply these changes? [y/N] ", resolve));
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
        (0, index_1.rollback)(path_1.default.resolve(snapshotDir));
        console.log(`\n✅ Rolled back from: ${snapshotDir}\n`);
    }
    catch (e) {
        console.error(`❌ Rollback failed: ${e}`);
        process.exit(1);
    }
}
// ─── patchgate history ────────────────────────────────────────────────────────
function cmdHistory() {
    const entries = (0, index_1.readLog)();
    if (entries.length === 0) {
        console.log("\n📋 No history found.\n");
        return;
    }
    (0, index_1.printHistory)(entries);
}
// ─── patchgate preview <patch-file.json> ─────────────────────────────────────
async function cmdPreview() {
    const patchFile = args[1];
    if (!patchFile) {
        console.error("❌ Usage: patchgate preview <patch-file.json>");
        process.exit(1);
    }
    const { generateDiff } = await Promise.resolve().then(() => __importStar(require("./executor")));
    const patchSet = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(patchFile), "utf-8"));
    console.log(`\n🔍 Preview — ${patchSet.patches.length} patch(es)\n`);
    for (const patch of patchSet.patches) {
        console.log(`── ${patch.op.toUpperCase()}  ${patch.path}`);
        if (patch.reason)
            console.log(`   Reason: ${patch.reason}`);
        console.log(generateDiff(patch));
        console.log();
    }
}
// ─── Help ─────────────────────────────────────────────────────────────────────
function printHelp() {
    console.log(`
  PatchGate — Policy enforcement and rollback for AI agent code edits

  Usage:
    patchgate apply <patch.json> [--dry-run]   Apply patches with policy check + snapshot
    patchgate preview <patch.json>              Preview diffs without writing anything
    patchgate rollback <snapshot>               Undo the last patch application
    patchgate history                           Show audit log of past runs

  Options:
    --dry-run    Simulate the full pipeline without actual filesystem writes

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

  Docs: https://github.com/shivae372-hub/patchgate

  `);
}
main().catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map
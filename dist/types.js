"use strict";
// src/types.ts
// PatchGate — Core Type Definitions
// Defines what a "patch" looks like — the contract every other file depends on.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    blocklist: [".env", ".env.*", "*.pem", "*.key", "node_modules/**", ".git/**"],
    requireApproval: true,
    enableSnapshot: true,
    runTypecheck: false,
    failOnBlocked: false,
};
//# sourceMappingURL=types.js.map
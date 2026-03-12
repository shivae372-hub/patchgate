"use strict";
// src/config.ts
// PatchGate — Config file auto-loader
// Reads patchgate.config.json from project root automatically.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_USER_CONFIG = void 0;
exports.loadConfigFile = loadConfigFile;
exports.loadConfig = loadConfig;
exports.mergeConfig = mergeConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Default configuration values.
 */
exports.DEFAULT_USER_CONFIG = {
    rootDir: process.cwd(),
    blocklist: [],
    allowlist: [],
    snapshotDir: ".patchgate/snapshots",
    auditLog: ".patchgate/audit.log",
    failOnBlocked: false,
    dryRun: false,
};
/**
 * Attempts to load patchgate.config.json from the specified directory.
 * Returns null if the file does not exist or cannot be parsed.
 */
function loadConfigFile(configDir = process.cwd()) {
    const configPath = path.join(configDir, "patchgate.config.json");
    // Check if file exists first
    if (!fs.existsSync(configPath)) {
        return null;
    }
    try {
        const content = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(content);
        // Basic validation: ensure it's an object
        if (typeof parsed !== "object" || parsed === null) {
            return null;
        }
        return parsed;
    }
    catch (err) {
        // Invalid JSON or other read errors — return null to use defaults
        if (err instanceof Error) {
            // Check for JSON parse errors
            if (err.message.includes("JSON") || err.message.includes("Unexpected token")) {
                return null;
            }
        }
        throw err;
    }
}
/**
 * Loads config from file and merges with defaults.
 * File config takes precedence over defaults.
 */
function loadConfig(configDir = process.cwd()) {
    const fileConfig = loadConfigFile(configDir);
    return {
        ...exports.DEFAULT_USER_CONFIG,
        ...fileConfig,
    };
}
/**
 * Merges multiple config sources: defaults < file < runtime overrides.
 * Runtime overrides take highest precedence.
 */
function mergeConfig(fileDir = process.cwd(), runtimeOverrides) {
    const fileConfig = loadConfigFile(fileDir);
    return {
        ...exports.DEFAULT_USER_CONFIG,
        ...fileConfig,
        ...runtimeOverrides,
    };
}

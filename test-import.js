console.log("=== PatchGate Import Test ===");

const patchgate = require("patchgate");

console.log("Exports found:", Object.keys(patchgate));

if (patchgate.createPatchGateFileTools) {
  console.log("✅ OpenAI adapter export found!");
} else {
  console.log("❌ Adapter missing export!");
}

console.log("=== Done ===");

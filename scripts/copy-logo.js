#!/usr/bin/env node
/**
 * Copy the FGEHA emblem into assets/logo.png.
 * Run from project root: node scripts/copy-logo.js
 *
 * If you have the logo in the project, either:
 * 1. Copy it manually to fgeha-app/assets/logo.png
 * 2. Or set SOURCE_LOGO env to the full path and run: node scripts/copy-logo.js
 */
const fs = require("fs");
const path = require("path");

const assetsDir = path.join(__dirname, "..", "assets");
const destPath = path.join(assetsDir, "logo.png");

const possibleSources = [
  process.env.SOURCE_LOGO,
  path.join(__dirname, "..", "..", "assets", "c__Users_shoai_AppData_Roaming_Cursor_User_workspaceStorage_7c393d1a57e39ea8394d6f980ca1b029_images_18-02-2020_LOGO_hr-35fa37a6-a278-4652-8704-024f1de70c2d.png"),
  path.join(__dirname, "..", "..", "assets", "logo.png"),
].filter(Boolean);

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

for (const src of possibleSources) {
  if (src && fs.existsSync(src)) {
    fs.copyFileSync(src, destPath);
    console.log("Copied logo to assets/logo.png");
    process.exit(0);
  }
}

console.log("No source logo found. Copy your FGEHA emblem to fgeha-app/assets/logo.png manually.");
console.log("Or run: SOURCE_LOGO=/path/to/your/logo.png node scripts/copy-logo.js");

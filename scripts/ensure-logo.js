const fs = require("fs");
const path = require("path");
const assetsDir = path.join(__dirname, "..", "assets");
const logoPath = path.join(assetsDir, "logo.png");
const minimalPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
if (!fs.existsSync(logoPath)) {
  fs.writeFileSync(logoPath, minimalPng);
  console.log("Created placeholder assets/logo.png – replace with your FGEHA emblem (logo.png).");
}

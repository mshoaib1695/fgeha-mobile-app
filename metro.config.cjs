// Learn more https://docs.expo.io/guides/customizing-metro
// .cjs ensures CommonJS on Windows (avoids ESM URL scheme error with D:\ paths)
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;

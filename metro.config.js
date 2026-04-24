const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Get the default config
const config = getDefaultConfig(__dirname);

// --- Add SVG transformer ---
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver = {
  ...resolver,
  // Remove 'svg' from assetExts
  assetExts: resolver.assetExts.filter(ext => ext !== "svg"),
  // Add 'svg' to sourceExts so we can import it as a component
  sourceExts: [...resolver.sourceExts, "svg"],
};

// Wrap with NativeWind
module.exports = withNativeWind(config, { input: './global.css' });
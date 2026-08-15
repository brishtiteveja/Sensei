const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { default: exclusionList } = require('metro-config/private/defaults/exclusionList');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Watch the vendored packages so changes in vendor/*/src hot-reload.
config.watchFolders = [
  path.resolve(projectRoot, 'vendor/rn-onboardly'),
  path.resolve(projectRoot, 'vendor/rn-motionfold'),
];

// Resolve modules from the app only, so React / RN never duplicate.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

// Exclude .wasm binaries that Hermes can't parse as JS (canvaskit-wasm ships these)
config.resolver.blockList = exclusionList([
  /canvaskit-wasm[/\\]bin[/\\].*\.wasm$/,
]);

module.exports = withNativeWind(config, { input: './global.css' });

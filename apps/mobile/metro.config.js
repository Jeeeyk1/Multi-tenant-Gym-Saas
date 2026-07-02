const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro can resolve workspace packages.
config.watchFolders = [workspaceRoot];

// Tell Metro where to find modules — project first, then workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Force ALL react imports to the mobile app's own react@19.
// The workspace root node_modules/react symlinks to react@18.3.1 (pulled by
// Next.js web apps). extraNodeModules is only a fallback so it won't intercept
// when the workspace root resolves first. resolveRequest fully overrides.
const reactDir = path.resolve(projectRoot, 'node_modules/react');

// @babel/runtime lives at the workspace root but Metro can't find it when
// resolving from inside pnpm's deeply-nested virtual store paths (e.g.
// socket.io-parser's ESM build). Pin it to the root copy explicitly.
const babelRuntimeDir = path.resolve(workspaceRoot, 'node_modules/@babel/runtime');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react') {
    return { type: 'sourceFile', filePath: path.join(reactDir, 'index.js') };
  }
  if (moduleName === 'react/jsx-runtime') {
    return { type: 'sourceFile', filePath: path.join(reactDir, 'jsx-runtime.js') };
  }
  if (moduleName === 'react/jsx-dev-runtime') {
    return { type: 'sourceFile', filePath: path.join(reactDir, 'jsx-dev-runtime.js') };
  }
  if (moduleName.startsWith('@babel/runtime/')) {
    const subPath = moduleName.slice('@babel/runtime/'.length);
    return { type: 'sourceFile', filePath: path.join(babelRuntimeDir, subPath + '.js') };
  }
  // Fall back to Metro's default resolver for everything else.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

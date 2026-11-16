const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const http = require('http');

// Ensure all responses from Expo/Metro dev server (including root HTML) include Cross-Origin Isolation headers
const originalWriteHead = http.ServerResponse.prototype.writeHead;
http.ServerResponse.prototype.writeHead = function (...args) {
  if (!this.headersSent) {
    if (!this.getHeader('Cross-Origin-Embedder-Policy')) {
      this.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    }
    if (!this.getHeader('Cross-Origin-Opener-Policy')) {
      this.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }
  }
  return originalWriteHead.apply(this, args);
};

const originalEnd = http.ServerResponse.prototype.end;
http.ServerResponse.prototype.end = function (...args) {
  if (!this.headersSent) {
    if (!this.getHeader('Cross-Origin-Embedder-Policy')) {
      this.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    }
    if (!this.getHeader('Cross-Origin-Opener-Policy')) {
      this.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }
  }
  return originalEnd.apply(this, args);
};

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Add support for .wasm asset extensions used by SQLite's web worker
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// 4. Add COEP and COOP headers to enable SharedArrayBuffer in the browser for expo-sqlite web
const prevEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const current = prevEnhanceMiddleware ? prevEnhanceMiddleware(middleware, server) : middleware;
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      return current(req, res, next);
    };
  },
};

module.exports = config;

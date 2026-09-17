import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

test('import(index.js) default export is a function', async () => {
  const mod = await import(pathToFileURL(path.join(packageRoot, 'index.js')).href);
  assert.equal(typeof mod.default, 'function');
});

test('require(index.cjs) returns a function', () => {
  const choicy = require(path.join(packageRoot, 'index.cjs'));
  assert.equal(typeof choicy, 'function');
});

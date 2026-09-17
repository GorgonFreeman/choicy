'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const packageRoot = path.join(__dirname, '..');
const packageJson = require(path.join(packageRoot, 'package.json'));

test('package exports dual entries', () => {
  assert.equal(packageJson.exports['.'].import, './index.js');
  assert.equal(packageJson.exports['.'].require, './index.cjs');
  assert.equal(packageJson.main, './index.cjs');
  assert.equal(packageJson.module, './index.js');
});

test('require(index.cjs) returns the choicy function', () => {
  const choicy = require(path.join(packageRoot, 'index.cjs'));
  assert.equal(typeof choicy, 'function');
  assert.equal(typeof choicy.default, 'function');
  assert.equal(choicy.default, choicy);
});

test('dynamic import(index.js) default export is a function', async () => {
  const mod = await import(pathToFileURL(path.join(packageRoot, 'index.js')).href);
  assert.equal(typeof mod.default, 'function');
});

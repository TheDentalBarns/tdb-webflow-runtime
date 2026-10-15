const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const targets = require('../tools/runtime-build/targets.cjs');
const release = require('../config/release.json');
test('release includes each declared asset and readable JavaScript counterpart', () => {
  for (const path of [...release.javascript, ...release.styles, ...release.assets])
    assert.ok(fs.statSync(path).size > 0, path);
  for (const path of release.javascript)
    assert.ok(fs.statSync(path.replace(/^dist\//, 'readable/')).size > 0, path);
});
test('active sources cannot select a page-specific or historical release', () => {
  const sources = new Set(release.javascript.flatMap(path => targets[path] || []));
  for (const path of sources) {
    const source = fs.readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /677cf86df9952f978d94d8a9/, path);
    assert.doesNotMatch(source, /https:\/\/cdn\.jsdelivr\.net\/gh\/TheDentalBarns\/tdb-webflow-\w+@[a-f0-9]{40}/, path);
  }
});

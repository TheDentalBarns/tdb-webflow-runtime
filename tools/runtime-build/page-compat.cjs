#!/usr/bin/env node
'use strict';
// Generate owner-only Webflow footer snippets without changing execution timing.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const manifest = require('../../config/webflow-page-compat.json');

function render(pageId) {
  const owner = manifest.owners[pageId];
  if (!owner) throw new Error(`No compatibility owner registered for ${pageId}`);
  const blocks = [];
  if (owner.features.includes('calculator')) {
    blocks.push(`<script defer src="${manifest.calculatorLoader}"></script>`);
  }
  for (const script of manifest.scripts) {
    if (!owner.features.includes(script.feature)) continue;
    const code = fs.readFileSync(path.join(root, script.source), 'utf8');
    blocks.push(`<script ${script.attribute}>${code}</script>`);
  }
  return blocks.join('\n') + '\n';
}

if (require.main === module) {
  if (process.argv[2]) process.stdout.write(render(process.argv[2]));
  else process.stdout.write(JSON.stringify(Object.fromEntries(
    Object.keys(manifest.owners).map(id => [id, render(id)])
  ), null, 2) + '\n');
}
module.exports = { render, manifest };

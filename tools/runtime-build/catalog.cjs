/* Regenerate the public technical catalog from the captured release inventory. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const inventory = require('../../config/runtime-inventory-2026-10-14.json');
const targets = require('./targets.cjs');
const rows = [
  '# Referenced JavaScript catalog — 14 October 2026',
  '',
  'Captured staging configuration and static page references, including conditional dependencies. A row is an immutable artifact, not necessarily a request made on every page. Local gzip estimates use level 9. See [the audit](audit-2026-10-14.md) for gates, risks and release status.',
  '',
  '| Artifact | Captured pin | Raw / gzip bytes | Source/build status | Direct consumers or configured route |',
  '| --- | --- | ---: | --- | --- |',
];
for (const asset of inventory.artifacts) {
  const file = asset.file.startsWith('src/service-awards/')
    ? 'dist/tdb-service-awards.js'
    : asset.file;
  const sources = targets[file];
  const status =
    asset.repo !== 'tdb-webflow-runtime'
      ? 'Separate attribution repository; preserve pin'
      : file.endsWith('tdb-swiper-8.4.7.min.js')
        ? 'Pinned vendor build + shared adapter'
        : sources
          ? sources.map((source) => '`' + source + '`').join('<br>')
          : 'Historical compatibility artifact; not rebuilt by canonical manifest';
  const consumers = asset.directConsumers?.length
    ? asset.directConsumers.join(', ')
    : asset.configuration.join(', ');
  rows.push(
    `| \`${asset.file}\` | [${asset.commit.slice(0, 8)}](https://github.com/TheDentalBarns/${asset.repo}/blob/${asset.commit}/${asset.file}) | ${asset.rawBytes} / ${asset.gzipBytes} | ${status} | ${consumers} |`,
  );
}
rows.push(
  '',
  '## Retained dist files outside the canonical JavaScript build',
  '',
  'These are retained for compatibility/history or a separate vendor build. Absence from the captured staging references is not evidence that a production page or older release cannot use them.',
  '',
);
for (const file of fs
  .readdirSync(path.join(root, 'dist'))
  .filter((file) => file.endsWith('.js'))
  .sort()) {
  if (!targets['dist/' + file]) rows.push('- `' + file + '`');
}
fs.mkdirSync(path.join(root, 'docs/runtime'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/runtime/module-catalog.md'), rows.join('\n') + '\n');
console.log('Cataloged ' + inventory.artifacts.length + ' pinned artifacts.');

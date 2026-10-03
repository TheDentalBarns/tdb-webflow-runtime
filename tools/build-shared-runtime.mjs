// Source of truth for the native/shared runtime artifacts. No bundler required:
// these browser IIFEs intentionally stay separate so loaders retain their gates.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entries = {
  'src/shared/modules.js': 'tdb-modules.js',
  'src/shared/motion.js': 'tdb-motion.js',
  'src/shared/drawer.js': 'tdb-drawer.js',
  'src/shared/ticker.js': 'tdb-ticker.js',
  'src/reviews/native/loader.js': 'tdb-reviews-loader.js',
  'src/reviews/native/cms.js': 'tdb-review-cms.js',
  'src/reviews/native/introduction.js': 'tdb-review-introduction.js',
  'src/reviews/native/quotes.js': 'tdb-review-quotes.js',
  'src/reviews/native/cards.js': 'tdb-review-cards.js',
  'src/reviews/native/drawer-content.js': 'tdb-reviews.js',
};
await mkdir(resolve(root, 'dist'), { recursive: true });
for (const [source, artifact] of Object.entries(entries)) {
  const text = await readFile(resolve(root, source), 'utf8');
  const output = resolve(root, 'dist', artifact);
  if (process.argv.includes('--check')) {
    if (await readFile(output, 'utf8') !== text) throw Error(`${artifact} differs from ${source}; run node tools/build-shared-runtime.mjs`);
  } else await writeFile(output, text);
}
console.log(`${process.argv.includes('--check') ? 'Checked' : 'Built'} ${Object.keys(entries).length} shared/native runtime artifacts.`);

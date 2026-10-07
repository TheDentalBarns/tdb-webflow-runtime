// Source of truth for the native/shared runtime artifacts. No bundler required:
// these browser IIFEs intentionally stay separate so loaders retain their gates.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entries = {
  'src/shared/reveal-motion.css': 'tdb-reveal-motion.css',
  'src/sliders/gallery-count.js': 'tdb-gallery-count.js',
  'src/smile-gallery/gallery-page.js': 'tdb-smile-gallery.js',
  'src/styles/tdb-smile-gallery-ui.css': 'tdb-smile-gallery-ui.css',
  'src/team-quotes/team-quotes.js': 'tdb-team-quotes.js',
  'src/partners/loader.js': 'tdb-logo-marquee-loader.js',
  'src/partners/marquee.js': 'tdb-logo-marquee.js',
  'src/shared/modules.js': 'tdb-modules.js',
  'src/shared/motion-policy.js': 'tdb-motion-policy.js',
  'src/shared/motion.js': 'tdb-motion.js',
  'src/shared/dd-loader.js': 'tdb-dd-loader.js',
  'src/shared/dd-bootstrap.js': 'tdb-dd-bootstrap.js',
  'src/shared/dd-memory.js': 'tdb-dd-memory.js',
  'src/shared/dd-fallback.css': 'tdb-dd-fallback.css',
  'src/page-break/loader.js': 'tdb-page-break-loader.js',
  'src/page-break/memory.js': 'tdb-page-break-memory.js',
  'src/shared/filters.js': 'tdb-filters.js',
  'src/shared/drawer.js': 'tdb-drawer.js',
  'src/shared/ticker.js': 'tdb-ticker.js',
  'src/styles/tdb-desktop-carousel-alignment.css': 'tdb-desktop-carousel-alignment.css',
  'src/reviews/native/loader.js': 'tdb-reviews-loader.js',
  'src/reviews/native/cms.js': 'tdb-review-cms.js',
  'src/reviews/native/list-loader.js': 'tdb-review-list-loader.js',
  'src/reviews/native/list.js': 'tdb-review-list.js',
  'src/reviews/native/availability.js': 'tdb-review-availability.js',
  'src/reviews/native/introduction.js': 'tdb-review-introduction.js',
  'src/reviews/native/quotes.js': 'tdb-review-quote-adapter.js',
  'src/reviews/native/cards.js': 'tdb-review-cards.js',
  'src/reviews/native/drawer-content.js': 'tdb-reviews.js',
  'src/five-senses/loader.js': 'tdb-five-senses-loader.js',
  'src/instagram/home-desktop-instagram.js': 'tdb-home-desktop-instagram.js',
  'src/instagram/instagram-feed-bundle.js': 'tdb-instagram-feed.js',
  'src/calculator/calculator.css': 'tdb-calculator.css',
  'src/calculator/loader.js': 'tdb-calculator-loader.js',
};
await mkdir(resolve(root, 'dist'), { recursive: true });
// Compatibility artifact retained; pages load only the shared canonical filename.
const quoteSource = await readFile(resolve(root, 'src/team-quotes/team-quotes.js'), 'utf8');
if (process.argv.includes('--check')) {
  if (await readFile(resolve(root, 'dist/tdb-quote-carousel.js'), 'utf8') !== quoteSource) throw Error('Shared quote carousel differs from source');
} else await writeFile(resolve(root, 'dist/tdb-quote-carousel.js'), quoteSource);
for (const [source, artifact] of Object.entries(entries)) {
  const text = await readFile(resolve(root, source), 'utf8');
  const output = resolve(root, 'dist', artifact);
  if (process.argv.includes('--check')) {
    if (await readFile(output, 'utf8') !== text) throw Error(`${artifact} differs from ${source}; run node tools/build-shared-runtime.mjs`);
  } else await writeFile(output, text);
}
const gallery = (await Promise.all(['src/sliders/gallery-presentation.js', 'src/sliders/gallery-plugin.js'].map(source => readFile(resolve(root, source), 'utf8')))).join('\n');
const galleryOutput = resolve(root, 'dist/tdb-gallery.js');
if (process.argv.includes('--check')) {
  if (await readFile(galleryOutput, 'utf8') !== gallery) throw Error('tdb-gallery.js differs from its presentation/plugin sources');
} else await writeFile(galleryOutput, gallery);
console.log(`${process.argv.includes('--check') ? 'Checked' : 'Built'} ${Object.keys(entries).length} shared/native runtime artifacts.`);

/* Keep authored CSS readable; minify the independently loaded UI outputs.
 * Level 0 changes serialization only. CSS declaration/order parity is verified.
 */
const fs = require('node:fs');
const path = require('node:path');
const CleanCSS = require('clean-css');
const root = path.resolve(__dirname, '../..');
const bundles = {
  'tdb-drawer.css': ['tdb-drawer.css'],
  'tdb-usp-drawer.css': ['tdb-pagination.css', 'tdb-usp-drawer.css'],
  'tdb-review-drawer.css': ['tdb-pagination.css', 'tdb-review-drawer.css'],
  'tdb-partner-card.css': ['tdb-partner-card.css'],
  'tdb-five-senses.css': ['tdb-five-senses.css'],
  'tdb-instagram-native.css': ['tdb-pagination.css', 'tdb-instagram-native.css'],
  'tdb-smile-feed.css': ['tdb-pagination.css', 'tdb-smile-feed.css'],
  'tdb-review-widget.css': ['tdb-review-widget.css'],
  'tdb-review-cards.css': ['tdb-pagination.css', 'tdb-review-cards.css'],
  'tdb-scroll-lock.css': ['tdb-scroll-lock.css'],
  'tdb-vip-chrome.css': ['tdb-vip-chrome.css'],
  'tdb-vip-content.css': ['tdb-vip-content.css'],
  'tdb-ui.css': ['tdb-ui.css'],
  'tdb-ui-critical.css': ['tdb-ui-critical.css'],
  'tdb-control-motion.css': ['tdb-control-motion.css'],
  'tdb-vimeo.css': ['tdb-vimeo-ui.css'],
  'tdb-announcement.css': [
    'tdb-announcement-layout.css',
    'tdb-announcement-chrome.css',
    'tdb-announcement-states.css',
  ],
  'tdb-slider-ui.css': [
    'tdb-slider-chrome.css',
    'tdb-slider-ui.css',
    'tdb-carousel-arrow-states.css',
  ],
};
for (const [output, sources] of Object.entries(bundles)) {
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  if (requested.length && !requested.includes(output)) continue;
  const source = sources
    .map((file) => fs.readFileSync(path.join(root, 'src/styles', file), 'utf8'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const result = new CleanCSS({ level: 0, rebase: false }).minify(source);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  if (result.warnings.length) throw new Error(result.warnings.join('\n'));
  if (!result.styles) throw new Error('Empty UI build: ' + output);
  if (process.argv.includes('--check')) {
    if (
      fs.readFileSync(path.join(root, 'dist', output), 'utf8').replace(/\r\n/g, '\n') !==
      result.styles + '\n'
    )
      throw Error(output + ' is stale; run npm run build');
  } else fs.writeFileSync(path.join(root, 'dist', output), result.styles + '\n');
  console.log('dist/' + output + ': ' + Buffer.byteLength(result.styles + '\n') + ' bytes');
}

/* Keep authored CSS readable; minify the independently loaded UI outputs.
 * Level 0 changes serialization only. CSS declaration/order parity is verified.
 */
const fs = require('node:fs');
const path = require('node:path');
const CleanCSS = require('clean-css');
const root = path.resolve(__dirname, '../..');
const bundles = {
  'tdb-vip-chrome.css': ['tdb-vip-chrome.css'],
  'tdb-ui.css': ['tdb-ui.css'],
  'tdb-vimeo.css': ['tdb-vimeo-ui.css'],
  'tdb-announcement.css': ['tdb-announcement-chrome.css', 'tdb-announcement-states.css'],
  'tdb-slider-ui.css': ['tdb-slider-chrome.css', 'tdb-slider-ui.css', 'tdb-carousel-arrow-states.css'],
};
for (const [output, sources] of Object.entries(bundles)) {
  const source = sources.map(file => fs.readFileSync(path.join(root, 'src/styles', file), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const result = new CleanCSS({level: 0, rebase: false}).minify(source);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  if (result.warnings.length) throw new Error(result.warnings.join('\n'));
  if (!result.styles) throw new Error('Empty UI build: ' + output);
  fs.writeFileSync(path.join(root, 'dist', output), result.styles + '\n');
  console.log('dist/' + output + ': ' + Buffer.byteLength(result.styles + '\n') + ' bytes');
}

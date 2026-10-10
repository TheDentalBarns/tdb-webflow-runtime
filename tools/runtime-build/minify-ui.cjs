/* Keep authored CSS readable; minify only the independently pinned UI output.
 * Level 0 changes serialization only. CSS declaration/order parity is verified.
 */
const fs = require('node:fs');
const path = require('node:path');
const CleanCSS = require('clean-css');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'src/styles/tdb-ui.css'), 'utf8');
const result = new CleanCSS({level: 0, rebase: false}).minify(source);
if (result.errors.length) throw new Error(result.errors.join('\n'));
if (result.warnings.length) throw new Error(result.warnings.join('\n'));
if (!result.styles) throw new Error('Empty global UI build');
fs.writeFileSync(path.join(root, 'dist/tdb-ui.css'), result.styles + '\n');
console.log('dist/tdb-ui.css: ' + Buffer.byteLength(result.styles + '\n') + ' bytes');

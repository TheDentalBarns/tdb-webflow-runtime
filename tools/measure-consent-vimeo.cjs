/* Reproduce byte counts against the immutable assets found on staging. */
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const zlib = require('node:zlib');
const sizes = input => ({bytes: input.length,
  gzip: input.length ? zlib.gzipSync(input, {level: 9}).length : 0,
  brotli: input.length ? zlib.brotliCompressSync(input, {params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: 11}}).length : 0});
const baseline = [
  ['dist/tdb-consent-startup.min.js', '716f48d913168ce00cfcc2546fb594ebe5182ebe'],
  ['dist/tdb-consent.min.js', 'dead3424dcad0607b95fe5b3704ab5247de45869'],
  ['dist/tdb-navbar-loader.js', 'b11d96a66dbab91f7237ad66e570933a1a780b65'],
  ['dist/tdb-vimeo-loader.js', '716f48d913168ce00cfcc2546fb594ebe5182ebe'],
  ['dist/tdb-vimeo.js', '97349848b1d29f0c509d57551393a6e9a49f1d46'],
  ['dist/tdb-vimeo.css', '716f48d913168ce00cfcc2546fb594ebe5182ebe'],
  ['dist/tdb-ui.css', 'd9aede36fbefe928fd108357fb560b2c16c70453'],
];
const rows = baseline.map(([file, ref]) => ({file, ref,
  before: sizes(execFileSync('git', ['show', ref + ':' + file])),
  after: sizes(fs.readFileSync(file))}));
rows.push({file: 'dist/tdb-scroll-lock.css (inserted in existing critical style)',
  before: sizes(Buffer.alloc(0)), after: sizes(fs.readFileSync('dist/tdb-scroll-lock.css'))});
const output = 'docs/consent-vimeo-sizes-20261013.json';
fs.writeFileSync(output, JSON.stringify(rows, null, 2) + '\n');
console.table(rows.map(row => ({file: row.file,
  bytes: row.before.bytes + ' → ' + row.after.bytes,
  gzip: row.before.gzip + ' → ' + row.after.gzip,
  brotli: row.before.brotli + ' → ' + row.after.brotli})));

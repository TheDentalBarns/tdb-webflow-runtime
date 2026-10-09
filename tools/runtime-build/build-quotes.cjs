// Run after npm ci in tools/runtime-build. Keep the readable source intact.
const fs = require('node:fs');
const path = require('node:path');
const terser = require(process.env.TDB_TERSER_MODULE || 'terser');
const root = path.resolve(__dirname, '../..');

(async () => {
  const source = fs.readFileSync(path.join(root, 'src/team-quotes/team-quotes.js'), 'utf8');
  const result = await terser.minify(source, { compress: true, mangle: true });
  if (!result.code) throw new Error('Empty quote carousel build');
  const output = result.code + '\n';
  const target = path.join(root, 'dist/tdb-quote-carousel.min.js');
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(target, 'utf8') !== output) throw new Error('Quote carousel build is stale');
  } else fs.writeFileSync(target, output);
  console.log(`tdb-quote-carousel.min.js: ${Buffer.byteLength(output)} bytes`);
})().catch(error => { console.error(error); process.exitCode = 1; });

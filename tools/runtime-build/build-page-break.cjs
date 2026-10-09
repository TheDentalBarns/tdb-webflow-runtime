const fs = require('node:fs');
const path = require('node:path');
const terser = require('terser');
const root = path.resolve(__dirname, '../..');
(async () => {
  const source = fs.readFileSync(path.join(root, 'src/page-break/loader.js'), 'utf8');
  const output = (await terser.minify(source, { compress: true, mangle: true })).code + '\n';
  const target = path.join(root, 'dist/tdb-page-break-loader.min.js');
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(target, 'utf8') !== output) throw Error('Page-break minified loader differs from source');
  } else fs.writeFileSync(target, output);
  console.log(`${Buffer.byteLength(source)} -> ${Buffer.byteLength(output)} bytes`);
})().catch(error => { console.error(error); process.exitCode = 1; });

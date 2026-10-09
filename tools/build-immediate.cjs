/* Rebuild only the immediate runtime; independent module pins remain in Webflow. */
const fs = require('node:fs');
const path = require('node:path');
const {minify} = require(process.env.TDB_TERSER || path.join(__dirname, 'runtime-build/node_modules/terser'));
(async () => {
  const root = path.resolve(__dirname, '..');
  const files = ['src/shared/rendered-progress.js', 'src/sliders/parallax.js', 'src/runtime/immediate-runtime-batch.js'];
  const input = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
  const result = await minify(input, {compress: true, mangle: true, format: {comments: false}});
  fs.writeFileSync(path.join(root, 'dist/tdb-immediate-runtime-batch.min.js'), result.code + '\n');
  console.log('Immediate runtime:', Buffer.byteLength(result.code), 'bytes');
})().catch(error => {console.error(error); process.exitCode = 1;});

/* Build the startup controller with the existing shared lock, not the motion engine. */
const fs = require('node:fs');
const path = require('node:path');
const {minify} = require(process.env.TDB_TERSER || path.join(__dirname, 'runtime-build/node_modules/terser'));
(async () => {
  const files = ['src/shared/scroll-lock.js', 'src/consent/banner.js'];
  const root = path.resolve(__dirname, '..');
  const input = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
  const result = await minify(input, {compress: true, mangle: true, format: {comments: false}});
  fs.writeFileSync(path.join(root, 'dist/tdb-consent-startup.min.js'), result.code + '\n');
  console.log('Consent startup:', Buffer.byteLength(result.code), 'bytes');
  const bridge = fs.readFileSync(path.join(root, 'src/consent/consent.js'), 'utf8');
  const bridgeResult = await minify(bridge, {compress: true, mangle: true, format: {comments: false}});
  fs.writeFileSync(path.join(root, 'dist/tdb-consent.js'), bridge);
  fs.writeFileSync(path.join(root, 'dist/tdb-consent.min.js'), bridgeResult.code + '\n');
  console.log('Consent bridge:', Buffer.byteLength(bridgeResult.code), 'bytes');
})();

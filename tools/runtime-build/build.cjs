const fs = require('node:fs');
const path = require('node:path');
const terser = require(process.env.TDB_TERSER_MODULE || 'terser');
const root = path.resolve(__dirname, '../..');
const targets = [
  { source: ['src/vip-drawer/vip-focus.js', 'src/runtime/site-asset-loader.js'], output: 'dist/tdb-footer-runtime.min.js' },
  { source: ['src/runtime/immediate-runtime-batch.js'], output: 'dist/tdb-immediate-runtime-batch.min.js' },
  { source: ['src/vip-drawer/vip-drawer.js'], output: 'dist/tdb-vip-drawer.js', newline: true },
  { source: ['src/vip-drawer/vip-drawer-legacy.js'], output: 'dist/tdb-vip-drawer-legacy.js', newline: true },
];
(async () => {
  for (const target of targets) {
    const inputs = Object.fromEntries(target.source.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
    const result = await terser.minify(inputs, { compress: true, mangle: true });
    if (!result.code) throw new Error(`Empty build: ${target.output}`);
    const output = result.code + (target.newline ? '\n' : '');
    fs.writeFileSync(path.join(root, target.output), output);
    process.stdout.write(`${target.output}: ${Buffer.byteLength(output)} bytes\n`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

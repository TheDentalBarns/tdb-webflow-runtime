const fs = require('node:fs');
const path = require('node:path');
const terser = require(process.env.TDB_TERSER_MODULE || 'terser');
const root = path.resolve(__dirname, '../..');
const targets = [
  { source: ['src/navbar/navbar.js'], output: 'dist/tdb-navbar.min.js', newline: true },
  { source: ['src/sliders/slider-focus.js', 'src/sliders/sliders.js'], output: 'dist/tdb-sliders.js', newline: true },
  { source: ['src/tooltips/tooltips.js'], output: 'dist/tdb-tooltips.js', newline: true },
  { source: ['src/vip-drawer/vip-focus.js', 'src/runtime/deferred-ui.js', 'src/runtime/site-asset-loader.js'], output: 'dist/tdb-footer-runtime.min.js' },
  { source: ['src/sliders/parallax-controls.js', 'src/runtime/immediate-runtime-batch.js'], output: 'dist/tdb-immediate-runtime-batch.min.js' },
  { source: ['src/vip-drawer/vip-drawer.js'], output: 'dist/tdb-vip-drawer.js', newline: true },
  { source: ['src/vip-drawer/vip-drawer-legacy.js'], output: 'dist/tdb-vip-drawer-legacy.js', newline: true },
];
(async () => {
  for (const target of targets) {
    const requested = process.argv.slice(2);
    if (requested.length && !requested.includes(target.output)) continue;
    const inputs = Object.fromEntries(target.source.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
    const result = await terser.minify(inputs, { compress: true, mangle: true });
    if (!result.code) throw new Error(`Empty build: ${target.output}`);
    const output = result.code + (target.newline ? '\n' : '');
    fs.writeFileSync(path.join(root, target.output), output);
    process.stdout.write(`${target.output}: ${Buffer.byteLength(output)} bytes\n`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

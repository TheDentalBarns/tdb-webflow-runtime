/* Reproducible, independent builds for the homepage preservation releases.
 * Only named targets are built; unrelated deployed assets retain their pins. */
const fs = require('node:fs');
const path = require('node:path');
const {minify} = require('terser');
const root = path.resolve(__dirname, '../..');
const targets = {
  'dist/tdb-modules.js': ['src/shared/modules.js'],
  'dist/tdb-gallery.js': ['src/sliders/gallery-presentation.js', 'src/sliders/gallery-plugin.js'],
  'dist/tdb-parallax.js': ['src/sliders/treatment-plugin.js', 'src/sliders/parallax-plugin.js'],
  'dist/tdb-drawer.js': ['src/shared/scroll-lock.js', 'src/shared/site-chrome.js',
    'src/shared/carousel-controls.js', 'src/shared/drawer-reading.js', 'src/shared/drawer.js'],
  'dist/tdb-footer-runtime.min.js': ['src/runtime/initial-position.js', 'src/banner/loader.js',
    'src/vip-drawer/vip-focus.js', 'src/runtime/deferred-ui.js', 'src/runtime/site-asset-loader.js'],
  'dist/tdb-vip-drawer.js': ['src/shared/panel-motion.js', 'src/vip-drawer/vip-drawer.js'],
  'dist/tdb-consent-startup.min.js': ['src/shared/scroll-lock.js', 'src/consent/banner.js'],
};
(async () => {
  const requested = process.argv.slice(2);
  if (!requested.length) throw new Error('Specify one or more output paths');
  for (const output of requested) {
    if (!targets[output]) throw new Error('Unknown target: ' + output);
    const sources = targets[output].map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]);
    const input = output.includes('consent-startup') ? Object.fromEntries(sources) : sources.map(([,s])=>s).join('\n');
    const result = await minify(input, {compress:true, mangle:true, format:{comments:false}});
    if (!result.code) throw new Error('Empty build: ' + output);
    fs.writeFileSync(path.join(root, output), result.code + '\n');
    console.log(output + ': ' + Buffer.byteLength(result.code + '\n') + ' bytes');
  }
})().catch(error => {console.error(error);process.exitCode=1;});

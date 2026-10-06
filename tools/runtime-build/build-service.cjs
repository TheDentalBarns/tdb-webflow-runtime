/* Builds early parallax preparation, independent carousel plugins and loaders. */
const fs = require('node:fs');
const path = require('node:path');
const terser = require(process.env.TDB_TERSER_MODULE || 'terser');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const targets = {
  'dist/tdb-motion-policy.min.js': ['src/shared/motion-policy.js'],
  'dist/tdb-immediate-runtime-batch.min.js': ['src/sliders/parallax.js', 'src/runtime/immediate-runtime-batch.js'],
  'dist/tdb-sliders.js': ['src/sliders/sliders.js'],
  'dist/tdb-parallax.js': ['src/sliders/parallax-plugin.js'],
  'dist/tdb-gallery.js': ['src/sliders/gallery-plugin.js'],
  'dist/tdb-slider-focus.js': ['src/shared/slider-focus.js'],
  'dist/tdb-vip-drawer.js': ['src/shared/panel-motion.js', 'src/vip-drawer/vip-motion.js', 'src/vip-drawer/vip-drawer.js'],
  'dist/tdb-vip-drawer-legacy.js': ['src/shared/panel-motion.js', 'src/vip-drawer/vip-motion.js', 'src/vip-drawer/vip-drawer-legacy.js'],
  'dist/tdb-footer-runtime.min.js': ['src/banner/announcement.js', 'src/vip-drawer/vip-focus.js', 'src/runtime/deferred-ui.js', 'src/runtime/site-asset-loader.js'],
};
(async () => {
  for (const [output, sources] of Object.entries(targets)) {
    const requested = process.argv.slice(2);
    if (requested.length && !requested.includes(output)) continue;
    const result = await terser.minify(sources.map(read).join('\n'), {compress:true,mangle:true});
    if (!result.code) throw new Error('Empty build: ' + output);
    fs.writeFileSync(path.join(root, output), result.code + '\n');
  }
  const requested = process.argv.slice(2);
  if (!requested.length || requested.includes('dist/tdb-banner-parallax.css'))
    fs.copyFileSync(path.join(root,'src/styles/tdb-banner-parallax.css'),path.join(root,'dist/tdb-banner-parallax.css'));
})().catch(error => { console.error(error); process.exitCode = 1; });

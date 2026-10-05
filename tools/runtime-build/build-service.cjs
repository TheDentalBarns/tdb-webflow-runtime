/* Builds the shared parallax module in the existing immediate entry point. */
const fs = require('node:fs');
const path = require('node:path');
const terser = require(process.env.TDB_TERSER_MODULE || 'terser');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const targets = {
  'dist/tdb-immediate-runtime-batch.min.js': ['src/sliders/parallax.js', 'src/runtime/immediate-runtime-batch.js'],
  'dist/tdb-sliders.js': ['src/sliders/sliders.js'],
  'dist/tdb-footer-runtime.min.js': ['src/banner/announcement.js', 'src/vip-drawer/vip-focus.js', 'src/runtime/deferred-ui.js', 'src/runtime/site-asset-loader.js'],
};
(async () => {
  for (const [output, sources] of Object.entries(targets)) {
    const result = await terser.minify(sources.map(read).join('\n'), {compress:true,mangle:true});
    if (!result.code) throw new Error('Empty build: ' + output);
    fs.writeFileSync(path.join(root, output), result.code + '\n');
  }
  fs.copyFileSync(path.join(root,'src/styles/tdb-banner-parallax.css'),path.join(root,'dist/tdb-banner-parallax.css'));
})().catch(error => { console.error(error); process.exitCode = 1; });

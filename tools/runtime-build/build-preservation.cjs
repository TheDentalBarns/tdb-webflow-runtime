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
  'dist/tdb-reviews.js': ['src/reviews/native/drawer-content.js'],
  'dist/tdb-review-cards.js': ['src/reviews/native/cards.js'],
  'dist/tdb-vip-form.js': ['src/forms/vip-form.js'],
  'dist/tdb-five-senses-loader.js': ['src/five-senses/loader.js'],
  'dist/tdb-five-senses.js': ['src/five-senses/scene-renderer.js', 'src/five-senses/five-senses.js'],
  'dist/tdb-quote-carousel.js': ['src/team-quotes/team-quotes.js'],
  'dist/tdb-quote-carousel.min.js': ['src/team-quotes/team-quotes.js'],
  'dist/tdb-drawer.js': ['src/shared/scroll-lock.js', 'src/shared/site-chrome.js',
    'src/shared/carousel-controls.js', 'src/shared/drawer-reading.js', 'src/shared/drawer.js'],
  'dist/tdb-footer-runtime.min.js': ['src/runtime/initial-position.js', 'src/banner/loader.js',
    'src/vip-drawer/vip-focus.js', 'src/runtime/deferred-ui.js', 'src/runtime/site-asset-loader.js'],
  'dist/tdb-vip-drawer.js': ['src/shared/panel-motion.js', 'src/vip-drawer/vip-drawer.js'],
  'dist/tdb-consent-startup.min.js': ['src/shared/scroll-lock.js', 'src/consent/banner.js'],
  'dist/tdb-navbar-loader.js': ['src/navbar/navbar-state.js', 'src/shared/scroll-lock.js',
    'src/navbar/navbar-mobile-lock.js', 'src/navbar/navbar-loader.js'],
  'dist/tdb-navbar.min.js': ['src/shared/panel-motion.js', 'src/navbar/navbar-enhancement.js'],
};
(async () => {
  const requested = process.argv.slice(2);
  if (!requested.length) throw new Error('Specify one or more output paths');
  for (const output of requested) {
    if (!targets[output]) throw new Error('Unknown target: ' + output);
    const sources = targets[output].map(file => {
      let source = fs.readFileSync(path.join(root, file), 'utf8');
      if (file === 'src/five-senses/five-senses.js') {
        source = source.replace(/^import \{SceneRenderer\} from '\.\/scene-renderer\.js';\n/, '');
      }
      if (file === 'src/navbar/navbar-enhancement.js') {
        for (const [marker, cssFile] of [['__TDB_NAV_STATE_CSS__','tdb-navbar-state.css'],
          ['__TDB_NAV_DESKTOP_CSS__','tdb-navbar-desktop.css']]) {
          const css = fs.readFileSync(path.join(root, 'src/styles', cssFile), 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
          source = source.replace(marker, JSON.stringify(css));
        }
      }
      return [file, source];
    });
    const input = output.includes('consent-startup') ? Object.fromEntries(sources) : sources.map(([,s])=>s).join('\n');
    if (output.startsWith('dist/tdb-five-senses')) {
      fs.writeFileSync(path.join(root, output), input + (output === 'dist/tdb-five-senses.js' ? '\n' : ''));
      continue;
    }
    if (output === 'dist/tdb-quote-carousel.js') {
      fs.writeFileSync(path.join(root, output), input); continue;
    }
    const result = await minify(input, {compress:true, mangle:true, format:{comments:false},
      ...(output.includes('navbar') ? {ecma:2020} : {})});
    if (!result.code) throw new Error('Empty build: ' + output);
    fs.writeFileSync(path.join(root, output), result.code + '\n');
    console.log(output + ': ' + Buffer.byteLength(result.code + '\n') + ' bytes');
  }
})().catch(error => {console.error(error);process.exitCode=1;});

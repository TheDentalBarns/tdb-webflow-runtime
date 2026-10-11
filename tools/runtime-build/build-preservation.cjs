/* Reproducible, independent builds for the homepage preservation releases.
 * Only named targets are built; unrelated deployed assets retain their pins. */
const fs = require('node:fs');
const path = require('node:path');
const {minify} = require('terser');
const root = path.resolve(__dirname, '../..');
const targets = require('./targets.cjs');
(async () => {
  const requested = process.argv.slice(2);
  if (!requested.length) throw new Error('Specify one or more output paths');
  for (const output of requested) {
    if (!targets[output]) throw new Error('Unknown target: ' + output);
    const sources = targets[output].map(file => {
      let source = fs.readFileSync(path.join(root, file), 'utf8');
      if (source.includes('__TDB_REVIEW_DRAWER_HTML__')) {
        source = source.replace('__TDB_REVIEW_DRAWER_HTML__', JSON.stringify(
          fs.readFileSync(path.join(root, 'src/reviews/native/drawer-template.html'), 'utf8').trim()
        ));
      }
      for (const [marker, file] of Object.entries({
        __TDB_PARTNER_CARD_HTML__: 'src/logo-marquee/card-template.html',
        __TDB_USP_DRAWER_HTML__: 'src/usp/drawer-template.html',
        __TDB_USP_SOURCES_HTML__: 'src/usp/drawer-sources.html'
      })) {
        if (source.includes(marker)) source = source.replace(marker, JSON.stringify(fs.readFileSync(path.join(root, file), 'utf8').trim()));
      }
      const embeddedStyles = {
        '__TDB_NATIVE_FOUNDATION_CSS__': ['src/styles/tdb-native-foundation.css', 'src/styles/tdb-phone-landscape.css'],
        '__TDB_PARTNER_CONTROLS_CSS__': ['src/styles/tdb-partner-controls.css'],
        '__TDB_VIP_RUNTIME_CSS__': ['src/styles/tdb-vip-runtime-states.css'],
      };
      for (const [marker, files] of Object.entries(embeddedStyles)) {
        if (!source.includes(marker)) continue;
        const css = files.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')
          .replace(/\/\*[\s\S]*?\*\//g, '').trim();
        source = source.replace(marker, JSON.stringify(css));
      }
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
    if (output.endsWith('.css')) {
      const result = new (require('clean-css'))({level:0}).minify(input);
      if (result.errors.length) throw new Error(result.errors.join('\n'));
      fs.writeFileSync(path.join(root, output), result.styles + '\n');
      console.log(output + ': ' + Buffer.byteLength(result.styles + '\n') + ' bytes');
      continue;
    }
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

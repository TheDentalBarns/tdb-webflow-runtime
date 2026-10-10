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

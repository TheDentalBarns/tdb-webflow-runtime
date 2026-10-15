/* Deterministic classic-script/ES-module builds. Never changes Webflow or pins. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { minify } = require('terser');
const root = path.resolve(__dirname, '../..');
const targets = require('./targets.cjs');
// These compatibility entries share private source helpers, not window globals
// or an additional dependency request. Their existing window APIs stay public.
const isolated = new Set([
  'dist/tdb-home-desktop-instagram.js',
  'dist/tdb-instagram-feed.js',
  'dist/tdb-first-impressions.js',
  'dist/tdb-legacy-review-drawer.js',
]);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex');
const sizes = (text) => ({
  raw: Buffer.byteLength(text),
  gzip: zlib.gzipSync(text, { level: 9 }).length,
  brotli: zlib.brotliCompressSync(text, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    },
  }).length,
});
function source(file) {
  let code = read(file);
  const styles = {
    __TDB_NATIVE_FOUNDATION_CSS__: ['tdb-native-foundation.css', 'tdb-phone-landscape.css'],
    __TDB_PARTNER_CONTROLS_CSS__: ['tdb-partner-controls.css'],
    __TDB_VIP_RUNTIME_CSS__: ['tdb-vip-runtime-states.css'],
    __TDB_NAV_STATE_CSS__: ['tdb-navbar-state.css'],
    __TDB_NAV_DESKTOP_CSS__: ['tdb-navbar-desktop.css'],
  };
  for (const [marker, files] of Object.entries(styles)) {
    if (!code.includes(marker)) continue;
    const css = files
      .map((name) => read('src/styles/' + name))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
    code = code.replaceAll(marker, JSON.stringify(css));
  }
  if (file === 'src/five-senses/five-senses.js') {
    code = code.replace(
      /^import\s*\{\s*SceneRenderer\s*\}\s*from\s*['"]\.\/scene-renderer\.js['"];?\s*/m,
      '',
    );
  }
  if (/__TDB_[A-Z_]+__/.test(code)) throw Error('Unresolved build marker: ' + file);
  return code;
}
async function build(output, { readable = false } = {}) {
  if (!targets[output]) throw Error('Unknown target: ' + output);
  const assembled = targets[output].map(source).join('\n;\n');
  const input = isolated.has(output)
    ? "(() => { 'use strict';\n" + assembled + '\n})();'
    : assembled;
  if (readable)
    return require('prettier').format(input, {
      parser: 'babel',
      singleQuote: true,
      printWidth: 100,
    });
  const result = await minify(input, {
    module: output === 'dist/tdb-five-senses.js',
    compress: { passes: 3, unsafe: false },
    // Window exports, DOM attributes and cross-file property names are contracts.
    mangle: { properties: false },
    format: { comments: /^!|@license|@preserve/ },
    ...(output.includes('navbar') ? { ecma: 2020 } : {}),
  });
  if (!result.code) throw Error('Empty build: ' + output);
  return result.code + '\n';
}
async function main() {
  const args = process.argv.slice(2),
    check = args.includes('--check');
  const readable = args.includes('--readable'),
    all = args.includes('--all');
  const requested = args.filter((arg) => !arg.startsWith('--'));
  if (args.some((arg) => arg.startsWith('--') && !['--check', '--all', '--readable'].includes(arg)))
    throw Error('Unknown build option');
  if (all && requested.length) throw Error('Use --all or named targets');
  const outputs = all ? Object.keys(targets).sort() : requested;
  if (!outputs.length) throw Error('Specify --all or one or more output paths');
  const report = {};
  for (const output of outputs) {
    const code = await build(output, { readable });
    const destination = readable ? 'readable/' + path.basename(output) : output;
    if (check) {
      if (!fs.existsSync(path.join(root, destination)) || read(destination) !== code)
        throw Error(destination + ' is stale; run npm run build');
    } else {
      fs.mkdirSync(path.dirname(path.join(root, destination)), { recursive: true });
      fs.writeFileSync(path.join(root, destination), code);
    }
    report[output] = { sources: targets[output], sha256: hash(code), ...sizes(code) };
    if (!readable) {
      const prettyPath = 'readable/' + path.basename(output);
      const pretty = await build(output, { readable: true });
      if (check) {
        if (!fs.existsSync(path.join(root, prettyPath)) || read(prettyPath) !== pretty)
          throw Error(prettyPath + ' is stale; run npm run build');
      } else {
        fs.mkdirSync(path.join(root, 'readable'), { recursive: true });
        fs.writeFileSync(path.join(root, prettyPath), pretty);
      }
    }
    console.log(
      `${check ? 'Checked' : 'Built'} ${destination}: ${report[output].raw} B (${report[output].gzip} B gzip)`,
    );
  }
  if (all && !readable) {
    const destination = 'config/build-artifacts.json';
    const code =
      JSON.stringify(
        {
          tool: 'terser@5.44.0',
          compression: '3 safe passes; no property mangling',
          note: 'Local gzip/Brotli estimates, not measured CDN transfer sizes or initial-page totals.',
          outputs: report,
        },
        null,
        2,
      ) + '\n';
    if (check) {
      if (read(destination) !== code) throw Error(destination + ' is stale');
    } else fs.writeFileSync(path.join(root, destination), code);
  }
}
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
module.exports = { build, targets };

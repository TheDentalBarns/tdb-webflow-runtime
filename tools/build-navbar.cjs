/* Build the immediate loader/shared controls and consent-gated enhancement. */
const fs = require('node:fs');
const path = require('node:path');
const { minify } = require('terser');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const css = file => read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
(async () => {
  const shared = ['src/navbar/navbar-state.js','src/shared/scroll-lock.js','src/navbar/navbar-mobile-lock.js'];
  const loader = shared.map(read).join('\n') + '\n' + read('src/navbar/navbar-loader.js');
  const enhancement = read('src/navbar/navbar-enhancement.js')
    .replace('__TDB_NAV_STATE_CSS__', JSON.stringify(css('src/styles/tdb-navbar-state.css')))
    .replace('__TDB_NAV_DESKTOP_CSS__', JSON.stringify(css('src/styles/tdb-navbar-desktop.css')));
  for (const [file, source] of [
    ['dist/tdb-navbar-loader.js', loader],
    ['dist/tdb-navbar.min.js', enhancement],
    ['dist/tdb-immediate-runtime-batch.min.js', read('src/runtime/immediate-runtime-batch.js')]
  ]) {
    const result = await minify(source, { ecma: 2020, compress: true, mangle: true });
    fs.writeFileSync(path.join(root, file), result.code + '\n');
  }
})();

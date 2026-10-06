/* Builds the essential navbar and footer from their canonical sources.
 * Existing immediate/Vimeo/review releases are intentionally independent. */
const fs = require('node:fs');
const path = require('node:path');
const terser = require(process.env.TDB_TERSER_MODULE || 'terser');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const css = file => read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
const targets = ['dist/tdb-navbar.min.js', 'dist/tdb-navbar-loader.js', 'dist/tdb-footer-runtime.min.js'];
(async () => {
  for (const output of targets) {
    const requested = process.argv.slice(2);
    if (requested.length && !requested.includes(output)) continue;
    let input;
    if (output === 'dist/tdb-navbar.min.js') {
      input = `(() => {
        if (window.TDBNavbar || !document.querySelector('.navbar10_component')) return;
        const install = () => {
        if (window.TDBNavbar) return;
        const TDB_NAV_DESKTOP_CSS = ${JSON.stringify(css('src/navbar/desktop-state.css'))};
        const style = document.createElement('style');
        style.dataset.tdbNavbarState = '';
        style.textContent = ${JSON.stringify(css('src/navbar/nav-state.css'))};
        // Preserve the old head block's cascade ahead of page entrance fades.
        const anchor = document.querySelector('[data-tdb-navbar-motion-anchor]');
        if (anchor) anchor.after(style); else document.head.append(style);
        ${read('src/shared/panel-motion.js')}
        ${['nav-motion', 'navbar', 'nav-clear-cycle', 'desktop-dropdowns', 'nav-surfaces'].map(name => read('src/navbar/' + name + '.js')).join('\n')}
        window.TDBNavbar = Object.freeze({version:'1.4.1'});
        };
        if (window.TDBNavbarLoader) window.TDBNavbarLoader.register(install); else install();
      })();`;
    } else if (output === 'dist/tdb-navbar-loader.js') {
      input = read('src/loaders/navbar-loader.js');
    } else {
      input = ['src/banner/announcement.js', 'src/vip-drawer/vip-focus.js',
        'src/runtime/deferred-ui.js', 'src/runtime/site-asset-loader.js'].map(read).join('\n');
    }
    const result = await terser.minify(input, {compress:true, mangle:true});
    if (!result.code) throw new Error('Empty build: ' + output);
    fs.writeFileSync(path.join(root, output), result.code + '\n');
    process.stdout.write(`${output}: ${Buffer.byteLength(result.code) + 1} bytes\n`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

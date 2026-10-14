/* Use the canonical manifest so local and CI bundles stay identical. */
const {execFileSync} = require('node:child_process');
const path = require('node:path');
execFileSync(process.execPath, [path.join(__dirname, 'runtime-build/build-preservation.cjs'), 'dist/tdb-navbar-loader.js', 'dist/tdb-navbar.min.js'], {stdio:'inherit'});

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/usp/usp-drawer.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/usp/usp-drawer.css'), 'utf8');
fs.writeFileSync(path.join(root, 'dist/tdb-usp-drawer.js'), source.replace('__USP_CSS__', JSON.stringify(css)));

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/reviews/review-drawer.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/reviews/review-drawer.css'), 'utf8');
fs.writeFileSync(path.join(root, 'dist/tdb-reviews.js'), source.replace('__DRAWER_CSS__', JSON.stringify(css)));
fs.copyFileSync(path.join(root, 'src/styles/tdb-mobile-review-drawer.css'), path.join(root, 'dist/tdb-mobile-review-drawer.css'));

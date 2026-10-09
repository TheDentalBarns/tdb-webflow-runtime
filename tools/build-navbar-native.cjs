// Build with Node and terser available (npm install --no-save terser).
const fs = require('node:fs');
const path = require('node:path');
const { minify } = require('terser');
const root = path.resolve(__dirname, '..');
(async () => {
  const js = ['src/shared/disclosure.js', 'src/navbar/navbar-native.js']
    .map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  const result = await minify(js, { ecma: 2020, compress: true, mangle: true });
  fs.writeFileSync(path.join(root, 'dist/tdb-navbar-native.js'), result.code + '\n');
  const css = ['src/styles/tdb-disclosure.css', 'src/styles/tdb-navbar-native.css']
    .map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
    // A space before :is() can be a descendant combinator. Preserve colons.
    .replace(/\s*([{};,])\s*/g, '$1')
    // Preserve selector descendant spaces and calc() operators. These lexical
    // reductions keep the identical sampled easing curves inside the head cap.
    .replace(/([(:,\s])0\.(\d)/g, '$1.$2')
    .replace(/:\s+/g, ':').replace(/\s*>\s*/g, '>')
    .replace(/;}/g, '}').trim();
  fs.writeFileSync(path.join(root, 'dist/tdb-navbar-native.css'), css + '\n');
})();

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const CleanCSS = require('clean-css');
const root = path.resolve(__dirname, '../..');
const css = fs.readFileSync(path.join(root, 'src/styles/tdb-ui.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const result = new CleanCSS({level: 0, rebase: false}).minify(css);
assert.deepEqual(result.errors, []);
assert.deepEqual(result.warnings, []);
assert.equal(fs.readFileSync(path.join(root, 'dist/tdb-ui.css'), 'utf8'), result.styles + '\n');
console.log('Global UI artifact matches its readable sources');

const criticalSource = fs.readFileSync(path.join(root, 'src/styles/tdb-ui-critical.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const critical = new CleanCSS({level: 0, rebase: false}).minify(criticalSource);
assert.deepEqual(critical.errors, []);
assert.deepEqual(critical.warnings, []);
assert.equal(fs.readFileSync(path.join(root, 'dist/tdb-ui-critical.css'), 'utf8'), critical.styles + '\n');
assert.ok(!critical.styles.includes('--tdb-ui-ready'), 'Inline CSS must not announce full UI readiness');
for (const rule of ['[data-fade-slide]', '[data-tdb-navbar-native]:not([data-tdb-nav-enhanced])', '@keyframes tdbBtnPulseOpacity', 'tdb-phone-landscape']) {
  assert.ok(critical.styles.includes(rule), 'Missing first-paint rule: ' + rule);
}
console.log('Critical UI artifact matches its sources; full UI readiness stays external');

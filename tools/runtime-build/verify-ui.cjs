const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const CleanCSS = require('clean-css');

function assertCriticalContract(css) {
  const tree = postcss.parse(css);
  const guards = new Map([
    ['[data-tdb-navbar-native]:not([data-tdb-nav-enhanced])', ['transition', 'animation']],
    ['[data-tdb-navbar-native]:not([data-tdb-nav-enhanced]) *', ['transition', 'animation']],
    ['html:not([data-tdb-control-motion]) [data-tdb-chevron]', ['transition']],
    ['html:not([data-tdb-control-motion]) [data-tdb-disclosure-item]', ['transition']],
  ]);
  const values = new Map([...guards.keys()].map((selector) => [selector, new Map()]));
  tree.walkDecls((decl) => {
    assert.notEqual(decl.prop, '--tdb-ui-ready', 'Inline CSS must not announce full UI readiness');
  });
  tree.walkAtRules('property', (rule) => {
    assert.notEqual(
      rule.params,
      '--tdb-ui-ready',
      'Inline CSS must not announce full UI readiness',
    );
  });
  tree.walkRules((rule) => {
    // A first-paint guard must apply unconditionally, not only inside a media/supports branch.
    if (rule.parent.type !== 'root') return;
    for (const selector of postcss.list.comma(rule.selector)) {
      const declarations = values.get(selector);
      if (!declarations) continue;
      rule.walkDecls((decl) => {
        const previous = declarations.get(decl.prop);
        if (!previous?.important || decl.important) declarations.set(decl.prop, decl);
      });
    }
  });
  for (const [selector, properties] of guards)
    for (const property of properties) {
      const declaration = values.get(selector).get(property);
      assert.ok(
        declaration?.value === 'none' && declaration.important,
        `Missing early control guard: ${selector} { ${property}:none!important }`,
      );
    }
}

function verifyUIArtifacts(root = path.resolve(__dirname, '../..')) {
  for (const name of ['tdb-ui.css', 'tdb-ui-critical.css']) {
    const source = fs
      .readFileSync(path.join(root, 'src/styles', name), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const result = new CleanCSS({ level: 0, rebase: false }).minify(source);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
    assert.equal(fs.readFileSync(path.join(root, 'dist', name), 'utf8'), result.styles + '\n');
    if (name === 'tdb-ui-critical.css') assertCriticalContract(result.styles);
  }
}

if (require.main === module) {
  verifyUIArtifacts();
  console.log('UI artifacts match their sources; early control guards precede full UI readiness');
}

module.exports = { assertCriticalContract, verifyUIArtifacts };

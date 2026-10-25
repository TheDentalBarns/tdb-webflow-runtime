const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { assertCriticalContract } = require('../tools/runtime-build/verify-ui.cjs');
const critical = fs.readFileSync('dist/tdb-ui-critical.css', 'utf8');

test('current critical UI preserves early control guards without obsolete feature rules', () => {
  assert.doesNotThrow(() => assertCriticalContract(critical));
});

test('missing descendant, chevron or disclosure protection fails the critical contract', () => {
  for (const selector of [
    '[data-tdb-navbar-native]:not([data-tdb-nav-enhanced]) *',
    'html:not([data-tdb-control-motion]) [data-tdb-chevron]',
    'html:not([data-tdb-control-motion]) [data-tdb-disclosure-item]',
  ]) {
    assert.throws(
      () => assertCriticalContract(critical.replace(selector, '.unprotected')),
      /Missing early control guard/,
    );
  }
});

test('early protection must defeat existing native motion and cannot claim full UI readiness', () => {
  assert.throws(
    () => assertCriticalContract(critical.replaceAll('!important', '')),
    /Missing early control guard/,
  );
  assert.throws(
    () => assertCriticalContract(critical + 'html{--tdb-ui-ready:1}'),
    /full UI readiness/,
  );
  assert.throws(
    () =>
      assertCriticalContract(
        critical + '@property --tdb-ui-ready{syntax:"<number>";inherits:false;initial-value:1}',
      ),
    /full UI readiness/,
  );
  assert.throws(
    () => assertCriticalContract('@media(max-width:479px){' + critical + '}'),
    /Missing early control guard/,
  );
  assert.throws(
    () =>
      assertCriticalContract(
        critical +
          '[data-tdb-navbar-native]:not([data-tdb-nav-enhanced]){animation:pulse 1s!important}',
      ),
    /Missing early control guard/,
  );
});

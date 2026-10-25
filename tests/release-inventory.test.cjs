const test = require('node:test');
const assert = require('node:assert/strict');
const { assetReferences, auditRelease } = require('../tools/runtime-build/release-inventory.cjs');

function fixture() {
  return {
    release: {
      javascript: ['dist/tdb-entry.js', 'dist/tdb-review-widget.js'],
      styles: ['dist/tdb-review-widget.css', 'dist/tdb-vimeo.css'],
      assets: [],
      compatibilityOnly: ['dist/tdb-modules.js'],
      compatibilityFallbacks: {
        'dist/tdb-modules.js': {
          sources: ['entry.js'],
          reason: 'A direct legacy entry can bootstrap its missing registry.',
        },
      },
    },
    targets: {
      'dist/tdb-entry.js': ['entry.js'],
      'dist/tdb-review-widget.js': ['widget.js'],
      'dist/tdb-modules.js': ['modules.js'],
    },
    read: (file) =>
      file === 'entry.js'
        ? `load('tdb-review-widget.js'); load('tdb-review-widget.css'); load('tdb-vimeo.css');
         if (!window.TDBModules) load('tdb-modules.js');`
        : '',
  };
}

test('literal asset discovery ignores comments and accepts both release-relative forms', async () => {
  const found = await assetReferences(`
    // Historical 'tdb-retired.js' is not a dependency.
    /* Neither is "tdb-old.css". */
    load('tdb-current.js'); const styles = ['dist/tdb-current.css'];
    load('https://example.com/tdb-external.js');
  `);
  assert.deepEqual([...found].sort(), ['dist/tdb-current.css', 'dist/tdb-current.js']);
});

test('valid active dependencies and explicit compatibility fallback pass', async () => {
  assert.deepEqual((await auditRelease(fixture())).errors, []);
});

test('omitting a built module fails even if no active source names it', async () => {
  const input = fixture();
  input.release.javascript = ['dist/tdb-entry.js'];
  input.read = () => '';
  input.release.compatibilityFallbacks = {};
  assert.ok(
    (await auditRelease(input)).errors.includes(
      'Unclassified JavaScript build target: dist/tdb-review-widget.js',
    ),
  );
});

test('omitting either deferred stylesheet is caught from the active source', async () => {
  for (const missing of ['dist/tdb-review-widget.css', 'dist/tdb-vimeo.css']) {
    const input = fixture();
    input.release.styles = input.release.styles.filter((asset) => asset !== missing);
    assert.ok(
      (await auditRelease(input)).errors.includes(
        `entry.js references undeclared asset ${missing}`,
      ),
    );
  }
});

test('compatibility use requires an explicit current source and reason', async () => {
  const input = fixture();
  input.release.compatibilityFallbacks = {};
  assert.ok(
    (await auditRelease(input)).errors.includes(
      'entry.js references unclassified compatibility fallback dist/tdb-modules.js',
    ),
  );
  input.release.compatibilityFallbacks = {
    'dist/tdb-modules.js': { sources: ['retired.js'], reason: 'Old entry' },
  };
  assert.ok(
    (await auditRelease(input)).errors.includes(
      'Stale compatibility fallback: retired.js -> dist/tdb-modules.js',
    ),
  );
});

test('a file cannot be classified as both active and compatibility-only', async () => {
  const input = fixture();
  input.release.compatibilityOnly.push('dist/tdb-review-widget.js');
  assert.ok(
    (await auditRelease(input)).errors.includes(
      'dist/tdb-review-widget.js is classified more than once',
    ),
  );
});

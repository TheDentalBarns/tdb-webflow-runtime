const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const postcss = require('postcss');
const { project } = require('../tools/runtime-build/native-motion.cjs');

function declarations(css) {
  const rows = [];
  postcss.parse(css).walkDecls((decl) =>
    rows.push({
      selector: decl.parent.selector,
      property: decl.prop,
      value: decl.value,
      important: !!decl.important,
    }),
  );
  return rows;
}

test('inactive native baselines, discrete state resets and already linked families need no copy', () => {
  const css =
    '.badge{transition:unset}.drawer{transition:none}.control.held{transition-duration:0s}' +
    '.quote.entry{transition-duration:0s}.nav.detail{transition-delay:0s}' +
    '.linked{transition:opacity calc(.3s * var(--tdb-fade-pace,1)) var(--tdb-motion-ease-fade,ease-out)}' +
    '@media(max-width:767px){.linked{transition-duration:calc(.4s * var(--tdb-fade-pace,1))}}';
  assert.equal(project(css).trim(), '');
  const scoped = declarations(
    project('.control{transition:opacity .3s}.control.held{transition-duration:0s}'),
  );
  assert(
    scoped.some((row) => row.selector === '.control' && row.value.includes('--tdb-fade-pace')),
  );
  assert(
    !scoped.some((row) => row.selector === '.control.held'),
    'more-specific native zero reset remains authoritative',
  );
});

test('mixed native families retain equal-specificity breakpoint and :where reset guards', () => {
  const output = project(
    '.card{transition:opacity .3s ease-out}' +
      '@media(max-width:767px){.card{transition-duration:0s}}' +
      '.card:where(.variant){transition-duration:calc(.5s * var(--tdb-motion-pace,1))}' +
      '.card:hover{transition-duration:0s}',
  );
  const rows = declarations(output);
  assert(
    rows.some(
      (row) =>
        row.selector === '.card' && row.property === 'transition-duration' && row.value === '0s',
    ),
  );
  assert(
    rows.some(
      (row) =>
        row.selector === '.card:where(.variant)' &&
        row.value === 'calc(.5s * var(--tdb-fade-pace,1))',
    ),
  );
  assert(!rows.some((row) => row.selector === '.card:hover'));
  assert(output.includes('@media(max-width:767px)'));
});

test('opaque shorthand variables remain native rather than acquiring a guessed zero duration', () => {
  assert.equal(project('.backdrop{animation:var(--w-backdrop-animation,none)}').trim(), '');
  assert.equal(project('.unknown{transition:var(--component-transition)}').trim(), '');
  assert.throws(
    () => project('.card{animation:spin 1s linear}.card{animation:var(--component-animation)}'),
    /Opaque native timing shares a projected selector/,
    'an opaque later reset must not silently lose to an earlier projected binding',
  );
});

test('changed shorthands preserve list positions, linear curves, prefixes and importance', () => {
  const output = project(
    '@supports (backdrop-filter:blur(1px)){.card{' +
      '-webkit-transition:-webkit-backdrop-filter .4s ease,backdrop-filter .4s ease!important;' +
      'transition:opacity var(--tdb-panel-duration,.4s)ease,visibility 0s linear .4s;' +
      'animation:spin .8s linear .12s infinite;opacity:0}}',
  );
  const rows = declarations(output);
  assert(
    rows.every((row) =>
      /^(?:-webkit-)?(?:transition|animation)-(?:duration|delay|timing-function)$/.test(
        row.property,
      ),
    ),
  );
  const prefixed = rows.filter((row) => row.property.startsWith('-webkit-'));
  assert.equal(prefixed.length, 3);
  assert(prefixed.every((row) => row.important));
  assert.equal(
    prefixed.find((row) => row.property.endsWith('-duration')).value,
    'calc(.4s * var(--tdb-motion-pace,1)),calc(.4s * var(--tdb-motion-pace,1))',
  );
  assert.equal(
    rows.find((row) => row.property === 'transition-duration').value,
    'var(--tdb-panel-duration,calc(.4s * var(--tdb-fade-pace,1))),0s',
  );
  assert.equal(
    rows.find((row) => row.property === 'transition-delay').value,
    '0s,calc(.4s * var(--tdb-fade-pace,1))',
  );
  assert.equal(rows.find((row) => row.property === 'animation-timing-function').value, 'linear');
  assert(output.includes('@supports'));
  assert(!output.includes('animation-name'));
});

test('regeneration refuses mismatched audited inputs before replacing the committed projection', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'tdb-native-motion-'));
  try {
    fs.mkdirSync(path.join(cwd, 'config'));
    fs.mkdirSync(path.join(cwd, 'src/styles'), { recursive: true });
    const source = '.card{transition:opacity .3s}',
      input = path.join(cwd, 'native.css');
    const output = path.join(cwd, 'src/styles/tdb-native-motion.css');
    fs.writeFileSync(input, source);
    fs.writeFileSync(output, 'previous projection');
    const provenance = { inputs: [{ sha256: '0'.repeat(64) }] };
    fs.writeFileSync(
      path.join(cwd, 'config/native-motion-provenance.json'),
      JSON.stringify(provenance),
    );
    const tool = path.resolve(__dirname, '../tools/runtime-build/native-motion.cjs');
    const mismatch = spawnSync(process.execPath, [tool, input], { cwd, encoding: 'utf8' });
    assert.notEqual(mismatch.status, 0);
    assert.match(mismatch.stderr, /Update audited native CSS provenance/);
    assert.equal(fs.readFileSync(output, 'utf8'), 'previous projection');
    provenance.inputs[0].sha256 = crypto.createHash('sha256').update(source).digest('hex');
    fs.writeFileSync(
      path.join(cwd, 'config/native-motion-provenance.json'),
      JSON.stringify(provenance),
    );
    const valid = spawnSync(process.execPath, [tool, input], { cwd, encoding: 'utf8' });
    assert.equal(valid.status, 0, valid.stderr);
    assert(fs.readFileSync(output, 'utf8').includes('--tdb-fade-pace'));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

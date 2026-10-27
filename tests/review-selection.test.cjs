const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../src/reviews/native/selection.js'), 'utf8');
const row = (i, extra = {}) => ({
  id: 'review-' + i,
  name: 'Patient ' + i,
  rank: i,
  rating: 5,
  snippetRanks: {},
  ...extra,
});
test('native lead owns first position and duplicate priority without losing any reviews', () => {
  const w = new JSDOM('', { runScripts: 'outside-only' }).window;
  try {
    w.eval(source);
    const rows = [
      row(1, { duplicate: 'same-patient', snippetRanks: { location: 1 } }),
      row(2, { duplicate: 'same-patient', snippetRanks: { location: 2 } }),
      row(3, { snippetRanks: { location: 3 } }),
      row(4),
      row(5, { rating: 4 }),
    ];
    const contexts = [{ id: 'location', paths: ['/location'], topics: ['location'] }];
    const select = (lead) => Array.from(
      w.TDBReviewSelection.select(rows, contexts, '/location', '', lead), r => r.id,
    );
    assert.deepEqual(select('review-2'), ['review-2', 'review-3', 'review-4', 'review-1', 'review-5']);
    assert.deepEqual(select('unpublished'), select(''));
    assert.deepEqual(rows.map(r => r.id), ['review-1', 'review-2', 'review-3', 'review-4', 'review-5']);
  } finally { w.close(); }
});
test('all 50 topic matches precede fallback; cross-posts retained before low ratings; stable shared positions', () => {
  const w = new JSDOM('', { runScripts: 'outside-only' }).window;
  try {
    w.eval(source);
    const rows = Array.from({ length: 80 }, (_, i) =>
      row(i + 1, i >= 20 && i < 70 ? { snippetRanks: { nervous: 70 - i } } : {}),
    );
    rows.push(
      row(81, { rating: 4, snippetRanks: { nervous: 0.1 } }),
      row(82, { rating: 1, snippetRanks: { nervous: 0.2 } }),
    );
    rows[69].duplicate = 'crosspost';
    rows.push(row(83, { duplicate: 'crosspost', snippetRanks: { nervous: 1.5 } }));
    const contexts = [
      { id: 'nervous', paths: ['/services/nervous-patient-care'], topics: ['nervous'] },
    ];
    const result = w.TDBReviewSelection.select(rows, contexts, '/services/nervous-patient-care/');
    assert.equal(result.length, 83);
    assert.deepEqual(new Set(Array.from(result, (r) => r.id)), new Set(rows.map((r) => r.id)));
    assert.deepEqual(
      Array.from(result.slice(0, 50), (r) => r.id),
      Array.from({ length: 50 }, (_, i) => 'review-' + (70 - i)),
    );
    assert.deepEqual(
      Array.from(result.slice(0, 4), (r) => r.id),
      ['review-70', 'review-69', 'review-68', 'review-67'],
    );
    assert.deepEqual(
      Array.from(result.slice(-2), (r) => r.rating),
      [4, 1],
    );
    assert.deepEqual(
      Array.from(result.slice(-3), (r) => r.id),
      ['review-83', 'review-81', 'review-82'],
    );
    assert.equal(w.TDBReviewSelection.select(rows, contexts, '/unconfigured'), null);
    assert.equal(
      w.TDBReviewSelection.select(rows, contexts, '/vip/campaign', 'nervous')[0].id,
      'review-70',
    );
    const full = {
      id: 'review-70',
      excerpt: 'General',
      excerpts: { nervous: 'Exact nervous quote' },
    };
    assert.equal(
      w.TDBReviewSelection.decorate(full, result[0]).displayExcerpt,
      'Exact nervous quote',
    );
  } finally {
    w.close();
  }
});
test('Home uses available general excerpt ranks, ignores numbering gaps, keeps full-review fallback order', () => {
  const w = new JSDOM('', { runScripts: 'outside-only' }).window;
  try {
    w.eval(source);
    const result = w.TDBReviewSelection.select(
      [
        row(1),
        row(2, { snippetRanks: { general: 5 } }),
        row(3, { snippetRanks: { general: 1 } }),
        row(4, { snippetRanks: { general: 3 } }),
      ],
      [{ id: 'home', paths: ['/'], topics: ['general'] }],
      '/',
    );
    assert.deepEqual(
      Array.from(result, (r) => r.id),
      ['review-3', 'review-4', 'review-2', 'review-1'],
    );
  } finally {
    w.close();
  }
});

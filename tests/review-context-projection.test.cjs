const test = require('node:test'),
  assert = require('node:assert/strict');
const item = (id, fieldData, extra = {}) => ({
  id,
  fieldData,
  isArchived: false,
  lastPublished: '2026-10-01T00:00:00Z',
  createdOn: '2026-01-01T00:00:00Z',
  ...extra,
});
test('published available excerpts replace legacy fields, rank resolves repeated references and drafts stay excluded', async () => {
  const { addReviewContexts } = await import('../services/content-feed/review-contexts.mjs');
  const records = [
    { id: 'review', excerpt: 'obsolete', excerpts: { nervous: 'obsolete' }, topics: [] },
  ];
  const masters = [item('master', { slug: 'review' })],
    tags = [item('topic', { slug: 'nervous-patient-care' })];
  const excerpt = (id, text, rank, available = true, extra = {}) =>
    item(id, { review: 'master', 'ranking-topic': 'topic', excerpt: text, rank, available }, extra);
  const plans = addReviewContexts(
    records,
    masters,
    [
      excerpt('late', 'Later', 3),
      excerpt('first', 'Exact quote', 1),
      excerpt('unavailable', 'Hidden', 0.1, false),
      excerpt('draft', 'Draft', 0.01, true, { lastPublished: null }),
    ],
    tags,
    [
      item('context', {
        slug: 'nervous',
        active: true,
        service: 'service',
        'primary-topics': ['topic'],
      }),
    ],
    [item('service', { slug: 'nervous-patient-care' })],
    [],
    [],
  );
  assert.deepEqual(records[0].excerpts, { nervous: 'Exact quote' });
  assert.equal(records[0].excerpt, '');
  assert.deepEqual(records[0].snippetRanks, { nervous: 1 });
  assert.deepEqual(plans, [
    { id: 'nervous', paths: ['/services/nervous-patient-care'], topics: ['nervous'] },
  ]);
});
test('only active contexts map explicit paths; area paths follow treatment references', async () => {
  const { addReviewContexts } = await import('../services/content-feed/review-contexts.mjs');
  const contexts = [
    item('home', { slug: 'home', active: true, 'page-path': '/' }),
    item('inactive', { slug: 'inactive', active: false, 'page-path': '/other' }),
    item('v', { slug: 'veneers', active: true, treatment: 't', 'primary-topics': ['tag'] }),
  ];
  const plans = addReviewContexts(
    [],
    [],
    [],
    [item('tag', { slug: 'veneers' })],
    contexts,
    [],
    [item('t', { slug: 'veneers' })],
    [
      item('area', { slug: 'veneers-lichfield', treatment: 't' }),
      item('unrelated', { slug: 'wrong', other: 't' }),
    ],
  );
  assert.deepEqual(
    plans.map((p) => p.paths),
    [['/'], ['/treatments/veneers', '/areas/veneers-lichfield']],
  );
});

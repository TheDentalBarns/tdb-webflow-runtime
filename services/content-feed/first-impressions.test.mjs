import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFeedService, projectFirstImpressions, FIRST_IMPRESSIONS_COLLECTION } from './feed.mjs';

const card = (id, order, fields = {}, extra = {}) => ({
  id, isArchived: false, lastPublished: '2026-09-26T10:16:37.308Z',
  fieldData: { 'display-order': order, initials: id.toUpperCase(),
    'word-one': 'Calm', 'word-two': 'Relaxing', 'word-three': 'Great',
    'card-image': { url: 'https://cdn.prod.website-files.com/67837ee85ee175873126e461/' + id + '.webp' },
    'review-month': '2026-07', 'verified-patient': true, 'import-notes': 'PRIVATE', ...fields }, ...extra,
});
test('First Impressions projects only published cards, CMS order and authored date precision', () => {
  const rows = [card('ec', 2, { 'review-date': '2026-07-14T00:00:00Z' }), card('jh', 1),
    card('draft', 0, {}, { lastPublished: null }), card('archived', 0, {}, { isArchived: true }),
    card('sd', 3, { 'verified-patient': false }, { isDraft: true })];
  const before = JSON.stringify(rows), { cards } = projectFirstImpressions(rows);
  assert.deepEqual(cards.map(x => x.id), ['jh', 'ec', 'sd']);
  assert.equal(cards[0].date, ''); assert.equal(cards[0].month, '2026-07');
  assert.equal(cards[1].date, '2026-07-14'); assert.equal(cards[2].verified, false);
  assert.equal(cards[0].image.alt, 'JH’s handwritten first-visit card: Calm, Relaxing, Great');
  assert.equal(JSON.stringify(rows), before); assert.ok(!JSON.stringify(cards).includes('PRIVATE'));
  for (const fields of [{ 'word-two': '' }, { 'review-month': '2026-13' },
    { 'review-date': '2026-02-30T00:00:00Z' }, { 'card-image': { url: 'https://other.example/x' } }])
    assert.throws(() => projectFirstImpressions([card('invalid', 1, fields)]), /invalid_cms_data/);
});

test('The First Impressions route reads /live, caches independently, and preserves a valid snapshot on refresh failure', async () => {
  let time = Date.now(), broken = false; const calls = [], saved = new Map();
  const env = { WEBFLOW_API_TOKEN: 'test-secret', CONTENT_FEEDS: {
    get: async key => saved.get(key), put: async (key, text) => saved.set(key, JSON.parse(text)),
  } };
  const handle = createFeedService({ now: () => time, fetcher: async url => {
    calls.push(url);
    const rows = [card('jh', 1, broken ? { 'word-one': '' } : {})];
    return Response.json({ items: rows, pagination: { total: 1, offset: 0 } });
  } });
  const request = () => new Request('https://dentalbarns.webflow.io/tdb-content/v1/first-impressions.json');
  let response = await handle(request(), env), body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.feed, 'first-impressions');
  assert.equal(body.cards.length, 1); assert.equal(calls.length, 1);
  assert.ok(calls[0].includes(`/collections/${FIRST_IMPRESSIONS_COLLECTION}/items/live?`));
  assert.deepEqual([...saved.keys()], ['first-impressions:published:v1']);
  assert.ok(!JSON.stringify(body).includes('test-secret'));
  await handle(request(), env); assert.equal(calls.length, 1);
  broken = true; time += 300001;
  response = await handle(request(), env);
  assert.equal(response.status, 200); assert.equal(response.headers.get('X-TDB-Feed-State'), 'stale');
  assert.equal((await response.json()).cards[0].words[0], 'Calm');
  time += 3600000; assert.equal((await handle(request(), env)).status, 503);
});

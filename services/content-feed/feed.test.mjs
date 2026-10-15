import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectReviews, REVIEW_COLLECTIONS } from './reviews.mjs';
import {
  createFeedService,
  projectInstagram,
  projectSmiles,
  COLLECTION,
  CATEGORY,
  SMILE_COLLECTION,
} from './feed.mjs';

const smile = (id = 'smile1', fields = {}, extra = {}) => ({
  id,
  isArchived: false,
  lastPublished: '2026-10-15T10:00:00Z',
  createdOn: '2026-01-01T00:00:00Z',
  fieldData: {
    featured: true,
    header: 'A natural smile',
    description: 'Published description',
    'before-and-after-picture': {
      url: 'https://cdn.prod.website-files.com/67837ee85ee175873126e461/example.webp',
      alt: 'Before and after',
    },
    'treatment-s-carried-out': ['678a8a0fc4638735effb336e', '678a8a3bb9789257faea7f25'],
    'cosmetic-lead-1': '2adb229d526cbad7bcbf34f3c508943e',
    price: 'From £1,000',
    duration: '6 months',
    'import-notes': 'PRIVATE',
    ...fields,
  },
  ...extra,
});
test('Smile projection preserves native order and labels without exposing source records', () => {
  const result = projectSmiles([
    smile('pinned', { 'pin-priority': 1 }),
    smile('blank'),
    smile('unfeatured', { featured: false }),
    smile('draft', {}, { lastPublished: null }),
  ]);
  assert.deepEqual(
    result.cases.map((x) => x.id),
    ['blank', 'pinned'],
  );
  assert.equal(result.total, 3);
  assert.deepEqual(result.cases[0].treatments, ['Invisalign®', 'Enlighten® Whitening']);
  assert.equal(result.cases[0].clinician, 'Dr Keely Thorne');
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  assert.ok(!JSON.stringify(result).includes('cosmetic-lead'));
  assert.equal(projectSmiles([smile('pending', {}, { isDraft: true })]).cases.length, 1);
  assert.throws(() =>
    projectSmiles([
      smile('unsafe', { 'before-and-after-picture': { url: 'https://evil.example/x' } }),
    ]),
  );
  assert.throws(() => projectSmiles([smile('unknown', { 'cosmetic-lead-1': 'unknown' })]));
});
test('Instagram and Smile requests have independent flights, cache keys and failure backoff', async () => {
  let time = Date.now(),
    failSmiles = false;
  const saved = new Map(),
    calls = [];
  const env = {
    WEBFLOW_API_TOKEN: 'test-secret',
    CONTENT_FEEDS: {
      get: async (key) => saved.get(key),
      put: async (key, value) => saved.set(key, JSON.parse(value)),
    },
  };
  const create = () =>
    createFeedService({
      now: () => time,
      fetcher: async (url) => {
        calls.push(url);
        if (url.includes(SMILE_COLLECTION)) {
          if (failSmiles) throw Error('offline');
          return page([smile()]);
        }
        return page([item()]);
      },
    });
  const handle = create();
  const responses = await Promise.all([
    handle(request(), env),
    handle(request('/tdb-content/v1/smiles.json'), env),
  ]);
  assert.deepEqual(await Promise.all(responses.map(async (r) => (await r.json()).feed)), [
    'instagram',
    'smiles',
  ]);
  assert.equal(saved.size, 2);
  await create()(request('/tdb-content/v1/smiles.json'), env);
  assert.equal(calls.length, 2);
  time += 300001;
  failSmiles = true;
  assert.equal(
    (await handle(request('/tdb-content/v1/smiles.json'), env)).headers.get('X-TDB-Feed-State'),
    'stale',
  );
  assert.equal((await handle(request(), env)).headers.get('X-TDB-Feed-State'), 'fresh');
  const before = calls.length;
  await handle(request('/tdb-content/v1/smiles.json'), env);
  assert.equal(calls.length, before);
  time += 3600000;
  assert.equal((await handle(request('/tdb-content/v1/smiles.json'), env)).status, 503);
});

const IMAGE = 'https://cdn.prod.website-files.com/67837ee85ee175873126e461/example.webp';
const item = (id = 'post1', fields = {}, extra = {}) => ({
  id,
  isArchived: false,
  isDraft: false,
  lastPublished: '2026-10-15T10:00:00.000Z',
  fieldData: {
    visible: true,
    categories: [CATEGORY],
    'display-order': 1,
    date: '2026-01-10T00:00:00.000Z',
    name: 'Example post',
    image: { url: IMAGE, alt: '' },
    'instagram-link': `https://www.instagram.com/p/${id}`,
    'alt-text': 'Published photo',
    'instagram-likes': 0,
    'source-media-type': 'image',
    'import-notes': 'PRIVATE',
    'source-caption': 'PRIVATE',
    'original-file-link': 'PRIVATE',
    ...fields,
  },
  ...extra,
});
const page = (items, total = items.length, offset = 0) =>
  Response.json({ items, pagination: { total, offset, limit: 100 } });
const request = (path = '/tdb-content/v1/instagram.json', method = 'GET') =>
  new Request('https://dentalbarns.webflow.io' + path, { method });
function harness() {
  let time = Date.parse('2026-10-15T12:00:00Z'),
    saved = null,
    calls = [],
    writes = 0;
  let upstream = () => page([item()]);
  const logs = [];
  const env = {
    WEBFLOW_API_TOKEN: 'test-secret',
    CONTENT_FEEDS: {
      async get() {
        return saved;
      },
      async put(key, value) {
        writes++;
        saved = JSON.parse(value);
      },
    },
  };
  const create = () =>
    createFeedService({
      now: () => time,
      report: (x) => logs.push(x),
      fetcher: async (...args) => {
        calls.push(args);
        return upstream(...args);
      },
    });
  return {
    env,
    calls,
    logs,
    create,
    setUpstream(fn) {
      upstream = fn;
    },
    advance(ms) {
      time += ms;
    },
    get saved() {
      return saved;
    },
    get writes() {
      return writes;
    },
  };
}

test('projects only eligible published fields; unknown metrics stay null and zero stays zero', () => {
  const rows = [
    item(),
    item('hidden', { visible: false }),
    item('other', { categories: [] }),
    item('archived', {}, { isArchived: true }),
    item('unpublished', {}, { lastPublished: null }),
  ];
  const posts = projectInstagram(rows);
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0], {
    url: 'https://www.instagram.com/p/post1/',
    image: { src: IMAGE, alt: 'Published photo' },
    date: '2026-01-10',
    mediaType: 'image',
    likes: 0,
    comments: null,
    shares: null,
  });
  assert.ok(!JSON.stringify(posts).includes('PRIVATE'));
});
test('uses published endpoint content even when staged changes are pending', () => {
  assert.equal(projectInstagram([item('post1', {}, { isDraft: true })]).length, 1);
});
test('sorts by display order then descending date, before applying 20-post limit', () => {
  const rows = Array.from({ length: 23 }, (_, i) => item('post' + i, { 'display-order': 5 }));
  rows.push(item('first', { 'display-order': -1 }));
  rows.push(item('newest', { 'display-order': 5, date: '2026-02-10T00:00:00Z' }));
  const posts = projectInstagram(rows);
  assert.equal(posts.length, 20);
  assert.match(posts[0].url, /first/);
  assert.match(posts[1].url, /newest/);
});
test('rejects invalid links, image origins, dates, duplicate posts and malformed metrics', () => {
  for (const fields of [
    { 'instagram-link': 'javascript:alert(1)' },
    { 'instagram-link': 'https://www.instagram.com.evil.example/p/x' },
    { 'instagram-link': 'https://user:pass@www.instagram.com/p/x' },
    { image: { url: 'https://other.example/image.jpg' } },
    { date: '2026-02-31T00:00:00Z' },
    { 'instagram-likes': -1 },
  ])
    assert.throws(() => projectInstagram([item('x', fields)]));
  assert.throws(() =>
    projectInstagram([item('a'), item('b', { 'instagram-link': 'https://instagram.com/p/a/' })]),
  );
});
test('paginates all live records before filtering, never fetching a caller-selected collection', async () => {
  const h = harness();
  h.setUpstream((url, options) => {
    assert.ok(url.startsWith(`https://api.webflow.com/v2/collections/${COLLECTION}/items/live?`));
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    return url.endsWith('offset=0')
      ? page(
          Array.from({ length: 100 }, (_, i) => item('hidden' + i, { visible: false })),
          101,
        )
      : page([item('last')], 101, 100);
  });
  const result = await h.create()(request('?collection=private'), h.env);
  assert.equal(result.status, 404);
  const response = await h.create()(
    request('/tdb-content/v1/instagram.json?collection=private&refresh=1'),
    h.env,
  );
  assert.match((await response.json()).posts[0].url, /last/);
  assert.equal(h.calls.length, 2);
});
test('fresh snapshot survives an isolate restart without a new API call', async () => {
  const h = harness();
  await h.create()(request(), h.env);
  h.advance(120000);
  const response = await h.create()(request(), h.env);
  assert.equal(response.headers.get('X-TDB-Feed-State'), 'fresh');
  assert.equal(h.calls.length, 1);
  assert.equal(h.writes, 1);
});
test('concurrent cold requests share a single refresh', async () => {
  const h = harness();
  let release;
  h.setUpstream(
    () =>
      new Promise((r) => {
        release = () => r(page([item()]));
      }),
  );
  const handle = h.create(),
    pending = Array.from({ length: 8 }, () => handle(request(), h.env));
  await new Promise((r) => setImmediate(r));
  release();
  const responses = await Promise.all(pending);
  assert.ok(responses.every((r) => r.status === 200));
  assert.equal(h.calls.length, 1);
});
test('rebuild reflects deletions; a successful empty feed replaces old content', async () => {
  const h = harness(),
    handle = h.create();
  await handle(request(), h.env);
  h.advance(300001);
  h.setUpstream(() => page([]));
  assert.deepEqual((await (await handle(request(), h.env)).json()).posts, []);
  assert.equal(h.saved.posts.length, 0);
});
test('API failure retains validated last good snapshot for at most an hour and backs off', async () => {
  const h = harness(),
    handle = h.create();
  await handle(request(), h.env);
  h.advance(300001);
  h.setUpstream(() => new Response('secret upstream detail', { status: 429 }));
  let response = await handle(request(), h.env);
  assert.equal(response.headers.get('X-TDB-Feed-State'), 'stale');
  assert.equal(h.writes, 1);
  await handle(request(), h.env);
  assert.equal(h.calls.length, 2);
  h.advance(3600000);
  response = await handle(request(), h.env);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.ok(!JSON.stringify(h.logs).includes('secret'));
  assert.ok(!(await response.text()).includes('secret'));
});
test('incomplete or changing pagination cannot overwrite the previous snapshot', async () => {
  const h = harness(),
    handle = h.create();
  await handle(request(), h.env);
  h.advance(300001);
  h.setUpstream(() => page([item('replacement')], 101));
  const response = await handle(request(), h.env);
  assert.equal(response.headers.get('X-TDB-Feed-State'), 'stale');
  assert.equal(h.writes, 1);
  assert.match(h.saved.posts[0].url, /post1/);
});
test('unknown routes and writes cannot access CMS; JSON is noindex and HEAD has no body', async () => {
  const h = harness(),
    handle = h.create();
  assert.equal((await handle(request('/'), h.env)).status, 404);
  assert.equal(
    (await handle(request('/tdb-content/v1/instagram.json', 'POST'), h.env)).status,
    405,
  );
  assert.equal(h.calls.length, 0);
  const response = await handle(request(undefined, 'HEAD'), h.env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
  assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});
test('missing configuration fails closed without calling the API or exposing settings', async () => {
  const h = harness(),
    handle = h.create();
  assert.equal((await handle(request(), {})).status, 503);
  const response = await handle(request(), { CONTENT_FEEDS: h.env.CONTENT_FEEDS });
  assert.equal(response.status, 503);
  assert.equal(h.calls.length, 0);
  assert.deepEqual(await response.json(), { error: 'Feed temporarily unavailable' });
});

const reviewItem = (id = 'r1', fields = {}, extra = {}) => ({
  id,
  isArchived: false,
  lastPublished: '2026-10-15T10:00:00Z',
  createdOn: '2026-01-01T00:00:00Z',
  fieldData: {
    slug: id,
    'reviewer-display-name': 'Published reviewer',
    'full-review': 'Published review',
    'approved-for-display': true,
    'exclude-from-display': false,
    'editorial-priority': 1,
    'snippet-rank': 1,
    'featured-excerpt': 'Excerpt',
    'platform-2': 'efe6db2067ed0fd456d38bc2e521b4bd',
    'review-date': '2026-10-01T00:00:00Z',
    'display-date': 'October 2026',
    'star-rating': 5,
    'tagging-guidance': 'PRIVATE',
    'rating-basis': 'PRIVATE',
    'topic-invisalign': true,
    'excerpt-invisalign': 'Aligner excerpt',
    ...fields,
  },
  ...extra,
});
const reviewSummary = () => ({
  id: '69948ce9f89df128e65600b5',
  isArchived: false,
  lastPublished: '2026-10-15T10:00:00Z',
  fieldData: { ratingvalue: '4.94', reviewcount: '85' },
});
const reviewResponse = (fields = {}, extra = {}) => ({
  id: 'response1',
  isArchived: false,
  lastPublished: '2026-10-15T10:00:00Z',
  fieldData: {
    review: 'r2',
    response: 'Published response',
    'approved-for-display': true,
    ...fields,
  },
  ...extra,
});
test('review projection preserves content, aliases, responses and editorial order without drafts or notes', () => {
  const result = projectReviews(
    [
      reviewItem('r2', { 'editorial-priority': 2, 'snippet-rank': 2 }),
      reviewItem(),
      reviewItem('draft', {}, { lastPublished: null }),
      reviewItem('excluded', { 'exclude-from-display': true }),
    ],
    [reviewResponse(), reviewResponse({ response: 'PRIVATE DRAFT' }, { lastPublished: null })],
    [reviewSummary()],
  );
  assert.deepEqual(
    result.records.map((r) => r.id),
    ['r1', 'r2'],
  );
  assert.equal(result.records[1].response, 'Published response');
  assert.equal(result.records[1].showResponse, true);
  assert.deepEqual(result.records[0].topics, ['clear-aligners']);
  assert.equal(result.records[0].excerpts['clear-aligners'], 'Aligner excerpt');
  assert.equal(result.records[0].displayDate, 'October 2026');
  assert.deepEqual(result.featured, ['r2']);
  assert.equal(result.average, 4.94);
  assert.equal(result.total, 85);
  assert(!JSON.stringify(result).includes('PRIVATE'));
  assert(!JSON.stringify(result).includes('rating-basis'));
  assert.equal(
    projectReviews([reviewItem('r1', {}, { isDraft: true })], [], [reviewSummary()]).records.length,
    1,
    'live endpoint retains published version when staged edits exist',
  );
  assert.throws(() =>
    projectReviews(
      [reviewItem('r1', { 'source-url': 'javascript:alert(1)' })],
      [],
      [reviewSummary()],
    ),
  );
  assert.throws(() => projectReviews([reviewItem()], [], []));
});
test('reviews refresh all three live collections atomically and retain an isolated last-good snapshot', async () => {
  let time = Date.now(),
    failResponses = false;
  const calls = [],
    saved = new Map();
  const env = {
    WEBFLOW_API_TOKEN: 'test-secret',
    CONTENT_FEEDS: {
      get: async (k) => saved.get(k),
      put: async (k, v) => saved.set(k, JSON.parse(v)),
    },
  };
  const handle = createFeedService({
    now: () => time,
    fetcher: async (url, options) => {
      calls.push(url);
      assert.equal(options.headers.Authorization, 'Bearer test-secret');
      assert(url.includes('/items/live?'));
      if (url.includes(REVIEW_COLLECTIONS[0])) return page([reviewItem()]);
      if (url.includes(REVIEW_COLLECTIONS[1])) {
        if (failResponses) throw Error('offline');
        return page([]);
      }
      if (url.includes(REVIEW_COLLECTIONS[2])) return page([reviewSummary()]);
      return page([item()]);
    },
  });
  const initial = await handle(request('/tdb-content/v1/reviews.json'), env);
  assert.equal(initial.status, 200);
  const first = await initial.json();
  assert.equal(first.records.length, 1);
  assert.equal(calls.length, 3);
  assert.equal(saved.size, 1);
  assert(saved.has('reviews:published:v1'));
  time += 300001;
  failResponses = true;
  const stale = await handle(request('/tdb-content/v1/reviews.json'), env);
  assert.equal(stale.headers.get('X-TDB-Feed-State'), 'stale');
  assert.deepEqual(await stale.json(), first);
  const after = calls.length;
  await handle(request('/tdb-content/v1/reviews.json'), env);
  assert.equal(calls.length, after);
  assert.equal((await handle(request(), env)).status, 200, 'Instagram unaffected');
  time += 3600000;
  assert.equal((await handle(request('/tdb-content/v1/reviews.json'), env)).status, 503);
});

const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { JSDOM } = require(process.env.TDB_JSDOM_PATH || 'jsdom');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const record = (i) => ({
  id: `review-${i}`,
  name: `Reviewer ${i}`,
  text: `Published review ${i}`,
  excerpt: 'Excerpt',
  platform: 'Google',
  date: '2026-10-01',
  displayDate: 'October 2026',
  rating: i === 25 ? 1 : 5,
  approx: false,
  historic: false,
  rank: i,
  snippetRank: i,
  nRank: { 10: 1, 2: 2, 4: 3 }[i] || 999,
  iRank: i === 44 ? 1 : 999,
  lRank: 999,
  duplicate: '',
  url: 'https://www.google.com/maps/',
  direct: false,
  topics: ['comfort'],
  excerpts: { comfort: 'Comfortable visit' },
  response: i === 25 ? 'Published response' : '',
  showResponse: i === 25,
});
const payload = () => ({
  version: 1,
  feed: 'reviews',
  checkedAt: Date.now(),
  records: Array.from({ length: 45 }, (_, i) => record(i + 1)),
  average: 4.91,
  total: 45,
  featured: ['review-1', 'review-25'],
});
test('CMS context shares power, trio and unlimited ranked index while downloading only 20 bodies at a time', async () => {
  const { w, calls } = await setup('/services/nervous-patient-care', s => {
    s.records = Array.from({length:80},(_,i)=>({...record(i+1),
      rating:i===79 ? 4 : i===78 ? 1 : 5,
      snippetRanks:i>=20 && i<70 ? {nervous:70-i} : {},
      excerpts:i>=20 && i<70 ? {nervous:'Exact excerpt '+(i+1)} : {},
    }));
    s.total=80;
    s.contexts=[{id:'nervous',paths:['/services/nervous-patient-care'],topics:['nervous']}];
  });
  try {
    const data=await w.TDBReviewCMS.load();
    assert.equal(data.records.length,20);
    assert.equal(data.power,'review-70');
    assert.deepEqual(Array.from(data.featured),['review-69','review-68','review-67']);
    assert.equal(data.records[0].displayExcerpt,'Exact excerpt 70');
    assert.deepEqual(Array.from(data.filterIndex.slice(0,50),r=>r.id),Array.from({length:50},(_,i)=>'review-'+(70-i)));
    await data.fetchRecords(['review-21','review-5']);
    assert.equal(data.getCached('review-21').displayExcerpt,'Exact excerpt 21');
    await data.loadAll();
    assert.deepEqual(Array.from(data.records,r=>r.id),Array.from(data.filterIndex,r=>r.id));
    assert.deepEqual(Array.from(data.records.slice(-2),r=>r.rating),[1,4]);
    for (const url of calls.slice(1)) assert(new URL(url).searchParams.get('ids').split(',').length<=20);
  } finally {w.close();}
});
async function setup(page = '/', editSnapshot) {
  const { createFeedService } = await import('../services/content-feed/feed.mjs');
  const dom = new JSDOM('<div data-tdb-reviews-feed="/tdb-content/v2/reviews.json"></div>', {
    url: 'https://dentalbarns.webflow.io' + page,
    runScripts: 'outside-only',
  });
  const snapshot = payload();
  editSnapshot?.(snapshot);
  const
    saved = new Map([['reviews:published:statistics:v1', snapshot]]);
  const env = {
    CONTENT_FEEDS: {
      get: async (key) => saved.get(key),
      put: async (key, value) => saved.set(key, JSON.parse(value)),
    },
  };
  const handle = createFeedService({ hostname: 'tdb-public-availability.david-070.workers.dev', fetcher: () => assert.fail('fresh snapshot must avoid CMS') }),
    calls = [];
  const network = async (url, options) => {
    calls.push(url);
    assert.equal(options.headers.Accept, 'application/json');
    return handle(new Request(url), env);
  };
  dom.window.fetch = network;
  for (const file of ['selection.js', 'json.js', 'cms.js'])
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../src/reviews/native', file), 'utf8'));
  return { w: dom.window, calls, network, snapshot };
}

test('explicit introduction topic uses ranked topic excerpts while retaining the complete review total', async () => {
  const { w } = await setup('/location', s => {
    s.records[3].snippetRanks = { location: 2 };
    s.records[3].excerpts.location = 'Second location quotation';
    s.records[8].snippetRanks = { location: 1 };
    s.records[8].excerpts.location = 'First location quotation';
    s.contexts = [{ id: 'home', paths: ['/'], topics: ['general'] }];
  });
  try {
    const root = w.document.createElement('section');
    root.setAttribute('data-tdb-review-introduction', '');
    root.setAttribute('data-tdb-review-topic', 'location');
    w.document.body.append(root);
    const data = await w.TDBReviewCMS.load();
    assert.equal(data.power, 'review-9');
    assert.equal(data.getCached(data.power).displayExcerpt, 'First location quotation');
    assert.equal(data.filterIndex[1].id, 'review-4');
    assert.equal(data.total, 45);
    assert.equal(data.average, 4.91);
    assert.equal(data.filterIndex.length, 45);
  } finally { w.close(); }
});
test('native lead and its cross-post share one contextual order, first batch and cache identity', async () => {
  const { w, calls } = await setup('/location', s => {
    s.records[3].snippetRanks = { location: 2 };
    s.records[3].excerpts.location = 'Native Google lead';
    s.records[3].duplicate = 'same-patient';
    s.records[8].snippetRanks = { location: 1 };
    s.records[8].excerpts.location = 'Facebook cross-post';
    s.records[8].platform = 'Facebook';
    s.records[8].duplicate = 'same-patient';
    s.contexts = [{ id: 'home', paths: ['/'], topics: ['general'] }];
  });
  try {
    const root = w.document.createElement('section');
    root.setAttribute('data-tdb-review-introduction', '');
    root.setAttribute('data-tdb-review-topic', 'location');
    root.innerHTML = '<blockquote data-tdb-review-excerpt data-tdb-review-id="review-4">Native Google lead</blockquote>';
    w.document.body.append(root);
    const data = await w.TDBReviewCMS.load();
    assert.equal(data.power, 'review-4');
    assert.equal(data.filterIndex[0].id, 'review-4');
    assert.equal(data.filterIndex.at(-2).id, 'review-9');
    assert.equal(data.getCached(data.power).displayExcerpt, 'Native Google lead');
    assert.equal(data.records.length, 20);
    assert.equal(new URL(calls[1]).searchParams.get('ids').split(',')[0], 'review-4');
    await data.ensure(['review-4']);
    assert.equal(calls.length, 2, 'opening the lead must not download the whole queue');
    assert.equal(data.total, 45);
    assert.equal(data.average, 4.91);
    assert.equal(data.filterIndex.length, 45);
    assert.equal(await w.TDBReviewCMS.load(), data);
    const state = { sort: 'recommended', rating: [], platform: [], treatment: [], experience: [] };
    assert.equal(w.TDBReviewCMS.ordered(data.filterIndex, state)[0].id, 'review-4');
    assert.equal(w.TDBReviewCMS.ordered(data.filterIndex, { ...state, platform: ['Facebook'] })[0].id, 'review-9');
    assert.equal(w.TDBReviewCMS.ordered(data.filterIndex, { ...state, sort: 'lowest' })[0].id, 'review-25');
    root.firstElementChild.setAttribute('data-tdb-review-id', 'review-9');
    const changed = await w.TDBReviewCMS.load();
    assert.notEqual(changed, data);
    assert.equal(changed.power, 'review-9');
    assert.equal(changed.filterIndex.at(-2).id, 'review-4');
  } finally { w.close(); }
});

test('JSON downloads only 20 bodies, arbitrary selected IDs preserve caller order and cached bodies are reused', async () => {
  const { w, calls } = await setup();
  try {
    const d = await w.TDBReviewCMS.load();
    assert.equal(d.records.length, 20);
    assert.equal(d.filterIndex.length, 45);
    assert.equal(d.getCached('review-25'), undefined);
    assert.equal(calls.length, 2);
    const selected = await d.fetchRecords(['review-25', 'review-2', 'review-4']);
    assert.deepEqual(
      Array.from(selected, (r) => r.id),
      ['review-25', 'review-2', 'review-4'],
    );
    assert.equal(selected[0].response, 'Published response');
    assert.equal(new URL(calls.at(-1)).searchParams.get('ids'), 'review-25');
    const before = calls.length;
    await d.fetchRecords(['review-4', 'review-25', 'review-2']);
    assert.equal(calls.length, before);
    let notifications = 0;
    d.subscribe(() => notifications++);
    await Promise.all([d.loadMore(), d.loadMore()]);
    assert.equal(d.records.length, 40);
    assert.equal(notifications, 1);
    assert.equal(calls.length, before + 1);
    await d.loadAll();
    assert.equal(d.records.length, 45);
    assert.equal(d.hasMore, false);
    assert.equal(await w.TDBReviewCMS.load(), d);
    for (const url of calls.slice(1))
      assert(new URL(url).searchParams.get('ids').split(',').length <= 20);
    await assert.rejects(d.fetchRecords(['unpublished']), /outside the published index/);
  } finally {
    w.close();
  }
});
test('context chooses 10, 2, 4 before downloading; another page selects its own order and filters retain full metadata', async () => {
  for (const [page, first] of [
    ['/nervous-patients', ['review-10', 'review-2', 'review-4']],
    ['/invisalign', ['review-44']],
  ]) {
    const { w, calls } = await setup(page);
    try {
      const d = await w.TDBReviewCMS.load();
      assert.deepEqual(
        Array.from(d.records.slice(0, first.length), (r) => r.id),
        first,
      );
      assert.deepEqual(
        new URL(calls[1]).searchParams.get('ids').split(',').slice(0, first.length),
        first,
      );
      const state = { sort: 'lowest', rating: [], platform: [], treatment: [], experience: [] };
      assert.equal(w.TDBReviewCMS.ordered(d.filterIndex, state)[0].id, 'review-25');
      const filtered = w.TDBReviewCMS.ordered(d.filterIndex, { ...state, rating: ['1'] });
      const body = await d.fetchRecords(Array.from(filtered, (r) => r.id));
      assert.equal(body.length, 1);
      assert(body[0].showResponse);
    } finally {
      w.close();
    }
  }
});
test('initial and batch cancellation are per caller and aborted work cannot poison caches', async () => {
  const { w, network } = await setup();
  let release, signal;
  w.fetch = (url, options) => {
    if (new URL(url).search) return network(url, options);
    signal = options.signal;
    return new Promise((resolve) => {
      release = () => resolve(network(url, options));
    });
  };
  try {
    const a = new w.AbortController(),
      b = new w.AbortController();
    const one = w.TDBReviewCMS.load({ signal: a.signal }),
      two = w.TDBReviewCMS.load({ signal: b.signal });
    await tick();
    const rejected = assert.rejects(one, { name: 'AbortError' });
    a.abort();
    await rejected;
    assert.equal(signal.aborted, false);
    release();
    const data = await two;
    assert.equal(data.records.length, 20);
    w.fetch = (url, options) => {
      signal = options.signal;
      return new Promise((resolve) => {
        release = () => resolve(network(url, options));
      });
    };
    const c = new w.AbortController(),
      pending = data.fetchRecords(['review-41'], { signal: c.signal });
    await tick();
    const aborted = assert.rejects(pending, { name: 'AbortError' });
    c.abort();
    await aborted;
    assert.equal(signal.aborted, true);
    release();
    await tick();
    assert.equal(data.getCached('review-41'), undefined);
    w.fetch = network;
    assert.equal((await data.fetchRecords(['review-41']))[0].id, 'review-41');
  } finally {
    w.close();
  }
});
test('each request gets its own deadline; timeout is retryable rather than caller cancellation', async () => {
  const { w, network } = await setup();
  const timers = new Map();
  let timerId = 0,
    release,
    signal;
  w.setTimeout = (callback, ms) => {
    assert.equal(ms, 12000);
    timers.set(++timerId, callback);
    return timerId;
  };
  w.clearTimeout = (id) => timers.delete(id);
  w.fetch = (url, options) =>
    new Promise((resolve, reject) => {
      signal = options.signal;
      signal.addEventListener('abort', () => reject(new w.DOMException('Aborted', 'AbortError')), {
        once: true,
      });
      release = () => resolve(network(url, options));
    });
  try {
    const pending = w.TDBReviewCMS.load();
    await tick();
    assert.equal(timers.size, 1, 'only the index request has a deadline');
    const indexTimer = timerId;
    release();
    await tick();
    assert.equal(timers.has(indexTimer), false);
    assert.equal(timers.size, 1, 'the first batch has a fresh deadline');
    const rejected = assert.rejects(
      pending,
      (error) => error.name !== 'AbortError' && /timed out/.test(error.message),
    );
    [...timers.values()][0]();
    await rejected;
    assert.equal(signal.aborted, true);
    assert.equal(timers.size, 0);
    w.fetch = network;
    const data = await w.TDBReviewCMS.load();
    assert.equal(data.records.length, 20, 'timeout did not poison the session cache');
  } finally {
    w.close();
  }
});

test('invalid index, stale or mismatched batches, unsafe records and cross-origin sources fail without HTML fallback', async () => {
  for (const mutate of [
    (p) => p.index.push(p.index[0]),
    (p) => (p.index[0].topics = ['invalid<script>']),
    (p) => (p.checkedAt = Date.now() - 3600001),
    (p) => (p.featured = ['unknown']),
  ]) {
    const { w, network, calls } = await setup();
    w.fetch = async (url, options) => {
      const r = await network(url, options),
        p = await r.json();
      mutate(p);
      return Response.json(p);
    };
    try {
      await assert.rejects(w.TDBReviewCMS.load());
      assert.equal(calls.length, 1);
    } finally {
      w.close();
    }
  }
  for (const mutate of [
    (p) => (p.records[0].url = 'javascript:alert(1)'),
    (p) => p.records.reverse(),
    (p) => p.checkedAt++,
    (p) => p.records.pop(),
  ]) {
    const { w, network } = await setup();
    w.fetch = async (url, options) => {
      const r = await network(url, options),
        p = await r.json();
      if (new URL(url).search) mutate(p);
      return Response.json(p);
    };
    try {
      await assert.rejects(w.TDBReviewCMS.load());
    } finally {
      w.close();
    }
  }
  const { w } = await setup();
  try {
    w.document
      .querySelector('[data-tdb-reviews-feed]')
      .setAttribute('data-tdb-reviews-feed', 'https://other.test/tdb-content/v2/reviews.json');
    w.fetch = () => assert.fail('cross-origin');
    await assert.rejects(w.TDBReviewCMS.load());
  } finally {
    w.close();
  }
});

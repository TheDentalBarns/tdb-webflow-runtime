import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFeedService } from './feed.mjs';
import { createCloudflareWorker, HOST } from './cloudflare-worker.mjs';

const url = `https://${HOST}/tdb-content/v1/smiles.json`;
const empty = () => Response.json({ items: [], pagination: { offset: 0, total: 0 } });
function storage() {
  const rows = new Map();
  return { get: async key => rows.get(key), put: async (key, value) => rows.set(key, JSON.parse(value)) };
}

test('A valid stale snapshot is returned without waiting for the CMS; refresh remains deduplicated', { timeout: 2000 }, async () => {
  let time = 1800000000000, calls = 0, release;
  const pending = [];
  const feed = createFeedService({ hostname: HOST, now: () => time, fetcher: async () => {
    calls++;
    if (calls > 1) await new Promise(resolve => release = resolve);
    return empty();
  } });
  const env = { WEBFLOW_API_TOKEN: 'test', CONTENT_FEEDS: storage() };
  const initial = await (await feed(new Request(url), env)).json();
  time += 300001;
  const ctx = { waitUntil: p => pending.push(p) };
  for (let i = 0; i < 2; i++) {
    const response = await feed(new Request(url), env, ctx);
    assert.equal(response.headers.get('X-TDB-Feed-State'), 'stale');
    assert.equal((await response.json()).checkedAt, initial.checkedAt);
  }
  assert.equal(calls, 2);
  release();
  await Promise.all(pending);
  const fresh = await (await feed(new Request(url), env, ctx)).json();
  assert.equal(fresh.checkedAt, time);
});

test('Refresh failure keeps a valid snapshot but never serves data beyond one hour', async () => {
  let time = 1800000000000, fail = false;
  const pending = [];
  const feed = createFeedService({ hostname: HOST, now: () => time, fetcher: async () => {
    if (fail) throw Error('offline');
    return empty();
  } });
  const env = { WEBFLOW_API_TOKEN: 'test', CONTENT_FEEDS: storage() };
  await feed(new Request(url), env);
  fail = true;
  time += 300001;
  assert.equal((await feed(new Request(url), env, { waitUntil: p => pending.push(p) })).status, 200);
  await Promise.all(pending);
  time += 3600000;
  const unavailable = await feed(new Request(url), env);
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('Cache-Control'), 'no-store');
});

test('Cloudflare responses are public and cache lifetimes cannot outlive the snapshot', async () => {
  const time = 1800000000000;
  let age = 0;
  const worker = createCloudflareWorker({ now: () => time, feed: async () => Response.json({ ok: true }, {
    headers: { 'X-TDB-Checked-At': String(time - age) },
  }) });
  const first = await worker.fetch(new Request(url));
  assert.equal(first.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(first.headers.get('Cache-Control'), 'public, max-age=30, s-maxage=60, stale-while-revalidate=30');
  age = 3590000;
  const expiring = await worker.fetch(new Request(url));
  assert.equal(expiring.headers.get('Cache-Control'), 'public, max-age=9, s-maxage=9, stale-while-revalidate=0');
  age = 3600000;
  assert.equal((await worker.fetch(new Request(url))).headers.get('Cache-Control'), 'no-store');
});

test('Errors are not cached, preflight is credential-free, and availability uses its original handler', async () => {
  let seen;
  const legacyResponse = new Response('unchanged');
  const worker = createCloudflareWorker({
    legacy: { fetch: (...args) => { seen = args; return legacyResponse; } },
    feed: async () => Response.json({ error: 'unavailable' }, { status: 503 }),
  });
  const request = new Request(`https://${HOST}/active.json`), env = {}, ctx = {};
  assert.equal(await worker.fetch(request, env, ctx), legacyResponse);
  assert.deepEqual(seen, [request, env, ctx]);
  const error = await worker.fetch(new Request(url));
  assert.equal(error.status, 503);
  assert.equal(error.headers.get('Cache-Control'), 'no-store');
  const options = await worker.fetch(new Request(url, { method: 'OPTIONS' }));
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('Access-Control-Allow-Credentials'), null);
});

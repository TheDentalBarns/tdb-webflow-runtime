/* Public projections of published Webflow CMS data. No CMS credentials or raw
 * records are returned. Route-specific projections can be added for other feeds. */
export const COLLECTION = '6ab7b3c409814bb83c9902de';
export const CATEGORY = '6ab7b743e5d9f17124ef7ab3';
export const SMILE_COLLECTION = '69a07fdcd392dc2c0d92967f';
const FRESH_MS = 300000;
const MAX_AGE_MS = 3600000;
const RETRY_MS = 30000;
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

function fail() {
  throw Error('invalid_cms_data');
}
function text(value, max = 2000) {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > max) fail();
  return value.trim();
}
function safeURL(value, kind) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail();
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) fail();
  if (kind === 'post') {
    if (
      !['instagram.com', 'www.instagram.com'].includes(url.hostname) ||
      !/^\/(?:p|reel|tv)\/[\w-]+\/?$/.test(url.pathname)
    )
      fail();
    return 'https://www.instagram.com' + url.pathname.replace(/\/?$/, '/');
  }
  if (
    url.hostname !== 'cdn.prod.website-files.com' ||
    !url.pathname.startsWith('/67837ee85ee175873126e461/')
  )
    fail();
  return url.href;
}
function metric(value) {
  if (value == null || value === '') return null;
  if (!Number.isSafeInteger(value) || value < 0) fail();
  return value;
}
function date(value) {
  const raw = text(value, 40);
  if (!raw) return '';
  const stamp = Date.parse(raw);
  if (
    !/^\d{4}-\d{2}-\d{2}T/.test(raw) ||
    !Number.isFinite(stamp) ||
    new Date(stamp).toISOString().slice(0, 10) !== raw.slice(0, 10)
  )
    fail();
  return raw.slice(0, 10);
}

export function projectInstagram(items) {
  if (!Array.isArray(items)) fail();
  const selected = items.filter((item) => {
    const f = item?.fieldData;
    // /live supplies the published version, even when the staged item has newer
    // edits. Never use the staged endpoint or copy its fields into this feed.
    return (
      item?.lastPublished &&
      item.isArchived === false &&
      f?.visible === true &&
      Array.isArray(f.categories) &&
      f.categories.includes(CATEGORY)
    );
  });
  selected.sort((a, b) => {
    const order = (item) =>
      Number.isFinite(item.fieldData['display-order']) ? item.fieldData['display-order'] : Infinity;
    const aOrder = order(a),
      bOrder = order(b);
    return (
      (aOrder < bOrder ? -1 : aOrder > bOrder ? 1 : 0) ||
      (Date.parse(b.fieldData.date) || 0) - (Date.parse(a.fieldData.date) || 0) ||
      String(a.id).localeCompare(String(b.id))
    );
  });
  const seen = new Set();
  return selected.slice(0, 20).map((item) => {
    const f = item.fieldData;
    const url = safeURL(f['instagram-link'], 'post');
    if (seen.has(url)) fail();
    seen.add(url);
    return {
      url,
      image: {
        src: safeURL(f.image?.url, 'image'),
        alt: text(f['alt-text'] || f.image?.alt || f.name),
      },
      date: date(f.date),
      mediaType: text(f['source-media-type'], 80),
      likes: metric(f['instagram-likes']),
      comments: metric(f['instagram-comments']),
      shares: metric(f['instagram-shares']),
    };
  });
}

export function projectSmiles(items) {
  if (!Array.isArray(items)) fail();
  const published = items.filter((item) => item?.lastPublished && item.isArchived === false);
  // Match the native Home list: blank priorities first, then ascending priority,
  // with creation order resolving ties. The /live endpoint excludes unpublished cases.
  const selected = published.filter((item) => item.fieldData?.featured === true);
  selected.sort((a, b) => {
    const priority = (item) =>
      Number.isFinite(item.fieldData['pin-priority']) ? item.fieldData['pin-priority'] : -Infinity;
    const x = priority(a),
      y = priority(b);
    return (
      (x < y ? -1 : x > y ? 1 : 0) ||
      (Date.parse(a.createdOn) || 0) - (Date.parse(b.createdOn) || 0) ||
      String(a.id).localeCompare(String(b.id))
    );
  });
  const seen = new Set();
  const cases = selected.slice(0, 100).map((item) => {
    const f = item.fieldData;
    const id = text(item.id, 80),
      title = text(f.header, 500);
    if (!id || !title || seen.has(id)) fail();
    seen.add(id);
    if (!Array.isArray(f['treatment-s-carried-out'])) fail();
    const refs = f['treatment-s-carried-out'];
    const treatments = [
      [refs.includes('678a8a0fc4638735effb336e'), 'Invisalign®'],
      [refs.includes('678a8a3bb9789257faea7f25'), 'Enlighten® Whitening'],
      [f['composite-veneers-2'] === true, 'Composite Veneers'],
      [f['compoiste-edge-bonding'] === true, 'Composite Edge Bonding'],
      [refs.includes('678a8a4699de45047ec331a7'), 'e.max® Porcelain Veneers'],
      [f['e-max-crowns'] === true, 'e.max® Porcelain Crowns'],
    ]
      .filter(([show]) => show)
      .map(([, label]) => label);
    // Option IDs are the same controlled choices used by the native card.
    const clinician = { '2adb229d526cbad7bcbf34f3c508943e': 'Dr Keely Thorne' }[
      f['cosmetic-lead-1']
    ];
    if (!clinician) fail();
    return {
      id,
      title,
      description: text(f.description, 4000),
      image: {
        src: safeURL(f['before-and-after-picture']?.url, 'image'),
        alt: text(f['before-and-after-picture']?.alt || title),
      },
      price: text(f.price, 100),
      duration: text(f.duration, 100),
      clinician,
      treatments,
    };
  });
  return { cases, total: published.length };
}

const FEEDS = {
  '/tdb-content/v1/instagram.json': {
    name: 'instagram',
    key: 'instagram:awards:v1',
    collection: COLLECTION,
    project: (items) => ({ posts: projectInstagram(items) }),
    valid: (snapshot) => Array.isArray(snapshot.posts) && snapshot.posts.length <= 20,
  },
  '/tdb-content/v1/smiles.json': {
    name: 'smiles',
    key: 'smiles:home:v1',
    collection: SMILE_COLLECTION,
    project: projectSmiles,
    valid: (snapshot) =>
      Array.isArray(snapshot.cases) &&
      snapshot.cases.length <= 100 &&
      Number.isSafeInteger(snapshot.total) &&
      snapshot.total >= snapshot.cases.length,
  },
};

async function readPublished(fetcher, token, feed) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const items = [],
      ids = new Set();
    let total;
    for (let offset = 0; offset < 1000; offset += 100) {
      const response = await fetcher(
        `https://api.webflow.com/v2/collections/${feed.collection}/items/live?limit=100&offset=${offset}`,
        {
          headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
          redirect: 'manual',
          credentials: 'omit',
          cache: 'no-store',
          signal: controller.signal,
        },
      );
      if (!response.ok) throw Error('cms_http_error');
      const body = await response.text();
      if (body.length > 2097152) fail();
      const page = JSON.parse(body);
      if (
        !Array.isArray(page.items) ||
        !Number.isSafeInteger(page.pagination?.total) ||
        page.pagination.total < 0 ||
        page.pagination.total > 1000 ||
        page.pagination.offset !== offset ||
        page.items.length > 100
      )
        fail();
      if (total !== undefined && total !== page.pagination.total)
        throw Error('cms_changed_during_read');
      total = page.pagination.total;
      for (const item of page.items) {
        if (!item.id || ids.has(item.id)) throw Error('cms_changed_during_read');
        ids.add(item.id);
        items.push(item);
      }
      if (items.length === total) return feed.project(items);
      if (page.items.length !== 100 || items.length > total) fail();
    }
    fail();
  } finally {
    clearTimeout(timeout);
  }
}

export function createFeedService({
  fetcher = (...args) => fetch(...args),
  now = Date.now,
  report = () => {},
} = {}) {
  const handlers = new Map(
    Object.entries(FEEDS).map(([path, feed]) => [path, createHandler(feed)]),
  );
  return (request, env = {}) => {
    const url = new URL(request.url);
    const handler = url.hostname === 'dentalbarns.webflow.io' && handlers.get(url.pathname);
    return handler
      ? handler(request, env)
      : Response.json({ error: 'Not found' }, { status: 404, headers });
  };
  function createHandler(feed) {
    let memory,
      flight,
      retryAt = 0;
    const valid = (snapshot) =>
      snapshot?.version === 1 &&
      snapshot.feed === feed.name &&
      Number.isSafeInteger(snapshot.checkedAt) &&
      snapshot.checkedAt <= now() &&
      now() - snapshot.checkedAt < MAX_AGE_MS &&
      feed.valid(snapshot);
    function log(code) {
      try {
        report({ event: 'content_feed_failure', feed: feed.name, code });
      } catch {}
    }
    async function refresh(env) {
      if (flight) return flight;
      flight = (async () => {
        if (typeof env.WEBFLOW_API_TOKEN !== 'string' || !env.WEBFLOW_API_TOKEN.trim())
          throw Error('missing_token');
        const projection = await readPublished(fetcher, env.WEBFLOW_API_TOKEN, feed);
        const snapshot = { version: 1, feed: feed.name, checkedAt: now(), ...projection };
        // Publish only complete, validated projections; keep the previous snapshot
        // if pagination, the CMS API, or an individual published post is invalid.
        memory = snapshot;
        retryAt = 0;
        try {
          await env.CONTENT_FEEDS.put(feed.key, JSON.stringify(snapshot), { expirationTtl: 3600 });
        } catch {
          log('snapshot_write_failed');
        }
        return snapshot;
      })()
        .catch(() => {
          retryAt = now() + RETRY_MS;
          log('refresh_failed');
          return null;
        })
        .finally(() => {
          flight = null;
        });
      return flight;
    }
    return async function handle(request, env = {}) {
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } });
      }
      const reply = (body, status = 200, extra = {}) =>
        new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
          status,
          headers: { ...headers, ...extra },
        });
      if (!env.CONTENT_FEEDS?.get || !env.CONTENT_FEEDS?.put) {
        log('missing_storage');
        return reply({ error: 'Feed temporarily unavailable' }, 503);
      }
      let snapshot = valid(memory) ? memory : null;
      if (!snapshot) {
        try {
          const saved = await env.CONTENT_FEEDS.get(feed.key, 'json');
          if (valid(saved)) memory = snapshot = saved;
        } catch {
          log('snapshot_read_failed');
        }
      }
      if (!snapshot || now() - snapshot.checkedAt >= FRESH_MS) {
        if (now() >= retryAt) snapshot = (await refresh(env)) || snapshot;
      }
      if (!valid(snapshot))
        return reply({ error: 'Feed temporarily unavailable' }, 503, { 'Retry-After': '30' });
      const stale = now() - snapshot.checkedAt >= FRESH_MS;
      return reply(snapshot, 200, {
        'Cache-Control': 'public, max-age=30, must-revalidate',
        'X-TDB-Feed-State': stale ? 'stale' : 'fresh',
      });
    };
  }
}

import availability from '../availability-feed/worker.mjs';
import { createFeedService } from './feed.mjs';

export const HOST = 'tdb-public-availability.david-070.workers.dev';
const MAX_AGE = 3600000;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'Age, X-TDB-Feed-State, X-TDB-Checked-At, CF-Cache-Status',
  'Timing-Allow-Origin': '*',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

export function createCloudflareWorker({
  feed = createFeedService({
    hostname: HOST,
    report: (detail) => console.error(JSON.stringify(detail)),
  }),
  legacy = availability,
  now = Date.now,
} = {}) {
  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/tdb-content/')) return legacy.fetch(request, env, ctx);
      if (request.method === 'OPTIONS')
        return new Response(null, { status: 204, headers: { ...cors, 'Cache-Control': 'no-store' } });
      const response = await feed(request, env, ctx);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      headers.set('Cache-Control', 'no-store');
      if (response.ok) {
        const checkedAt = Number(headers.get('X-TDB-Checked-At'));
        // Neither edge nor browser caching may extend the one-hour data limit.
        const remaining = Math.floor((checkedAt + MAX_AGE - now()) / 1000) - 1;
        if (Number.isSafeInteger(checkedAt) && checkedAt > 0 && remaining > 0) {
          const browser = Math.min(30, remaining);
          const edge = Math.min(60, remaining);
          const stale = Math.min(30, Math.max(0, remaining - edge));
          headers.set('Cache-Control',
            `public, max-age=${browser}, s-maxage=${edge}, stale-while-revalidate=${stale}`);
        }
      }
      return new Response(response.body, { status: response.status, headers });
    },
  };
}

export default createCloudflareWorker();

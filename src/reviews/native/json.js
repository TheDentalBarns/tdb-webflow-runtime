/* Published JSON adapter. Keep the drawer's 20-record batches and shared API
 * while holding one validated snapshot, without fetching/parsing HTML pages. */
(() => {
  'use strict';
  if (window.TDBReviewJSON) return;
  const route = '/tdb-content/v1/reviews.json';
  const platformNames = ['Google', 'Facebook', 'Yell', 'Doctify', 'Direct testimonial', 'Other'];
  const topicNames = [
    'nervous',
    'invisalign',
    'clear-aligners',
    'bonding',
    'veneers',
    'whitening',
    'hygiene',
    'natural',
    'comfort',
    'assessment',
    'team',
    'environment',
    'location',
    'technology',
  ];
  const invalid = () => {
    throw Error('Invalid published review feed');
  };
  const cancelled = () => new DOMException('Cancelled', 'AbortError');
  const check = (signal) => {
    if (signal?.aborted) throw cancelled();
  };
  const text = (value, max = 20000) => {
    if (typeof value !== 'string' || value.length > max) invalid();
    return value;
  };
  function validate(payload) {
    if (
      payload?.version !== 1 ||
      payload.feed !== 'reviews' ||
      !Number.isSafeInteger(payload.checkedAt) ||
      payload.checkedAt > Date.now() + 300000 ||
      Date.now() - payload.checkedAt >= 3600000 ||
      !Array.isArray(payload.records) ||
      payload.records.length > 1000 ||
      !Array.isArray(payload.featured) ||
      payload.featured.length > 3 ||
      !Number.isFinite(payload.average) ||
      payload.average < 0 ||
      payload.average > 5 ||
      !Number.isSafeInteger(payload.total) ||
      payload.total < 0
    )
      invalid();
    const seen = new Set();
    const records = payload.records.map((source) => {
      if (!source || typeof source !== 'object') invalid();
      const record = {};
      for (const key of [
        'id',
        'name',
        'text',
        'excerpt',
        'platform',
        'date',
        'displayDate',
        'duplicate',
        'url',
        'response',
      ])
        record[key] = text(
          source[key],
          ['id', 'name', 'displayDate', 'duplicate'].includes(key) ? 256 : 20000,
        );
      if (
        !/^[a-z0-9-]+$/.test(record.id) ||
        seen.has(record.id) ||
        !record.name ||
        !record.text ||
        !platformNames.includes(record.platform) ||
        (record.date && !Number.isFinite(Date.parse(record.date)))
      )
        invalid();
      seen.add(record.id);
      if (record.url) {
        const url = new URL(record.url);
        if (url.protocol !== 'https:' || url.username || url.password || record.url.length > 2048)
          invalid();
      }
      for (const key of ['approx', 'historic', 'direct', 'showResponse']) {
        if (typeof source[key] !== 'boolean') invalid();
        record[key] = source[key];
      }
      for (const key of ['rank', 'snippetRank', 'nRank', 'iRank', 'lRank']) {
        if (!Number.isFinite(source[key]) || source[key] <= 0) invalid();
        record[key] = source[key];
      }
      if (
        source.rating !== null &&
        (!Number.isInteger(source.rating) || source.rating < 1 || source.rating > 5)
      )
        invalid();
      record.rating = source.rating;
      if (
        !Array.isArray(source.topics) ||
        source.topics.length > topicNames.length ||
        source.topics.some((topic) => !topicNames.includes(topic)) ||
        !source.excerpts ||
        typeof source.excerpts !== 'object' ||
        Array.isArray(source.excerpts)
      )
        invalid();
      record.topics = [...new Set(source.topics)];
      record.excerpts = {};
      for (const [topic, value] of Object.entries(source.excerpts)) {
        if (!topicNames.includes(topic)) invalid();
        record.excerpts[topic] = text(value, 5000);
      }
      return record;
    });
    if (payload.featured.some((id) => !seen.has(id))) invalid();
    return {
      records,
      average: payload.average,
      total: payload.total,
      featured: [...payload.featured],
    };
  }
  function session(snapshot, resolveIdentity) {
    const all = snapshot.records,
      records = all.slice(0, 20);
    const byId = new Map(all.map((record) => [record.id, record]));
    const index = all.map(({ id, platform, date, rating, rank, topics }) => ({
      id,
      platform,
      date,
      rating,
      rank,
      topics,
    }));
    const listeners = new Set();
    const data = {
      ...snapshot,
      records,
      get filterIndex() {
        return index;
      },
      indexReady: true,
      getCached(id) {
        return byId.get(id);
      },
      async loadIndex({ signal } = {}) {
        check(signal);
        return index;
      },
      async fetchRecords(ids, { signal } = {}) {
        check(signal);
        if (!Array.isArray(ids) || ids.some((id) => !byId.has(id)))
          throw Error('Review is outside the published index');
        return ids.map((id) => byId.get(id));
      },
      get hasMore() {
        return records.length < all.length;
      },
      get nextURL() {
        return '';
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async loadMore({ signal } = {}) {
        check(signal);
        const start = records.length;
        await Promise.resolve();
        check(signal);
        if (records.length !== start || !data.hasMore) return data;
        records.push(...all.slice(start, start + 20));
        for (const listener of listeners) listener(data);
        return data;
      },
      async ensure(ids, options) {
        while (data.hasMore && ids.some((id) => !records.some((record) => record.id === id)))
          await data.loadMore(options);
        return data;
      },
      async ensureIdentity(root, options) {
        if (!root?.querySelector('[data-tdb-review-author]')) return data;
        while (data.hasMore && !resolveIdentity(records, root)) await data.loadMore(options);
        return data;
      },
      async loadAll(options) {
        while (data.hasMore) await data.loadMore(options);
        return data;
      },
    };
    return data;
  }
  let cached,
    cachedAt = 0,
    flight;
  function load(source, { signal, resolveIdentity } = {}) {
    try {
      check(signal);
      const url = new URL(source, location.href);
      if (url.origin !== location.origin || url.pathname !== route || url.search || url.hash)
        invalid();
      if (cached && Date.now() - cachedAt < 60000) return Promise.resolve(cached);
      if (!flight) {
        const controller = new AbortController();
        const request = { controller, clients: 0, done: false };
        const timer = setTimeout(() => controller.abort(), 12000);
        flight = request;
        request.promise = fetch(url.href, {
          credentials: 'same-origin',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
          .then(async (response) => {
            if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json'))
              throw Error('Published review feed unavailable');
            const body = await response.text();
            if (body.length > 2097152) invalid();
            const snapshot = validate(JSON.parse(body));
            check(controller.signal);
            cached = session(snapshot, resolveIdentity);
            cachedAt = Date.now();
            return cached;
          })
          .finally(() => {
            clearTimeout(timer);
            request.done = true;
            if (flight === request) flight = null;
          });
      }
      const request = flight;
      request.clients++;
      return new Promise((resolve, reject) => {
        let done = false;
        const finish = (fn, value) => {
          if (done) return;
          done = true;
          signal?.removeEventListener('abort', abort);
          request.clients--;
          if (!request.done && !request.clients) {
            if (flight === request) flight = null;
            request.controller.abort();
          }
          fn(value);
        };
        const abort = () => finish(reject, cancelled());
        signal?.addEventListener('abort', abort, { once: true });
        request.promise.then(
          (data) => finish(resolve, data),
          (error) => finish(reject, error),
        );
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }
  window.TDBReviewJSON = Object.freeze({ load });
})();

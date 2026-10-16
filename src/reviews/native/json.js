/* Published JSON index plus requested batches of at most 20 review bodies. */
(() => {
  'use strict';
  if (window.TDBReviewJSON) return;
  const route = '/tdb-content/v2/reviews.json';
  const platformNames = ['Google', 'Facebook', 'Yell', 'Doctify', 'Direct testimonial', 'Other'];
  const invalid = () => {
    throw Error('Invalid published review feed');
  };
  const topic = (value) => typeof value === 'string' && /^[a-z0-9-]{1,100}$/.test(value);
  function ranks(value) {
    if (value === undefined) return undefined;
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).length > 100
    )
      invalid();
    const result = {};
    for (const [key, number] of Object.entries(value)) {
      if (!topic(key) || !Number.isFinite(number) || number <= 0) invalid();
      result[key] = number;
    }
    return result;
  }
  function contexts(value) {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.length > 1000) invalid();
    const paths = new Set(),
      ids = new Set();
    return value.map((item) => {
      if (
        !topic(item.id) ||
        ids.has(item.id) ||
        !Array.isArray(item.paths) ||
        item.paths.length > 1000 ||
        !Array.isArray(item.topics) ||
        !item.topics.length ||
        item.topics.length > 100 ||
        item.topics.some((t) => !topic(t))
      )
        invalid();
      ids.add(item.id);
      for (const p of item.paths) {
        if (
          typeof p !== 'string' ||
          p.length > 2048 ||
          !/^\/[a-zA-Z0-9_/-]*$/.test(p) ||
          paths.has(p)
        )
          invalid();
        paths.add(p);
      }
      return { id: item.id, paths: [...item.paths], topics: [...item.topics] };
    });
  }
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
        source.topics.length > 100 ||
        source.topics.some((value) => !topic(value)) ||
        !source.excerpts ||
        typeof source.excerpts !== 'object' ||
        Array.isArray(source.excerpts)
      )
        invalid();
      record.topics = [...new Set(source.topics)];
      record.excerpts = {};
      for (const [topic, value] of Object.entries(source.excerpts)) {
        if (!/^[a-z0-9-]{1,100}$/.test(topic)) invalid();
        record.excerpts[topic] = text(value, 5000);
      }
      record.snippetRanks = ranks(source.snippetRanks);
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
  function manifest(payload) {
    if (payload?.version !== 2 || !Array.isArray(payload.index) || payload.index.length > 1000)
      invalid();
    // Reuse the summary/time validation without downloading any full records.
    validate({ ...payload, version: 1, records: [], featured: [] });
    const seen = new Set();
    const index = payload.index.map((source) => {
      if (!source || !/^[a-z0-9-]{1,256}$/.test(source.id) || seen.has(source.id)) invalid();
      seen.add(source.id);
      const row = {
        id: source.id,
        name: text(source.name, 256),
        platform: text(source.platform, 80),
        date: text(source.date, 40),
        rating: source.rating,
      };
      if (
        !row.name ||
        !platformNames.includes(row.platform) ||
        (row.date && !Number.isFinite(Date.parse(row.date))) ||
        (row.rating !== null && (!Number.isInteger(row.rating) || row.rating < 1 || row.rating > 5))
      )
        invalid();
      for (const key of ['rank', 'snippetRank', 'nRank', 'iRank', 'lRank']) {
        if (!Number.isFinite(source[key]) || source[key] <= 0) invalid();
        row[key] = source[key];
      }
      for (const key of ['topics', 'excerptTopics']) {
        if (
          !Array.isArray(source[key]) ||
          source[key].length > 100 ||
          source[key].some((value) => !topic(value))
        )
          invalid();
        row[key] = [...new Set(source[key])];
      }
      row.snippetRanks = ranks(source.snippetRanks);
      row.duplicate = source.duplicate === undefined ? '' : text(source.duplicate, 256);
      return row;
    });
    if (
      !Array.isArray(payload.featured) ||
      payload.featured.length > 3 ||
      payload.featured.some((id) => !seen.has(id))
    )
      invalid();
    return {
      index,
      featured: [...payload.featured],
      average: payload.average,
      total: payload.total,
      checkedAt: payload.checkedAt,
      contexts: contexts(payload.contexts),
    };
  }
  const requests = new Map(),
    sessions = new Map();
  // Cancellation belongs to each caller. Only the last departing caller aborts
  // shared network work; an aborted request cannot install a cached session.
  function shared(key, signal, start, timeout = 0) {
    try {
      check(signal);
      let request = requests.get(key);
      if (!request) {
        const controller = new AbortController();
        request = { controller, clients: 0, done: false };
        const current = request;
        let timedOut = false;
        // Bound each network request, not the combined index + first-batch load.
        const timer = timeout
          ? setTimeout(() => {
              timedOut = true;
              controller.abort();
            }, timeout)
          : null;
        requests.set(key, request);
        request.promise = Promise.resolve()
          .then(() => {
            check(controller.signal);
            return start(controller.signal);
          })
          .catch((error) => {
            if (timedOut) throw Error('Published review feed timed out. Please try again.');
            throw error;
          })
          .finally(() => {
            clearTimeout(timer);
            current.done = true;
            if (requests.get(key) === current) requests.delete(key);
          });
      }
      const current = request;
      current.clients++;
      return new Promise((resolve, reject) => {
        let done = false;
        const finish = (fn, value) => {
          if (done) return;
          done = true;
          signal?.removeEventListener('abort', abort);
          current.clients--;
          if (!current.done && !current.clients) {
            if (requests.get(key) === current) requests.delete(key);
            current.controller.abort();
          }
          fn(value);
        };
        const abort = () => finish(reject, cancelled());
        signal?.addEventListener('abort', abort, { once: true });
        current.promise.then(
          (value) => finish(resolve, value),
          (error) => finish(reject, error),
        );
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }
  function requestJSON(url, signal) {
    return shared(
      url.href,
      signal,
      async (networkSignal) => {
        const response = await fetch(url.href, {
          credentials: 'omit',
          redirect: 'error',
          signal: networkSignal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json'))
          throw Error(
            response.status === 410
              ? 'Review session expired. Reload to refresh reviews.'
              : 'Published review feed unavailable',
          );
        const body = await response.text();
        check(networkSignal);
        if (body.length > 2097152) invalid();
        return JSON.parse(body);
      },
      12000,
    );
  }
  function session(snapshot, url, { resolveIdentity, order }) {
    const index = order ? order(snapshot.index, snapshot) : snapshot.index.slice();
    const editorial = index.some((row) => row.displayTopic);
    if (
      index.length > snapshot.index.length ||
      (!editorial && index.length !== snapshot.index.length) ||
      new Set(index.map((row) => row.id)).size !== index.length ||
      index.some((row) => !snapshot.index.some((original) => original.id === row.id))
    )
      invalid();
    const records = [],
      byId = new Map(),
      indexIds = new Set(index.map((row) => row.id));
    const listeners = new Set();
    let cursor = 0;
    const data = {
      records,
      featured: editorial ? index.slice(1, 4).map((row) => row.id) : snapshot.featured,
      power: editorial ? index[0]?.id || '' : '',
      displayTotal: index.length,
      average: snapshot.average,
      total: snapshot.total,
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
        if (!Array.isArray(ids) || ids.some((id) => !indexIds.has(id)))
          throw Error('Review is outside the published index');
        const missing = [...new Set(ids)].filter((id) => !byId.has(id));
        for (let offset = 0; offset < missing.length; offset += 20) {
          check(signal);
          const batch = missing.slice(offset, offset + 20).filter((id) => !byId.has(id));
          if (!batch.length) continue;
          const target = new URL(url);
          target.searchParams.set('ids', batch.join(','));
          target.searchParams.set('revision', String(snapshot.checkedAt));
          const result = await requestJSON(target, signal);
          check(signal);
          if (
            result?.version !== 2 ||
            result.checkedAt !== snapshot.checkedAt ||
            !Array.isArray(result.records) ||
            result.records.length !== batch.length ||
            result.records.some((record, i) => record.id !== batch[i])
          )
            invalid();
          const clean = validate({
            ...result,
            version: 1,
            average: snapshot.average,
            total: snapshot.total,
            featured: [],
          }).records;
          check(signal);
          clean.forEach((record) =>
            byId.set(
              record.id,
              window.TDBReviewSelection?.decorate(
                record,
                index.find((row) => row.id === record.id),
              ) || record,
            ),
          );
        }
        check(signal);
        return ids.map((id) => byId.get(id));
      },
      get hasMore() {
        return cursor < index.length;
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
        const start = cursor,
          ids = index.slice(start, start + 20).map((row) => row.id);
        if (!ids.length) return data;
        const batch = await data.fetchRecords(ids, { signal });
        check(signal);
        if (cursor !== start) return data;
        records.push(...batch);
        cursor += batch.length;
        for (const listener of listeners) listener(data);
        return data;
      },
      async ensure(ids, options) {
        if (ids.some((id) => !indexIds.has(id)))
          throw Error('Review is outside the published index');
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
  function load(source, { signal, resolveIdentity, order, context = 'default' } = {}) {
    try {
      check(signal);
      const url = new URL(source, location.href);
      if (
        ![location.origin, 'https://tdb-public-availability.david-070.workers.dev'].includes(
          url.origin,
        ) ||
        url.username ||
        url.password ||
        ![route, '/tdb-content/v1/reviews.json'].includes(url.pathname) ||
        url.search ||
        url.hash
      )
        invalid();
      url.protocol = 'https:';
      url.host = 'tdb-public-availability.david-070.workers.dev';
      url.pathname = route;
      const key = 'session:' + url.href + ':' + context,
        cached = sessions.get(key);
      if (cached && Date.now() - cached.at < 60000) return Promise.resolve(cached.data);
      return shared(key, signal, async (sessionSignal) => {
        const snapshot = manifest(await requestJSON(url, sessionSignal));
        const data = session(snapshot, url, { resolveIdentity, order });
        await data.loadMore({ signal: sessionSignal });
        check(sessionSignal);
        sessions.set(key, { data, at: Date.now() });
        return data;
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }
  window.TDBReviewJSON = Object.freeze({ load });
})();

/* Permission and proximity release either the legacy inert CMS source or the
 * opt-in external JSON feed. The same native carousel and CSS own presentation. */
(() => {
  'use strict';
  if (window.TDBInstagramDeferred) return;
  const base = new URL('./', document.currentScript.src);
  const records = new Map();
  let disposed = false;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  const cancelled = () => new DOMException('Cancelled', 'AbortError');
  const feedTemplate = __TDB_IG_TEMPLATE__;
  async function feedRoot(endpoint, key, signal) {
    const url = new URL(endpoint, location.href);
    if (url.origin !== location.origin || url.pathname !== '/tdb-content/v1/instagram.json')
      throw Error('Instagram feed must use the configured same-origin endpoint');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const timer = setTimeout(abort, 10000);
    let payload;
    try {
      const response = await fetch(url, {
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json'))
        throw Error('Instagram feed unavailable');
      const body = await response.text();
      if (body.length > 65536) throw Error('Instagram feed too large');
      payload = JSON.parse(body);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
    if (
      payload?.version !== 1 ||
      payload.feed !== 'instagram' ||
      !Number.isSafeInteger(payload.checkedAt) ||
      payload.checkedAt > Date.now() + 60000 ||
      Date.now() - payload.checkedAt >= 3600000 ||
      !Array.isArray(payload.posts) ||
      !payload.posts.length ||
      payload.posts.length > 20
    )
      throw Error('Instagram feed has no current posts');
    const template = document.createElement('template');
    // This is a fixed, versioned layout exported from our native Webflow design.
    // CMS values never become HTML; only validated attributes are assigned below.
    template.innerHTML = feedTemplate;
    const root = template.content.firstElementChild;
    root.setAttribute('data-tdb-ig-native', key);
    const track = root.querySelector('[data-ig-track]');
    const card = track.querySelector('[data-ig-slide]');
    card.remove();
    const seen = new Set();
    for (const post of payload.posts) {
      const link = new URL(post.url),
        image = new URL(post.image?.src);
      const identity = link.pathname.replace(/\/+$/, '');
      if (
        link.protocol !== 'https:' ||
        !['instagram.com', 'www.instagram.com'].includes(link.hostname) ||
        link.username ||
        link.password ||
        link.port ||
        !/^\/(p|reel|tv)\/[\w-]+$/.test(identity) ||
        seen.has(identity) ||
        image.protocol !== 'https:' ||
        image.hostname !== 'cdn.prod.website-files.com' ||
        image.username ||
        image.password ||
        image.port ||
        !image.pathname.startsWith('/67837ee85ee175873126e461/') ||
        typeof post.image.alt !== 'string' ||
        post.image.alt.length > 2000 ||
        typeof post.mediaType !== 'string' ||
        post.mediaType.length > 80 ||
        typeof post.date !== 'string' ||
        (post.date !== '' &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(post.date) ||
            !Number.isFinite(Date.parse(post.date)) ||
            new Date(post.date).toISOString().slice(0, 10) !== post.date)) ||
        ['likes', 'comments', 'shares'].some(
          (name) => post[name] !== null && (!Number.isSafeInteger(post[name]) || post[name] < 0),
        )
      )
        throw Error('Instagram feed contains an invalid post');
      seen.add(identity);
      const slide = card.cloneNode(true);
      for (const [name, value] of Object.entries({
        url: link.href,
        date: post.date,
        'media-type': post.mediaType,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
      }))
        slide.setAttribute('data-ig-record-' + name, value == null ? '' : String(value));
      slide.querySelectorAll('.ig-native_photo,.ig-native_reflection-photo').forEach((photo) => {
        photo.setAttribute('data-ig-src', image.href);
        photo.alt = photo.classList.contains('ig-native_photo') ? post.image.alt : '';
      });
      track.append(slide);
    }
    return document.importNode(root, true);
  }
  function check(holder, signal) {
    if (!allowed() || signal.aborted || !holder.isConnected) throw cancelled();
  }
  function waitReady(root, signal) {
    return new Promise((resolve, reject) => {
      let observer, timer;
      const finish = (error) => {
        observer?.disconnect();
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        error ? reject(error) : resolve();
      };
      const abort = () => finish(cancelled());
      const inspect = () => {
        if (signal.aborted) return abort();
        if (root.dataset.tdbIgReady) return finish();
        if (root.dataset.tdbIgError) finish(Error(root.dataset.tdbIgError));
      };
      observer = new MutationObserver(inspect);
      observer.observe(root, {
        attributes: true,
        attributeFilter: ['data-tdb-ig-ready', 'data-tdb-ig-error'],
      });
      signal.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => finish(Error('Instagram preparation timed out')), 20000);
      inspect();
    });
  }
  function decode(image, signal) {
    if (!image) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let timer;
      const finish = (error) => {
        clearTimeout(timer);
        image.removeEventListener('load', loaded);
        image.removeEventListener('error', failed);
        signal.removeEventListener('abort', abort);
        error ? reject(error) : resolve();
      };
      const abort = () => finish(cancelled());
      const failed = () => finish(Error('Instagram image could not load'));
      const loaded = () => {
        if (image.decode) image.decode().then(() => finish(), failed);
        else finish();
      };
      if (signal.aborted) return abort();
      signal.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => finish(Error('Instagram image timed out')), 15000);
      if (image.complete && image.naturalWidth) loaded();
      else {
        image.addEventListener('load', loaded, { once: true });
        image.addEventListener('error', failed, { once: true });
      }
    });
  }
  function reset(holder, record) {
    record.controller?.abort();
    record.root?.remove();
    record.root = null;
    holder.removeAttribute('aria-busy');
    holder.removeAttribute('data-ig-state');
    record.ready = false;
  }
  function prepare(holder) {
    if (!allowed() || !holder?.isConnected) return Promise.resolve();
    let record = records.get(holder);
    if (!record) {
      record = {};
      records.set(holder, record);
    }
    if (record.ready || record.flight) return record.flight || Promise.resolve();
    if (record.retryAt > Date.now()) return Promise.resolve();
    const controller = new AbortController(),
      signal = controller.signal;
    record.controller = controller;
    holder.setAttribute('aria-busy', 'true');
    record.flight = (async () => {
      const key = holder.getAttribute('data-tdb-ig-placeholder');
      const endpoint = holder.getAttribute('data-tdb-ig-feed');
      const template = [...document.querySelectorAll('template[data-tdb-ig-source]')].find(
        (node) => node.getAttribute('data-tdb-ig-source') === key,
      );
      const original = template?.content.querySelector('[data-tdb-ig-native]');
      if (!endpoint && !original) throw Error('Instagram CMS template missing');
      const [root] = await Promise.all([
        endpoint
          ? feedRoot(endpoint, key, signal)
          : Promise.resolve(document.importNode(original, true)),
        window.TDBModules.load(new URL('tdb-instagram-native.css', base), {
          type: 'style',
          attribute: 'data-tdb-instagram-css',
        }),
        window.TDBModules.load(new URL('tdb-instagram-native.min.js', base), {
          ready: () => Boolean(window.TDBInstagramNative),
          attribute: 'data-tdb-instagram-feature',
        }),
      ]);
      check(holder, signal);
      // The opt-in feed needs no initial CMS template. Legacy pages keep theirs.
      record.root = root;
      [root, ...root.querySelectorAll('[data-ig-class]')].forEach((node) => {
        const names = node.getAttribute('data-ig-class')?.split(/\s+/).filter(Boolean) || [];
        node.classList.add(...names);
        node.removeAttribute('data-ig-class');
      });
      // Both are inside the native first image window: the last card supplies
      // the entry advance and the first card is its destination. Decode them
      // before mounting so reveal can happen in the mount's microtask, before
      // the shared first-view frames. Visibility:hidden would cancel that entry.
      const photos = [...root.querySelectorAll('img.ig-native_photo')];
      await Promise.all(
        [...new Set([photos[0], photos.at(-1)])].filter(Boolean).map((photo) => {
          const image = new Image();
          for (const name of ['crossorigin', 'referrerpolicy', 'sizes', 'srcset', 'src']) {
            const value = photo.getAttribute(name) || photo.getAttribute('data-ig-' + name);
            if (value) image.setAttribute(name, value);
          }
          return decode(image, signal);
        }),
      );
      check(holder, signal);
      // Park CMS photos before connecting the fragment. Native imageWindow then
      // releases its existing desktop 5/mobile 3 window, including reflections.
      root.querySelectorAll('.ig-native_photo,.ig-native_reflection-photo').forEach((image) => {
        for (const name of ['src', 'srcset'])
          if (image.hasAttribute(name)) {
            image.setAttribute('data-ig-' + name, image.getAttribute(name));
            image.removeAttribute(name);
          }
      });
      holder.append(root);
      const mounted = waitReady(root, signal);
      window.TDBInstagramNative.refresh(root);
      await mounted;
      check(holder, signal);
      holder.setAttribute('data-ig-state', 'ready');
      holder.removeAttribute('aria-busy');
      record.ready = true;
    })()
      .catch((error) => {
        reset(holder, record);
        window.TDBInstagramNative?.refresh();
        if (error.name !== 'AbortError') {
          record.retryAt = Date.now() + 5000;
          holder.setAttribute('data-ig-state', 'error');
          console.warn('TDB Instagram: holding image retained.', error);
        }
      })
      .finally(() => {
        record.flight = null;
      });
    return record.flight;
  }
  const unsubscribe = window.TDBConsent?.subscribe(() => {
    if (allowed()) return;
    records.forEach((record, holder) => reset(holder, record));
  });
  window.TDBInstagramDeferred = Object.freeze({
    version: '1.1.0',
    prepare,
    destroy() {
      if (disposed) return;
      disposed = true;
      unsubscribe?.();
      records.forEach((record, holder) => reset(holder, record));
      records.clear();
    },
  });
})();

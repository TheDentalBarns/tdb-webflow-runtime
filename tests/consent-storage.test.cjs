const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const markup = fs.readFileSync('src/consent/banner.html', 'utf8');
const sources = {
  source: ['src/shared/consent-decision.js', 'src/consent/banner.js', 'src/consent/consent.js']
    .map((path) => fs.readFileSync(path, 'utf8'))
    .join('\n')
    .replace('__TDB_CONSENT_INSTANT_CSS__', "''"),
  foundation: fs.readFileSync('dist/tdb-foundation.js', 'utf8'),
  compatibility: fs.readFileSync('dist/tdb-consent.js', 'utf8'),
};

function fixture(source, storage, saved) {
  const dom = new JSDOM(
    '<!doctype html><html><body>' +
      markup +
      '<section data-vimeo-hero-shell></section><section data-tdb-journey>' +
      '<div data-tdb-journey-map role="region" aria-label="Map to The Dental Barns">' +
      'The Dental Barns · Lichfield</div></section></body></html>',
    {
      url: 'https://dentalbarns.webflow.io/location',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    },
  );
  const w = dom.window,
    d = w.document,
    requests = [],
    timers = new Map();
  let now = 0,
    sequence = 0,
    cookie = saved ? 'CookieScriptConsent=' + encodeURIComponent(JSON.stringify(saved)) : '';
  Object.defineProperty(d, 'readyState', { value: 'complete' });
  Object.defineProperty(d, 'currentScript', {
    value: { src: 'https://cdn.test/dist/tdb-foundation.js' },
  });
  Object.defineProperty(d, 'cookie', {
    get() {
      if (storage === 'throws') throw new w.DOMException('Storage is unavailable', 'SecurityError');
      return cookie;
    },
    set(value) {
      if (storage === 'throws') throw new w.DOMException('Storage is unavailable', 'SecurityError');
      if (storage === 'available') cookie = value.split(';')[0];
      // Some embedded browsers silently discard cookie writes.
    },
  });
  w.setTimeout = (fn, delay = 0) => {
    timers.set(++sequence, { fn, at: now + delay });
    return sequence;
  };
  w.clearTimeout = (id) => timers.delete(id);
  w.requestAnimationFrame = (fn) => w.setTimeout(fn, 16);
  w.cancelAnimationFrame = w.clearTimeout;
  w.Element.prototype.getAnimations = () => [];
  w.Element.prototype.animate = () => ({ cancel() {}, finished: Promise.resolve() });
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.TDBScrollLock = { acquire: () => () => {} };
  w.TDBModules = {
    async load(url) {
      requests.push(String(url));
      w.TDBRuntime = { refresh() {} };
    },
  };
  function advance(ms) {
    const end = now + ms;
    for (;;) {
      const next = [...timers]
        .filter(([, value]) => value.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].fn();
    }
    now = end;
  }
  const run = () => w.eval(source);
  return {
    w,
    d,
    requests,
    run,
    advance,
    api: () => w.CookieScript.instance,
    map: d.querySelector('[data-tdb-journey-map]'),
    close: () => w.close(),
  };
}

for (const [name, source] of Object.entries(sources)) {
  test(`${name}: successful persistence keeps later cross-tab changes authoritative`, () => {
    const f = fixture(source, 'available');
    try {
      f.run();
      f.api().acceptAllAction();
      f.advance(470);
      assert.equal(f.w.TDBConsent.allows('functionality'), true);
      f.d.cookie =
        'CookieScriptConsent=' +
        encodeURIComponent(JSON.stringify({ action: 'reject', categories: [] }));
      f.w.TDBConsent.refresh();
      assert.equal(f.api().currentState().action, 'reject');
      assert.equal(f.w.TDBConsent.allows('functionality'), false);
      f.d.cookie = 'CookieScriptConsent=';
      f.w.TDBConsent.refresh();
      assert.equal(f.api().currentState().action, undefined);
      assert.equal(f.w.TDBConsent.allows(), false);
    } finally {
      f.close();
    }
  });
  for (const storage of ['ignored', 'throws']) {
    test(`${name}: ${storage} cookies retain explicit choices and release the essential-only map`, () => {
      const f = fixture(source, storage);
      try {
        assert.doesNotThrow(f.run, 'restricted storage must not abort essential startup');
        const api = f.api();
        assert.equal(api.currentState().action, undefined);
        assert.equal(f.w.TDBConsent.allows(), false);
        assert.equal(f.map.getAttribute('role'), 'button');
        assert.equal(f.requests.length, 0);

        f.d.getElementById('cookiescript_reject').click();
        assert.equal(api.currentState().action, 'reject');
        assert.equal(f.requests.length, 0, 'runtime still waits for banner close');
        f.advance(470);
        assert.equal(api.isOpen(), false);
        assert.equal(f.w.TDBConsent.allows(), true);
        assert.equal(f.w.TDBConsent.allows('functionality'), false);
        assert.equal(f.w.TDBConsent.allows('performance'), false);
        assert.equal(f.map.getAttribute('role'), 'region');
        assert.equal(f.map.getAttribute('aria-haspopup'), null);
        assert.equal(f.requests.filter((url) => url.endsWith('tdb-runtime.js')).length, 1);
        assert.equal(
          f.requests.some((url) => /vimeo/.test(url)),
          false,
        );
        assert.equal(f.d.querySelector('[data-tdb-ga-js],[data-tdb-meta-js]'), null);
        assert.doesNotThrow(() => api.getCookieValueForQueryArg());

        api.show();
        api.acceptAllAction();
        f.advance(470);
        assert.equal(f.w.TDBConsent.allows('functionality'), true);
        assert.equal(f.w.TDBConsent.allows('performance'), true);
        api.show();
        api.rejectAllAction();
        f.advance(470);
        const state = api.currentState();
        state.action = 'accept';
        state.categories.push('functionality');
        f.w.TDBConsent.refresh();
        assert.equal(api.currentState().action, 'reject');
        assert.equal(f.w.TDBConsent.allows('functionality'), false);
        assert.equal(f.w.TDBConsent.allows('performance'), false);
        assert.equal(f.map.getAttribute('role'), 'region');
      } finally {
        f.close();
      }

      const fresh = fixture(source, storage);
      try {
        fresh.run();
        assert.equal(
          fresh.api().currentState().action,
          undefined,
          'memory is not permission on a new page',
        );
        assert.equal(fresh.w.TDBConsent.allows(), false);
      } finally {
        fresh.close();
      }
    });
  }

  test(`${name}: withdrawal overrides an accepted cookie when a browser refuses to replace it`, () => {
    const f = fixture(source, 'ignored', { action: 'accept', categories: ['functionality'] });
    try {
      f.run();
      assert.equal(f.w.TDBConsent.allows('functionality'), true);
      f.api().show();
      f.api().rejectAllAction();
      f.advance(470);
      assert.equal(f.api().currentState().action, 'reject');
      assert.equal(f.w.TDBConsent.allows('functionality'), false);
      assert.equal(f.w.TDBConsent.allows(), true);
      assert.equal(f.map.getAttribute('role'), 'region');
    } finally {
      f.close();
    }
  });
}

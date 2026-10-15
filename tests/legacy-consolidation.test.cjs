const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = (name) => fs.readFileSync(name, 'utf8');
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture(html = '<div id="slot"></div>') {
  const dom = new JSDOM(html, {
    url: 'https://dentalbarns.webflow.io/',
    runScripts: 'outside-only',
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false });
  w.ResizeObserver = w.MutationObserver = class {
    observe() {}
    disconnect() {}
  };
  const animations = [];
  w.Element.prototype.animate = function (frames, options) {
    const animation = {
      frames,
      options,
      cancelled: false,
      cancel() {
        this.cancelled = true;
      },
    };
    animations.push(animation);
    return animation;
  };
  return { w, d: w.document, animations, close: () => w.close() };
}
test('shared ticker preserves 400ms reversal, interruption, labels and motion options for all three consumers', () => {
  for (const [valueClass, label] of [
    ['tdb-fi-ticker-value', true],
    ['tdb-ri-ticker-value', true],
    ['tdb-ig-ticker-value', false],
  ]) {
    const f = fixture();
    try {
      f.w.eval(read('src/shared/value-ticker.js'));
      const slot = f.d.querySelector('#slot'),
        reduced = { matches: false };
      const ticker = f.w.tdbValueTicker(slot, { valueClass, label, reduced });
      ticker.update('01');
      assert.equal(f.animations.length, 0);
      ticker.update('02', 1);
      const oldFinish = f.animations[1].onfinish;
      assert.equal(f.animations[0].options.duration, 400);
      assert.equal(f.animations[0].options.easing, 'ease-in-out');
      ticker.update('01', -1);
      assert.equal(f.animations[0].cancelled, true);
      assert.equal(f.animations[1].cancelled, true);
      assert.equal(f.animations[2].frames[1].transform, 'translateY(100%)');
      oldFinish();
      assert.equal(slot.children.length, 2);
      f.animations[3].onfinish();
      assert.equal(slot.children.length, 1);
      assert.equal(slot.textContent, '01');
      assert.equal(slot.firstElementChild.className, valueClass);
      assert.equal(slot.getAttribute('aria-label'), label ? '01' : null);
      reduced.matches = true;
      ticker.update('03');
      assert.equal(f.animations.length, 4);
      assert.equal(slot.textContent, '03');
      ticker.stop();
      assert.equal(slot.textContent, '03');
    } finally {
      f.close();
    }
  }
});
test('ticker animation failure settles the value and cancels partial motion', () => {
  const f = fixture();
  try {
    f.w.eval(read('src/shared/value-ticker.js'));
    const slot = f.d.querySelector('#slot');
    let calls = 0,
      cancelled = false;
    f.w.Element.prototype.animate = () => {
      if (++calls === 2) throw Error('animation unavailable');
      return {
        cancel() {
          cancelled = true;
        },
      };
    };
    const ticker = f.w.tdbValueTicker(slot, { valueClass: 'value' });
    ticker.update('1');
    ticker.update('2');
    assert.equal(slot.textContent, '2');
    assert.equal(slot.children.length, 1);
    assert.equal(cancelled, true);
  } finally {
    f.close();
  }
});
test('both legacy IG entry points preserve post order, identical markup, links and a single owner', async () => {
  const id = 'd03f7f34-0953-4575-946c-bca5b6a21bed';
  let expected;
  for (const desktop of [false, true]) {
    const f = fixture(
      '<html data-wf-page="677cf86df9952f978d94d8a9"><body><div data-tdb-ig-widget="' +
        id +
        '" aria-busy="true"></div></body></html>',
    );
    try {
      let fetches = 0;
      if (desktop) {
        f.w.eval(read('src/instagram/manual-snapshot.js'));
        const data = f.w.TDBInstagramManualData;
        delete f.w.TDBInstagramManualData;
        f.w.fetch = async () => {
          fetches++;
          return { ok: true, json: async () => data };
        };
      }
      const file = desktop ? 'dist/tdb-home-desktop-instagram.js' : 'dist/tdb-instagram-feed.js';
      f.w.eval(read(file));
      await tick();
      const mount = f.d.querySelector('[data-tdb-ig-widget]');
      assert.equal(mount.hasAttribute('aria-busy'), false);
      const data = f.w.TDBInstagramManualData,
        posts = data.feeds[id].posts;
      const order = [
        ...mount.querySelectorAll('.swiper-wrapper > .swiper-slide [data-ig-post]'),
      ].map((n) => n.dataset.igPost);
      assert.deepEqual(order, Array.from([posts.at(-1), ...posts.slice(0, -1)]));
      assert.equal(mount.querySelectorAll('.tdb-ig-details-panel').length, 3);
      for (const panel of mount.querySelectorAll('.is-neighbour')) {
        assert.equal(panel.getAttribute('aria-hidden'), 'true');
        assert.equal(panel.inert, true);
      }
      assert.equal(mount.querySelector('.tdb-ig-instagram').href, data.posts[posts.at(-1)].url);
      const markup = mount.innerHTML;
      if (!desktop) expected = markup;
      else assert.equal(markup, expected);
      const api = f.w.TDBInstagramFeed;
      f.w.eval(read(file));
      await tick();
      assert.equal(f.w.TDBInstagramFeed, api);
      assert.equal(mount.innerHTML, markup);
      assert.equal(fetches, desktop ? 1 : 0);
      assert.equal(f.d.scripts.length, 0);
    } finally {
      f.close();
    }
  }
});
test('legacy IG tag filtering and data failure preserve the existing fallback', async () => {
  const f = fixture(
    '<div data-tdb-ig-widget="d03f7f34-0953-4575-946c-bca5b6a21bed" data-tdb-ig-tags="invisalign" aria-busy="true"></div>',
  );
  try {
    f.w.eval(read('dist/tdb-instagram-feed.js'));
    const expected = Object.values(f.w.TDBInstagramManualData.posts).filter((p) =>
      p.tags.includes('invisalign'),
    );
    assert.equal(
      f.d.querySelectorAll('.swiper-wrapper > .swiper-slide [data-ig-post]').length,
      expected.length,
    );
  } finally {
    f.close();
  }
  const failed = fixture('<div data-tdb-ig-widget="missing" aria-busy="true"></div>');
  try {
    failed.w.fetch = async () => ({ ok: false });
    failed.w.eval(read('dist/tdb-home-desktop-instagram.js'));
    await tick();
    assert.equal(failed.d.querySelector('a').href, 'https://www.instagram.com/thedentalbarns/');
    assert.equal(failed.d.querySelector('[data-tdb-ig-widget]').hasAttribute('aria-busy'), false);
  } finally {
    failed.close();
  }
});
test('combined review CMS exposes both APIs without fetching or mounting; old adapter calls remain idempotent', () => {
  const f = fixture();
  try {
    f.w.fetch = () => {
      throw Error('definition must not fetch');
    };
    f.w.eval(read('dist/tdb-review-cms.js'));
    assert.equal(typeof f.w.TDBReviewCMS.load, 'function');
    assert.equal(typeof f.w.TDBReviewQuotes.mount, 'function');
    const cms = f.w.TDBReviewCMS,
      quotes = f.w.TDBReviewQuotes;
    f.w.eval(read('dist/tdb-review-quote-adapter.min.js'));
    f.w.eval(read('dist/tdb-review-cms.js'));
    assert.equal(f.w.TDBReviewCMS, cms);
    assert.equal(f.w.TDBReviewQuotes, quotes);
    assert.equal(f.d.body.innerHTML, '<div id="slot"></div>');
  } finally {
    f.close();
  }
});

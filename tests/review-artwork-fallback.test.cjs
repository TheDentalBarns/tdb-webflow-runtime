const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('src/reviews/native/cards.js', 'utf8');
const cardTemplate = fs.readFileSync('src/reviews/native/cards-template.html', 'utf8');

function setup(template = cardTemplate) {
  const dom = new JSDOM('<div id="holder"></div>', {
    url: 'https://dentalbarns.webflow.io/',
    runScripts: 'outside-only',
  });
  const w = dom.window,
    holder = w.document.getElementById('holder'),
    images = [],
    timers = new Map();
  let id = 0;
  w.setTimeout = (fn, delay) => {
    timers.set(++id, { fn, delay });
    return id;
  };
  w.clearTimeout = (id) => timers.delete(id);
  w.Image = class {
    constructor() {
      images.push(this);
    }
    decode() {
      return Promise.resolve();
    }
  };
  w.eval(source.replace('__TDB_REVIEW_CARDS_TEMPLATE__', JSON.stringify(template)));
  const controller = new w.AbortController();
  return {
    w,
    holder,
    images,
    timers,
    controller,
    create: () => w.TDBReviewCards.create(holder, { signal: controller.signal }),
    expire() {
      for (const [id, timer] of [...timers]) {
        timers.delete(id);
        timer.fn();
      }
    },
    close: () => w.close(),
  };
}

test('healthy review artwork decodes before insertion and duplicate arrows share preparation', async () => {
  const f = setup();
  try {
    const creating = f.create();
    assert.equal(f.images.length, 2);
    assert.equal(f.holder.children.length, 0);
    f.images.forEach((image) => image.onload());
    const root = await creating;
    assert.equal(f.holder.firstElementChild, root);
    assert(
      [...root.querySelectorAll('img')].every((node) =>
        node.src.startsWith('https://cdn.prod.website-files.com/'),
      ),
    );
    assert.equal(f.timers.size, 0);
    assert(f.images.every((image) => image.onload === null && image.onerror === null));
  } finally {
    f.close();
  }
});

test('missing or undecodable artwork retains labelled controls and the decorative clock box', async () => {
  const f = setup();
  try {
    const creating = f.create();
    f.images[0].onerror();
    f.images[1].decode = () => Promise.reject(Error('decode failure'));
    f.images[1].onload();
    const root = await creating;
    const clock = root.querySelector('.tdb-review-cards_clock');
    assert.equal(clock.style.visibility, 'hidden');
    assert.equal(clock.getAttribute('aria-hidden'), 'true');
    assert.equal(
      root.querySelector('[data-tdb-cards-prev]').getAttribute('aria-label'),
      'Previous review',
    );
    assert.equal(
      root.querySelector('[data-tdb-cards-next]').getAttribute('aria-label'),
      'Next review',
    );
    assert.equal(root.querySelector('[data-tdb-cards-prev]').textContent, 'Prev');
    assert.equal(root.querySelector('[data-tdb-cards-next]').textContent, 'Next');
    assert.equal(
      root.querySelector('[data-tdb-cards-prev] span').getAttribute('aria-hidden'),
      'true',
    );
    assert.equal(
      root.querySelector('[data-tdb-cards-next] span').getAttribute('aria-hidden'),
      'true',
    );
    assert.equal(root.querySelector('.tdb-review-cards_arrow-asset'), null);
  } finally {
    f.close();
  }
});

test('a stalled decode falls back after 1500ms and late completion cannot replace the mounted fallback', async () => {
  const f = setup();
  try {
    let decode;
    const creating = f.create();
    f.images[0].decode = () =>
      new Promise((resolve) => {
        decode = resolve;
      });
    f.images[0].onload();
    assert([...f.timers.values()].every((timer) => timer.delay === 1500));
    f.expire();
    const root = await creating,
      fallback = root.innerHTML;
    decode();
    await Promise.resolve();
    assert.equal(root.innerHTML, fallback);
    assert.equal(f.holder.children.length, 1);
    assert.equal(f.timers.size, 0);
  } finally {
    f.close();
  }
});

test('abort and detached holders never append cards after artwork completes', async () => {
  for (const abort of [true, false]) {
    const f = setup();
    try {
      const creating = f.create();
      if (abort) f.controller.abort();
      else {
        f.holder.remove();
        f.images.forEach((image) => image.onload());
      }
      await assert.rejects(creating, { name: 'AbortError' });
      assert.equal(f.holder.children.length, 0);
      assert.equal(f.timers.size, 0);
      assert(f.images.every((image) => image.onload === null && image.onerror === null));
    } finally {
      f.close();
    }
  }
});

test('failure of a future essential template image rejects preparation instead of hiding it', async () => {
  const f = setup(
    cardTemplate.replace(
      '</article>',
      '<img src="/essential.jpg" alt="Review evidence"></article>',
    ),
  );
  try {
    const creating = f.create();
    const essential = f.images.find((image) => image.src.endsWith('/essential.jpg'));
    assert(essential);
    for (const image of f.images) if (image !== essential) image.onload();
    essential.onerror();
    await assert.rejects(creating, /Review artwork unavailable/);
    assert.equal(f.holder.children.length, 0);
    assert.equal(f.timers.size, 0);
    assert(f.images.every((image) => image.onload === null && image.onerror === null));
  } finally {
    f.close();
  }
});

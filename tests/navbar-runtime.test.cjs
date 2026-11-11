const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const flush = () => new Promise((resolve) => setImmediate(resolve));
const dropdown = (id) =>
  `<div class="navbar10_menu-dropdown"><button id="${id}" class="navbar10_dropdown-toggle w-dropdown-toggle" aria-expanded="false">${id}</button><nav class="w-dropdown-list navbar10_dropdown-list"><div class="navbar10_container"><div class="navbar10_dropdown-content-left"><a href="/about-us">About</a></div><div class="navbar10_dropdown-content-right"><img class="navbar10_blog-item-image" loading="lazy" src="https://example.test/${id}.webp" sizes="100vw"></div></div></nav></div>`;
function fixture(width = 448, consent = true, registry = true, transparent = true) {
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body style="overflow:clip"><main>Page</main><div class="navbar10_component w-nav" transparent-nav="true" data-tdb-navbar-native data-duration="500" fs-scrolldisable-element="smart-nav"><div class="tdb-nav-bar-glass"></div><a class="navbar10_logo-link"></a><div class="navbar_line"></div><button class="w-nav-button navbar10_menu-button" aria-expanded="false">Menu</button><div class="w-nav-overlay"><nav class="w-nav-menu navbar10_menu"><div class="navbar10_menu-left">${dropdown('services')}${dropdown('discover')}</div><div class="navbar10_menu-right">First visit</div></nav></div><div class="tdb-desktop-nav-backdrop"></div></div></body></html>`,
    { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://dentalbarns.webflow.io/' },
  );
  const w = dom.window,
    d = w.document,
    queries = new Map(),
    animations = [];
  d.querySelector('.navbar10_component').setAttribute('transparent-nav', String(transparent));
  // Deployment supplies these fixed rules in the early shared style block.
  const critical = d.createElement('style');
  critical.textContent = 'body{overflow:visible}' + read('dist/tdb-scroll-lock.css');
  d.head.append(critical);
  w.innerWidth = width;
  w.innerHeight = 874;
  Object.defineProperty(d.documentElement, 'clientWidth', { get: () => w.innerWidth });
  const matches = (query) => {
    const min = /min-width:\s*(\d+)/.exec(query),
      max = /max-width:\s*(\d+)/.exec(query);
    return (!min || w.innerWidth >= +min[1]) && (!max || w.innerWidth <= +max[1]);
  };
  w.matchMedia = (query) => {
    if (!queries.has(query))
      queries.set(query, {
        matches: matches(query),
        listeners: new Set(),
        addEventListener(type, fn) {
          this.listeners.add(fn);
        },
        removeEventListener(type, fn) {
          this.listeners.delete(fn);
        },
        addListener(fn) {
          this.listeners.add(fn);
        },
        removeListener(fn) {
          this.listeners.delete(fn);
        },
      });
    return queries.get(query);
  };
  w.Element.prototype.animate = function (frames, options) {
    let finish;
    const animation = {
      element: this,
      frames,
      options,
      cancelled: false,
      finished: new Promise((resolve) => {
        finish = resolve;
      }),
      finish() {
        finish();
      },
      cancel() {
        this.cancelled = true;
        finish();
      },
    };
    animations.push(animation);
    return animation;
  };
  w.HTMLImageElement.prototype.decode = () => Promise.resolve();
  Object.defineProperty(d, 'currentScript', {
    configurable: true,
    value: {
      src: 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@fixture/dist/tdb-navbar-loader.js',
      dataset: { tdbRuntimeBase: 'https://example.test/runtime/' },
    },
  });
  if (consent)
    d.cookie = 'CookieScriptConsent=' + encodeURIComponent(JSON.stringify({ action: 'reject' }));
  if (registry) w.eval(read('dist/tdb-modules.js'));
  w.eval(
    read('src/shared/scroll-lock.js').replace(
      '__TDB_SCROLL_LOCK_CSS__',
      JSON.stringify(read('src/styles/tdb-scroll-lock.css')),
    ),
  );
  w.TDBConsent = { allows: () => consent };
  w.eval(read('dist/tdb-navbar-loader.js'));
  // The bundle now includes the native foundation; complete its parser lifecycle.
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  const nav = d.querySelector('.w-nav'),
    menu = d.querySelector('.w-nav-menu'),
    button = d.querySelector('.w-nav-button');
  return {
    dom,
    w,
    d,
    nav,
    menu,
    button,
    animations,
    enhance() {
      w.eval(read('dist/tdb-navbar.min.js'));
      w.TDBNavbarLoader.activate((work) => Promise.resolve(work()));
      d.querySelector('[data-tdb-navbar-enhancement]')?.dispatchEvent(new w.Event('load'));
    },
    async resize(next) {
      w.innerWidth = next;
      for (const [q, m] of queries) {
        const value = matches(q);
        if (value !== m.matches) {
          m.matches = value;
          for (const fn of m.listeners) fn(m);
        }
      }
      w.dispatchEvent(new w.Event('resize'));
      await flush();
    },
    async open() {
      button.classList.add('w--open');
      menu.setAttribute('data-nav-menu-open', '');
      await flush();
    },
    async closeStart() {
      button.classList.remove('w--open');
      await flush();
    },
    async closeEnd() {
      menu.removeAttribute('data-nav-menu-open');
      button.setAttribute('aria-expanded', 'false');
      await flush();
    },
    async finish() {
      animations.forEach((a) => a.finish());
      await flush();
      await flush();
    },
  };
}

for (const width of [448, 1363])
  test(`About navigation attaches to the final screen and scrolls away with it at ${width}px`, async () => {
    const f = fixture(width);
    const intro = f.d.createElement('section');
    intro.setAttribute('data-tdb-stepped-intro', '');
    intro.setAttribute('data-tdb-intro-pin-nav', '');
    intro.getBoundingClientRect = () => ({ bottom: 3496 - f.w.scrollY });
    f.d.body.append(intro);
    const frames = new Map();
    let id = 0;
    f.w.requestAnimationFrame = (fn) => {
      frames.set(++id, fn);
      return id;
    };
    f.w.cancelAnimationFrame = (id) => frames.delete(id);
    const drain = () => {
      for (let turn = 0; frames.size && turn < 10; turn++) {
        const jobs = [...frames.values()];
        frames.clear();
        jobs.forEach((fn) => fn());
      }
    };
    const scroll = (y) => {
      f.w.scrollY = y;
      f.w.dispatchEvent(new f.w.Event('scroll'));
      drain();
    };
    try {
      f.enhance();
      await flush();
      drain();
      for (const y of [0, 874, 1748, 2600]) {
        scroll(y);
        assert.equal(f.nav.style.position, 'fixed');
        assert.equal(f.nav.style.transform, 'translateY(0)');
      }
      for (const y of [2622, 2800, 3400]) {
        scroll(y);
        assert.equal(f.nav.style.position, 'absolute');
        assert.equal(f.nav.style.top, '2622px');
        assert.equal(f.nav.style.transform, 'translateY(0)');
      }
      scroll(3800);
      assert.equal(f.nav.style.top, '', 'normal document position is restored outside the intro');
      scroll(3600);
      assert.equal(f.nav.style.position, 'fixed', 'ordinary scroll-up navigation returns below the intro');
      scroll(3300);
      assert.equal(f.nav.style.position, 'absolute', 'returning into the exit screen reattaches the nav');
      scroll(2500);
      assert.equal(f.nav.style.position, 'fixed');
      assert.equal(f.nav.style.top, '');
      assert.equal(f.nav.style.transform, 'translateY(0)');
    } finally {
      f.dom.window.close();
    }
  });

for (const width of [448, 834, 1363])
  test(`transparent navbar keeps the mobile hero hold at ${width}px`, async () => {
    const f = fixture(width);
    const frames = new Map();
    let frameId = 0;
    f.w.requestAnimationFrame = (fn) => {
      frames.set(++frameId, fn);
      return frameId;
    };
    f.w.cancelAnimationFrame = (id) => frames.delete(id);
    const drain = () => {
      for (let turn = 0; frames.size && turn < 10; turn++) {
        const batch = [...frames.values()];
        frames.clear();
        batch.forEach((fn) => fn());
      }
    };
    const scroll = (y) => {
      f.w.scrollY = y;
      f.w.dispatchEvent(new f.w.Event('scroll'));
      drain();
    };
    try {
      f.enhance();
      await flush();
      drain();
      assert.equal(f.nav.style.position, 'absolute');
      scroll(600);
      scroll(400);
      assert.equal(
        f.nav.style.position,
        'absolute',
        'upward movement within 75vh must not reveal a fixed navbar',
      );
      scroll(1100);
      scroll(900);
      assert.equal(
        f.nav.style.position,
        'fixed',
        'upward movement beyond 75vh reveals the shared sticky navbar',
      );
      assert.equal(f.nav.style.transform, 'translateY(0)');
      scroll(1200);
      assert.equal(f.nav.style.transform, 'translateY(-100%)');
      scroll(400);
      assert.equal(
        f.nav.style.position,
        'absolute',
        'hidden sticky bar returns to the original hero placement',
      );
      scroll(0);
      assert.equal(f.nav.style.position, 'absolute');
      assert.equal(f.nav.style.transform, 'translateY(0)');
    } finally {
      f.dom.window.close();
    }
  });

for (const width of [448, 834, 1363]) {
  for (const [page, transparent] of [
    ['/', true],
    ['/location', true],
    ['/dental-cost-lichfield', false],
    ['/services/example', false],
  ]) {
    test(`shared scroll and announcement handoff at ${width}px on ${page}`, async () => {
      const f = fixture(width, true, true, transparent);
      f.dom.reconfigure({ url: 'https://dentalbarns.webflow.io' + page });
      const frames = new Map();
      let serial = 0;
      f.w.requestAnimationFrame = (fn) => {
        frames.set(++serial, fn);
        return serial;
      };
      f.w.cancelAnimationFrame = (id) => frames.delete(id);
      const drain = async () => {
        for (let turn = 0; turn < 10; turn++) {
          await flush();
          if (!frames.size) break;
          const jobs = [...frames.values()];
          frames.clear();
          jobs.forEach((fn) => fn());
        }
      };
      const scroll = async (y) => {
        f.w.scrollY = y;
        f.w.dispatchEvent(new f.w.Event('scroll'));
        await drain();
      };
      try {
        f.enhance();
        await drain();
        const shell = f.d.createElement('div');
        shell.id = 'tdb-elfsight-timer-shell';
        shell.setAttribute('data-tdb-announcement', '');
        shell.setAttribute('data-placement', 'floating');
        f.d.body.append(shell);
        f.w.TDBRuntimePageState = { hadInteraction: true };
        f.w.requestIdleCallback = (fn) => fn();
        f.w.TDBAnnouncementLoader = { load: async () => ({ mount() {} }) };
        f.w.eval(
          read('src/runtime/page-position.js') +
            '\n' +
            read('src/banner/floating-loader.js') +
            '\nprepareFloatingAnnouncement();',
        );
        await drain();
        const bannerHidden = () => f.d.documentElement.classList.contains('tdb-timer-hidden');
        assert(bannerHidden(), 'banner retains its existing initial reveal distance');
        assert.equal(f.nav.style.position, 'absolute');
        await scroll(600);
        await scroll(400);
        assert.equal(
          f.nav.style.position,
          'absolute',
          'all appearances stay in the hero before 75vh',
        );
        await scroll(5000);
        assert.equal(
          bannerHidden(),
          false,
          'scrolling the original nav off screen must allow the banner',
        );
        await scroll(4800);
        assert.equal(f.nav.style.position, 'fixed');
        assert.equal(f.nav.style.transform, 'translateY(0)');
        assert.equal(bannerHidden(), true, 'the announcement yields when any navbar returns');
        if (!transparent) {
          assert.equal(
            f.nav.classList.contains('is-trans'),
            false,
            'glass appearance does not enter transparent colour states',
          );
          assert.equal(f.d.documentElement.classList.contains('tdb-nav-at-top'), false);
          assert.equal(f.w.TDBNavScroll.clearSurface, false);
        }
        await scroll(5100);
        assert.equal(f.nav.style.transform, 'translateY(-100%)');
        assert.equal(bannerHidden(), false, 'banner returns when the navbar leaves');
        await scroll(4900);
        await f.open();
        await drain();
        await scroll(5400);
        assert.equal(
          f.nav.style.transform,
          'translateY(0)',
          'open menus keep every appearance present',
        );
        assert.equal(bannerHidden(), true);
        await f.closeStart();
        await f.closeEnd();
        await drain();
        await scroll(5700);
        assert.equal(f.nav.style.transform, 'translateY(-100%)');
        assert.equal(bannerHidden(), false);
        await scroll(400);
        assert.equal(f.nav.style.position, 'absolute');
        await scroll(0);
        assert.equal(f.nav.style.transform, 'translateY(0)');
        assert.equal(f.w.TDBNavScroll.floatingVisible, false);
        assert.equal(bannerHidden(), true);
      } finally {
        f.dom.window.close();
      }
    });
  }
}

test('downward exit from a held section releases only the assessment banner', async () => {
  const f = fixture(448, true, true, false);
  const frames = new Map();
  let serial = 0;
  f.w.requestAnimationFrame = (fn) => {
    frames.set(++serial, fn);
    return serial;
  };
  f.w.cancelAnimationFrame = (id) => frames.delete(id);
  const drain = () => {
    for (let turn = 0; frames.size && turn < 10; turn++) {
      const jobs = [...frames.values()];
      frames.clear();
      jobs.forEach((fn) => fn());
    }
  };
  const scroll = (y) => {
    f.w.scrollY = y;
    f.w.dispatchEvent(new f.w.Event('scroll'));
    drain();
  };
  try {
    f.enhance();
    await flush();
    drain();
    scroll(3000);
    scroll(2800);
    assert.equal(f.w.TDBNavScroll.floatingVisible, true);
    f.w.TDBNavScroll.focus(
      () => {},
      () => true,
    );
    scroll(3200);
    scroll(5000);
    assert(f.d.documentElement.classList.contains('tdb-slider-focus'));
    f.w.TDBNavScroll.release({ respectDirection: true });
    assert.equal(f.nav.style.transform, 'translateY(-100%)');
    assert.equal(f.w.TDBNavScroll.floatingVisible, false);
    assert.equal(f.d.documentElement.classList.contains('tdb-slider-focus'), false);
    scroll(4800);
    assert.equal(f.w.TDBNavScroll.floatingVisible, true, 'normal upward navigation resumes');
  } finally {
    f.dom.window.close();
  }
});

test('a rapid reversal cancels an unpainted sticky reveal', async () => {
  const f = fixture(448, true, true, false);
  const frames = new Map();
  let serial = 0;
  f.w.requestAnimationFrame = (fn) => {
    frames.set(++serial, fn);
    return serial;
  };
  f.w.cancelAnimationFrame = (id) => frames.delete(id);
  const frame = () => {
    const jobs = [...frames.values()];
    frames.clear();
    jobs.forEach((fn) => fn());
  };
  const scrollFrame = (y) => {
    f.w.scrollY = y;
    f.w.dispatchEvent(new f.w.Event('scroll'));
    frame();
  };
  try {
    f.enhance();
    await flush();
    frame();
    scrollFrame(2000);
    scrollFrame(1800);
    assert.equal(f.nav.style.position, 'fixed');
    // Execute the next scroll update before the scheduled reveal paints.
    f.w.scrollY = 2200;
    f.w.dispatchEvent(new f.w.Event('scroll'));
    const latest = [...frames.entries()].at(-1);
    frames.delete(latest[0]);
    latest[1]();
    frame();
    assert.equal(f.nav.style.transform, 'translateY(-100%)');
    assert.equal(f.w.TDBNavScroll.floatingVisible, false);
  } finally {
    f.dom.window.close();
  }
});

test('basic navigation locks before consent, retains lock through closing, and preserves document state', async () => {
  const f = fixture(448, false);
  try {
    f.w.scrollY = 280;
    assert.equal(f.d.querySelector('[data-tdb-navbar-enhancement]'), null);
    await f.open();
    assert.equal(f.w.TDBScrollLock.active, true);
    await f.closeStart();
    assert.equal(f.w.TDBScrollLock.active, true);
    await f.closeEnd();
    assert.equal(f.w.TDBScrollLock.active, false);
    assert.equal(f.w.scrollY, 280);
    assert.equal(f.d.body.style.overflow, 'clip');
    assert.equal(f.d.body.style.position, '');
    assert.equal(f.d.body.hasAttribute('data-lenis-prevent'), false);
  } finally {
    f.dom.window.close();
  }
});

test('shared locks release independently and contain wheel/touch at nested scroll edges', async () => {
  const f = fixture();
  try {
    const scroller = f.d.createElement('div');
    scroller.style.overflowY = 'auto';
    f.menu.append(scroller);
    Object.defineProperties(scroller, {
      clientHeight: { value: 100 },
      scrollHeight: { value: 500 },
    });
    scroller.scrollTop = 100;
    const release1 = f.w.TDBScrollLock.acquire({ allow: [f.menu] });
    const release2 = f.w.TDBScrollLock.acquire({ allow: [f.menu] });
    const wheel = (target) => {
      const ev = new f.w.WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 30 });
      target.dispatchEvent(ev);
      return ev.defaultPrevented;
    };
    assert.equal(wheel(scroller), false);
    assert.equal(wheel(f.d.querySelector('main')), true);
    scroller.scrollTop = 400;
    assert.equal(wheel(scroller), true);
    const touch = (type, y) => {
      const ev = new f.w.Event(type, { bubbles: true, cancelable: true });
      Object.assign(ev, { touches: [{ clientX: 30, clientY: y }] });
      scroller.dispatchEvent(ev);
      return ev.defaultPrevented;
    };
    touch('touchstart', 100);
    assert.equal(touch('touchmove', 80), true);
    scroller.scrollTop = 100;
    assert.equal(touch('touchmove', 60), false);
    release1();
    assert.equal(f.w.TDBScrollLock.active, true);
    release1();
    release2();
    assert.equal(f.w.TDBScrollLock.active, false);
    assert.equal(wheel(f.d.querySelector('main')), false);
  } finally {
    f.dom.window.close();
  }
});

test('Every page locks the viewport without turning body into a competing sticky scroll container', async () => {
  for (const page of ['677cf86df9952f978d94d8a9', 'another-page']) {
    const f = fixture(448, false);
    try {
      f.d.documentElement.setAttribute('data-wf-page', page);
      f.d.body.style.removeProperty('overflow');
      f.w.scrollY = 1200;
      await f.open();
      assert.equal(f.w.getComputedStyle(f.d.documentElement).overflow, 'hidden');
      assert.equal(f.w.getComputedStyle(f.d.body).overflow, 'visible');
      assert.equal(f.w.scrollY, 1200);
      const wheel = new f.w.WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 });
      f.d.querySelector('main').dispatchEvent(wheel);
      assert.equal(wheel.defaultPrevented, true);
      await f.closeStart();
      await f.closeEnd();
      assert.equal(f.w.TDBScrollLock.active, false);
      assert.equal(f.w.getComputedStyle(f.d.body).overflow, 'visible');
      assert.equal(f.w.scrollY, 1200);
    } finally {
      f.dom.window.close();
    }
  }
});

test('open menu survives consent handoff; enhancement begins only after the native close completes', async () => {
  const f = fixture();
  try {
    await f.open();
    f.enhance();
    assert.equal(f.w.TDBNavbar, undefined);
    assert.equal(f.w.TDBNavbarLoader.status().waitingForClose, true);
    await f.closeStart();
    assert.equal(f.w.TDBNavbar, undefined);
    await f.closeEnd();
    assert.equal(f.w.TDBNavbar.version, '1.8.0');
    assert.equal(f.w.TDBScrollLock.active, false);
  } finally {
    f.dom.window.close();
  }
});

test('every native closing route triggers the same text exit once, with rapid reopen cancelling it', async () => {
  const f = fixture();
  try {
    f.enhance();
    await flush();
    for (const route of ['button', 'Escape', 'outside', 'link']) {
      await f.open();
      const count = f.animations.length;
      await f.closeStart();
      const text = f.animations
        .slice(count)
        .filter((a) => a.element.matches('.navbar10_menu-left,.navbar10_menu-right'));
      assert.equal(text.length, 2, route);
      assert.equal(text[0].frames.at(-1).opacity, 0);
      await f.open();
      assert(
        text.every((a) => a.cancelled),
        route + ' rapid reopen',
      );
      await f.closeStart();
      await f.closeEnd();
    }
  } finally {
    f.dom.window.close();
  }
});

test('keyboard-driven native opening retains the clear-to-solid cycle at the top', async () => {
  const f = fixture();
  try {
    f.enhance();
    await flush();
    await f.open();
    assert.equal(f.d.documentElement.classList.contains('tdb-nav-clear-cycle'), true);
    await f.closeStart();
    assert.equal(f.d.documentElement.classList.contains('tdb-nav-clear-cycle'), true);
    await f.resize(1000);
    assert.equal(f.d.documentElement.classList.contains('tdb-nav-clear-cycle'), false);
    assert.equal(f.w.TDBScrollLock.active, false);
  } finally {
    f.dom.window.close();
  }
});

test('phone-to-desktop resizing enables hover treatment and returning to phone removes it', async () => {
  const f = fixture();
  try {
    f.enhance();
    await flush();
    await f.resize(1363);
    f.nav.dispatchEvent(new f.w.MouseEvent('mouseenter'));
    assert.equal(f.nav.classList.contains('is-trans'), true);
    f.nav.dispatchEvent(new f.w.MouseEvent('mouseleave'));
    assert.equal(f.nav.classList.contains('is-trans'), false);
    await f.resize(448);
    f.nav.dispatchEvent(new f.w.MouseEvent('mouseenter'));
    assert.equal(f.nav.classList.contains('is-trans'), false);
  } finally {
    f.dom.window.close();
  }
});

test('images have appropriate slots before enhancement and only the intended desktop menu is warmed', async () => {
  const f = fixture(1363);
  try {
    const images = [...f.d.querySelectorAll('img')];
    assert(images.every((i) => i.sizes.endsWith('22vw')));
    f.enhance();
    await flush();
    assert(images.every((i) => i.getAttribute('loading') === 'lazy'));
    const event = new f.w.Event('pointerenter');
    Object.defineProperty(event, 'pointerType', { value: 'mouse' });
    f.d.querySelector('#services').dispatchEvent(event);
    assert.equal(images[0].loading, 'eager');
    assert.equal(images[1].getAttribute('loading'), 'lazy');
    f.d.querySelector('#discover').dispatchEvent(new f.w.FocusEvent('focus'));
    assert.equal(images[1].loading, 'eager');
  } finally {
    f.dom.window.close();
  }
});

test('desktop reversals settle the latest menu and restore locks on close and breakpoint exit', async () => {
  const f = fixture(1363);
  try {
    f.enhance();
    await flush();
    const services = f.d.querySelector('#services'),
      discover = f.d.querySelector('#discover');
    services.setAttribute('aria-expanded', 'true');
    await flush();
    services.setAttribute('aria-expanded', 'false');
    discover.setAttribute('aria-expanded', 'true');
    await flush();
    discover.setAttribute('aria-expanded', 'false');
    services.setAttribute('aria-expanded', 'true');
    await flush();
    await f.finish();
    assert.equal(services.nextElementSibling.dataset.tdbDesktopPanel, 'open');
    assert.equal(discover.nextElementSibling.hasAttribute('data-tdb-desktop-panel'), false);
    assert.equal(f.d.documentElement.classList.contains('tdb-desktop-nav-locked'), true);
    services.setAttribute('aria-expanded', 'false');
    await flush();
    await f.finish();
    assert.equal(f.d.documentElement.classList.contains('tdb-desktop-nav-locked'), false);
    services.setAttribute('aria-expanded', 'true');
    await flush();
    await f.resize(448);
    assert.equal(services.nextElementSibling.hasAttribute('data-tdb-desktop-panel'), false);
    assert.equal(f.d.documentElement.classList.contains('tdb-desktop-nav-locked'), false);
  } finally {
    f.dom.window.close();
  }
});

test('Finsweet is skipped for a claimed native navbar and retained for a separate legacy consumer', () => {
  for (const legacy of [false, true]) {
    const f = fixture();
    try {
      if (legacy) f.d.querySelector('main').setAttribute('fs-scrolldisable-element', 'toggle');
      f.w.eval(read('dist/tdb-immediate-runtime-batch.min.js'));
      assert.equal(!!f.d.querySelector('script[data-scrolldisable-js]'), legacy);
      assert(
        f.d
          .querySelector('[data-tdb-footer-runtime-js]')
          .src.startsWith('https://example.test/runtime/'),
      );
    } finally {
      f.dom.window.close();
    }
  }
});

test('pagehide releases the mobile lock and pageshow restores an open native menu', async () => {
  const f = fixture();
  try {
    await f.open();
    f.w.dispatchEvent(new f.w.Event('pagehide'));
    assert.equal(f.w.TDBScrollLock.active, false);
    f.w.dispatchEvent(new f.w.Event('pageshow'));
    assert.equal(f.w.TDBScrollLock.active, true);
    await f.closeStart();
    await f.closeEnd();
    assert.equal(f.w.TDBScrollLock.active, false);
  } finally {
    f.dom.window.close();
  }
});

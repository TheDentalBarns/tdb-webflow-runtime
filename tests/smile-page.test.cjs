const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const page = fs.readFileSync('src/smile-gallery/page.html', 'utf8');
const source = fs.readFileSync('src/smile-gallery/standalone.js', 'utf8');
const feed = fs
  .readFileSync('src/smile-gallery/feed.js', 'utf8')
  .replace(
    '__TDB_SMILE_TEMPLATE__',
    JSON.stringify(fs.readFileSync('src/smile-gallery/template.html', 'utf8')),
  );
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function setup({ display = '', allowed = true, fail = false, saved = null, cases } = {}) {
  const records = cases || [
    ['A', 'From £3,000', 'Aligners', 'Dr A', '2 hours', 'Male'],
    ['B', 'From £1,000', 'Bonding', 'Dr B', '6–8 weeks', 'Female'],
    ['C', 'From £2,000', 'Whitening', 'Dr A', '180 minutes', ''],
  ];
  const cms =
    '<div data-smile-page-source>' +
    records
      .map(
        ([title, price, treatment, doctor, duration, gender]) =>
          `<div data-tdb-sg-case><div data-smile-grid-photo role="button" tabindex="0"><img data-tdb-sg-image src="https://cdn.prod.website-files.com/smile-${title}.webp" srcset="https://cdn.prod.website-files.com/smile-${title}-500.webp 500w, https://cdn.prod.website-files.com/smile-${title}.webp 1080w" sizes="(max-width: 640px) 100vw, 33vw" alt="Smile ${title}"></div><span data-tdb-sg-title>${title}</span><span data-tdb-sg-description>Details ${title}</span><span data-tdb-sg-price-value>${price}</span><span data-tdb-sg-duration-value>${duration}</span><span data-tdb-sg-clinician-value>${doctor}</span><span data-tdb-sg-gender-value>${gender}</span>${[
            treatment,
          ]
            .flat()
            .map((name) => `<span data-tdb-sg-treatment-name>${name}</span>`)
            .join('')}</div>`,
      )
      .join('') +
    '</div>';
  const dom = new JSDOM(page, {
    pretendToBeVisual: true,
    url: 'https://dentalbarns.webflow.io/smile-gallery' + display,
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(),
  });
  const w = dom.window,
    d = w.document,
    subscriptions = new Set();
  d.querySelector('[data-smile-page-stage]').innerHTML = cms;
  for (const original of d.querySelectorAll('button')) {
    const native = d.createElement('div');
    for (const attr of original.attributes) native.setAttribute(attr.name, attr.value);
    native.append(...original.childNodes);
    original.replaceWith(native);
  }
  let opened = 0,
    destroyed = 0,
    loadFails = fail;
  Object.defineProperty(d, 'currentScript', {
    value: { src: 'https://cdn.example/dist/tdb-smile-page.js' },
  });
  const reduced = new w.EventTarget();
  reduced.matches = false;
  w.TDBMotion = {
    reduced,
    duration: () => 500,
    carousel: {
      copyOut: 150,
      copyIn: 400,
      nextDelay: 100,
      previousDelay: 140,
      copyEaseIn: 'ease-in',
      copyEaseOut: 'ease-out',
    },
  };
  const animations = [];
  w.HTMLElement.prototype.animate = function (frames, options) {
    animations.push({ node: this, frames, options });
    return { finished: Promise.resolve(), cancel() {} };
  };
  if (saved) w.sessionStorage.setItem('tdb-smile-gallery-view', JSON.stringify(saved));
  w.eval(fs.readFileSync('src/shared/filters.js', 'utf8'));
  const { mountDisclosures, mountDock } = w.TDBFilters;
  w.matchMedia = () => ({ matches: false });
  w.TDBConsent = {
    allows: () => allowed,
    subscribe(fn) {
      subscriptions.add(fn);
      return () => subscriptions.delete(fn);
    },
  };
  w.TDBModules = {
    async load() {
      if (loadFails) throw Error('offline');
    },
  };
  w.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  w.Image = class {
    set src(_) {
      queueMicrotask(() => this.onload?.());
    }
    decode() {
      return Promise.resolve();
    }
  };
  w.TDBSliderLoader = { async prepare() {}, async load() {} };
  w.TDBNativeTicker = {
    mount(slot) {
      return {
        update(value) {
          slot.textContent = value;
        },
        destroy() {},
      };
    },
  };
  w.TDBFilters = {
    mountDisclosures,
    mountDock,
    mount(panel, options) {
      const api = {
        isOpen: false,
        setCount() {},
        collapseAll() {},
        set(value) {
          if (this.isOpen === value) return;
          this.isOpen = value;
          options.onChange(value);
        },
        reset() {
          this.set(false);
        },
        destroy() {},
      };
      options.toggle.addEventListener('click', () => api.set(!api.isOpen));
      return api;
    },
  };
  w.TDBDrawer = {
    mount(root, options) {
      root.hidden = true;
      return {
        open() {
          opened++;
          root.hidden = false;
          options.onOpen();
        },
        close() {
          if (!root.hidden) {
            root.hidden = true;
            options.onClose();
            options.onClosed?.();
          }
          return Promise.resolve();
        },
        destroy() {
          destroyed++;
          this.close();
        },
      };
    },
  };
  w.TDBSwiper = {
    prune() {},
    mount(_, root) {
      root.querySelector('.swiper').swiper = {
        realIndex: 0,
        allowClick: true,
        slideToLoop(index) {
          this.realIndex = index;
        },
        on() {},
      };
    },
  };
  w.eval(
    fs
      .readFileSync('src/smile-gallery/head.html', 'utf8')
      .match(/<script[^>]*>([\s\S]*?)<\/script>/)[1],
  );
  w.eval(feed);
  w.eval(source);
  return {
    w,
    d,
    animations,
    get opened() {
      return opened;
    },
    get destroyed() {
      return destroyed;
    },
    fix() {
      loadFails = false;
    },
    permit(value) {
      allowed = value;
      subscriptions.forEach((fn) => fn());
    },
    close() {
      w.TDBSmilePage.destroy();
      w.close();
    },
  };
}
test('standalone mounts all native CMS cases by price and opens the original square image', async () => {
  const x = setup();
  try {
    await x.w.TDBSmilePage.mount();
    assert.equal(x.d.querySelectorAll('[data-tdb-sg-case]:not([hidden])').length, 3);
    assert.equal(x.d.querySelector('[data-smile-filter-toggle]').tagName, 'BUTTON');
    assert.equal(x.d.querySelector('[data-smile-case-next]').tagName, 'BUTTON');
    assert.equal(x.d.querySelector('[data-smile-page-status]').textContent, '3 smiles');
    x.d.querySelector('[data-smile-grid-photo]').click();
    assert.equal(x.opened, 1);
    assert.equal(x.d.querySelector('[data-smile-case-title]').textContent, 'B');
    assert.match(x.d.querySelector('[data-smile-case-image]').src, /smile-B/);
    x.d.querySelector('[data-smile-case-next]').click();
    assert.equal(x.d.querySelector('[data-smile-case-title]').textContent, 'C');
    assert.ok(x.d.querySelector('[data-smile-case-drawer] [data-smile-filter-dock]'));
    const submit = new x.w.Event('submit', { bubbles: true, cancelable: true });
    x.d.querySelector('[data-smile-filter-panel] form').dispatchEvent(submit);
    assert.equal(submit.defaultPrevented, true);
  } finally {
    x.close();
  }
});
test('comparison changes in place in both views and persists its display mode', async () => {
  const x = setup({ display: '?display=slider' });
  try {
    await x.w.TDBSmilePage.mount();
    const range = x.d.querySelector('.smile-comparison_control');
    range.dispatchEvent(new x.w.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    for (let i = 0; i < 27; i++)
      range.dispatchEvent(new x.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    assert.equal(x.opened, 0);
    assert.equal(range.getAttribute('aria-valuetext'), '27% before, 73% after');
    assert.equal(range.parentElement.style.getPropertyValue('--smile-reveal'), '27%');
    x.d.querySelector('[data-smile-grid-photo]').click();
    assert.equal(x.d.querySelectorAll('[data-smile-case-drawer] [role="slider"]').length, 1);
    x.d.querySelector('[name="smile-display"][value="before-after"]').checked = true;
    x.d.querySelector('[data-smile-filter-apply]').click();
    await tick();
    assert.equal(
      JSON.parse(x.w.sessionStorage.getItem('tdb-smile-gallery-view')).display,
      'before-after',
    );
    assert.equal(x.d.querySelectorAll('.smile-comparison_control').length, 0);
    assert.equal(x.d.querySelector('[data-smile-case-drawer]').hidden, false);
    assert.equal(new URL(x.w.location.href).searchParams.get('display'), 'before-after');
    assert.equal(
      x.d.querySelector('[name="embedded-smile-display"][value="before-after"]').checked,
      true,
    );
  } finally {
    x.close();
  }
});
test('embedded filters update every image in place and preserve the selected case', async () => {
  const x = setup();
  try {
    await x.w.TDBSmilePage.mount();
    const select = async (value) => {
      const input = x.d.querySelector('[name="embedded-smile-display"][value="' + value + '"]');
      input.checked = true;
      input.dispatchEvent(new x.w.Event('change', { bubbles: true }));
      await tick();
    };
    await select('slider');
    assert.equal(x.d.querySelectorAll('.smile-comparison_control').length, 4);
    assert.equal(x.d.querySelector('[name="smile-display"][value="slider"]').checked, true);
    await select('before-after');
    assert.equal(x.d.querySelectorAll('.smile-comparison_control').length, 0);
    await select('slider');
    assert.equal(x.d.querySelectorAll('.smile-comparison_control').length, 4);
    x.d.querySelector('[data-smile-grid-photo]').click();
    assert.equal(x.d.querySelector('[data-smile-case-title]').textContent, 'B');
    x.d.querySelector('[data-smile-case-next]').click();
    assert.equal(x.d.querySelector('[data-smile-case-price]').textContent, 'From £2,000');
    assert.equal(x.d.querySelector('[data-smile-case-clinician]').textContent, 'Dr A');
  } finally {
    x.close();
  }
});
test('main-page filter opens inside the shared modal drawer', async () => {
  const x = setup();
  try {
    await x.w.TDBSmilePage.mount();
    x.d.querySelector('[data-smile-filter-toggle]').click();
    assert.equal(x.opened, 1);
    assert.equal(x.d.querySelector('[data-smile-case-drawer]').hidden, false);
    assert.ok(x.d.querySelector('[data-smile-case-drawer]').classList.contains('is-filter-only'));
    assert.ok(x.d.querySelector('[data-tdb-drawer-panel] [data-smile-filter-panel]'));
    assert.equal(x.d.activeElement.textContent, 'Filter smiles');
    x.d.querySelector('[data-smile-filter-panel] [data-smile-group-toggle="display"]').click();
    assert.equal(
      x.d
        .querySelector('[data-smile-embedded-filter] [data-smile-group-toggle="display"]')
        .getAttribute('aria-expanded'),
      'false',
    );
  } finally {
    x.close();
  }
});
test('empty filter results recover and consent teardown permits a clean remount', async () => {
  const x = setup();
  try {
    await x.w.TDBSmilePage.mount();
    x.d.querySelectorAll('[name="smile-treatment"]').forEach((input) => (input.checked = true));
    x.d.querySelector('[data-smile-filter-apply]').click();
    await tick();
    assert.equal(x.d.querySelector('[data-smile-empty]').hidden, false);
    assert.equal(x.d.querySelectorAll('[data-tdb-sg-case]:not([hidden])').length, 0);
    x.d.querySelector('[data-smile-filter-panel] [data-smile-filter-reset]').click();
    x.d.querySelector('[data-smile-filter-apply]').click();
    await tick();
    assert.equal(x.d.querySelectorAll('[data-tdb-sg-case]:not([hidden])').length, 3);
    x.permit(false);
    assert.equal(x.destroyed, 1);
    assert.equal(x.d.querySelectorAll('[data-tdb-sg-case]:not([hidden])').length, 3);
    x.permit(true);
    await x.w.TDBSmilePage.mount();
    assert.equal(x.d.querySelectorAll('[data-tdb-sg-case]:not([hidden])').length, 3);
  } finally {
    x.close();
  }
});
test('failed startup keeps the native grid and hides retry after recovery', async () => {
  const x = setup({ fail: true });
  try {
    await assert.rejects(x.w.TDBSmilePage.mount());
    assert.equal(x.d.querySelectorAll('[data-tdb-sg-case]:not([hidden])').length, 3);
    assert.equal(x.d.querySelector('[data-smile-page-retry]').hidden, false);
    x.fix();
    await x.w.TDBSmilePage.mount();
    assert.equal(x.d.querySelector('[data-smile-page-retry]').hidden, true);
    assert.equal(x.d.querySelectorAll('[data-tdb-sg-case]:not([hidden])').length, 3);
  } finally {
    x.close();
  }
});
test('dragging comparison suppresses opening a case and the next click still opens it', async () => {
  const x = setup({ display: '?display=slider' });
  try {
    await x.w.TDBSmilePage.mount();
    const photo = x.d.querySelector('[data-smile-grid-photo]');
    const range = photo.querySelector('[role=slider]');
    photo.getBoundingClientRect = () => ({ left: 0, width: 400 });
    const pointer = (type, clientX) =>
      range.dispatchEvent(
        new x.w.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX }),
      );
    pointer('pointerdown', 200);
    pointer('pointermove', 320);
    pointer('pointerup', 320);
    range.click();
    assert.equal(range.getAttribute('aria-valuenow'), '80');
    assert.equal(x.opened, 0);
    assert.ok([...photo.querySelectorAll('img')].every((image) => !image.draggable));
    const opener = photo.querySelector('button');
    opener.dispatchEvent(
      new x.w.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 60 }),
    );
    opener.dispatchEvent(
      new x.w.MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 60 }),
    );
    opener.click();
    assert.equal(x.opened, 1);
  } finally {
    x.close();
  }
});

test('vertical scrolling never moves the comparison, while a fresh horizontal gesture does', async () => {
  const x = setup({ display: '?display=slider' });
  try {
    await x.w.TDBSmilePage.mount();
    const photo = x.d.querySelector('[data-smile-grid-photo]');
    const range = photo.querySelector('[role=slider]');
    photo.getBoundingClientRect = () => ({ left: 0, width: 400 });
    const pointer = (type, clientX, clientY) => {
      const event = new x.w.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX,
        clientY,
      });
      range.dispatchEvent(event);
      return event;
    };
    pointer('pointerdown', 200, 200);
    assert.equal(
      range.getAttribute('aria-valuenow'),
      '50',
      'touching the image must not jump the divider',
    );
    assert.equal(pointer('pointermove', 204, 240).defaultPrevented, false);
    assert.equal(
      pointer('pointermove', 350, 245).defaultPrevented,
      false,
      'vertical intent remains locked despite later sideways drift',
    );
    pointer('pointerup', 350, 245);
    range.click();
    assert.equal(range.getAttribute('aria-valuenow'), '50');
    assert.equal(x.opened, 0, 'scrolling must not open the case');
    pointer('pointerdown', 200, 200);
    assert.equal(pointer('pointermove', 320, 204).defaultPrevented, true);
    pointer('pointerup', 320, 204);
    assert.equal(range.getAttribute('aria-valuenow'), '80');
    pointer('pointerdown', 320, 204);
    pointer('pointercancel', 320, 240);
    pointer('pointermove', 100, 240);
    assert.equal(
      range.getAttribute('aria-valuenow'),
      '80',
      'a cancelled touch cannot continue dragging',
    );
  } finally {
    x.close();
  }
});

test('touch pan cancellation never moves the divider or blocks the next image tap', async () => {
  const x = setup({ display: '?display=slider' });
  try {
    await x.w.TDBSmilePage.mount();
    const photo = x.d.querySelector('[data-smile-grid-photo]'),
      opener = photo.querySelector('button'),
      slider = photo.querySelector('[role=slider]');
    photo.getBoundingClientRect = () => ({ width: 400 });
    const pointer = (target, type, clientX, clientY) => {
      const event = new x.w.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX,
        clientY,
      });
      Object.defineProperties(event, { pointerId: { value: 12 }, pointerType: { value: 'touch' } });
      target.dispatchEvent(event);
      return event;
    };
    assert.equal(
      photo.querySelector('input[type=range]'),
      null,
      'native range cannot intercept Android scrolling',
    );
    assert.equal(pointer(opener, 'pointerdown', 50, 100).defaultPrevented, false);
    pointer(opener, 'pointermove', 80, 150);
    pointer(opener, 'pointercancel', 80, 150);
    opener.dispatchEvent(new x.w.MouseEvent('click', { bubbles: true, detail: 1 }));
    assert.equal(x.opened, 0);
    assert.equal(slider.getAttribute('aria-valuenow'), '50');
    pointer(opener, 'pointerdown', 50, 100);
    pointer(opener, 'pointerup', 50, 100);
    opener.dispatchEvent(new x.w.MouseEvent('click', { bubbles: true, detail: 1 }));
    assert.equal(x.opened, 1, 'a fresh image tap opens the case');
    pointer(slider, 'pointerdown', 180, 100);
    assert.equal(slider.getAttribute('aria-valuenow'), '50');
    pointer(slider, 'pointermove', 220, 101);
    pointer(slider, 'pointerup', 220, 101);
    assert.equal(
      slider.getAttribute('aria-valuenow'),
      '60',
      'grabbing the edge of the 44px target uses relative movement without jumping',
    );
  } finally {
    x.close();
  }
});

test('a short tap on the divider opens the case without moving its value', async () => {
  const x = setup({ display: '?display=slider' });
  try {
    await x.w.TDBSmilePage.mount();
    const slider = x.d.querySelector('[data-smile-grid-photo] [role=slider]');
    for (const type of ['pointerdown', 'pointerup', 'click'])
      slider.dispatchEvent(
        new x.w.MouseEvent(type, {
          bubbles: true,
          detail: 1,
          button: 0,
          clientX: 180,
          clientY: 100,
        }),
      );
    assert.equal(slider.getAttribute('aria-valuenow'), '50');
    assert.equal(x.opened, 1);
  } finally {
    x.close();
  }
});

test('unavailable combinations are disabled while valid additions and deselection remain available', async () => {
  const x = setup({
    cases: [
      ['A', 'From £3,000', ['Aligners', 'Whitening'], 'Dr A', '2 hours', ''],
      ['B', 'From £1,000', ['Bonding', 'Whitening'], 'Dr B', '2 hours', ''],
      ['C', 'From £2,000', ['Bonding'], 'Dr A', '2 hours', ''],
    ],
  });
  try {
    await x.w.TDBSmilePage.mount();
    const option = (prefix, group, value) =>
      x.d.querySelector(`[name="${prefix}smile-${group}"][value="${value}"]`);
    const choose = async (input, checked = true) => {
      input.checked = checked;
      input.dispatchEvent(new x.w.Event('change', { bubbles: true }));
      await tick();
    };
    await choose(option('embedded-', 'treatment', 'aligners'));
    assert.equal(option('embedded-', 'treatment', 'bonding').disabled, true);
    assert.equal(option('embedded-', 'treatment', 'whitening').disabled, false);
    assert.equal(option('embedded-', 'treatment', 'aligners').disabled, false);
    assert.equal(option('embedded-', 'clinician', 'Dr B').disabled, true);
    x.d.querySelector('[data-smile-filter-toggle]').click();
    assert.equal(
      option('', 'treatment', 'bonding').disabled,
      true,
      'modal starts with the same availability',
    );
    await choose(option('', 'treatment', 'aligners'), false);
    assert.equal(
      option('', 'treatment', 'bonding').disabled,
      false,
      'removing a choice restores possibilities in the draft',
    );
    assert.equal(
      option('embedded-', 'treatment', 'bonding').disabled,
      true,
      'an unapplied modal draft does not change the grid',
    );
    x.d.querySelector('[data-smile-filter-apply]').click();
    await tick();
    assert.equal(option('embedded-', 'treatment', 'bonding').disabled, false);
    await choose(option('embedded-', 'clinician', 'Dr B'));
    assert.equal(option('embedded-', 'treatment', 'aligners').disabled, true);
    x.d.querySelector('[data-smile-embedded-filter] [data-smile-filter-reset]').click();
    await tick();
    assert.ok(
      [...x.d.querySelectorAll('[name="embedded-smile-treatment"]')].every(
        (input) => !input.disabled,
      ),
    );
  } finally {
    x.close();
  }
});

test('new treatments and their diamonds remain hidden until the shared carousel travel finishes', async () => {
  const x = setup();
  try {
    await x.w.TDBSmilePage.mount();
    x.d.querySelector('[data-smile-grid-photo]').click();
    x.animations.length = 0;
    x.d.querySelector('[data-smile-case-next]').click();
    const incoming = x.animations.find((a) => a.node.hasAttribute('data-smile-case-treatments'));
    assert.deepEqual(JSON.parse(JSON.stringify(incoming.frames)), [{ opacity: 0 }, { opacity: 1 }]);
    assert.equal(incoming.options.fill, 'both', 'the first frame applies throughout the delay');
    assert.equal(incoming.options.delay, 600);
    assert.equal(incoming.options.duration, 400);
    assert.equal(incoming.options.easing, 'ease-in');
    const outgoing = x.animations.find((a) =>
      a.node.matches('.smile-page_case-outgoing.smile-page_case-treatments'),
    );
    assert.ok(
      outgoing,
      'the previous treatment list fades as one unit, including its diamond pseudo-elements',
    );
    assert.equal(outgoing.options.duration, 150);
    assert.equal(outgoing.options.easing, 'ease-out');
  } finally {
    x.close();
  }
});

test('sorts prices and mixed duration units while deferred gender is ignored', async () => {
  const x = setup();
  try {
    await x.w.TDBSmilePage.mount();
    const titles = () =>
      [...x.d.querySelectorAll('[data-tdb-sg-case]:not([hidden]) [data-tdb-sg-title]')].map(
        (n) => n.textContent,
      );
    const choose = async (group, value) => {
      const input = x.d.querySelector(
        '[name="embedded-smile-' + group + '"][value="' + value + '"]',
      );
      input.checked = true;
      input.dispatchEvent(new x.w.Event('change', { bubbles: true }));
      await tick();
    };
    await choose('order', 'price-desc');
    assert.deepEqual(titles(), ['A', 'C', 'B']);
    await choose('order', 'duration-asc');
    assert.deepEqual(titles(), ['A', 'C', 'B']);
    await choose('order', 'duration-desc');
    assert.deepEqual(titles(), ['B', 'C', 'A']);
    await choose('gender', 'male');
    assert.deepEqual(titles(), ['B', 'C', 'A']);
    assert.ok(
      [...x.d.querySelectorAll('[data-smile-filter-group="gender"]')].every(
        (group) => group.hidden,
      ),
    );
    x.d.querySelector('[data-smile-embedded-filter] [data-smile-filter-reset]').click();
    await tick();
    assert.deepEqual(titles(), ['B', 'C', 'A']);
    assert.equal(x.d.querySelector('[name="smile-order"][value="price-asc"]').checked, true);
    assert.equal(new URL(x.w.location.href).searchParams.has('gender'), false);
  } finally {
    x.close();
  }
});

test('stale patient preferences are cleared and both count buttons retain ticker slots', async () => {
  const x = setup({ display: '?gender=male', saved: { gender: 'female' } });
  try {
    await x.w.TDBSmilePage.mount();
    assert.equal(x.d.querySelectorAll('[data-tdb-sg-case]:not([hidden])').length, 3);
    assert.equal(new URL(x.w.location.href).searchParams.has('gender'), false);
    const cta = x.d.querySelector('[data-smile-view-results]');
    assert.equal(cta.getAttribute('aria-label'), 'View 3 smiles');
    const option = x.d.querySelector('[name="embedded-smile-treatment"][value="bonding"]');
    option.checked = true;
    option.dispatchEvent(new x.w.Event('change', { bubbles: true }));
    await tick();
    assert.equal(cta.getAttribute('aria-label'), 'View 1 smile');
    assert.equal(cta.querySelector('[data-smile-action-count]').textContent, '1');
    assert.equal(
      x.d.querySelector('[data-smile-filter-apply]').getAttribute('aria-label'),
      'View 1 smile',
    );
    assert.equal(cta.querySelector('[data-smile-count-reserve]').textContent, '3');
    assert.ok(cta.querySelector('[data-smile-count-plural]').classList.contains('is-singular'));
  } finally {
    x.close();
  }
});

test('filter dock uses native sticky bounds and never rewrites position on scroll', async () => {
  const x = setup();
  try {
    await x.w.TDBSmilePage.mount();
    const root = x.d.querySelector('[data-tdb-smile-page]'),
      home = x.d.querySelector('[data-smile-filter-home]'),
      dock = x.d.querySelector('[data-smile-filter-dock]'),
      landing = x.d.querySelector('[data-smile-filter-landing]'),
      anchor = root.querySelector('.tdb-filter-sticky-anchor'),
      rail = anchor.parentElement;
    root.getBoundingClientRect = () => ({ top: 100 });
    home.getBoundingClientRect = () => ({ top: 760 });
    landing.getBoundingClientRect = () => ({ top: 1500, height: 96 });
    anchor.getBoundingClientRect = () => ({ height: 48 });
    x.w.dispatchEvent(new x.w.Event('resize'));
    await new Promise((r) => setTimeout(r, 25));
    assert.equal(rail.style.top, '0px');
    assert.equal(rail.style.height, '1472px');
    assert.equal(rail.style.clipPath, 'inset(0)');
    assert.equal(anchor.style.position, 'sticky');
    assert.match(anchor.style.top, /100dvh/);
    const position = rail.style.cssText;
    home.getBoundingClientRect = () => {
      throw Error('scroll must not measure the home');
    };
    x.w.dispatchEvent(new x.w.Event('scroll'));
    await new Promise((r) => setTimeout(r, 25));
    assert.equal(rail.style.cssText, position);
    home.getBoundingClientRect = () => ({ top: 760 });
    x.d.querySelector('[data-smile-filter-toggle]').click();
    assert.equal(dock.parentElement.hasAttribute('data-tdb-drawer-panel'), true);
    x.d.querySelector('[data-smile-filter-toggle]').click();
    assert.equal(dock.parentElement, anchor);
    x.permit(false);
    assert.equal(root.querySelector('.tdb-filter-sticky-rail'), null);
    assert.equal(dock.parentElement, home);
  } finally {
    x.close();
  }
});

test('saved slider reserves its shape before consent or runtime, with URL precedence and a failure fallback', async () => {
  for (const [display, saved, expected] of [
    ['', { display: 'slider' }, 'slider'],
    ['?display=before-after', { display: 'slider' }, 'before-after'],
    ['?display=slider', { display: 'before-after' }, 'slider'],
  ]) {
    const x = setup({ display, saved, allowed: false });
    try {
      assert.equal(x.d.documentElement.dataset.smileDisplay, expected);
      assert.equal(x.d.querySelectorAll('.smile-comparison_control').length, 0);
      x.fix();
      x.permit(true);
      await x.w.TDBSmilePage.mount();
      assert.equal(x.d.documentElement.dataset.smileDisplay, expected);
    } finally {
      x.close();
    }
  }
  const x = setup({ display: '?display=slider', fail: true });
  try {
    await assert.rejects(x.w.TDBSmilePage.mount());
    assert.equal(x.d.documentElement.dataset.smileDisplay, 'slider');
    assert.equal(x.d.querySelector('[data-tdb-sg-image]').hidden, false);
  } finally {
    x.close();
  }
});

test('slider layers reuse responsive sources and the drawer requests an appropriate image size', async () => {
  const x = setup({ display: '?display=slider' });
  try {
    await x.w.TDBSmilePage.mount();
    const photo = x.d.querySelector('[data-smile-grid-photo]');
    const original = photo.querySelector('[data-tdb-sg-image]');
    for (const image of photo.querySelectorAll(
      '.smile-comparison_before img, .smile-comparison_after img',
    )) {
      assert.equal(image.src, original.src);
      assert.equal(image.srcset, original.srcset);
      assert.equal(image.sizes, original.sizes);
      assert.equal(image.loading, 'lazy');
      assert.equal(image.decoding, 'async');
    }
    photo.click();
    const drawer = x.d.querySelector('[data-smile-case-image]');
    assert.equal(drawer.srcset, original.srcset);
    assert.match(drawer.sizes, /75rem/);
    x.d.querySelector('[data-smile-case-next]').click();
    assert.match(drawer.srcset, /smile-C/);
    assert.equal(
      x.d.querySelector('.smile-page_drawer-photo .smile-comparison_after img').srcset,
      drawer.srcset,
    );
  } finally {
    x.close();
  }
});

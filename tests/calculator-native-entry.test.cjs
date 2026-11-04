const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const core = require('../src/calculator/core.js');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const entry = `<section id="treatment-calculator" data-tdb-calculator="inline" data-tdb-calc-load="interaction" data-tdb-calc-price-guide="false">
  <div class="tdbc-shell" data-node="shell"><header class="tdbc-header" data-node="header" data-tdb-calc-static><h2>Authored heading</h2></header>
  <div class="tdbc-main" data-node="main"><section data-node="step-1" data-tdb-calc-static data-tdb-calc-native-entry>
  <h3>Authored opening question</h3><form>${['cosmetic', 'restorative'].map((key) => `<label class="tdbc-category"><input type="checkbox" data-category="${key}" data-control="category-${key}"><span class="form_checkbox-icon"></span><span>${key}</span></label>`).join('')}</form>
  <p data-tdb-calc-status role="status"></p></section></div></div>
  </section>
  <section id="headphones">Native page break</section><a id="jump" href="#treatment-calculator">Calculator</a><button id="drawer" data-tdb-calc-open>Open drawer</button>`;
const feed = Object.entries(core.IDS)
  .map(
    ([key, id]) =>
      `<div data-tdb-calc-record="${id}" data-name="${key}" data-label="${key}" data-price="100" data-min="100" data-max="100"></div>`,
  )
  .join('');
function setup() {
  const dom = new JSDOM(entry, {
    url: 'https://dentalbarns.webflow.io/dental-cost-lichfield',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const w = dom.window,
    observers = [],
    requests = [],
    mounts = [];
  Object.defineProperty(w.document, 'readyState', { value: 'complete' });
  Object.defineProperty(w.document, 'currentScript', {
    get: () => ({ src: 'https://cdn.example.test/release/dist/tdb-calculator-loader.js' }),
  });
  w.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback;
      this.targets = [];
      this.options = options;
      observers.push(this);
    }
    observe(node) {
      this.targets.push(node);
    }
    disconnect() {}
  };
  w.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  w.scrollTo = () => {};
  w.Element.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event('close'));
  };
  w.TDBAvailability = {
    seed() {},
    subscribe() {},
    read: async () => {},
    snapshot: () => ({ state: 'unavailable' }),
    assessmentSlot: () => null,
  };
  w.TDBModules = { load: async () => {} };
  const root = w.document.querySelector('section');
  const change = (key, checked = true) => {
    const input = root.querySelector(`[data-category=${key}]`);
    input.checked = checked;
    input.dispatchEvent(new w.Event('change', { bubbles: true }));
    return input;
  };
  const run = (file) => w.eval(fs.readFileSync(file, 'utf8'));
  return { dom, w, root, observers, requests, mounts, change, run };
}
test('native embed does not request a controller on proximity or local anchor focus', async () => {
  const h = setup();
  try {
    h.w.TDBModuleBootstrap = {
      ensure: async () => {
        h.requests.push('bootstrap');
        return { load: async () => {} };
      },
    };
    h.run('src/calculator/loader.js');
    for (const observer of h.observers)
      if (observer.targets.length) observer.callback([{ isIntersecting: true }]);
    h.w.document.getElementById('jump').dispatchEvent(new h.w.Event('focusin', { bubbles: true }));
    await tick();
    assert.deepEqual(h.requests, []);
    assert.equal(h.root.querySelector('h2').textContent, 'Authored heading');
  } finally {
    h.dom.window.close();
  }
});
test('rapid choices share one load and a failed request can be retried', async () => {
  const h = setup();
  try {
    let release,
      attempts = 0;
    h.w.TDBModuleBootstrap = {
      ensure: () => {
        attempts++;
        return new Promise((resolve, reject) => {
          release = () => reject(Error('offline'));
        });
      },
    };
    h.run('src/calculator/loader.js');
    h.change('cosmetic');
    h.change('restorative');
    assert.equal(attempts, 1);
    release();
    await tick();
    assert.match(h.root.textContent, /Choose again to retry/);
    h.w.TDBModuleBootstrap.ensure = async () => {
      attempts++;
      return {
        load: async (url) => {
          if (url.endsWith('.js'))
            h.w.TDBCalculator = {
              open() {},
              mount: async (root) =>
                h.mounts.push(
                  [...root.querySelectorAll('input:checked')].map((n) => n.dataset.category),
                ),
            };
        },
      };
    };
    h.change('cosmetic', false);
    await tick();
    await tick();
    assert.equal(attempts, 2);
    assert.deepEqual(h.mounts, [['restorative']]);
    assert.equal(h.root.hasAttribute('aria-busy'), false);
  } finally {
    h.dom.window.close();
  }
});
test('controller preserves native nodes, adopts changes during fetch, and resets both cards', async () => {
  const h = setup();
  try {
    let resolveFeed;
    h.w.fetch = () =>
      new Promise((resolve) => {
        resolveFeed = () => resolve({ ok: true, text: async () => feed });
      });
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    assert.equal(h.root.hasAttribute('data-tdb-calc-ready'), false);
    const header = h.root.querySelector('header'),
      first = h.root.querySelector('[data-node=step-1]'),
      checkbox = h.change('cosmetic');
    checkbox.focus();
    const promise = h.w.TDBCalculator.mount(h.root);
    assert.equal(h.w.TDBCalculator.mount(h.root), promise);
    h.change('restorative');
    resolveFeed();
    await promise;
    await tick();
    assert.equal(h.root.querySelector('header'), header);
    assert.equal(h.root.querySelector('[data-node=step-1]'), first);
    assert.equal(h.w.document.activeElement, checkbox);
    assert.equal(h.root.querySelectorAll('[data-node=step-1]').length, 1);
    assert.equal(h.root.querySelectorAll('input[data-category]:checked').length, 2);
    assert.equal(h.root.querySelectorAll('[data-node=step-2]').length, 1);
    assert.equal(h.root.querySelector('[data-node=price-guide-intro]'), null);
    assert.equal(h.root.querySelector('[data-node=section-footer]'), null);
    assert.equal(h.root.nextElementSibling.id, 'headphones');
    h.root.querySelector('[data-action=reset]').click();
    assert.equal(h.root.querySelectorAll('input[data-category]:checked').length, 0);
    assert.equal(h.root.querySelectorAll('.tdbc-category.is-selected').length, 0);
    h.change('cosmetic');
    assert.equal(h.root.querySelectorAll('input[data-category]:checked').length, 1);
  } finally {
    h.dom.window.close();
  }
});
test('failed price fetch keeps native entry and mount retries without duplicate controls', async () => {
  const h = setup();
  try {
    h.w.fetch = async () => {
      throw Error('offline');
    };
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    h.change('cosmetic');
    await assert.rejects(h.w.TDBCalculator.mount(h.root));
    assert.equal(h.root.querySelectorAll('input[data-category]').length, 2);
    assert.equal(h.root.hasAttribute('data-tdb-calc-ready'), false);
    h.w.fetch = async () => ({ ok: true, text: async () => feed });
    await h.w.TDBCalculator.mount(h.root);
    assert.equal(h.root.querySelectorAll('[data-node=step-2]').length, 1);
    assert.equal(h.root.querySelector('[data-category=cosmetic]').checked, true);
  } finally {
    h.dom.window.close();
  }
});
test('drawer opening remains independent of an untouched native inline entry', async () => {
  const h = setup();
  try {
    h.w.document.body.insertAdjacentHTML('beforeend', feed);
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    await h.w.TDBCalculator.open(h.w.document.getElementById('drawer'));
    assert.equal(h.w.document.querySelector('dialog').open, true);
    assert(h.w.document.querySelector('dialog .tdbc-shell > .tdbc-live'));
    assert.equal(h.root.hasAttribute('data-tdb-calc-ready'), false);
    assert.equal(h.root.querySelector('h2').textContent, 'Authored heading');
    h.w.TDBCalculator.close();
  } finally {
    h.dom.window.close();
  }
});

for (const retainChrome of [false, true])
  test(
    'inline viewport and interaction respect chrome policy; drawers keep modal focus: ' +
      retainChrome,
    async () => {
      const h = setup();
      try {
        if (retainChrome) h.w.document.body.dataset.tdbChromeFocus = 'off';
        h.w.document.body.insertAdjacentHTML('beforeend', feed);
        let focusCalls = 0;
        h.w.TDBNavScroll = {
          focus() {
            focusCalls++;
          },
          release() {},
        };
        h.run('src/calculator/core.js');
        h.run('src/calculator/ui.js');
        h.change('cosmetic');
        await h.w.TDBCalculator.mount(h.root);
        const observer = h.observers.find((o) => o.targets.includes(h.root));
        observer.callback([{ isIntersecting: true }]);
        h.root.dispatchEvent(new h.w.Event('pointerdown', { bubbles: true }));
        h.root.querySelector('input').focus();
        assert.equal(
          h.w.document.documentElement.classList.contains('tdbc-chrome-away'),
          !retainChrome,
        );
        assert.equal(
          h.root.classList.contains('is-focused'),
          !retainChrome,
          'inline sticky estimate cannot cover a retained navbar',
        );
        assert.equal(focusCalls > 0, !retainChrome);
        assert(
          h.root.querySelector('[data-node=step-2]'),
          'the calculator still renders the selected category',
        );
        await h.w.TDBCalculator.open(h.w.document.getElementById('drawer'));
        assert.equal(h.w.document.querySelector('dialog').open, true);
        assert(h.w.document.documentElement.classList.contains('tdbc-chrome-away'));
        h.w.TDBCalculator.close();
        assert.equal(
          h.w.document.documentElement.classList.contains('tdbc-chrome-away'),
          !retainChrome,
        );
      } finally {
        h.dom.window.close();
      }
    },
  );

test('interaction-led embed holds chrome within its section after intent, with explicit exit controls', async () => {
  const h = setup();
  try {
    h.w.document.body.dataset.tdbChromeFocus = 'off';
    h.root.dataset.tdbCalcFocus = 'interaction';
    h.w.document.body.insertAdjacentHTML('beforeend', feed);
    let release,
      hold,
      focusCalls = 0;
    h.w.TDBNavScroll = {
      focus(onRelease, isHeld) {
        release = onRelease;
        hold = isHeld;
        focusCalls++;
      },
      release() {},
    };
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    await h.w.TDBCalculator.mount(h.root);
    const observer = h.observers.find((o) => o.targets.includes(h.root));
    const away = () => h.w.document.documentElement.classList.contains('tdbc-chrome-away');
    observer.callback([{ isIntersecting: true }]);
    assert.equal(away(), false);
    assert.equal(focusCalls, 0);
    const tap = (node) => node.dispatchEvent(new h.w.Event('pointerdown', { bubbles: true }));
    tap(h.root);
    assert(away());
    assert.equal(hold(), true, 'scrolling within the calculator keeps its chrome protected');
    release();
    assert(away(), 'a navbar scroll release cannot expose menus over the active calculator');
    observer.callback([{ isIntersecting: false }]);
    assert.equal(away(), false, 'leaving the section releases chrome');
    observer.callback([{ isIntersecting: true }]);
    assert(away(), 'returning to an interacted calculator restores its protected area');
    h.root.querySelector('input').focus();
    assert(away(), 'keyboard interaction has the same chrome behavior');
    h.w.document.dispatchEvent(new h.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(away(), false);
    observer.callback([{ isIntersecting: true }]);
    assert.equal(away(), false, 'Escape remains an explicit release');
    tap(h.root);
    tap(h.w.document.getElementById('headphones'));
    assert.equal(away(), false, 'outside interaction releases chrome');
    tap(h.root);
    h.w.dispatchEvent(new h.w.Event('pagehide'));
    assert.equal(away(), false);
  } finally {
    h.dom.window.close();
  }
});

test('first lazy choice acquires chrome only if the user is still on the visible form', async () => {
  for (const stillOnForm of [true, false]) {
    const h = setup();
    try {
      h.w.document.body.dataset.tdbChromeFocus = 'off';
      h.root.dataset.tdbCalcFocus = 'interaction';
      h.root.getBoundingClientRect = () => ({ height: 700, top: 100, bottom: 800 });
      let finish;
      h.w.fetch = () =>
        new Promise((resolve) => {
          finish = () => resolve({ ok: true, text: async () => feed });
        });
      h.run('src/calculator/core.js');
      h.run('src/calculator/ui.js');
      h.change('cosmetic').focus();
      const pending = h.w.TDBCalculator.mount(h.root);
      if (!stillOnForm) h.w.document.getElementById('drawer').focus();
      finish();
      await pending;
      assert.equal(
        h.w.document.documentElement.classList.contains('tdbc-chrome-away'),
        stillOnForm,
      );
    } finally {
      h.dom.window.close();
    }
  }
});

test('basic navigation holds focus until the calculator leaves the viewport before enhancement is ready', async () => {
  const h = setup();
  try {
    h.root.dataset.tdbCalcFocus = 'interaction';
    h.w.document.body.insertAdjacentHTML('beforeend', feed);
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    await h.w.TDBCalculator.mount(h.root);
    const observer = h.observers.find((o) => o.targets.includes(h.root));
    observer.callback([{ isIntersecting: true }]);
    h.w.scrollY = 1000;
    h.root.dispatchEvent(new h.w.Event('pointerdown', { bubbles: true }));
    h.w.scrollY = 850;
    h.w.dispatchEvent(new h.w.Event('scroll'));
    assert.equal(h.w.document.documentElement.classList.contains('tdbc-chrome-away'), true);
    observer.callback([{ isIntersecting: false }]);
    assert.equal(h.w.document.documentElement.classList.contains('tdbc-chrome-away'), false);
  } finally {
    h.dom.window.close();
  }
});

test('calculator panels reuse disclosure motion and shared chevrons without replaying on quantity updates', async () => {
  const h = setup();
  try {
    h.w.document.body.insertAdjacentHTML('beforeend', feed);
    h.run('src/navbar/native-foundation.js');
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    h.change('cosmetic');
    await h.w.TDBCalculator.mount(h.root);
    h.w.TDBDisclosure.refresh();
    const trigger = h.root.querySelector('[data-action=option][data-key=bonding]');
    const panel = h.root.querySelector('[data-panel=option-bonding]');
    const inner = panel.querySelector('[data-tdb-disclosure-panel]');
    const reveal = inner.querySelector('[data-tdb-disclosure-reveal]');
    assert(trigger.querySelector('[data-tdb-chevron]'));
    assert(panel.hasAttribute('data-tdb-disclosure-item'));
    assert(inner.hidden);
    trigger.click();
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(inner.hidden, false);
    assert(panel.hasAttribute('data-tdb-disclosure-interacted'));
    h.root.querySelector('[data-action=plus][data-key=bonding]').click();
    assert.equal(panel.querySelector('[data-tdb-disclosure-reveal]'), reveal);
    assert(panel.hasAttribute('data-tdb-disclosure-interacted'));
    // The runtime can clear startup markers. An ordinary value render must not
    // put one back and unexpectedly restart a reveal already in view.
    panel.removeAttribute('data-tdb-disclosure-interacted');
    h.root.querySelector('[data-action=plus][data-key=bonding]').click();
    assert.equal(panel.hasAttribute('data-tdb-disclosure-interacted'), false);
    for (let i = 0; i < 10; i++) trigger.click();
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(inner.hidden, false);
    trigger.click();
    assert(inner.hidden);
    assert.equal(panel.getAttribute('aria-hidden'), 'true');
    assert.equal(h.root.querySelector('[data-w-id]'), null);
    assert.equal(h.root.querySelector('[data-node=section-footer]'), null);
    await tick();
  } finally {
    h.dom.window.close();
  }
});

test('starting routes reorder the journey, retain controls and collapse to either appointment-only estimate', async () => {
  const h = setup();
  try {
    const prices = { assessment: 450, design: 225, bonding: 395, hygiene: 195 };
    h.w.document.body.insertAdjacentHTML(
      'beforeend',
      Object.entries(core.IDS)
        .map(
          ([key, id]) =>
            `<div class="w-dyn-item"><div schema-type="pricing-block">
            <div class="pricing-info_icon-wrapper">${key === 'assessment' ? 90 : 60} minutes</div>
            <div class="pricing-checbox">${key === 'assessment' ? 'Comprehensive new-patient dental examination' : 'Understanding your goals, concerns and priorities'}</div>
            <div class="pricing-checbox">${key === 'assessment' ? 'Personalised written report' : 'Clear recommendation for the next clinical step'}</div>
            <div class="pricing-checbox" visible=""></div>
            <div class="w-condition-invisible"><div class="pricing-checbox">Unpublished inclusion</div></div>
            </div><div data-tdb-calc-record="${id}" data-label="${key}" data-price="£${prices[key] || 100}"></div></div>`,
        )
        .join(''),
    );
    const liveDay = core.iso(core.addDays(new Date(), 90));
    const slot = { day: liveDay, time: '10:00', at: Date.parse(liveDay + 'T10:00:00Z') };
    h.w.TDBAvailability.snapshot = () => ({
      state: 'ready',
      fresh: true,
      checkedAt: Date.now(),
      data: { nextSlot: liveDay + 'T10:00:00Z' },
    });
    h.w.TDBAvailability.assessmentSlot = () => slot;
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    h.change('cosmetic');
    await h.w.TDBCalculator.mount(h.root);
    await tick();
    const choose = (selector) => h.root.querySelector(selector).click();
    choose('[data-select=bonding]');
    choose('[data-action=plus][data-key=bonding]');
    const order = [
      ...h.root.querySelectorAll(
        '[data-panel=journey]>[data-tdb-disclosure-panel]>[data-tdb-disclosure-reveal]>section',
      ),
    ].map((e) => e.dataset.node);
    assert.deepEqual(order, ['assessment', 'hygiene', 'timeline', 'estimate']);
    assert.match(h.root.querySelector('[data-node=assessment] h3').textContent, /03Where to start/);
    assert.match(h.root.querySelector('[data-node=hygiene] h3').textContent, /04Hygiene/);
    assert.match(
      h.root.querySelector('[data-node=timeline] h3').textContent,
      /05A date to look forward/,
    );
    assert(h.root.querySelector('[data-node=timeline] .tdbc-step-intro').textContent.trim());
    const assessment = h.root.querySelector('[data-node=assessment]');
    const nativeHeader = h.root.querySelector('[data-node=header]');
    assert.equal(h.root.querySelector('.tdbc-live').parentElement, h.root);
    assert.equal(nativeHeader.parentElement, h.root.querySelector('.tdbc-shell'));
    assert.equal(nativeHeader.textContent, 'Authored heading');
    assert.match(
      assessment.querySelector('.tdbc-included-additional').textContent,
      /Comprehensive new-patient/,
    );
    assert.equal(assessment.querySelectorAll('.tdbc-included li').length, 4);
    assert.equal(
      assessment.querySelector('.tdbc-included-additional').classList.contains('is-unavailable'),
      false,
    );
    const durationRows = [...assessment.querySelectorAll('.tdbc-appointment-duration')];
    assert.deepEqual(
      durationRows.map((row) => row.textContent),
      ['90 minutes', '60 minutes'],
    );
    assert(durationRows.every((row) => row.querySelector('svg')));
    choose('[data-action=sooner]');
    assert.match(
      h.root.querySelector('.tdbc-timing-warning').textContent,
      /already selected the fastest/,
    );
    assert.match(
      h.root.querySelector('.tdbc-timing-warning').textContent,
      /We’re no strangers to deadlines/,
    );
    const hygiene = h.root.querySelector('[data-hygiene]');
    const quantity = h.root.querySelector('[data-qty=bonding]');
    const signatureTarget = h.root.querySelector('[data-date=target]').value;
    assert.equal(h.root.querySelector('[data-output=total]').textContent, '£1,240');
    choose('[data-assessment=design]');
    assert.equal(h.root.querySelector('[data-node=assessment]'), assessment);
    assert.equal(h.root.querySelector('[data-output=total]').textContent, '£1,240');
    const designTarget = h.root.querySelector('[data-date=target]').value;
    assert.equal((core.parseDate(designTarget) - core.parseDate(signatureTarget)) / 86400000, 49);
    assert.equal(h.root.querySelector('[data-node=header]'), nativeHeader);
    assert.match(
      assessment.querySelector('.tdbc-included').textContent,
      /Understanding your goals/,
    );
    assert.doesNotMatch(
      assessment.querySelector('.tdbc-included').textContent,
      /examination|written report|Unpublished/,
    );
    assert.match(assessment.textContent, /does not include a comprehensive dental examination/);
    assert(
      assessment.querySelector('.tdbc-included-additional').classList.contains('is-unavailable'),
    );
    assert.match(
      assessment.querySelector('.tdbc-included-additional').textContent,
      /Comprehensive new-patient/,
    );
    choose('[data-action=stage][data-key=checkup]');
    assert.match(
      h.root.querySelector('[data-stage=checkup]').textContent,
      /1–2 weeks after Smile Design/,
    );
    assert.match(
      h.root.querySelector('[data-stage=checkup]').textContent,
      /Comprehensive check-up£225/,
    );
    choose('[data-action=sooner]');
    assert.match(
      h.root.querySelector('.tdbc-timing-warning').textContent,
      /could save up to two months/,
    );
    assert.match(
      h.root.querySelector('.tdbc-timing-warning').textContent,
      /six-week Smile Design wait, followed by 1–2 weeks/,
    );
    assert.match(
      h.root.querySelector('.tdbc-timing-warning').textContent,
      /We’re no strangers to deadlines/,
    );
    assert.equal(
      h.root.querySelector('[data-output=availability]').dataset.assessmentRoute,
      'design',
    );
    assert.equal(h.root.querySelector('[data-availability-status]').dataset.live, 'false');
    choose('[data-hygiene]');
    assert.equal(h.root.querySelector('[data-hygiene]'), hygiene);
    assert.equal(h.root.querySelector('[data-qty=bonding]'), quantity);
    assert.equal(h.root.querySelector('[data-output=total]').textContent, '£1,435');
    assert.equal(
      (core.parseDate(h.root.querySelector('[data-date=target]').value) -
        core.parseDate(designTarget)) /
        86400000,
      7,
    );
    choose('[data-action=start-design]');
    assert(h.root.querySelector('[data-tdb-calc-native-entry]').hidden);
    assert(h.root.querySelector('[data-panel=treatments]>[data-tdb-disclosure-panel]').hidden);
    assert.equal(h.root.querySelector('[data-node=hygiene]'), null);
    assert.equal(h.root.querySelector('[data-node=timeline]'), null);
    assert.equal(h.root.querySelector('[data-output=total]').textContent, '£225');
    assert.equal(h.root.querySelector('[data-output=duration]').textContent, '60 minutes');
    choose('[data-assessment=signature]');
    assert.equal(h.root.querySelector('[data-output=total]').textContent, '£450');
    assert.equal(h.root.querySelector('[data-output=duration]').textContent, '90 minutes');
    assert.equal(
      h.root.querySelector('[data-action=resume-estimate]').textContent,
      'Return to full treatment estimate',
    );
    choose('[data-action=resume-estimate]');
    assert.equal(h.root.querySelector('[data-tdb-calc-native-entry]').hidden, false);
    assert.equal(h.root.querySelector('[data-qty=bonding]').value, '2');
    assert.equal(h.root.querySelector('[data-output=total]').textContent, '£1,435');
    choose('[data-action=start-assessment]');
    assert.equal(h.root.querySelector('[data-output=total]').textContent, '£450');
    choose('[data-action=reset]');
    assert.equal(h.root.querySelector('[data-tdb-calc-native-entry]').hidden, false);
    await tick();
  } finally {
    h.dom.window.close();
  }
});

test('drawer reads appointment checklists and duration from fetched price cards as escaped text', async () => {
  const h = setup();
  try {
    h.w.fetch = async (url) => {
      assert.equal(url, '/dental-cost-lichfield');
      return {
        ok: true,
        text: async () => `
        <div class="w-dyn-item"><div schema-type="pricing-block">
          <div class="pricing-checbox">Comprehensive examination</div>
        </div><div data-tdb-calc-record="${core.IDS.assessment}" data-price="£450"></div></div>
        <div class="w-dyn-item"><div schema-type="pricing-block">
          <div class="pricing-info_icon-wrapper">75 minutes</div>
          <div class="pricing_btm-accordion" style="height:0">
            <div class="pricing-checbox">Explore &lt;your goals&gt; &amp; priorities</div>
            <div class="pricing-checbox" hidden>Hidden item</div>
          </div>
        </div><div data-tdb-calc-record="${core.IDS.design}" data-price="£225"></div></div>`,
      };
    };
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    await h.w.TDBCalculator.open(h.w.document.getElementById('drawer'));
    const drawer = h.w.document.querySelector('dialog');
    drawer.querySelector('[data-category=cosmetic]').click();
    drawer.querySelector('[data-action=start-design]').click();
    assert.deepEqual(
      [...drawer.querySelectorAll('.tdbc-included li')].map((e) => e.textContent),
      ['Explore <your goals> & priorities', 'Comprehensive examination'],
    );
    assert(drawer.querySelector('.tdbc-included-additional').classList.contains('is-unavailable'));
    assert.equal(drawer.querySelector('.tdbc-included your'), null);
    assert.equal(drawer.querySelector('[data-output=duration]').textContent, '75 minutes');
    assert.equal(h.root.querySelector('h2').textContent, 'Authored heading');
    h.w.TDBCalculator.close();
  } finally {
    h.dom.window.close();
  }
});

test('availability refresh uses shared motion timing and finishes complete turns', async () => {
  const h = setup();
  try {
    h.w.document.body.insertAdjacentHTML('beforeend', feed);
    const durations = [],
      iterations = [];
    h.w.TDBMotionProfile = { time: (n) => n * 2 };
    h.w.Element.prototype.animate = function (_frames, options) {
      durations.push(options.duration);
      return {
        currentTime: 1500,
        effect: { updateTiming: (x) => iterations.push(x.iterations) },
        finished: Promise.resolve(),
        cancel() {},
      };
    };
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    h.change('cosmetic');
    await h.w.TDBCalculator.mount(h.root);
    await tick();
    h.root.querySelector('[data-action=start-assessment]').click();
    h.root.querySelector('[data-action=availability]').click();
    await tick();
    assert(durations.includes(1400));
    assert(iterations.includes(2));
    assert.equal(h.root.querySelector('[data-action=availability]').disabled, false);
  } finally {
    h.dom.window.close();
  }
});

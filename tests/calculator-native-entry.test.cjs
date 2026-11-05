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
          if (String(url).endsWith('tdb-calculator.js'))
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
    assert(h.w.document.querySelector('dialog .tdbc-drawer-root > .tdbc-live'));
    assert.equal(h.root.hasAttribute('data-tdb-calc-ready'), false);
    assert.equal(h.root.querySelector('h2').textContent, 'Authored heading');
    h.w.TDBCalculator.close();
  } finally {
    h.dom.window.close();
  }
});

test('reopening a saved drawer restores its reading position after modal focus and keeps choices', async () => {
  const h = setup();
  try {
    h.w.document.body.insertAdjacentHTML('beforeend', feed);
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    const trigger = h.w.document.getElementById('drawer');
    await h.w.TDBCalculator.open(trigger);
    const drawer = h.w.document.querySelector('dialog');
    drawer.querySelector('[data-category=cosmetic]').click();
    drawer.querySelector('[data-select=gumline]').click();
    drawer.querySelector('[data-action=plus][data-key=gumline]').click();
    drawer.scrollTop = 780;
    h.w.TDBCalculator.close();
    assert.equal(h.w.document.activeElement, trigger);
    drawer.showModal = function () {
      this.open = true;
      this.scrollTop = 0;
    };
    await h.w.TDBCalculator.open(trigger);
    assert.equal(drawer.scrollTop, 780);
    assert.equal(drawer.querySelector('[data-qty=gumline]').value, '2');
    assert.equal(drawer.querySelector('[data-select=gumline]').checked, true);
    assert.equal(h.w.document.activeElement, drawer.querySelector('[data-tdb-calc-close]'));
    h.w.TDBCalculator.close();
    await tick();
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
    assert(durationRows.every((row) => row.querySelector('.tdbc-shared-icon.is-clock')));
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
    assert.match(assessment.textContent, /Both routes start from £450/);
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
      /Premium New Patient AssessmentFrom £225/,
    );
    choose('[data-action=sooner]');
    assert.match(
      h.root.querySelector('.tdbc-timing-warning').textContent,
      /could save up to two months/,
    );
    const tip = h.root.querySelector('[data-action="assessment-tip"]');
    assert.match(tip.textContent, /Save up to two months/);
    assert.equal(tip.getAttribute('aria-expanded'), 'false');
    const tipPanel = h.root.querySelector(
      '[data-panel="assessment-tip"]>[data-tdb-disclosure-panel]',
    );
    assert.equal(tipPanel.hidden, true);
    choose('[data-action="assessment-tip"]');
    assert.equal(tip.getAttribute('aria-expanded'), 'true');
    assert.equal(tipPanel.hidden, false);
    assert.equal(
      h.root.querySelector('[data-action="bridal"]').getAttribute('aria-expanded'),
      'false',
    );
    choose('[data-action="assessment-tip"]');
    assert.equal(tip.getAttribute('aria-expanded'), 'false');
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

for (const mode of ['native', 'lenis', 'drawer', 'no-bar', 'standalone'])
  test(
    'route buttons reveal the correct heading below the actual estimate bar: ' + mode,
    async () => {
      const h = setup();
      try {
        h.w.document.body.insertAdjacentHTML('beforeend', feed);
        h.w.document.head.insertAdjacentHTML(
          'beforeend',
          '<style>.tdbc-step{padding-top:40px}' +
            (mode === 'standalone' ? '[data-node="step-1"]{padding-top:0}' : '') +
            '</style>',
        );
        if (mode === 'no-bar') h.w.document.body.dataset.tdbChromeFocus = 'off';
        const frames = new Map(),
          calls = [];
        let frame = 0,
          barHeight = 72.5,
          lenisPosition = 2500;
        h.w.requestAnimationFrame = (callback) => {
          frames.set(++frame, callback);
          return frame;
        };
        h.w.cancelAnimationFrame = (id) => frames.delete(id);
        const flush = () => {
          for (let count = 0; frames.size && count < 20; count++) {
            const pending = [...frames.values()];
            frames.clear();
            pending.forEach((callback) => callback(h.w.performance.now() + 1000));
          }
          assert.equal(frames.size, 0);
        };
        h.w.HTMLElement.prototype.getBoundingClientRect = function () {
          const top = this.matches('dialog') ? 12 : this.dataset.node === 'step-1' ? 280 : 480;
          const height = this.classList.contains('tdbc-live') ? barHeight : 200;
          return { top, bottom: top + height, left: 0, right: 400, width: 400, height };
        };
        h.w.scrollY = 1000;
        h.w.scrollTo = (options) => calls.push(options);
        h.w.Element.prototype.scrollIntoView = () => assert.fail('must use the shared offset');
        if (mode === 'lenis')
          h.w.lenis = {
            resize: () => {
              lenisPosition = h.w.scrollY;
            },
            scrollTo: (target, options) =>
              calls.push({ target, origin: lenisPosition, ...options }),
          };
        h.run('src/calculator/core.js');
        h.run('src/calculator/ui.js');
        let root = h.root,
          drawer;
        if (mode === 'drawer') {
          await h.w.TDBCalculator.open(h.w.document.getElementById('drawer'));
          drawer = h.w.document.querySelector('dialog');
          root = drawer.querySelector('.tdbc-drawer-root');
          Object.defineProperty(drawer, 'scrollHeight', { value: 5000 });
          Object.defineProperty(drawer, 'clientHeight', { value: 700 });
          root.querySelector('[data-category=cosmetic]').click();
        } else {
          h.root.querySelector('[data-node=step-1]').classList.add('tdbc-step');
          h.change('cosmetic');
          await h.w.TDBCalculator.mount(h.root);
        }
        root.querySelector('[data-select=whitening]').click();
        flush();
        const choice = root.querySelector('[data-category=cosmetic]');
        for (const [action, destination, route] of [
          ['start-assessment', 'assessment', 'signature'],
          ['resume-estimate', 'step-1'],
          ['start-design', 'assessment', 'design'],
          ['resume-estimate', 'step-1'],
        ]) {
          // A responsive/updated bar must be measured for each action, not cached.
          barHeight += 11.25;
          lenisPosition += 1000;
          if (drawer) drawer.scrollTop = 500;
          calls.length = 0;
          root.querySelector('[data-action=' + action + ']').click();
          flush();
          const target = root.querySelector('[data-node=' + destination + ']'),
            offset =
              (mode === 'no-bar' ? 0 : barHeight) +
              (mode === 'standalone' && destination === 'step-1' ? 40 : 0),
            top = target.getBoundingClientRect().top;
          assert.equal(h.w.document.activeElement, target.querySelector('h3'));
          if (drawer) {
            assert.equal(drawer.scrollTop, 500 + top - 12 - offset);
            assert.equal(calls.length, 0, 'the background page must not scroll');
          } else if (mode === 'lenis') {
            assert.equal(calls.length, 1);
            assert.equal(calls[0].target, 1000 + top - offset);
            assert.equal(
              calls[0].origin,
              1000,
              'layout shrink must not reuse the old scroll origin',
            );
          } else {
            assert.equal(calls.length, 1);
            assert.equal(calls[0].top, 1000 + top - offset);
          }
          if (route) {
            assert(root.querySelector('[data-assessment=' + route + ']').checked);
            assert(choice.closest('[data-node=step-1]').hidden);
          } else {
            assert.equal(root.querySelector('[data-category=cosmetic]'), choice);
            assert(choice.checked, 'returning keeps the category choice');
            assert(
              root.querySelector('[data-select=whitening]').checked,
              'returning keeps treatment selections',
            );
            assert.equal(choice.closest('[data-node=step-1]').hidden, false);
          }
        }
        if (drawer) h.w.TDBCalculator.close();
        await tick();
        flush();
      } finally {
        h.dom.window.close();
      }
    },
  );

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

test('reset forgets calculator chrome protection, including programmatic intro focus and re-entry', async () => {
  const h = setup();
  try {
    h.root.dataset.tdbCalcFocus = 'interaction';
    h.root.querySelector('header').className = 'tdbc-header';
    h.root.querySelector('header').tabIndex = -1;
    h.w.document.body.insertAdjacentHTML('beforeend', feed);
    let releases = 0;
    h.w.TDBNavScroll = {
      focus() {},
      release() {
        releases++;
      },
    };
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    h.change('cosmetic');
    await h.w.TDBCalculator.mount(h.root);
    const observer = h.observers.find((o) => o.targets.includes(h.root));
    observer.callback([{ isIntersecting: true }]);
    h.root.dispatchEvent(new h.w.Event('pointerdown', { bubbles: true }));
    assert(h.w.document.documentElement.classList.contains('tdbc-chrome-away'));
    h.root.querySelector('[data-action=reset]').click();
    assert(releases > 0);
    assert.equal(h.w.document.documentElement.classList.contains('tdbc-chrome-away'), false);
    observer.callback([{ isIntersecting: false }]);
    observer.callback([{ isIntersecting: true }]);
    assert.equal(h.w.document.documentElement.classList.contains('tdbc-chrome-away'), false);
    h.root.querySelector('input').focus();
    assert(h.w.document.documentElement.classList.contains('tdbc-chrome-away'));
  } finally {
    h.dom.window.close();
  }
});

test('refresh preserves the last available date and status until the new date is ready', async () => {
  const h = setup();
  try {
    h.w.document.body.insertAdjacentHTML('beforeend', feed);
    let liveDay = core.iso(core.addDays(new Date(), 90));
    h.w.TDBAvailability.snapshot = () => ({
      state: 'ready',
      fresh: true,
      checkedAt: Date.now(),
      data: { nextSlot: liveDay + 'T10:00:00Z' },
    });
    h.w.TDBAvailability.assessmentSlot = () => ({
      day: liveDay,
      time: '10:00',
      at: Date.parse(liveDay + 'T10:00:00Z'),
    });
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    h.change('cosmetic');
    await h.w.TDBCalculator.mount(h.root);
    await tick();
    h.root.querySelector('[data-action=start-design]').click();
    const card = h.root.querySelector('[data-output=availability]');
    const original = card.textContent;
    let resolveRead;
    h.w.TDBAvailability.read = () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      });
    card.querySelector('[data-action=availability]').click();
    await tick();
    assert(h.root.hasAttribute('data-availability-loading'));
    assert.equal(card.textContent, original);
    assert.equal(card.querySelector('[data-action=availability]').disabled, true);
    liveDay = core.iso(core.addDays(core.parseDate(liveDay), 7));
    resolveRead();
    await tick();
    assert.equal(h.root.hasAttribute('data-availability-loading'), false);
    assert.notEqual(card.textContent, original);
    assert.equal(card.querySelector('[data-action=availability]').disabled, false);
  } finally {
    h.dom.window.close();
  }
});

test('shared tickers keep appointment copy stable and settle the latest price and date after rapid switches', async () => {
  const h = setup();
  try {
    h.w.document.body.insertAdjacentHTML(
      'beforeend',
      Object.entries(core.IDS)
        .map(
          ([key, id]) =>
            `<div data-tdb-calc-record="${id}" data-label="${key}" data-price="£${key === 'assessment' ? 450 : key === 'design' ? 225 : 100}"></div>`,
        )
        .join(''),
    );
    const liveDay = core.iso(core.addDays(new Date(), 90));
    h.w.TDBAvailability.snapshot = () => ({
      state: 'ready',
      fresh: true,
      checkedAt: Date.now(),
      data: { nextSlot: liveDay + 'T10:00:00Z' },
    });
    h.w.TDBAvailability.assessmentSlot = () => ({
      day: liveDay,
      time: '10:00',
      at: Date.parse(liveDay + 'T10:00:00Z'),
    });
    const animations = [];
    h.w.TDBMotion = { reduced: new h.w.EventTarget(), defaults: { ticker: 777 } };
    h.w.TDBMotion.reduced.matches = false;
    h.w.Element.prototype.animate = function (frames, options) {
      const animation = {
        frames,
        options,
        cancel() {},
        onfinish: null,
        finished: Promise.resolve(),
      };
      animations.push(animation);
      return animation;
    };
    h.run('src/shared/native-ticker.js');
    h.run('src/calculator/core.js');
    h.run('src/calculator/ui.js');
    h.change('cosmetic');
    await h.w.TDBCalculator.mount(h.root);
    await tick();
    h.root.querySelector('[data-action=start-assessment]').click();
    const assessment = h.root.querySelector('[data-node=assessment]');
    const fixedCopy = () =>
      [
        ...assessment.querySelectorAll(
          '.tdbc-included-label,.tdbc-help,.tdbc-assessment-price>span',
        ),
      ]
        .map((n) => n.textContent)
        .join('|');
    const originalCopy = fixedCopy();
    const price = assessment.querySelector('[data-output=appointment-price]');
    const date = assessment.querySelector('[data-output=assessment-date]');
    for (const route of ['design', 'signature', 'design'])
      assessment.querySelector(`[data-assessment=${route}]`).click();
    assert.equal(
      fixedCopy(),
      originalCopy.replace(
        /Our diary updates live, and this time is not reserved\./,
        'An approximate waiting time, confirmed when appointments are released.',
      ),
    );
    assert.equal(assessment.querySelector('[data-output=appointment-price]'), price);
    assert.equal(assessment.querySelector('[data-output=assessment-date]'), date);
    assert(animations.some((a) => a.options.duration === 777));
    for (const animation of animations) animation.onfinish?.();
    assert.equal(price.textContent, '£225');
    assert.equal(h.root.querySelector('[data-output=total]').textContent, '£225');
    assert.equal(h.root.querySelector('[data-output=duration]').textContent, '60 minutes');
    assert.equal(date.textContent, date.dataset.tickerText);
    assert.equal(h.root.querySelectorAll('.tdbc-ticker-incoming').length, 0);
    h.w.TDBMotion.reduced.matches = true;
    assessment.querySelector('[data-assessment=signature]').click();
    assert.equal(price.textContent, '£450');
    assert.equal(h.root.querySelectorAll('.tdbc-ticker-incoming').length, 0);
  } finally {
    h.dom.window.close();
  }
});

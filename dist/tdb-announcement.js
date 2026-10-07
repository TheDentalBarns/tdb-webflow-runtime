/* TDB Announcement 2.0.1: native Designer markup, shared Swiper/motion/tickers. */
(() => {
  'use strict';
  if (window.TDBAnnouncement) return;
  const instances = new Map();
  function createAnnouncement(target) {
  const root = document.documentElement;
  const formatters = new Map(), labels = new Map();
  const formatter = (key, options) => {
    if (!formatters.has(key)) formatters.set(key, new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London', ...options}));
    return formatters.get(key);
  };
  const preview = location.hostname === 'dentalbarns.webflow.io' && new URLSearchParams(location.search).has('banner-preview');
  let row = [...document.querySelectorAll('[data-tdb-banner-item]')].find(el => (el.getAttribute('data-tdb-banner-item') || el.querySelector('[data-banner-field="slug"]')?.textContent.trim()) === (preview ? 'preview' : 'active'));
  const field = name => row?.querySelector('[data-banner-field="' + name + '"]')?.textContent.trim() || '';
  const defaults = readConfig();
  function readConfig() { return {
    deadline: ukDate(field('smile-release-time'), field('smile-release-uk-time')),
    nextSlot: ukDate(field('next-signature-slot'), field('next-signature-uk-time')),
    title: field('smile-countdown-text') || 'Smile Design · Appointments released in',
    rest: field('smile-waitlist-text') || 'Join the waitlist',
    bookedTitle: field('smile-booked-title') || 'Smile Design · Fully booked',
    signature: field('signature-heading') || 'Signature Assessment ✦ Next appointment',
    action: field('signature-availability-text') || 'Appointments available'
  }; }
  let overrides = { ...window.TDBAnnouncementConfig };
  let config = { ...defaults, ...overrides }, dataRequested = false, dataLoading = false, dataAttempts = 0, dataRetry = 0, dataState = row ? 'ready' : 'idle';
  const signatureOnly = /^\/services\/fast-track\/?$/.test(location.pathname);
  let shell = target, button, track, progress, swiper;
  let panels = [], digitSlots = [];

  let timer = 0, rotation = 0, active = false, started = false, mode = '', last = '';
  let signatureState = true, interacting = false, hovered = false, moving = false, suspended = false, lastVisible = false;
  const dwell = 8000;
  let rotationLeft = dwell, rotationEnd = 0;
  let manual = false, gesture = false, suppressClickUntil = 0, openedTouch = null, pressPoint = null;
  const events = ['CookieScriptLoaded', 'CookieScriptAccept', 'CookieScriptAcceptAll', 'CookieScriptReject', 'CookieScriptClose'];
  const reduced = window.TDBMotion.reduced;
  const reduceMotion = () => reduced.matches;
  function ukDate(date, clock) {
    // Webflow publishes date text without its time. Keep an explicit, editable UK clock field.
    if (!date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) return null;
    const day = Date.parse(date + ' 00:00:00 GMT');
    if (!Number.isFinite(day)) return null;
    const [hour, minute] = clock.split(':').map(Number);
    const wall = day + (hour * 60 + minute) * 60000;
    const parts = value => Object.fromEntries(formatter('parts', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(value).map(p => [p.type,p.value]));
    const local = value => { const p = parts(value); return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second); };
    let utc = wall;
    for (let i = 0; i < 2; i++) utc = wall - (local(utc) - utc);
    return local(utc) === wall ? new Date(utc).toISOString() : null;
  }
  function decisionExists() {
    if (window.TDBConsent?.status?.().elfsight) return true;
    const cookie = document.cookie.split('; ').find(x => x.startsWith('CookieScriptConsent='));
    if (!cookie) return false;
    try { return /"action"|"a":|accept|reject|close/.test(decodeURIComponent(cookie)); }
    catch (_) { return false; }
  }
  function attribute(node, key, value) { value = String(value); if (node.getAttribute(key) !== value) node.setAttribute(key, value); }
  function setText(node, value) { if (node.textContent !== value) node.textContent = value; }
  function isVisible() {
    return !suspended && !document.hidden && !shell.hidden && !shell.hasAttribute('data-tdb-announcement-pending') &&
      !root.matches('.tdb-timer-hidden,.tdb-slider-focus,.tdb-sg-chrome-away,.tdb-sg-locked') &&
      !document.querySelector('#tdb-vip-drawer.is-open,#tdb-vip-drawer.is-closing');
  }
  function time(value) {
    return typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
  }
  function slotText(value = config.nextSlot) {
    const date = time(value);
    if (!(date > Date.now())) return config.action;
    if (!labels.has(value)) {
      const day = formatter('day', {weekday:'short', day:'numeric', month:'short'}).format(date);
      const clock = formatter('clock', {hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).format(date);
      labels.set(value, day + ' · ' + clock);
    }
    return labels.get(value);
  }

  function settleSlide() {
    if (!swiper || !moving) return;
    swiper.setTransition(0); swiper.setTranslate(swiper.snapGrid[swiper.snapIndex] * -1);
    swiper.transitionEnd(); moving = false; signatureState = swiper.realIndex === 0;
  }
  function slide(direction = -1) {
    if (moving || signatureOnly) return;
    pauseRotation(); rotationLeft = dwell;
    if (direction < 0) swiper.slideNext(); else swiper.slidePrev();
  }
  function pauseRotation() {
    if (!rotation) return;
    clearTimeout(rotation); rotation = 0;
    rotationLeft = Math.max(0, rotationEnd - performance.now());
    progress.style.transition = 'none'; progress.style.strokeDashoffset = String(rotationLeft / dwell);
  }
  function rotate() {
    if (signatureOnly || manual || gesture || interacting || moving || !isVisible()) return;
    progress.style.transition = 'none'; progress.style.strokeDashoffset = String(rotationLeft / dwell);
    progress.getBoundingClientRect();
    progress.style.transition = 'stroke-dashoffset ' + rotationLeft + 'ms linear'; progress.style.strokeDashoffset = '0';
    rotationEnd = performance.now() + rotationLeft;
    rotation = setTimeout(() => {
      rotation = 0; slide();
    }, rotationLeft);
  }
  function render() {
    clearTimeout(timer); timer = 0;
    if (!button) return;
    const visible = lastVisible = isVisible();
    if (!visible) { gesture = false; settleSlide(); digitSlots.forEach(({ticker}) => ticker.settle()); }
    attribute(button, 'tabindex', visible ? 0 : -1); attribute(shell, 'aria-hidden', !visible);
    const remaining = Math.max(0, Math.ceil((time(config.deadline) - Date.now()) / 1000)) || 0;
    mode = signatureState ? 'signature' : remaining ? 'countdown' : 'rest';
    attribute(button, 'data-mode', mode);
    attribute(button, 'data-rotation', signatureOnly ? 'static' : manual ? 'manual' : 'auto');
    const signatureHeading = (preview ? 'Preview · ' : '') + config.signature;
    const smileHeading = (preview ? 'Preview · ' : '') + (remaining ? config.title : config.bookedTitle);
    panels.forEach(panel => {
      const signature = panel.dataset.message === 'signature';
      const current = panel === swiper.slides[swiper.activeIndex];
      attribute(panel, 'aria-hidden', !current);
      setText(panel.querySelector('.tdb-announcement-title'), signature ? signatureHeading : smileHeading);
      if (signature) {
        const action = panel.querySelector('.tdb-announcement-slot');
        setText(action, slotText());
        attribute(action, 'data-live', dataState === 'ready' && time(config.nextSlot) > Date.now());
        attribute(action, 'data-pulse', visible && current && !moving);
      } else {
        const counters = panel.querySelector('.tdb-announcement-countdown');
        const action = panel.querySelector('[data-announcement-action]');
        setText(action, config.rest); counters.hidden = !remaining; action.hidden = Boolean(remaining);
      }
    });
    const label = signatureState ? signatureHeading + '. ' + slotText() : smileHeading + '. ' + (remaining ? slotText(config.deadline) : config.rest);
    attribute(button, 'aria-label', label + '. Open VIP appointments');
    if (remaining) {
      const values = [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60];
      const formatted = values.map(n => String(n).padStart(2, '0'));
      digitSlots.forEach(({node, ticker}) => ticker.update(formatted[+node.dataset.countdownUnit], -1,
        Boolean(last && visible && !moving && node.closest('[data-message]') === swiper.slides[swiper.activeIndex])));
      last = formatted.join(':');
    }
    if (visible) {
      const untilSlot = time(config.nextSlot) - Date.now();
      if (mode === 'countdown') timer = setTimeout(render, 1000 - Date.now() % 1000 + 10);
      else if (signatureState && untilSlot > 0) timer = setTimeout(render, Math.min(untilSlot + 10, 2147483647));
    }
    if (!visible || interacting || gesture || manual) pauseRotation();
    else if (!rotation && !moving) rotate();
  }
  function openDrawer(event) {
    event.preventDefault(); event.stopPropagation();
    if (performance.now() < suppressClickUntil) return;
    // Opening is idempotent and waits for a cold drawer on either screen size.
    // Clicking the drawer's hidden toggle can lose the first mobile intent.
    const api = window.TDBVIPDrawer || window.TDBVIPDrawerDesktop;
    if (api?.open) api.open();
    else if (window.TDBVIPDrawerLoader?.load) window.TDBVIPDrawerLoader.load().then(api => api?.open?.()).catch(() => {});
    else document.querySelector('#tdb-vip-drawer .tdb-vip-drawer-handle')?.click();
  }
  function bindSwiping() {
    // Swiper owns horizontal gestures. Keep CTA activation protection here.
    window.addEventListener('pointerdown', event => {
      openedTouch = null; suppressClickUntil = 0;
      pressPoint = button.contains(event.target) ? {x:event.clientX,y:event.clientY} : null;
    }, true);
    window.addEventListener('click', event => {
      // The CTA also contains padding outside Swiper. A drag there is not a click.
      if (event.detail > 0 && pressPoint && Math.hypot(event.clientX - pressPoint.x, event.clientY - pressPoint.y) > 10)
        suppressClickUntil = performance.now() + 600;
      if (performance.now() >= suppressClickUntil) return;
      const sameTouch = openedTouch && event.detail > 0 &&
        Math.abs(event.clientX - openedTouch.x) < 4 && Math.abs(event.clientY - openedTouch.y) < 4;
      if (!button.contains(event.target) && !sameTouch) return;
      openedTouch = null; event.preventDefault(); event.stopImmediatePropagation();
    }, true);
    swiper.on('touchStart', () => { gesture = true; pauseRotation(); render(); });
    swiper.on('sliderFirstMove', () => { manual = true; pauseRotation(); });
    swiper.on('touchEnd', () => { gesture = false; queueMicrotask(render); });
    ['touchcancel','pointercancel'].forEach(type => button.addEventListener(type, () => { gesture = false; render(); }));
    swiper.on('tap', (_swiper, event) => {
      if (!isVisible()) return;
      if (event.type.startsWith('touch') || event.pointerType === 'touch' || event.pointerType === 'pen') {
        const point = event.changedTouches?.[0] || event;
        openedTouch = {x:point.clientX,y:point.clientY};
        suppressClickUntil = 0; openDrawer(event); suppressClickUntil = performance.now() + 600;
      }
    });
    button.addEventListener('click', event => {
      if (!swiper.allowClick) { event.preventDefault(); return; }
      openDrawer(event);
    });
    button.addEventListener('keydown', event => {
      if (event.key === ' ') { openDrawer(event); return; }
      if (!['ArrowLeft','ArrowRight'].includes(event.key) || moving || gesture) return;
      event.preventDefault(); manual = true; slide(event.key === 'ArrowLeft' ? -1 : 1);
    });
  }
  async function loadSettings() {
    if (dataLoading || suspended || dataAttempts >= 3) return;
    clearTimeout(dataRetry); dataRetry = 0;
    dataRequested = dataLoading = true; dataState = 'loading'; dataAttempts++;
    const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 4000);
    try {
      const response = await fetch('/banner-settings/' + (preview ? 'preview' : 'active'), {signal:abort.signal, credentials:'omit'});
      if (!response.ok) throw new Error('http');
      const html = await response.text();
      // Parse only inert field nodes; never insert or execute the fetched page.
      const values = html.match(/<div[^>]*data-banner-field="[^"]+"[^>]*>[^<]*<\/div>/g);
      const candidate = new DOMParser().parseFromString(values?.join('') || '', 'text/html').body;
      const fields = ['slug','smile-release-time','smile-release-uk-time','next-signature-slot','next-signature-uk-time','smile-countdown-text','smile-waitlist-text','smile-booked-title','signature-heading','signature-availability-text'];
      if (fields.some(name => candidate.querySelectorAll('[data-banner-field="' + name + '"]').length !== 1) ||
          candidate.querySelector('[data-banner-field="slug"]').textContent.trim() !== (preview ? 'preview' : 'active')) throw new Error('fields');
      for (const [date, clock] of [['smile-release-time','smile-release-uk-time'],['next-signature-slot','next-signature-uk-time']]) {
        const d = candidate.querySelector('[data-banner-field="' + date + '"]').textContent.trim();
        const c = candidate.querySelector('[data-banner-field="' + clock + '"]').textContent.trim();
        if ((d || c) && !ukDate(d, c)) throw new Error('date');
      }
      row = candidate; config = {...readConfig(), ...overrides}; labels.clear(); dataState = 'ready';
    } catch (_) {
      dataState = 'unavailable';
      // A network error is not evidence that appointments are available or fully booked.
      config = {...defaults, deadline:null, nextSlot:null, bookedTitle:'Smile Design', rest:'Join The Dental Barns VIP', action:'Enquire about appointments', ...overrides};
      if (dataAttempts < 2) dataRetry = setTimeout(loadSettings, 750);
      else console.warn('TDB banner: settings unavailable; waiting for connection recovery.');
    } finally {
      clearTimeout(timeout); dataLoading = false;
      if (started) render(); else start();
    }
  }
  function start() {
    if (started || dataLoading || !active || !shell) return;
    if (!row && !dataRequested && typeof fetch === 'function') { loadSettings(); return; }
    started = true;
    events.forEach(name => window.removeEventListener(name, consentReady));
    button = shell.querySelector('.tdb-announcement');
    const viewport = shell.querySelector('.tdb-announcement-viewport');
    track = shell.querySelector('.tdb-announcement-track');
    progress = shell.querySelector('.tdb-announcement-progress');
    if (signatureOnly) shell.querySelector('[data-message="smile"]')?.remove();
    // Avoid generic .swiper selectors: this announcement must not enter gallery focus mode.
    swiper = window.TDBSwiper.create(viewport, {
      wrapperClass:'tdb-announcement-track', slideClass:'tdb-announcement-panel',
      slidesPerView:1, loop:!signatureOnly, speed:reduceMotion() ? 0 : window.TDBMotion.defaults.base,
      threshold:10, touchAngle:45, touchStartPreventDefault:true,
      // A deliberate desktop drag should not require crossing half the wide banner.
      longSwipesRatio:Math.min(.15, 40 / Math.max(1, viewport.clientWidth)),
      allowTouchMove:!signatureOnly, a11y:false, keyboard:false, autoplay:false,
      on: {
        resize(instance) { instance.params.longSwipesRatio = Math.min(.15, 40 / Math.max(1, instance.width)); },
        beforeTransitionStart() { pauseRotation(); rotationLeft = dwell; moving = true; if (swiper) render(); },
        slideChange(instance) { signatureState = instance.realIndex === 0; },
        transitionEnd() { moving = false; render(); },
      }
    }, {bind:false});
    panels = [...track.querySelectorAll('[data-message]')];
    digitSlots = [...track.querySelectorAll('[data-countdown-unit]')].map(node => ({node,
      ticker:window.TDBNativeTicker.mount(node, {valueClass:'tdb-announcement-ticker-value',incomingClass:'tdb-announcement-ticker-incoming'})}));
    bindSwiping();
    shell.addEventListener('mouseenter', () => { hovered = interacting = true; render(); });
    shell.addEventListener('mouseleave', () => { hovered = false; interacting = shell.contains(document.activeElement); render(); });
    shell.addEventListener('focusin', () => { interacting = true; render(); });
    shell.addEventListener('focusout', event => { if (!shell.contains(event.relatedTarget)) { interacting = hovered; render(); } });
    const observer = new MutationObserver(() => { if (isVisible() !== lastVisible) render(); }); observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    const drawer = document.getElementById('tdb-vip-drawer'); if (drawer) observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', render); window.addEventListener('pageshow', () => { suspended = false; render(); recover(); });
    window.addEventListener('pagehide', () => { suspended = true; clearTimeout(dataRetry); dataRetry = 0; clearTimeout(timer); timer = 0; pauseRotation(); gesture = false; settleSlide(); digitSlots.forEach(({ticker}) => ticker.settle()); });
    render();
    function reveal() {
      if (getComputedStyle(root).getPropertyValue('--tdb-ui-ready').trim() !== '1') return;
      document.removeEventListener('load', onStyleLoad, true); shell.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => { shell.removeAttribute('data-tdb-announcement-pending'); render(); }));
    }
    // Run after the stylesheet's own onload switches media from print to all.
    function onStyleLoad() { requestAnimationFrame(reveal); }
    setTimeout(() => {
      document.addEventListener('load', onStyleLoad, true);
      if (window.TDBFeatureCSS?.ui) window.TDBFeatureCSS.ui().then(reveal).catch(() => console.warn('TDB banner: shared styles unavailable.'));
      else reveal();
    }, 500);
  }
  function recover() {
    if (active && dataState === 'unavailable') loadSettings();
  }
  window.addEventListener('online', recover);

  function consentReady(event) {
    if (event?.type !== 'CookieScriptLoaded' || decisionExists()) active = true;
    start();
  }
  const api = Object.freeze({
    version:'2.0.1',
    configure(next) { overrides = {...overrides,...next}; config = {...config,...next}; labels.clear(); mode = last = ''; render(); },
    status:() => ({version:'2.0.1',mounted:started,mode,deadline:config.deadline,ticking:Boolean(timer),rotating:Boolean(rotation),cms:Boolean(row),settings:dataState,settingsAttempts:dataAttempts,preview,manual,visible:lastVisible,reducedMotion:reduced.matches,swiper:Boolean(swiper),tickers:digitSlots.length})
  });
  active = decisionExists();
  if (active) start(); else events.forEach(name => window.addEventListener(name, consentReady));
  return api;
  }
  window.TDBSwiper.register('announcement', {mount:createAnnouncement});
  window.TDBAnnouncement = Object.freeze({
    version:'2.0.1',
    mount(target) {
      if (instances.has(target)) return instances.get(target);
      const instance = window.TDBSwiper.mount('announcement',target); instances.set(target,instance); return instance;
    },
    configure(next) { instances.forEach(instance => instance.configure(next)); },
    status:() => [...instances.values()].map(instance => instance.status())[0] || {version:'2.0.1',mounted:false}
  });
})();

/* TDB Announcement 2.1.0: native Designer markup, shared Swiper/motion/tickers. */
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
  const availability = window.TDBAvailability, channel = preview ? 'preview' : 'active';
  const initial = availability.seed(document, channel);
  let row = initial.data, unsubscribe = null;
  const defaults = initial.data || {
    deadline:null,nextSlot:null,title:'Smile Design · Appointments released in',rest:'Join The Dental Barns VIP',
    bookedTitle:'Smile Design',signature:'Signature Assessment ✦ Next appointment',action:'Enquire about appointments'
  };
  let overrides = { ...window.TDBAnnouncementConfig };
  let config = { ...defaults, ...overrides }, dataRequested = false, dataLoading = false, dataAttempts = 0, dataRetry = 0, dataState = row ? 'ready' : 'idle';
  const signatureOnly = target.dataset.announcementMode === 'signature' || /^\/services\/(?:signature-assessment|fast-track)\/?$/.test(location.pathname);
  let shell = target, button, track, progress, swiper;
  let panels = [], digitSlots = [];

  let timer = 0, rotation = 0, active = false, started = false, mode = '', last = '';
  let signatureState = true, interacting = false, hovered = false, moving = false, suspended = false, lastVisible = false;
  const dwell = 8000;
  let rotationLeft = dwell, rotationEnd = 0, ringAnimation = null;
  let manual = false, gesture = false, suppressClickUntil = 0, openedTouch = null, pressPoint = null;
  const events = ['CookieScriptLoaded', 'CookieScriptAccept', 'CookieScriptAcceptAll', 'CookieScriptReject', 'CookieScriptClose'];
  const reduced = window.TDBMotion.reduced;
  const reduceMotion = () => reduced.matches;
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
      !shell.closest('[inert]') && !root.matches('.tdb-timer-hidden,.tdb-slider-focus,.tdb-sg-chrome-away,.tdb-sg-locked') &&
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
    ringAnimation?.cancel(); ringAnimation = null;
    progress.style.strokeDashoffset = String(rotationLeft / dwell);
  }
  function rotate() {
    if (signatureOnly || manual || gesture || interacting || moving || !isVisible()) return;
    ringAnimation?.cancel(); ringAnimation = null;
    progress.style.strokeDashoffset = String(rotationLeft / dwell);
    if (progress.animate) ringAnimation = progress.animate([
      {strokeDashoffset:String(rotationLeft / dwell)}, {strokeDashoffset:'0'}
    ], {duration:rotationLeft,easing:'linear',fill:'forwards'});
    rotationEnd = performance.now() + rotationLeft;
    rotation = setTimeout(() => {
      rotation = 0; ringAnimation?.cancel(); ringAnimation = null; progress.style.strokeDashoffset = '0'; slide();
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
    // Shared opening retains the source for focus restoration and a real fallback.
    if (window.TDBVIPDrawerLoader?.open) window.TDBVIPDrawerLoader.open(button);
    else location.assign(button.href);
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
  function applySettings(snapshot) {
    dataState = snapshot.state;
    if (snapshot.state === 'ready' && snapshot.data) {
      row = snapshot.data; config = {...snapshot.data, ...overrides}; labels.clear();
    } else if (snapshot.state === 'unavailable') {
      config = {...defaults,deadline:null,nextSlot:null,bookedTitle:'Smile Design',rest:'Join The Dental Barns VIP',action:'Enquire about appointments',...overrides};
    }
    if (started) render();
  }
  async function loadSettings() {
    if (dataLoading || suspended) return;
    clearTimeout(dataRetry); dataRetry = 0;
    dataRequested = dataLoading = true; dataAttempts++;
    try { applySettings(await availability.read({slug:channel})); }
    catch (_) { if (dataAttempts < 2) dataRetry = setTimeout(loadSettings,750); }
    finally { dataLoading=false; if (started) render(); else start(); }
  }
  function start() {
    if (started || dataLoading || !active || !shell) return;
    if (!unsubscribe) unsubscribe = availability.subscribe(applySettings,{slug:channel});
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
    const observer = new MutationObserver(() => { if (isVisible() !== lastVisible) render(); }); observer.observe(root, { attributes: true, attributeFilter: ['class','inert'] });
    for (let node=shell;node && node!==root;node=node.parentElement) observer.observe(node, {attributes:true,attributeFilter:['inert','hidden']});
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
    document.addEventListener('load', onStyleLoad, true);
    if (window.TDBFeatureCSS?.ui) window.TDBFeatureCSS.ui().then(reveal).catch(() => console.warn('TDB banner: shared styles unavailable.'));
    else reveal();
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
    version:'2.1.0',
    configure(next) { overrides = {...overrides,...next}; config = {...config,...next}; labels.clear(); mode = last = ''; render(); },
    status:() => ({version:'2.1.0',mounted:started,mode,deadline:config.deadline,ticking:Boolean(timer),rotating:Boolean(rotation),cms:Boolean(row),settings:dataState,settingsAttempts:dataAttempts,preview,manual,visible:lastVisible,reducedMotion:reduced.matches,swiper:Boolean(swiper),tickers:digitSlots.length})
  });
  active = decisionExists();
  if (active) start(); else events.forEach(name => window.addEventListener(name, consentReady));
  return api;
  }
  window.TDBSwiper.register('announcement', {mount:createAnnouncement});
  window.TDBAnnouncement = Object.freeze({
    version:'2.1.0',
    mount(target) {
      if (instances.has(target)) return instances.get(target);
      const instance = window.TDBSwiper.mount('announcement',target); instances.set(target,instance); return instance;
    },
    configure(next) { instances.forEach(instance => instance.configure(next)); },
    status:() => [...instances.values()].map(instance => instance.status())[0] || {version:'2.1.0',mounted:false}
  });
})();

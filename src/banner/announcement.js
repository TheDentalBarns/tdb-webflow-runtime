/* TDB Announcement 1.6.0. Shares existing shell/consent/drawer controllers.
 * Uses published CMS text; shares consent, shell motion and drawer routing.
 */
(() => {
  'use strict';
  if (window.TDBAnnouncement) return;
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
  let shell, button, track, progress, smilePanel, signaturePanel, smileTitle, signatureTitle, smileAction, signatureAction, counters;
  const digits = [];
  let timer = 0, rotation = 0, slideTimer = 0, active = false, started = false, mode = '', last = '';
  let signatureState = signatureOnly, interacting = false, hovered = false, moving = false, suspended = false, lastVisible = false;
  const dwell = 8000;
  let rotationLeft = dwell, rotationEnd = 0;
  let manual = false, gesture = null, slideDirection = -1, suppressClickUntil = 0;
  let slideAnimation = null;
  const events = ['CookieScriptLoaded', 'CookieScriptAccept', 'CookieScriptAcceptAll', 'CookieScriptReject', 'CookieScriptClose'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const CSS = `
#tdb-elfsight-timer-shell[hidden]{display:none!important}
#tdb-elfsight-timer-shell[data-tdb-announcement-pending]{visibility:hidden!important;transform:translate3d(0,-100%,0)!important;opacity:0!important;pointer-events:none!important;transition:none!important}
html.tdb-slider-focus #tdb-elfsight-timer-shell,html.tdb-sg-chrome-away #tdb-elfsight-timer-shell,html.tdb-sg-locked #tdb-elfsight-timer-shell{transform:translate3d(0,-100%,0)!important;opacity:1!important;visibility:hidden!important;pointer-events:none!important;transition:transform 420ms cubic-bezier(.4,0,.2,1),visibility 0s 420ms!important}
.tdb-announcement{width:100%;height:6rem;min-height:6rem;box-sizing:border-box;margin:0;padding-block:0;border:0;border-radius:0;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--base-color-brand--black,#000);color:var(--base-color-brand--orange-1,#f9f2e6);font:inherit;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
.tdb-announcement:focus-visible{outline:1px solid currentColor;outline-offset:-6px}
.tdb-announcement{touch-action:pan-y pinch-zoom;user-select:none}
.tdb-announcement::before{content:"";width:3rem;flex:0 0 3rem}
.tdb-announcement-viewport{display:block;flex:1;min-width:0;overflow:hidden}
.tdb-announcement-track{display:flex;align-items:center;width:100%;transform:translateX(0)}
.tdb-announcement-panel{display:grid;flex:0 0 100%;min-width:0;grid-template-rows:20px 36px;gap:4px}
.tdb-announcement-title{display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:400;line-height:20px;opacity:.7}
.tdb-announcement-lower{display:flex;align-items:flex-start;justify-content:center;min-width:0;font-size:18px;line-height:24px;font-weight:400;font-variant-numeric:tabular-nums}
.tdb-announcement-circle{position:relative;display:flex;align-items:center;justify-content:center;width:3rem;height:3rem;flex:0 0 3rem;border-radius:50%;box-sizing:border-box;color:var(--base-color-brand--orange-3,#d6cab4)}
.tdb-announcement-circle .tdb-announcement-dial{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1;transform:rotate(-90deg)}
.tdb-announcement-dial circle:first-child{opacity:.3}
.tdb-announcement-progress{opacity:.65;stroke-dasharray:1;stroke-dashoffset:1}
.tdb-announcement[data-rotation="manual"] .tdb-announcement-progress,.tdb-announcement[data-rotation="static"] .tdb-announcement-progress{visibility:hidden}
.tdb-announcement-circle .tdb-announcement-arrow{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.25}
.tdb-announcement [hidden]{display:none!important}
.tdb-announcement-countdown{display:flex;align-items:flex-start;gap:8px}
.tdb-announcement-unit{display:flex;flex-direction:column;align-items:center;gap:2px}
.tdb-announcement-value{display:flex;justify-content:center;min-width:2.1em;padding:1px 4px;border:1px solid color-mix(in srgb,currentColor 28%,transparent);border-radius:3px;font-size:16px;line-height:20px;font-weight:500;font-variant-numeric:tabular-nums;overflow:hidden}
.tdb-announcement-digit{display:inline-block;min-width:1ch}
.tdb-announcement-digit.is-changing{animation:tdb-announcement-number 280ms cubic-bezier(.2,.6,.3,1)}
.tdb-announcement-unit small{font-size:.5rem;line-height:10px;font-weight:400;opacity:.7}
@keyframes tdb-announcement-number{from{transform:translateY(-.16em);opacity:.35}to{transform:translateY(0);opacity:1}}
@media(max-width:640px){.tdb-announcement{gap:8px}.tdb-announcement-panel{grid-template-rows:32px 32px;gap:3px}.tdb-announcement-title{font-size:12px;line-height:16px}.tdb-announcement-lower{font-size:14px;line-height:22px}.tdb-announcement-countdown{gap:5px}.tdb-announcement-value{font-size:13px;line-height:18px;padding:1px 3px}.tdb-announcement-unit small{line-height:8px}}
@media(prefers-reduced-motion:reduce){.tdb-announcement-digit.is-changing{animation:none}.tdb-announcement-track{transition:none!important}}
`;
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
  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
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
    if (!moving) return;
    clearTimeout(slideTimer); slideTimer = 0;
    const animation = slideAnimation; slideAnimation = null;
    if (animation) { animation.onfinish = animation.oncancel = null; animation.cancel(); }
    if (slideDirection < 0) track.append(track.firstElementChild);
    track.style.transition = 'none'; track.style.transform = 'translateX(0)';
    moving = false; signatureState = !signatureState;
    render();
  }
  function slide(direction = -1, prepared = false) {
    if (moving || signatureOnly) return;
    pauseRotation(); slideDirection = direction;
    if (direction > 0 && !prepared) {
      track.prepend(track.lastElementChild);
      track.style.transition = 'none'; track.style.transform = 'translateX(-100%)';
    }
    const from = track.style.transform || 'translateX(0)';
    moving = true; rotationLeft = dwell; render();
    if (reduced.matches) { settleSlide(); return; }
    const target = direction < 0 ? 'translateX(-100%)' : 'translateX(0)';
    // Let the browser's animation completion own settlement, including under load.
    if (typeof track.animate === 'function') {
      track.style.transition = 'none';
      try {
        slideAnimation = track.animate([{transform:from},{transform:target}],{duration:400,easing:'ease',fill:'forwards'});
        slideAnimation.onfinish = slideAnimation.oncancel = settleSlide;
        track.style.transform = target;
        return;
      } catch (_) { slideAnimation = null; } // CSS path also supports an unavailable animation API.
    }
    track.getBoundingClientRect();
    track.style.transition = 'transform 400ms ease';
    track.style.transform = target;
    slideTimer = setTimeout(settleSlide, 450);
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
    if (!visible && gesture) cancelGesture();
    if (!visible && moving) { settleSlide(); return; }
    attribute(button, 'tabindex', visible ? 0 : -1); attribute(shell, 'aria-hidden', !visible);
    const remaining = Math.max(0, Math.ceil((time(config.deadline) - Date.now()) / 1000)) || 0;
    mode = signatureState ? 'signature' : remaining ? 'countdown' : 'rest';
    attribute(button, 'data-mode', mode);
    attribute(button, 'data-rotation', signatureOnly ? 'static' : manual ? 'manual' : 'auto');
    attribute(smilePanel, 'aria-hidden', signatureState);
    attribute(signaturePanel, 'aria-hidden', !signatureState);
    setText(smileTitle, (preview ? 'Preview · ' : '') + (remaining ? config.title : config.bookedTitle));
    setText(signatureTitle, (preview ? 'Preview · ' : '') + config.signature);
    setText(smileAction, config.rest); setText(signatureAction, slotText());
    if (counters.hidden !== !remaining) counters.hidden = !remaining;
    if (smileAction.hidden !== Boolean(remaining)) smileAction.hidden = Boolean(remaining);
    const label = signatureState ? signatureTitle.textContent + '. ' + signatureAction.textContent : smileTitle.textContent + '. ' + (remaining ? slotText(config.deadline) : config.rest);
    attribute(button, 'aria-label', label + '. Open VIP appointments');
    if (remaining) {
      const values = [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60];
      const formatted = values.map(n => String(n).padStart(2, '0'));
      formatted.forEach((value, i) => {
        const box = digits[i];
        if (box.children.length !== value.length) {
          box.replaceChildren(...[...value].map(n => element('span', 'tdb-announcement-digit', n))); return;
        }
        [...box.children].forEach((digit, j) => {
          if (digit.textContent === value[j]) return;
          digit.textContent = value[j];
          if (last && visible && !signatureState && !reduced.matches) digit.classList.add('is-changing');
        });
      });
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
    if (matchMedia('(max-width:767px)').matches) document.querySelector('#tdb-vip-drawer .tdb-vip-drawer-handle')?.click();
    else if (window.TDBVIPDrawerDesktop?.open) window.TDBVIPDrawerDesktop.open();
    else window.TDBVIPDrawerLoader?.load?.().then(api => api?.open?.()).catch(() => {});
  }
  function cancelGesture() {
    if (!gesture) return;
    const previous = gesture; gesture = null;
    if (previous.dragging) {
      if (previous.direction > 0) track.append(track.firstElementChild);
      track.style.transition = 'none'; track.style.transform = 'translateX(0)';
      suppressClickUntil = performance.now() + 600;
    }
    if (button.hasPointerCapture?.(previous.id)) button.releasePointerCapture(previous.id);
  }
  function bindSwiping() {
    if (signatureOnly) return;
    button.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || moving || !isVisible()) return;
      // A new deliberate tap remains an ordinary drawer action after a previous swipe.
      suppressClickUntil = 0;
      gesture = {id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,dragging:false};
      button.setPointerCapture?.(event.pointerId);
      pauseRotation();
    });
    button.addEventListener('pointermove', event => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.max(Math.abs(dx),Math.abs(dy)) < 10) return;
        if (Math.abs(dy) >= Math.abs(dx)) { cancelGesture(); render(); return; }
        gesture.dragging = true; gesture.direction = dx < 0 ? -1 : 1;
        gesture.width = track.getBoundingClientRect().width;
        if (gesture.direction > 0) track.prepend(track.lastElementChild);
        track.style.transition = 'none'; button.setPointerCapture?.(event.pointerId);
      }
      gesture.dx = gesture.direction < 0 ? Math.max(-gesture.width,Math.min(0,dx)) : Math.min(gesture.width,Math.max(0,dx));
      // Direct finger movement remains responsive even when decorative motion is reduced.
      track.style.transform = 'translateX(' + (gesture.dx - (gesture.direction > 0 ? gesture.width : 0)) + 'px)';
    });
    button.addEventListener('pointerup', event => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const previous = gesture;
      if (!previous.dragging || Math.abs(previous.dx) < Math.min(40,previous.width * .15)) { cancelGesture(); render(); return; }
      gesture = null; manual = true; pauseRotation();
      suppressClickUntil = performance.now() + 600;
      if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
      slide(previous.direction,true);
    });
    const cancel = event => { if (gesture?.id === event.pointerId) { cancelGesture(); render(); } };
    button.addEventListener('pointercancel', cancel);
    button.addEventListener('lostpointercapture', event => {
      // A child's implicit touch capture can be handed to this button. Its bubbling
      // loss event must not cancel the new owner's gesture.
      if (event.target === button) cancel(event);
    });
    button.addEventListener('pointerleave', event => { if (gesture && !gesture.dragging) cancel(event); });
    button.addEventListener('keydown', event => {
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
    const style = element('style', ''); style.dataset.tdbAnnouncement = '1.6.0'; style.textContent = CSS;
    document.head.append(style);
    button = element('button', 'tdb-announcement padding-global'); button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'tdb-vip-drawer');
    const viewport = element('span', 'tdb-announcement-viewport'); track = element('span', 'tdb-announcement-track');
    smilePanel = element('span', 'tdb-announcement-panel'); smilePanel.dataset.message = 'smile';
    signaturePanel = element('span', 'tdb-announcement-panel'); signaturePanel.dataset.message = 'signature';
    smileTitle = element('span', 'tdb-announcement-title'); signatureTitle = element('span', 'tdb-announcement-title');
    const smileLower = element('span', 'tdb-announcement-lower');
    smileAction = element('span', 'tdb-announcement-action'); signatureAction = element('span', 'tdb-announcement-lower');
    counters = element('span', 'tdb-announcement-countdown'); counters.setAttribute('aria-hidden', 'true');
    ['Days', 'Hours', 'Minutes', 'Seconds'].forEach(label => {
      const unit = element('span', 'tdb-announcement-unit'), value = element('span', 'tdb-announcement-value');
      digits.push(value); unit.append(value, element('small', '', label)); counters.append(unit);
    });
    smileLower.append(counters, smileAction); smilePanel.append(smileTitle, smileLower); signaturePanel.append(signatureTitle, signatureAction);
    if (!signatureOnly) track.append(smilePanel); track.append(signaturePanel); viewport.append(track);
    const circle = element('span', 'tdb-announcement-circle'); circle.setAttribute('aria-hidden', 'true');
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); arrow.setAttribute('viewBox', '0 0 16 16');
    arrow.setAttribute('class', 'tdb-announcement-arrow');
    arrow.innerHTML = '<path d="M3 6l5-4 5 4M8 2v12"/>'; circle.append(arrow);
    const dial = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); dial.setAttribute('viewBox', '0 0 44 44');
    dial.setAttribute('class', 'tdb-announcement-dial');
    dial.innerHTML = '<circle cx="22" cy="22" r="21.5"/><circle class="tdb-announcement-progress" cx="22" cy="22" r="21.5" pathLength="1"/>';
    progress = dial.lastElementChild; circle.append(dial); button.append(viewport, circle);
    button.addEventListener('click', openDrawer);
    bindSwiping();
    button.addEventListener('animationend', event => event.target.classList.remove('is-changing'));
    track.addEventListener('transitionend', event => { if (event.target === track && event.propertyName === 'transform') settleSlide(); });
    shell.setAttribute('data-tdb-announcement-pending', ''); shell.append(button);
    shell.addEventListener('mouseenter', () => { hovered = interacting = true; render(); });
    shell.addEventListener('mouseleave', () => { hovered = false; interacting = shell.contains(document.activeElement); render(); });
    shell.addEventListener('focusin', () => { interacting = true; render(); });
    shell.addEventListener('focusout', event => { if (!shell.contains(event.relatedTarget)) { interacting = hovered; render(); } });
    const observer = new MutationObserver(() => { if (isVisible() !== lastVisible) render(); }); observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    const drawer = document.getElementById('tdb-vip-drawer'); if (drawer) observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', render); window.addEventListener('pageshow', () => { suspended = false; render(); recover(); });
    window.addEventListener('pagehide', () => { suspended = true; clearTimeout(dataRetry); dataRetry = 0; clearTimeout(timer); timer = 0; pauseRotation(); cancelGesture(); if (moving) settleSlide(); });
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
  window.TDBAnnouncement = Object.freeze({
    version: '1.6.0',
    mount(target) {
      if (shell) return;
      shell = target; shell.hidden = true; active = decisionExists();
      if (active) start(); else events.forEach(name => window.addEventListener(name, consentReady));
    },
    configure(next) { overrides = { ...overrides, ...next }; config = { ...config, ...next }; labels.clear(); mode = last = ''; render(); },
    status: () => ({ version: '1.6.0', mounted: started, mode, deadline: config.deadline, ticking: Boolean(timer), cms: Boolean(row), settings:dataState, settingsAttempts:dataAttempts, preview, manual, reducedMotion:reduced.matches })
  });
})();

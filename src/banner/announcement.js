/* TDB Announcement 1.3.0. Shares existing shell/consent/drawer controllers.
 * Uses published CMS text; shares consent, shell motion and drawer routing.
 */
(() => {
  'use strict';
  if (window.TDBAnnouncement) return;
  const root = document.documentElement;
  const preview = location.hostname === 'dentalbarns.webflow.io' && new URLSearchParams(location.search).has('banner-preview');
  let row = [...document.querySelectorAll('[data-tdb-banner-item]')].find(el => (el.getAttribute('data-tdb-banner-item') || el.querySelector('[data-banner-field="slug"]')?.textContent.trim()) === (preview ? 'preview' : 'active'));
  const field = name => row?.querySelector('[data-banner-field="' + name + '"]')?.textContent.trim() || '';
  const defaults = {
    deadline: ukDate(field('smile-release-time'), field('smile-release-uk-time')),
    nextSlot: ukDate(field('next-signature-slot'), field('next-signature-uk-time')),
    title: field('smile-countdown-text') || 'Smile Design · Appointments released in',
    rest: field('smile-waitlist-text') || 'Join the waitlist',
    bookedTitle: field('smile-booked-title') || 'Smile Design · Fully booked',
    signature: field('signature-heading') || 'Signature Assessment ✦ Next appointment',
    action: field('signature-availability-text') || 'Appointments available'
  };
  let overrides = { ...window.TDBAnnouncementConfig };
  let config = { ...defaults, ...overrides }, dataRequested = false, dataLoading = false;
  const signatureOnly = /^\/services\/fast-track\/?$/.test(location.pathname);
  let shell, button, track, smilePanel, signaturePanel, smileTitle, signatureTitle, smileAction, signatureAction, counters;
  const digits = [];
  let timer = 0, rotation = 0, slideTimer = 0, active = false, started = false, mode = '', last = '';
  let signatureState = signatureOnly, interacting = false, moving = false, suspended = false;
  const events = ['CookieScriptLoaded', 'CookieScriptAccept', 'CookieScriptAcceptAll', 'CookieScriptReject', 'CookieScriptClose'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const CSS = `
#tdb-elfsight-timer-shell[hidden]{display:none!important}
#tdb-elfsight-timer-shell[data-tdb-announcement-pending]{visibility:hidden!important;transform:translate3d(0,-100%,0)!important;opacity:0!important;pointer-events:none!important;transition:none!important}
html.tdb-slider-focus #tdb-elfsight-timer-shell,html.tdb-sg-chrome-away #tdb-elfsight-timer-shell,html.tdb-sg-locked #tdb-elfsight-timer-shell{transform:translate3d(0,-100%,0)!important;opacity:1!important;visibility:hidden!important;pointer-events:none!important;transition:transform 420ms cubic-bezier(.4,0,.2,1),visibility 0s 420ms!important}
.tdb-announcement{width:100%;height:6rem;min-height:6rem;box-sizing:border-box;margin:0;padding-block:0;border:0;border-radius:0;display:flex;align-items:center;justify-content:center;gap:12px;background:var(--base-color-brand--black,#000);color:var(--base-color-brand--orange-1,#f9f2e6);font:inherit;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
.tdb-announcement:focus-visible{outline:1px solid currentColor;outline-offset:-6px}
.tdb-announcement::before{content:"";width:36px;flex:0 0 36px}
.tdb-announcement-viewport{display:block;flex:1;min-width:0;overflow:hidden}
.tdb-announcement-track{display:flex;align-items:center;width:100%;transform:translateX(0)}
.tdb-announcement-panel{display:grid;flex:0 0 100%;min-width:0;grid-template-rows:20px 36px;gap:4px}
.tdb-announcement-title{display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:400;line-height:20px;opacity:.7}
.tdb-announcement-lower{display:flex;align-items:flex-start;justify-content:center;min-width:0;font-size:18px;line-height:24px;font-weight:400;font-variant-numeric:tabular-nums}
.tdb-announcement-circle{display:flex;align-items:center;justify-content:center;width:36px;height:36px;flex:0 0 36px;border:1px solid color-mix(in srgb,currentColor 35%,transparent);border-radius:50%;box-sizing:border-box}
.tdb-announcement-circle svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.25}
.tdb-announcement [hidden]{display:none!important}
.tdb-announcement-countdown{display:flex;align-items:flex-start;gap:8px}
.tdb-announcement-unit{display:flex;flex-direction:column;align-items:center;gap:2px}
.tdb-announcement-value{display:flex;justify-content:center;min-width:2.1em;padding:1px 4px;border:1px solid color-mix(in srgb,currentColor 28%,transparent);border-radius:3px;font-size:16px;line-height:20px;font-weight:500;font-variant-numeric:tabular-nums;overflow:hidden}
.tdb-announcement-digit{display:inline-block;min-width:1ch}
.tdb-announcement-digit.is-changing{animation:tdb-announcement-number 280ms cubic-bezier(.2,.6,.3,1)}
.tdb-announcement-unit small{font-size:.5rem;line-height:10px;font-weight:400;opacity:.7}
@keyframes tdb-announcement-number{from{transform:translateY(-.16em);opacity:.35}to{transform:translateY(0);opacity:1}}
@media(max-width:640px){.tdb-announcement{gap:8px}.tdb-announcement::before{width:32px;flex-basis:32px}.tdb-announcement-circle{width:32px;height:32px;flex-basis:32px}.tdb-announcement-panel{grid-template-rows:32px 32px;gap:3px}.tdb-announcement-title{font-size:12px;line-height:16px}.tdb-announcement-lower{font-size:14px;line-height:22px}.tdb-announcement-countdown{gap:5px}.tdb-announcement-value{font-size:13px;line-height:18px;padding:1px 3px}.tdb-announcement-unit small{line-height:8px}}
@media(prefers-reduced-motion:reduce){.tdb-announcement-digit.is-changing{animation:none}.tdb-announcement-track{transition:none!important}}
`;
  function ukDate(date, clock) {
    // Webflow publishes date text without its time. Keep an explicit, editable UK clock field.
    if (!date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) return null;
    const day = Date.parse(date + ' 00:00:00 GMT');
    if (!Number.isFinite(day)) return null;
    const [hour, minute] = clock.split(':').map(Number);
    const wall = day + (hour * 60 + minute) * 60000;
    const parts = value => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(value).map(p => [p.type,p.value]));
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
    const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short' }).format(date);
    const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
    return day + ' · ' + clock;
  }

  function settleSlide() {
    if (!moving) return;
    clearTimeout(slideTimer); slideTimer = 0;
    track.append(track.firstElementChild);
    track.style.transition = 'none'; track.style.transform = 'translateX(0)';
    moving = false; signatureState = !signatureState;
    render();
  }
  function rotate() {
    clearTimeout(rotation); rotation = 0;
    if (signatureOnly || interacting || moving || !isVisible()) return;
    rotation = setTimeout(() => {
      rotation = 0; moving = true; render();
      if (reduced.matches) { settleSlide(); return; }
      // Same 400ms transform travel as the existing Swiper controls, with no opacity fade.
      track.style.transition = 'transform 400ms ease'; track.style.transform = 'translateX(-100%)';
      slideTimer = setTimeout(settleSlide, 450);
    }, 8000);
  }
  function render() {
    clearTimeout(timer); timer = 0;
    if (!button) return;
    const visible = isVisible();
    if (!visible && moving) { settleSlide(); return; }
    button.tabIndex = visible ? 0 : -1; shell.setAttribute('aria-hidden', String(!visible));
    const remaining = Math.max(0, Math.ceil((time(config.deadline) - Date.now()) / 1000)) || 0;
    mode = signatureState ? 'signature' : remaining ? 'countdown' : 'rest';
    button.dataset.mode = mode;
    smilePanel.setAttribute('aria-hidden', String(signatureState));
    signaturePanel.setAttribute('aria-hidden', String(!signatureState));
    setText(smileTitle, (preview ? 'Preview · ' : '') + (remaining ? config.title : config.bookedTitle));
    setText(signatureTitle, (preview ? 'Preview · ' : '') + config.signature);
    setText(smileAction, config.rest); setText(signatureAction, slotText());
    counters.hidden = !remaining; smileAction.hidden = Boolean(remaining);
    const label = signatureState ? signatureTitle.textContent + '. ' + signatureAction.textContent : smileTitle.textContent + '. ' + (remaining ? slotText(config.deadline) : config.rest);
    button.setAttribute('aria-label', label + '. Open VIP appointments');
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
    if (!visible || interacting) { clearTimeout(rotation); rotation = 0; }
    else if (!rotation && !moving) rotate();
  }
  function openDrawer(event) {
    event.preventDefault(); event.stopPropagation();
    if (matchMedia('(max-width:767px)').matches) document.querySelector('#tdb-vip-drawer .tdb-vip-drawer-handle')?.click();
    else if (window.TDBVIPDrawerDesktop?.open) window.TDBVIPDrawerDesktop.open();
    else window.TDBVIPDrawerLoader?.load?.().then(api => api?.open?.()).catch(() => {});
  }
  function start() {
    if (started || dataLoading || !active || !shell) return;
    if (!row && !dataRequested && typeof fetch === 'function') {
      dataRequested = dataLoading = true;
      const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 4000);
      fetch('/banner-settings/' + (preview ? 'preview' : 'active'), {signal:abort.signal, credentials:'omit'})
        .then(response => { if (!response.ok) throw new Error('Banner settings unavailable'); return response.text(); })
        .then(html => {
          // Parse only our inert value nodes. Never insert the page or execute its scripts.
          const values = html.match(/<div[^>]*data-banner-field="[^"]+"[^>]*>[^<]*<\/div>/g);
          if (!values?.length) return;
          row = new DOMParser().parseFromString(values.join(''), 'text/html').body;
          config = { ...defaults,
            deadline:ukDate(field('smile-release-time'),field('smile-release-uk-time')),
            nextSlot:ukDate(field('next-signature-slot'),field('next-signature-uk-time')),
            title:field('smile-countdown-text') || defaults.title,
            rest:field('smile-waitlist-text') || defaults.rest,
            bookedTitle:field('smile-booked-title') || defaults.bookedTitle,
            signature:field('signature-heading') || defaults.signature,
            action:field('signature-availability-text') || defaults.action, ...overrides };
        }).catch(() => {}).finally(() => { clearTimeout(timeout); dataLoading = false; start(); });
      return;
    }
    started = true;
    events.forEach(name => window.removeEventListener(name, consentReady));
    const style = element('style', ''); style.dataset.tdbAnnouncement = '1.3.0'; style.textContent = CSS;
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
    arrow.innerHTML = '<path d="M3 6l5-4 5 4M8 2v12"/>'; circle.append(arrow); button.append(viewport, circle);
    button.addEventListener('click', openDrawer);
    button.addEventListener('animationend', event => event.target.classList.remove('is-changing'));
    track.addEventListener('transitionend', event => { if (event.target === track && event.propertyName === 'transform') settleSlide(); });
    shell.setAttribute('data-tdb-announcement-pending', ''); shell.append(button);
    shell.addEventListener('mouseenter', () => { interacting = true; render(); });
    shell.addEventListener('mouseleave', () => { interacting = shell.contains(document.activeElement); render(); });
    shell.addEventListener('focusin', () => { interacting = true; render(); });
    shell.addEventListener('focusout', event => { if (!shell.contains(event.relatedTarget)) { interacting = false; render(); } });
    const observer = new MutationObserver(render); observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    const drawer = document.getElementById('tdb-vip-drawer'); if (drawer) observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', render); window.addEventListener('pageshow', () => { suspended = false; render(); });
    window.addEventListener('pagehide', () => { suspended = true; clearTimeout(timer); clearTimeout(rotation); timer = rotation = 0; if (moving) settleSlide(); });
    render();
    function reveal() {
      if (getComputedStyle(root).getPropertyValue('--tdb-ui-ready').trim() !== '1') return;
      document.removeEventListener('load', reveal, true); shell.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => { shell.removeAttribute('data-tdb-announcement-pending'); render(); }));
    }
    setTimeout(() => { document.addEventListener('load', reveal, true); reveal(); }, 500);
  }
  function consentReady(event) {
    if (event?.type !== 'CookieScriptLoaded' || decisionExists()) active = true;
    start();
  }
  window.TDBAnnouncement = Object.freeze({
    version: '1.3.0',
    mount(target) {
      if (shell) return;
      shell = target; shell.hidden = true; active = decisionExists();
      if (active) start(); else events.forEach(name => window.addEventListener(name, consentReady));
    },
    configure(next) { overrides = { ...overrides, ...next }; config = { ...config, ...next }; mode = last = ''; render(); },
    status: () => ({ version: '1.3.0', mounted: started, mode, deadline: config.deadline, ticking: Boolean(timer), cms: Boolean(row), preview })
  });
})();

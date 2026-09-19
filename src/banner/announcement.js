/* TDB Announcement 1.2.0. Shares existing shell/consent/drawer controllers.
 * CMS values are published in the shared footer: no API, font or vendor requests.
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
    title: field('smile-countdown-text') || 'Smile Design appointments released in',
    rest: field('smile-waitlist-text') || 'Smile Design is fully booked · Join the waitlist',
    signature: field('signature-heading') || 'Signature Assessment',
    action: field('signature-availability-text') || 'Appointments available'
  };
  let overrides = { ...window.TDBAnnouncementConfig };
  let config = { ...defaults, ...overrides }, dataRequested = false, dataLoading = false;
  const signatureOnly = /^\/services\/fast-track\/?$/.test(location.pathname);
  let shell, button, title, rest, action, counters, counterLine, pauseButton;
  const digits = [];
  let timer = 0, rotation = 0, active = false, started = false, mode = '', last = '';
  let signatureState = signatureOnly, paused = false, interacting = false;
  const events = ['CookieScriptLoaded', 'CookieScriptAccept', 'CookieScriptAcceptAll', 'CookieScriptReject', 'CookieScriptClose'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const CSS = `
#tdb-elfsight-timer-shell[hidden]{display:none!important}
#tdb-elfsight-timer-shell[data-tdb-announcement-pending]{visibility:hidden!important;transform:translate3d(0,-100%,0)!important;opacity:0!important;pointer-events:none!important;transition:none!important}
html.tdb-slider-focus #tdb-elfsight-timer-shell,html.tdb-sg-chrome-away #tdb-elfsight-timer-shell,html.tdb-sg-locked #tdb-elfsight-timer-shell{transform:translate3d(0,-100%,0)!important;opacity:1!important;visibility:hidden!important;pointer-events:none!important;transition:transform 420ms cubic-bezier(.4,0,.2,1),visibility 0s 420ms!important}
.tdb-announcement-pause{position:absolute;z-index:1;right:0;top:50%;transform:translateY(-50%);width:44px;height:44px;padding:0;touch-action:manipulation;border:0;background:transparent;color:var(--base-color-brand--orange-1,#f9f2e6);font:inherit;font-size:10px;line-height:16px;opacity:.65;cursor:pointer}
.tdb-announcement.is-switching>span{animation:tdb-announcement-message 420ms ease both}
@keyframes tdb-announcement-message{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}
.tdb-announcement{width:100%;min-height:6rem;box-sizing:border-box;margin:0;padding-block:0;border:0;border-radius:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;background:var(--base-color-brand--black,#000);color:var(--base-color-brand--orange-1,#f9f2e6);font:inherit;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
.tdb-announcement:focus-visible{outline:1px solid currentColor;outline-offset:-6px}
.tdb-announcement-copy{display:flex;flex-direction:column;align-items:center;gap:3px;line-height:24px}
.tdb-announcement-action{font-size:18px;font-weight:400;line-height:24px}.tdb-announcement-title{font-size:14px;font-weight:400;line-height:20px;opacity:.7}
.tdb-announcement-rest{font-size:14px;line-height:20px;opacity:.7}
.tdb-announcement-action svg,.tdb-announcement-timerline>svg{width:.8em;height:.8em;margin-left:.55em;vertical-align:baseline;stroke:currentColor;fill:none;stroke-width:1.25}
.tdb-announcement [hidden]{display:none!important}
.tdb-announcement-timerline{display:flex;align-items:center;gap:8px}.tdb-announcement-timerline>svg{width:14px;height:14px;margin:0}.tdb-announcement-countdown{display:flex;gap:12px;flex-shrink:0;margin-top:4px}
.tdb-announcement-unit{display:flex;flex-direction:column;align-items:center;gap:2px}
.tdb-announcement-value{display:flex;justify-content:center;min-width:2.5em;padding:3px 5px;border:1px solid currentColor;border-color:color-mix(in srgb,currentColor 28%,transparent);border-radius:3px;font-size:18px;font-weight:500;line-height:20px;font-variant-numeric:tabular-nums;overflow:hidden}
.tdb-announcement-digit{display:inline-block;min-width:1ch}
.tdb-announcement-digit.is-changing{animation:tdb-announcement-number 280ms cubic-bezier(.2,.6,.3,1)}
.tdb-announcement-unit small{font-size:.5rem;line-height:13px;font-weight:400;opacity:.7}
@keyframes tdb-announcement-number{from{transform:translateY(-.16em);opacity:.35}to{transform:translateY(0);opacity:1}}
@media(max-width:640px){.tdb-announcement-title,.tdb-announcement-action{font-size:14px;line-height:20px}.tdb-announcement-rest{font-size:12px;line-height:18px}}
@media(max-width:480px){.tdb-announcement-title{font-size:12px;line-height:16px}.tdb-announcement{flex-direction:column;gap:4px}.tdb-announcement-countdown{gap:4px;margin:0}.tdb-announcement-value{font-size:13px;line-height:16px}.tdb-announcement-copy{gap:2px}}
@media(prefers-reduced-motion:reduce){.tdb-announcement-digit.is-changing,.tdb-announcement.is-switching>span{animation:none}}
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
  function isVisible() {
    return !document.hidden && !shell.hidden && !shell.hasAttribute('data-tdb-announcement-pending') &&
      !root.matches('.tdb-timer-hidden,.tdb-slider-focus,.tdb-sg-chrome-away,.tdb-sg-locked') &&
      !document.querySelector('#tdb-vip-drawer.is-open,#tdb-vip-drawer.is-closing');
  }
  function time(value) {
    return typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
  }
  function slotText() {
    const date = time(config.nextSlot);
    if (!(date > Date.now())) return config.action;
    const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short' }).format(date);
    const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
    return day + ' · ' + clock;
  }
  function rotate() {
    clearTimeout(rotation); rotation = 0;
    if (signatureOnly || paused || interacting || !isVisible()) return;
    rotation = setTimeout(() => {
      rotation = 0; signatureState = !signatureState;
      if (!reduced.matches) button.classList.add('is-switching');
      render();
    }, 8000);
  }
  function render() {
    clearTimeout(timer); timer = 0;
    if (!button) return;
    const visible = isVisible();
    button.tabIndex = visible ? 0 : -1;
    pauseButton.tabIndex = visible && !signatureOnly ? 0 : -1;
    shell.setAttribute('aria-hidden', String(!visible));
    const remaining = Math.max(0, Math.ceil((time(config.deadline) - Date.now()) / 1000)) || 0;
    const nextMode = signatureState ? 'signature' : remaining ? 'countdown' : 'rest';
    if (mode !== nextMode) {
      mode = nextMode; button.dataset.mode = mode;
      title.hidden = mode !== 'countdown';
      rest.hidden = mode === 'countdown';
      action.hidden = mode === 'countdown';
      counterLine.hidden = mode !== 'countdown';
    }
    title.textContent = (preview ? 'Preview · ' : '') + config.title;
    rest.textContent = (preview ? 'Preview · ' : '') + (signatureState ? config.signature + ' ✦' + (time(config.nextSlot) > Date.now() ? ' · Next appointment' : '') : 'Smile Design · Fully booked');
    action.firstChild.textContent = signatureState ? slotText() : config.rest.replace(/^Smile Design (?:is )?fully booked\s*[·—-]?\s*/i, '') || 'Join the waitlist';
    button.setAttribute('aria-label', mode === 'countdown' ? title.textContent + '. Open VIP appointments' : rest.textContent + '. ' + action.textContent + '. Open VIP appointments');
    if (mode === 'countdown') {
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
          if (last && visible && !reduced.matches) digit.classList.add('is-changing');
        });
      });
      last = formatted.join(':');
    }
    if (visible) {
      const untilSlot = time(config.nextSlot) - Date.now();
      if (mode === 'countdown') timer = setTimeout(render, 1000 - Date.now() % 1000 + 10);
      else if (signatureState && untilSlot > 0) timer = setTimeout(render, Math.min(untilSlot + 10, 2147483647));
    }
    // Repeated digit updates must not restart the eight-second message interval.
    if (!visible || paused || interacting) { clearTimeout(rotation); rotation = 0; }
    else if (!rotation) rotate();
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
            signature:field('signature-heading') || defaults.signature,
            action:field('signature-availability-text') || defaults.action, ...overrides };
        }).catch(() => {}).finally(() => { clearTimeout(timeout); dataLoading = false; start(); });
      return;
    }
    started = true;
    events.forEach(name => window.removeEventListener(name, consentReady));
    const style = element('style', ''); style.dataset.tdbAnnouncement = '1.2.0'; style.textContent = CSS;
    document.head.append(style);
    button = element('button', 'tdb-announcement padding-global'); button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'tdb-vip-drawer');
    const copy = element('span', 'tdb-announcement-copy');
    title = element('span', 'tdb-announcement-title'); rest = element('span', 'tdb-announcement-rest'); action = element('span', 'tdb-announcement-action');
    action.append(document.createTextNode(''));
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('viewBox', '0 0 16 16'); arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = '<path d="M3 6l5-4 5 4M8 2v12"/>'; action.append(arrow); copy.append(title, rest, action);
    counters = element('span', 'tdb-announcement-countdown'); counters.setAttribute('aria-hidden', 'true');
    ['Days', 'Hours', 'Minutes', 'Seconds'].forEach(label => {
      const unit = element('span', 'tdb-announcement-unit'), value = element('span', 'tdb-announcement-value');
      digits.push(value); unit.append(value, element('small', '', label)); counters.append(unit);
    });
    counterLine = element('span', 'tdb-announcement-timerline'); counterLine.append(counters, arrow.cloneNode(true)); button.append(copy, counterLine); button.addEventListener('click', openDrawer);
    button.addEventListener('animationend', event => { event.target.classList.remove('is-changing'); if (event.animationName === 'tdb-announcement-message') button.classList.remove('is-switching'); });
    pauseButton = element('button', 'tdb-announcement-pause', 'Ⅱ'); pauseButton.type = 'button'; pauseButton.hidden = signatureOnly;
    pauseButton.setAttribute('aria-label', 'Pause banner messages'); pauseButton.setAttribute('aria-pressed', 'false');
    pauseButton.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      paused = !paused; if (!paused) interacting = false; pauseButton.textContent = paused ? '▷' : 'Ⅱ';
      pauseButton.setAttribute('aria-label', paused ? 'Resume banner messages' : 'Pause banner messages');
      pauseButton.setAttribute('aria-pressed', String(paused)); render();
    });
    shell.setAttribute('data-tdb-announcement-pending', ''); shell.append(button, pauseButton);
    shell.addEventListener('mouseenter', () => { interacting = true; render(); });
    shell.addEventListener('mouseleave', () => { interacting = shell.contains(document.activeElement); render(); });
    shell.addEventListener('focusin', () => { interacting = true; render(); });
    shell.addEventListener('focusout', event => { if (!shell.contains(event.relatedTarget)) { interacting = false; render(); } });
    const observer = new MutationObserver(render); observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    const drawer = document.getElementById('tdb-vip-drawer'); if (drawer) observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', render); window.addEventListener('pageshow', render);
    window.addEventListener('pagehide', () => { clearTimeout(timer); clearTimeout(rotation); timer = rotation = 0; });
    render();
    // Shared CSS is deferred. Never paint an unpositioned shell while it is arriving.
    function reveal() {
      if (getComputedStyle(root).getPropertyValue('--tdb-ui-ready').trim() !== '1') return;
      document.removeEventListener('load', reveal, true);
      shell.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => { shell.removeAttribute('data-tdb-announcement-pending'); render(); }));
    }
    setTimeout(() => { document.addEventListener('load', reveal, true); reveal(); }, 500);
  }
  function consentReady(event) {
    if (event?.type !== 'CookieScriptLoaded' || decisionExists()) active = true;
    start();
  }
  window.TDBAnnouncement = Object.freeze({
    version: '1.2.0',
    mount(target) {
      if (shell) return;
      shell = target; shell.hidden = true;
      active = decisionExists();
      if (active) start(); else events.forEach(name => window.addEventListener(name, consentReady));
    },
    configure(next) { overrides = { ...overrides, ...next }; config = { ...config, ...next }; mode = last = ''; render(); },
    status: () => ({ version: '1.2.0', mounted: started, mode, deadline: config.deadline, ticking: Boolean(timer), cms: Boolean(row), preview })
  });
})();

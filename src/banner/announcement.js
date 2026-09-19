/* TDB Announcement 1.0.0. Mounted by the existing footer timer-shell controller.
 * The shared shell owns scroll, navigation and overlay motion. No vendor loader.
 * No deadline is guessed: null retains the currently published rest state.
 */
(() => {
  'use strict';
  if (window.TDBAnnouncement) return;
  const defaults = {
    deadline: null,
    title: 'September VIP Smile Consultations',
    rest: 'Smile Design is currently fully booked',
    action: 'Signature Assessment ✦ appointments available'
  };
  let config = { ...defaults, ...window.TDBAnnouncementConfig };
  let shell, button, copy, title, rest, action, counters, digits = [], timer = 0;
  let active = false, started = false, mode = '', last = '';
  const root = document.documentElement;
  const events = ['CookieScriptLoaded', 'CookieScriptAccept', 'CookieScriptAcceptAll', 'CookieScriptReject', 'CookieScriptClose'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const CSS = `
.tdb-elfsight-shell[data-tdb-announcement-pending]{transform:translate3d(0,-100%,0);opacity:0;pointer-events:none}
.tdb-announcement{width:100%;min-height:6rem;box-sizing:border-box;margin:0;padding:0 calc(24px + 5%);border:0;border-radius:0;display:flex;align-items:center;justify-content:center;gap:20px;background:var(--base-color-brand--black,#000);color:var(--base-color-brand--orange-1,#f9f2e6);font:inherit;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
.tdb-announcement:focus-visible{outline:1px solid currentColor;outline-offset:-6px}
.tdb-announcement-copy{display:flex;flex-direction:column;align-items:center;gap:3px;line-height:24px}
.tdb-announcement-title,.tdb-announcement-action{font-size:18px;font-weight:400;line-height:24px}
.tdb-announcement-rest{font-size:14px;line-height:20px;opacity:.7}
.tdb-announcement-action svg{width:.8em;height:.8em;margin-left:.55em;vertical-align:baseline;stroke:currentColor;fill:none;stroke-width:1.25}
.tdb-announcement [hidden]{display:none!important}
.tdb-announcement-countdown{display:flex;gap:12px;flex-shrink:0;margin-top:4px}
.tdb-announcement-unit{display:flex;flex-direction:column;align-items:center;gap:2px}
.tdb-announcement-value{display:flex;justify-content:center;min-width:2.5em;padding:3px 5px;border:1px solid currentColor;border-color:color-mix(in srgb,currentColor 28%,transparent);border-radius:3px;font-size:18px;font-weight:500;line-height:20px;font-variant-numeric:tabular-nums;overflow:hidden}
.tdb-announcement-digit{display:inline-block;min-width:1ch}
.tdb-announcement-digit.is-changing{animation:tdb-announcement-number 280ms cubic-bezier(.2,.6,.3,1)}
.tdb-announcement-unit small{font-size:.5rem;line-height:13px;font-weight:400;opacity:.7}
@keyframes tdb-announcement-number{from{transform:translateY(-.16em);opacity:.35}to{transform:translateY(0);opacity:1}}
@media(max-width:640px){.tdb-announcement-title,.tdb-announcement-action{font-size:14px;line-height:20px}.tdb-announcement-rest{font-size:12px;line-height:18px}}
@media(max-width:480px){.tdb-announcement{flex-direction:column;gap:4px}.tdb-announcement-countdown{gap:4px;margin:0}.tdb-announcement-value{font-size:13px;line-height:16px}.tdb-announcement-copy{gap:2px}}
@media(prefers-reduced-motion:reduce){.tdb-announcement-digit.is-changing{animation:none}}
`;

  function decisionExists() {
    if (window.TDBConsent?.status?.().elfsight) return true;
    const row = document.cookie.split('; ').find(x => x.startsWith('CookieScriptConsent='));
    if (!row) return false;
    try { return /"action"|"a":|accept|reject|close/.test(decodeURIComponent(row)); }
    catch (_) { return false; }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function isVisible() {
    return !document.hidden && !shell.hasAttribute('data-tdb-announcement-pending') && !root.classList.contains('tdb-timer-hidden') &&
      !document.querySelector('#tdb-vip-drawer.is-open,#tdb-vip-drawer.is-closing');
  }

  function deadlineTime() {
    // Require an explicit timezone; browser-local dates would disagree between visitors.
    return typeof config.deadline === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(config.deadline)
      ? Date.parse(config.deadline) : NaN;
  }

  function render() {
    clearTimeout(timer);
    timer = 0;
    if (!button) return;
    const visible = isVisible();
    button.tabIndex = visible ? 0 : -1;
    button.setAttribute('aria-hidden', String(!visible));
    const remaining = Math.max(0, Math.ceil((deadlineTime() - Date.now()) / 1000)) || 0;
    const nextMode = remaining ? 'countdown' : 'rest';
    if (mode !== nextMode) {
      mode = nextMode;
      button.dataset.mode = mode;
      title.hidden = !remaining;
      rest.hidden = action.hidden = Boolean(remaining);
      counters.hidden = !remaining;
      button.setAttribute('aria-label', remaining ? config.title + '. Open VIP appointments' : config.rest + '. ' + config.action + '. Open VIP appointments');
    }
    if (!remaining) return;
    const values = [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60];
    const formatted = values.map(n => String(n).padStart(2, '0'));
    formatted.forEach((value, i) => {
      const box = digits[i];
      if (box.children.length !== value.length) {
        box.replaceChildren(...[...value].map(n => element('span', 'tdb-announcement-digit', n)));
        return;
      }
      [...box.children].forEach((digit, j) => {
        if (digit.textContent === value[j]) return;
        digit.textContent = value[j];
        if (last && visible && !reduced.matches) digit.classList.add('is-changing');
      });
    });
    last = formatted.join(':');
    if (visible) timer = setTimeout(render, 1000 - (Date.now() % 1000) + 10);
  }

  function updateCopy() {
    if (!button) return;
    title.textContent = config.title;
    rest.textContent = config.rest;
    action.firstChild.textContent = config.action;
    mode = last = '';
    render();
  }

  function openDrawer(event) {
    event.preventDefault();
    event.stopPropagation();
    if (matchMedia('(max-width:767px)').matches) {
      document.querySelector('#tdb-vip-drawer .tdb-vip-drawer-handle')?.click();
    } else if (window.TDBVIPDrawerDesktop?.open) {
      window.TDBVIPDrawerDesktop.open();
    } else {
      window.TDBVIPDrawerLoader?.load?.().then(api => api?.open?.()).catch(() => {});
    }
  }

  function start() {
    if (started || !active || !shell) return;
    started = true;
    events.forEach(name => window.removeEventListener(name, consentReady));
    const style = element('style', '');
    style.dataset.tdbAnnouncement = '1.0.0';
    style.textContent = CSS;
    document.head.append(style);
    button = element('button', 'tdb-announcement');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'tdb-vip-drawer');
    copy = element('span', 'tdb-announcement-copy');
    title = element('span', 'tdb-announcement-title');
    rest = element('span', 'tdb-announcement-rest');
    action = element('span', 'tdb-announcement-action');
    action.append(document.createTextNode(''));
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('viewBox', '0 0 16 16');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = '<path d="M3 6l5-4 5 4M8 2v12"/>';
    action.append(arrow);
    copy.append(title, rest, action);
    counters = element('span', 'tdb-announcement-countdown');
    counters.setAttribute('aria-hidden', 'true');
    ['Days', 'Hours', 'Minutes', 'Seconds'].forEach(label => {
      const unit = element('span', 'tdb-announcement-unit');
      const value = element('span', 'tdb-announcement-value');
      digits.push(value);
      unit.append(value, element('small', '', label));
      counters.append(unit);
    });
    button.append(copy, counters);
    button.addEventListener('click', openDrawer);
    button.addEventListener('animationend', event => event.target.classList.remove('is-changing'));
    shell.setAttribute('data-tdb-announcement-pending', '');
    shell.append(button);
    const observer = new MutationObserver(render);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    const drawer = document.getElementById('tdb-vip-drawer');
    if (drawer) observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', render);
    window.addEventListener('pageshow', render);
    window.addEventListener('pagehide', () => { clearTimeout(timer); timer = 0; });
    updateCopy();
    setTimeout(() => { shell.removeAttribute('data-tdb-announcement-pending'); render(); }, 500);
  }

  function consentReady(event) {
    if (event?.type !== 'CookieScriptLoaded' || decisionExists()) active = true;
    start();
  }

  window.TDBAnnouncement = Object.freeze({
    version: '1.0.0',
    mount(target) {
      if (shell) return;
      shell = target;
      active = decisionExists();
      if (active) start();
      else events.forEach(name => window.addEventListener(name, consentReady));
    },
    configure(next) { config = { ...config, ...next }; updateCopy(); },
    status: () => ({ version: '1.0.0', mounted: started, mode, deadline: config.deadline, ticking: Boolean(timer) })
  });
})();

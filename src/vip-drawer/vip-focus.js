/* TDB VIP keyboard/focus layer v1.0.0.
 * Bundled before site-asset-loader in tdb-footer-runtime.min.js. Reads the
 * existing drawer classes without replacing loading or interaction ownership. */
(() => {
  'use strict';
  const drawer = document.getElementById('tdb-vip-drawer');
  const body = drawer?.querySelector('.tdb-vip-drawer-body');
  const handle = drawer?.querySelector('.tdb-vip-drawer-handle');
  if (!drawer || !body || !handle || drawer.dataset.tdbVipFocusBound === 'true') return;
  drawer.dataset.tdbVipFocusBound = 'true';
  const original = new Map(['role', 'aria-modal', 'aria-label', 'tabindex'].map(name => [name, drawer.getAttribute(name)]));
  const background = new Map();
  const selector = 'a[href],area[href],button,input:not([type="hidden"]),select,textarea,iframe,[tabindex],[contenteditable="true"]';
  let active = false;
  let origin = null;
  let latestTrigger = null;
  let restoring = 0;

  const isFocusable = element => element instanceof HTMLElement &&
    element.tabIndex >= 0 && !element.matches(':disabled') &&
    !element.closest('[inert],[hidden]') && element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden';
  const controls = () => Array.from(drawer.querySelectorAll(selector)).filter(isFocusable);
  const nestedConsentOpen = () => Boolean(document.querySelector('#tdb-consent-root.tdb-consent-active'));
  const focus = element => { try { element?.focus({ preventScroll: true }); } catch (_) {} };
  const preferredFocus = () => isFocusable(handle) ? handle : controls()[0] || drawer;
  const trigger = target => target instanceof Element && target.closest('a[href*="#vip" i],[data-vip-open],[data-vip-target],#tdb-vip-drawer .tdb-vip-drawer-handle');

  function rememberTrigger(event) {
    const candidate = trigger(event.target);
    if (candidate && !drawer.contains(candidate)) latestTrigger = candidate;
  }
  document.addEventListener('pointerdown', rememberTrigger, true);
  document.addEventListener('click', rememberTrigger, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') rememberTrigger(event);
  }, true);

  function lockBackground() {
    for (let node = drawer; node && node !== document.body; node = node.parentElement) {
      const parent = node.parentElement;
      if (!parent) break;
      for (const sibling of parent.children) {
        // Cookie settings is a separate, higher dialog with its own focus trap.
        if (sibling === node || sibling.id === 'tdb-consent-root' || ['SCRIPT','STYLE','LINK'].includes(sibling.tagName)) continue;
        if (!background.has(sibling)) background.set(sibling, sibling.hasAttribute('inert'));
        sibling.setAttribute('inert', '');
      }
    }
  }
  function unlockBackground() {
    for (const [node, wasInert] of background) if (!wasInert) node.removeAttribute('inert');
    background.clear();
  }
  function restoreAttributes() {
    for (const [name, value] of original) {
      if (value === null) drawer.removeAttribute(name); else drawer.setAttribute(name, value);
    }
  }
  function endModal() {
    active = false;
    unlockBackground();
    restoreAttributes();
    const candidate = origin;
    origin = null;
    latestTrigger = null;
    cancelAnimationFrame(restoring);
    restoring = requestAnimationFrame(() => {
      restoring = 0;
      if (active || nestedConsentOpen()) return;
      if (candidate?.isConnected && !drawer.contains(candidate) && isFocusable(candidate)) focus(candidate);
      else {
        const fallback = Array.from(document.querySelectorAll('a[href*="#vip" i],[data-vip-open],[data-vip-target]'))
          .find(node => !drawer.contains(node) && isFocusable(node));
        focus(fallback);
      }
    });
  }
  function sync() {
    const open = drawer.classList.contains('is-open');
    const closing = drawer.classList.contains('is-closing');
    const peek = drawer.classList.contains('is-peeking');
    const modal = open || (active && closing);
    if (modal) {
      drawer.removeAttribute('inert');
      drawer.removeAttribute('aria-hidden');
      body.removeAttribute('inert');
      body.removeAttribute('aria-hidden');
      if (!active) {
        cancelAnimationFrame(restoring);
        restoring = 0;
        const focused = document.activeElement;
        origin = latestTrigger?.isConnected ? latestTrigger : focused instanceof HTMLElement && !drawer.contains(focused) ? focused : null;
        active = true;
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');
        drawer.setAttribute('aria-label', 'VIP waitlist');
        drawer.setAttribute('tabindex', '-1');
        lockBackground();
        if (!nestedConsentOpen()) focus(preferredFocus());
      }
    } else {
      if (active) endModal();
      body.setAttribute('inert', '');
      body.setAttribute('aria-hidden', 'true');
      if (peek) {
        drawer.removeAttribute('inert');
        drawer.removeAttribute('aria-hidden');
      } else {
        drawer.setAttribute('inert', '');
        drawer.setAttribute('aria-hidden', 'true');
      }
    }
  }
  document.addEventListener('keydown', event => {
    if (!active || nestedConsentOpen() || event.key !== 'Tab') return;
    const available = controls();
    if (!available.length) { event.preventDefault(); focus(drawer); return; }
    const index = available.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); focus(available.at(-1)); }
    else if (!event.shiftKey && (index < 0 || index === available.length - 1)) { event.preventDefault(); focus(available[0]); }
    // Escape remains wholly owned by TDBVIPDrawer.
  }, true);
  document.addEventListener('focusin', event => {
    if (!active || nestedConsentOpen() || drawer.contains(event.target)) return;
    focus(preferredFocus());
  }, true);
  document.addEventListener('CookieScriptCurrentState', () => {
    if (active && !nestedConsentOpen() && !drawer.contains(document.activeElement)) focus(preferredFocus());
  });
  new MutationObserver(sync).observe(drawer, { attributes: true, attributeFilter: ['class'] });
  sync();
})();

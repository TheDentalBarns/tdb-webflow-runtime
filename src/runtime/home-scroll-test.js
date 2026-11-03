/* Explicit staging-only phone diagnostic. Nothing is sent to a server.
 * Normal visits install no observers, wrappers, storage or test UI.
 */
function createHomeScrollTest() {
  'use strict';
  if (
    !['dentalbarns.webflow.io', '127.0.0.1', 'localhost'].includes(location.hostname) ||
    new URLSearchParams(location.search).get('tdb-scroll-test') !== '1' ||
    !document.querySelector('[data-tdb-smile-placeholder="home"]')
  )
    return null;
  const key = 'tdb-home-scroll-test-v1',
    lifecycle = new AbortController(),
    { signal } = lifecycle,
    originalScroll = window.scrollTo,
    originalIntoView = Element.prototype.scrollIntoView,
    originalFocus = HTMLElement.prototype.focus;
  let previous = null;
  try {
    previous = JSON.parse(sessionStorage.getItem(key));
  } catch (_) {}
  const report = {
    loads: (Number(previous?.loads) || 0) + 1,
    navigation: performance.getEntriesByType?.('navigation')[0]?.type || 'unknown',
    previousTopReturn: previous?.topReturn || null,
    topReturn: null,
  };
  let y = window.scrollY,
    height = document.documentElement.scrollHeight;
  const commands = [];
  const targetName = (node) =>
    node instanceof Element ? node.tagName + (node.id ? '#' + node.id : '.' + node.className) : '';
  function record(kind, target) {
    commands.push({
      kind,
      target: targetName(target),
      at: performance.now(),
      stack: new Error().stack?.split('\n').slice(2, 6).join('\n'),
    });
    if (commands.length > 6) commands.shift();
  }
  function scrollTo(...args) {
    record('scrollTo');
    return originalScroll.apply(this, args);
  }
  function scrollIntoView(...args) {
    record('scrollIntoView', this);
    return originalIntoView.apply(this, args);
  }
  function focus(...args) {
    record(args[0]?.preventScroll ? 'focus(preventScroll)' : 'focus', this);
    return originalFocus.apply(this, args);
  }
  window.scrollTo = scrollTo;
  if (originalIntoView) Element.prototype.scrollIntoView = scrollIntoView;
  HTMLElement.prototype.focus = focus;

  const panel = document.createElement('aside'),
    status = document.createElement('div'),
    copy = document.createElement('button');
  panel.className = 'tdb-scroll-test';
  panel.setAttribute('aria-label', 'Staging scroll test');
  copy.type = 'button';
  copy.textContent = 'Copy test result';
  panel.append(status, copy);
  document.body.append(panel);
  function save() {
    try {
      sessionStorage.setItem(key, JSON.stringify(report));
    } catch (_) {}
  }
  function render() {
    const jump = report.topReturn;
    status.textContent = `Scroll test · page load ${report.loads}\n${
      jump
        ? `Top return: ${jump.from}px → ${jump.to}px\n${jump.commands.length ? jump.commands.map((c) => c.kind).join(', ') : 'No recent script scroll/focus call'}`
        : 'Waiting for a return to the top'
    }`;
    save();
  }
  copy.addEventListener(
    'click',
    async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
        copy.textContent = 'Copied';
      } catch (_) {
        copy.textContent = 'Please note the readout above';
      }
    },
    { signal },
  );
  // Record arrivals, without trying to override or "correct" the user's scroll.
  // Fast intentional trips to the top are also recorded; the user identifies
  // the unexpected one. Only that arrival reads layout or writes session data.
  window.addEventListener(
    'scroll',
    () => {
      const next = window.scrollY;
      if (next <= 4 && y > 80) {
        const currentHeight = document.documentElement.scrollHeight;
        report.topReturn = {
          from: Math.round(y),
          to: Math.round(next),
          documentHeight: [height, currentHeight],
          commands: commands.filter((c) => performance.now() - c.at < 1200),
          focused: targetName(document.activeElement),
          scrollLocked: document.documentElement.classList.contains('tdb-scroll-locked'),
          vipOpen:
            document.querySelector('#tdb-vip-drawer')?.classList.contains('is-open') || false,
        };
        height = currentHeight;
        render();
      }
      y = next;
    },
    { signal, passive: true },
  );
  window.addEventListener('pagehide', save, { signal });
  render();
  return {
    destroy() {
      lifecycle.abort();
      if (window.scrollTo === scrollTo) window.scrollTo = originalScroll;
      if (Element.prototype.scrollIntoView === scrollIntoView)
        Element.prototype.scrollIntoView = originalIntoView;
      if (HTMLElement.prototype.focus === focus) HTMLElement.prototype.focus = originalFocus;
      panel.remove();
    },
  };
}

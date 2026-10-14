/* Form readiness starts with the consent-released runtime. */
function prepareFormsLoader() {
  const formSelector = 'form';
  const excluded = '#vip-drawer-form';
  const vipIntent = 'a[href*="#vip" i], [href*="#vip" i], [data-vip-open]';
  const observed = new WeakSet();
  let loadingPromise = null;
  let loaded = false;
  let proximityObserver = null;
  let discoveryObserver = null;

  function cleanup() {
    proximityObserver?.disconnect();
    discoveryObserver?.disconnect();
    document.removeEventListener('focusin', onIntent, true);
    document.removeEventListener('pointerdown', onIntent, true);
    document.removeEventListener('keydown', onIntent, true);
    document.removeEventListener('submit', onIntent, true);
  }
  function loadForms() {
    if (loadingPromise) return loadingPromise;
    loadingPromise = loadScriptWithRecovery('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.1.0/dist/tdb-forms.min.js', 'data-tdb-forms-js')
      .then(script => { loaded = true; cleanup(); return script; })
      .catch(error => { loadingPromise = null; console.error('TDB Forms failed to load'); throw error; });
    return loadingPromise;
  }
  const loadSafely = () => { loadForms().catch(() => {}); };
  function onIntent(event) {
    const target = event.target;
    if (target instanceof Element && (target.closest(formSelector) || target.closest(vipIntent))) loadSafely();
  }
  function observeForm(form) {
    if (!(form instanceof HTMLFormElement) || observed.has(form) || form.matches(excluded)) return;
    observed.add(form);
    if (!proximityObserver) loadSafely();
    else proximityObserver.observe(form);
  }
  function discover(root = document) {
    if (root instanceof HTMLFormElement) observeForm(root);
    root.querySelectorAll?.(formSelector).forEach(observeForm);
  }
  if ('IntersectionObserver' in window) {
    proximityObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadSafely();
    }, { rootMargin: '600px 0px' });
  }
  document.addEventListener('focusin', onIntent, true);
  document.addEventListener('pointerdown', onIntent, true);
  document.addEventListener('keydown', onIntent, true);
  document.addEventListener('submit', onIntent, true);
  function start() {
    if (loaded) return;
    discover();
    discoveryObserver = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (node instanceof Element) discover(node);
    })));
    discoveryObserver.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

/* Forms start after either consent choice, then proximity or explicit intent.
 * One request owns VIP behaviour and shared validation; Webflow owns transport. */
function prepareFormsLoader() {
  if (window.TDBFormsLoader) return;
  const formSelector = 'form';
  const vipIntent = '#tdb-vip-drawer .tdb-vip-drawer-handle, [href*="#vip" i], [data-vip-open]';
  const observed = new WeakSet(), edited = new WeakSet(), pending = new WeakSet();
  let flight = null, loaded = false, proximityObserver, discoveryObserver, drawerObserver;
  let calculatorInterest = null;
  const src = new URL('tdb-vip-form.js', TDBRuntimeModuleRoot).href;

  function cleanup() {
    proximityObserver?.disconnect();
    discoveryObserver?.disconnect();
    drawerObserver?.disconnect();
    for (const type of ['focusin', 'pointerdown', 'keydown']) document.removeEventListener(type, onIntent, true);
    for (const type of ['input', 'change']) document.removeEventListener(type, rememberInput, true);
    document.removeEventListener('submit', onSubmit, true);
    window.removeEventListener('tdb:vip-open-intent', loadSafely);
  }
  function loadForms() {
    if (flight) return flight;
    flight = window.TDBModules.load(src, {
      attribute: 'data-tdb-vip-form',
      ready: () => !!window.TDBVIPForm && !!window.TDBForms,
      timeout: 15000
    }).then(() => {
      window.TDBForms.refresh();
      window.TDBVIPForm.refresh();
      if (calculatorInterest !== null) {
        window.TDBVIPInterest.fromCalculator(calculatorInterest);
        calculatorInterest = null;
      }
      loaded = true;
      cleanup();
      return window.TDBForms;
    }).catch(error => { flight = null; throw error; });
    return flight;
  }
  function loadSafely() {
    loadForms().catch(error => console.warn('TDB form preparation unavailable.', error));
  }
  function rememberInput(event) {
    if (event.target.matches?.('select') && event.target.closest(formSelector)) edited.add(event.target);
  }
  function onIntent(event) {
    if (event.target.closest?.(formSelector + ',' + vipIntent)) loadSafely();
  }
  function showFailure(form) {
    let message = form.querySelector('[data-tdb-form-load-error]');
    if (!message) {
      message = document.createElement('p');
      message.setAttribute('data-tdb-form-load-error', '');
      message.setAttribute('role', 'alert');
      form.append(message);
    }
    message.textContent = 'We could not prepare your enquiry. Please try again.';
  }
  function onSubmit(event) {
    const form = event.target;
    if (loaded || event.defaultPrevented || !(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending.has(form)) return;
    pending.add(form);
    const submitter = event.submitter;
    const oldBusy = form.getAttribute('aria-busy');
    form.setAttribute('aria-busy', 'true');
    form.querySelector('[data-tdb-form-load-error]')?.remove();
    loadForms().then(() => {
      if (!form.isConnected) return;
      // requestSubmit preserves native validation, submitter values and Webflow.
      // Never use form.submit(), which bypasses those owners.
      if (submitter?.isConnected && submitter.form === form && !submitter.disabled) form.requestSubmit(submitter);
      else form.requestSubmit();
    }).catch(() => showFailure(form)).finally(() => {
      pending.delete(form);
      if (oldBusy === null) form.removeAttribute('aria-busy');
      else form.setAttribute('aria-busy', oldBusy);
    });
  }
  function observeForm(form) {
    if (!(form instanceof HTMLFormElement) || observed.has(form)) return;
    observed.add(form);
    // A hidden drawer is prepared by its opener, not its page position.
    if (form.closest('#tdb-vip-drawer')) return;
    if (proximityObserver) proximityObserver.observe(form);
    else loadSafely();
  }
  function discover(root = document) {
    if (root instanceof HTMLFormElement) observeForm(root);
    root.querySelectorAll?.(formSelector).forEach(observeForm);
  }
  window.TDBFormsLoader = Object.freeze({
    version: '1.0.0', load: loadForms, wasEdited: select => edited.has(select),
    status: () => ({loaded, loading: !!flight && !loaded})
  });
  // Calculator intent must survive the interval before the form bundle arrives.
  if (!window.TDBVIPInterest) window.TDBVIPInterest = Object.freeze({
    fromCalculator(value) { calculatorInterest = value; loadSafely(); }
  });
  if ('IntersectionObserver' in window) proximityObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) loadSafely();
  }, {rootMargin: '600px 0px'});
  for (const type of ['focusin', 'pointerdown', 'keydown']) document.addEventListener(type, onIntent, true);
  for (const type of ['input', 'change']) document.addEventListener(type, rememberInput, true);
  document.addEventListener('submit', onSubmit, true);
  window.addEventListener('tdb:vip-open-intent', loadSafely);
  function start() {
    if (loaded) return;
    discover();
    discoveryObserver = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) discover(node);
    })));
    discoveryObserver.observe(document.body, {childList: true, subtree: true});
    const drawer = document.getElementById('tdb-vip-drawer');
    if (drawer) {
      const prepareOpenDrawer = () => { if (drawer.classList.contains('is-open')) loadSafely(); };
      drawerObserver = new MutationObserver(prepareOpenDrawer);
      drawerObserver.observe(drawer, {attributes: true, attributeFilter: ['class']});
      prepareOpenDrawer();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
}


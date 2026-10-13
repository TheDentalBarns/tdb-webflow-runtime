/* Consent browser helpers are ready before the consent controller opens. */
(() => {
  if (!document.getElementById('tdb-consent-root') || document.querySelector('style[data-tdb-consent-state-css]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-tdb-consent-state-css', '');
  style.textContent = __TDB_CONSENT_STATE_CSS__;
  const shared = document.querySelector('link[data-tdb-ui-css]');
  if (shared) shared.insertAdjacentElement('afterend', style);
  else document.head.append(style);
})();

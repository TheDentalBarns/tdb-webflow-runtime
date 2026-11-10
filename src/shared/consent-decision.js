/* The entry and native banner share the same saved-choice parser. No writes. */
(() => {
  'use strict';
  if (window.TDBConsentDecision) return;
  const COOKIE_NAME = 'CookieScriptConsent';
  const ALL_CATEGORIES = ['performance', 'strict', 'targeting', 'functionality'];
  function safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  function normaliseCategories(value, action) {
    let categories = value;
    if (typeof categories === 'string') {
      try {
        categories = JSON.parse(categories);
      } catch {
        categories = categories.split(',');
      }
    }
    if (!Array.isArray(categories)) categories = [];
    categories = [...new Set(categories.map(String).filter(Boolean))];
    if (action === 'accept' && categories.length === 0) categories = ALL_CATEGORIES.slice();
    if (!categories.includes('strict')) categories.push('strict');
    return categories;
  }
  function read() {
    const undecided = { action: undefined, categories: ['strict'] };
    const row = document.cookie.split('; ').find((item) => item.startsWith(`${COOKIE_NAME}=`));
    if (!row) return undecided;
    const raw = row.slice(COOKIE_NAME.length + 1);
    let data = null;
    for (const candidate of [raw, safeDecode(raw)]) {
      try {
        data = JSON.parse(candidate);
        break;
      } catch {}
    }
    if (!data || typeof data !== 'object') return undecided;
    let action = data.action ?? data.a;
    if (action === 'acceptall') action = 'accept';
    if (!['accept', 'reject'].includes(action)) action = undefined;
    const state = {
      action,
      categories: normaliseCategories(data.categories ?? data.c, action),
    };
    if (data.key) state.key = data.key;
    return state;
  }
  window.TDBConsentDecision = Object.freeze({ read });
})();

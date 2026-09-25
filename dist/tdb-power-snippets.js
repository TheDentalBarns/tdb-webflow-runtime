/* TDB Power Snippets v1.0.2 — staging design preview, no carousel. */
(function () {
  'use strict';
  function contextForPath(path) {
    path = path.toLowerCase().replace(/\/+$/, '') || '/';
    if (/facial-aesthetics/.test(path)) return null;
    if (/nervous/.test(path)) return 'nervous';
    if (/invisalign/.test(path)) return 'invisalign';
    if (/clear-aligners/.test(path)) return 'clear-aligners';
    if (/composite-bonding/.test(path)) return 'bonding';
    if (/veneers/.test(path)) return 'veneers';
    if (/whitening/.test(path)) return 'whitening';
    if (/hygiene/.test(path)) return 'hygiene';
    if (/signature-assessment|fast-track|first-visit/.test(path)) return 'assessment';
    if (/general-dentistry|restorative/.test(path)) return 'restorative';
    if (/cosmetic|smile-design/.test(path)) return 'cosmetic';
    return 'default';
  }
  // Matches the existing IX2 “DD - Text Effect” opacity keyframes.
  function opacityAtProgress(progress) {
    const p = Math.max(0, Math.min(1, progress));
    return p < .5 ? p : p <= .75 ? .5 : .5 - (p - .75) * 1.6;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = { contextForPath, opacityAtProgress };
    return;
  }
  // A later production publication must not enable this draft preview.
  if (location.hostname !== 'dentalbarns.webflow.io' || window.TDBPowerSnippets) return;
  const version = '1.0.2';
  const assetBase = new URL('.', document.currentScript.src).href;
  const dataNode = document.querySelector('[data-tdb-review-preview-data]');
  if (!dataNode) return;
  let data;
  try { data = JSON.parse(dataNode.textContent); } catch (_) { return; }
  if (data.mode !== 'staging-snapshot') return;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = assetBase + 'tdb-power-snippets.css';
  document.head.append(css);
  const QUOTE_MARK = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" role=\"img\" class=\"iconify iconify--bx\" width=\"100%\" height=\"100%\" preserveAspectRatio=\"xMidYMid meet\" viewBox=\"0 0 24 24\"><path d=\"M6.5 10c-.223 0-.437.034-.65.065c.069-.232.14-.468.254-.68c.114-.308.292-.575.469-.844c.148-.291.409-.488.601-.737c.201-.242.475-.403.692-.604c.213-.21.492-.315.714-.463c.232-.133.434-.28.65-.35l.539-.222l.474-.197l-.485-1.938l-.597.144c-.191.048-.424.104-.689.171c-.271.05-.56.187-.882.312c-.318.142-.686.238-1.028.466c-.344.218-.741.4-1.091.692c-.339.301-.748.562-1.05.945c-.33.358-.656.734-.909 1.162c-.293.408-.492.856-.702 1.299c-.19.443-.343.896-.468 1.336c-.237.882-.343 1.72-.384 2.437c-.034.718-.014 1.315.028 1.747c.015.204.043.402.063.539l.025.168l.026-.006A4.5 4.5 0 1 0 6.5 10zm11 0c-.223 0-.437.034-.65.065c.069-.232.14-.468.254-.68c.114-.308.292-.575.469-.844c.148-.291.409-.488.601-.737c.201-.242.475-.403.692-.604c.213-.21.492-.315.714-.463c.232-.133.434-.28.65-.35l.539-.222l.474-.197l-.485-1.938l-.597.144c-.191.048-.424.104-.689.171c-.271.05-.56.187-.882.312c-.317.143-.686.238-1.028.467c-.344.218-.741.4-1.091.692c-.339.301-.748.562-1.05.944c-.33.358-.656.734-.909 1.162c-.293.408-.492.856-.702 1.299c-.19.443-.343.896-.468 1.336c-.237.882-.343 1.72-.384 2.437c-.034.718-.014 1.315.028 1.747c.015.204.043.402.063.539l.025.168l.026-.006A4.5 4.5 0 1 0 17.5 10z\" fill=\"currentColor\"></path></svg>";
  const ICONS = {"Google": "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">\n  <path fill=\"currentColor\" d=\"M6.592 13.918a6.04 6.04 0 0 1-.307-1.909H2.208c0 1.517.343 2.946.947 4.227l.124.254v.01a10.063 10.063 0 0 0 1.889 2.604l4.47-1.674a6.12 6.12 0 0 1-3.046-3.512Z\"></path>\n  <path fill=\"currentColor\" d=\"M18.883 4.619C17.148 3 14.896 2.01 12.198 2.01c-.531 1.11-.62 2.771 0 3.981 1.472 0 2.78.51 3.824 1.491l2.86-2.863Z\"></path>\n  <path fill=\"currentColor\" d=\"M12.198 5.991h.095l-.095-3.981a9.936 9.936 0 0 0-7.645 3.577c.257 1.483.97 2.435 3.12 2.586 1.084-1.324 2.71-2.182 4.525-2.182Z\"></path>\n  <path fill=\"currentColor\" d=\"M15.568 17.073c-.89.6-2.026.963-3.37.963-.784 1.262-1.31 2.562 0 3.972 2.53 0 4.675-.783 6.295-2.14l.318-.278c1.482-1.37 2.473-3.244 2.83-5.46.098-.607.148-1.24.148-1.894l-2.265.3-1.912 1.35-.037.177a4.596 4.596 0 0 1-1.813 2.871l-.194.139Z\"></path>\n  <path fill=\"currentColor\" d=\"M12.207 10.195v3.864l5.368.004a7.211 7.211 0 0 1-.013.067h4.08a11.894 11.894 0 0 0-.034-3.94h-6.902v.005h-2.499Z\"></path>\n  <path fill=\"currentColor\" d=\"m6.532 10.336.072-.227a6.136 6.136 0 0 1 1.719-2.616c-.93-.157-3.263-1.525-3.567-2.14a10.066 10.066 0 0 0-1.477 2.174 9.885 9.885 0 0 0-1.07 4.694c.723.313 3.082.37 4.08 0a5.926 5.926 0 0 1 .243-1.885Z\"></path>\n  <path fill=\"currentColor\" d=\"M8.24 2.828 9.954 6.45c-.754.322-1.43.8-1.99 1.392l-3.77-1.798A10.016 10.016 0 0 1 8.24 2.828Z\"></path>\n  <path fill=\"currentColor\" d=\"M12.198 18.036a5.733 5.733 0 0 1-3.046-.879l-1.562-.043c-1.839.489-2.372.882-2.538 1.872a9.935 9.935 0 0 0 7.146 3.022v-3.972Z\"></path>\n  <path fill=\"currentColor\" d=\"M12.198 22.008c.421 0 .832-.022 1.231-.064v-4.017a6.84 6.84 0 0 1-1.23.109c-.413 0-.815-.045-1.203-.128v4.028c.394.047.795.072 1.202.072Z\" opacity=\".5\"></path>\n\n  \n</svg>", "Facebook": "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">\n  <circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"currentColor\"></circle>\n  <path fill=\"#fff\" fill-rule=\"evenodd\" d=\"M16.167 6.167v2.639h-1.842a1.04 1.04 0 0 0-1.048 1.03v2.04h2.843l-.393 2.935h-2.45v7.108a10.113 10.113 0 0 1-2.982-.064v-7.044H7.833v-2.934h2.462V9.412c0-1.792 1.477-3.245 3.298-3.245h2.574Z\" clip-rule=\"evenodd\"></path>\n</svg>", "Yell": "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\"><path fill=\"#FCDB00\" d=\"M3.47 3.525a1.637 1.637 0 0 1 1.145-.488h3.337c.024.583.054 1.167.033 1.75a3.755 3.755 0 0 1-.192 1.1c-.179.496-.475.94-.795 1.355-.556.715-1.206 1.35-1.829 2.007-.058.06-.055.154-.018.224a.719.719 0 0 0 .308.279c.296.155.644.192.972.143.426-.063.817-.275 1.145-.55C8.19 8.836 8.76 8.272 9.39 7.78c.243-.188.551-.288.858-.279.32.018.64.116.904.3.292.202.518.482.725.767.348.487.648 1.005.962 1.514.896 1.46 1.789 2.92 2.7 4.37.15.23.284.469.45.687.257.342.598.627.999.784.351.14.734.187 1.111.178.035-.001.08-.008.095-.045.01-.043-.016-.082-.032-.12-.839-1.765-1.694-3.524-2.541-5.286-.64-1.33-1.282-2.66-1.915-3.993-.156-.333-.315-.666-.465-1.002a50.816 50.816 0 0 1-1.038-2.6l-.006-.022c.346.008.693.001 1.039.004h5.839c.206.002.415-.013.618.033a1.645 1.645 0 0 1 1.306 1.683v14.583c.002.353-.118.705-.333.985a1.643 1.643 0 0 1-1.23.644c-.149.003-.297.001-.446.002H4.838c-.15-.001-.3.006-.447-.018a1.646 1.646 0 0 1-1.113-.705A1.613 1.613 0 0 1 3 19.352V4.651c.002-.418.176-.83.47-1.126Zm6.942 5.125c-.13.021-.199.144-.267.243-1.134 1.73-2.27 3.458-3.392 5.194-.18.277-.363.563-.448.887-.073.279-.052.591.094.844.14.24.399.386.663.45a.33.33 0 0 0 .34-.095c.055-.066.108-.135.162-.203.782-1.009 1.547-2.03 2.315-3.05.713-.948 1.425-1.897 2.135-2.848.043-.054.083-.128.05-.198-.075-.183-.21-.332-.337-.48-.22-.236-.457-.466-.746-.617-.175-.086-.371-.16-.57-.127Zm-5.789 9.072c.001.274.07.548.205.786.276.5.828.835 1.4.836l11.508.005c.5.003.99-.246 1.292-.642.217-.28.34-.63.336-.985H4.624Z\"></path><path fill=\"#000\" d=\"M7.952 3.037h4.099c.043 0 .087.002.13-.004l.022.021c.33.874.661 1.747 1.038 2.601.15.336.309.669.465 1.002.633 1.334 1.274 2.663 1.915 3.993.847 1.762 1.702 3.52 2.541 5.287.016.037.042.076.032.119-.014.037-.06.044-.095.045-.377.01-.76-.037-1.111-.178a2.353 2.353 0 0 1-1-.784c-.165-.218-.3-.457-.448-.687-.912-1.45-1.805-2.91-2.7-4.37-.315-.509-.615-1.027-.963-1.514-.207-.285-.433-.565-.725-.766a1.751 1.751 0 0 0-.904-.301 1.347 1.347 0 0 0-.858.28c-.63.491-1.199 1.055-1.814 1.564-.328.275-.719.487-1.145.55a1.59 1.59 0 0 1-.972-.143.719.719 0 0 1-.308-.279c-.038-.07-.04-.165.018-.224.623-.656 1.273-1.292 1.829-2.007.32-.416.616-.86.795-1.356.126-.352.176-.726.192-1.098.021-.584-.01-1.168-.033-1.751Z\"></path><path fill=\"#000\" d=\"M10.412 8.65c.198-.034.394.041.57.127.288.15.525.381.745.617.128.148.262.297.337.48.033.07-.006.144-.05.198-.71.95-1.422 1.9-2.135 2.848-.768 1.02-1.533 2.041-2.315 3.05l-.162.204a.328.328 0 0 1-.34.094c-.264-.064-.523-.21-.663-.45a1.126 1.126 0 0 1-.094-.844c.085-.324.267-.61.448-.887 1.123-1.736 2.258-3.465 3.392-5.194.068-.099.138-.222.267-.243Zm-5.789 9.072h14.741c.003.354-.12.706-.336.985a1.641 1.641 0 0 1-1.292.642l-11.508-.005a1.636 1.636 0 0 1-1.4-.836 1.61 1.61 0 0 1-.205-.786Z\"></path></svg>"};
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function sourceIcon(platform, monochrome) {
    const icon = element('span', 'tdb-review-source-icon' + (monochrome ? ' is-monochrome' : ''));
    icon.setAttribute('aria-hidden', 'true');
    if (platform === 'Doctify') {
      const img = document.createElement('img');
      img.src = assetBase + 'tdb-doctify-icon.png';
      img.alt = '';
      img.width = 24; img.height = 24;
      icon.append(img);
    } else if (ICONS[platform]) {
      icon.innerHTML = ICONS[platform];
    } else {
      icon.textContent = '★';
    }
    return icon;
  }
  const animated = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  function updateFade() {
    frame = 0;
    let settling = false;
    animated.forEach(state => {
      if (!state.el.getClientRects().length) return;
      const rect = state.el.getBoundingClientRect();
      const target = reduced.matches ? 1 : opacityAtProgress((innerHeight - rect.top) / innerHeight);
      state.opacity = reduced.matches ? 1 : state.opacity + (target - state.opacity) * .5;
      state.el.style.opacity = state.opacity.toFixed(3);
      if (Math.abs(target - state.opacity) > .001) settling = true;
    });
    if (settling) frame = requestAnimationFrame(updateFade);
  }
  function scheduleFade() { if (!frame) frame = requestAnimationFrame(updateFade); }
  function addRatingDetails(badge) {
    if (badge.nextElementSibling?.matches('[data-tdb-review-method]')) return;
    const details = element('details', 'tdb-review-method');
    details.setAttribute('data-tdb-review-method', '');
    const summary = element('summary', '', 'Includes Keely’s historic Doctify reviews');
    const body = element('div', 'tdb-review-method-body');
    body.append(element('p', '', '83 reviews across Google (55), Facebook (3), Yell (2) and Doctify (23). Doctify feedback relates to Dr Keely’s work at previous practices. Some patients have reviewed on more than one platform.'));
    body.append(element('p', '', 'Preview combined score: ' + data.average.toFixed(2) + '/5 from ' + data.ratedCount + ' rated entries, including the one-star Google review. Google ratings await final verification; Facebook recommendations are counted as 5/5. The two Yell entries are included in the review count but have no confirmed star rating and are excluded from the average. Captured 25 September 2026.'));
    details.append(summary, body);
    badge.after(details);
  }
  function updateBadge(badge) {
    if (badge.dataset.tdbReviewUpdated) return;
    const vendorRow = [...badge.children].find(el => el.querySelector('.vendor'));
    const score = [...badge.children].find(el => /^\d(?:\.\d+)?$/.test(el.textContent.trim()));
    const tally = [...badge.children].find(el => /^\(\d+\)$/.test(el.textContent.trim()));
    if (!vendorRow || !score || !tally) return;
    score.textContent = data.average.toFixed(2);
    tally.textContent = '(' + data.total + ')';
    const doctify = element('span', 'testimonial15_rating-icon vendor');
    doctify.title = 'Doctify — historic reviews of Dr Keely';
    doctify.append(sourceIcon('Doctify', false));
    vendorRow.append(doctify);
    // Existing component is aria-hidden; make the new tally available to AT.
    badge.removeAttribute('aria-hidden');
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', 'Combined preview rating ' + data.average.toFixed(2) + ' out of 5; ' + data.total + ' reviews across Google, Facebook, Yell and Doctify. Includes historic reviews of Dr Keely. See rating details below.');
    badge.dataset.tdbReviewUpdated = version;
    addRatingDetails(badge);
  }
  function render(slot) {
    const host = slot.closest('[data-tdb-power-snippet]');
    if (!host || host.hasAttribute('data-tdb-review-ready')) return;
    const context = contextForPath(location.pathname);
    const review = context && data.contexts[context];
    if (!review?.excerpt || !review.reviewer) return;
    const figure = element('figure', 'tdb-power-quote');
    const ornament = element('div', 'tdb-power-quote-mark icon-embed-medium text-color-orange');
    ornament.setAttribute('aria-hidden', 'true');
    ornament.innerHTML = QUOTE_MARK;
    const quote = element('blockquote', 'tdb-power-quote-body');
    quote.append(element('p', 'text-size-large', review.excerpt));
    const caption = element('figcaption', 'tdb-power-quote-attribution text-style-tagline-restored');
    caption.append(sourceIcon(review.platform, true), element('span', '', review.reviewer));
    caption.append(element('span', 'tdb-review-sr-only', ' — ' + review.platform));
    figure.append(ornament, quote, caption);
    if (review.historic) figure.append(element('p', 'tdb-review-history', 'Review of Dr Keely at a previous practice · ' + review.platform));
    slot.replaceChildren(figure);
    host.dataset.tdbReviewContext = context;
    host.dataset.tdbReviewId = review.id;
    host.dataset.tdbReviewReady = version;
    animated.push({ el: caption, opacity: 1 });
  }
  function start() {
    document.querySelectorAll('.button.is-review').forEach(updateBadge);
    document.querySelectorAll('[data-tdb-review-quote]').forEach(render);
    scheduleFade();
    addEventListener('scroll', scheduleFade, { passive: true });
    addEventListener('resize', scheduleFade, { passive: true });
    addEventListener('pageshow', scheduleFade);
    reduced.addEventListener('change', scheduleFade);
  }
  window.TDBPowerSnippets = Object.freeze({ version, mode: data.mode, capturedOn: data.capturedOn });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

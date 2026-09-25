/* TDB Power Snippets v1.0.4 — staging design preview, no carousel. */
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
    if (/smile-design/.test(path)) return 'smile-design';
    if (/cosmetic/.test(path)) return 'cosmetic';
    if (/^\/vip\//.test(path)) return 'vip';
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
  const version = '1.0.4';
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
  const DOCTIFY_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 42 42\" fill=\"#fff\" width=\"100%\" height=\"100%\" aria-hidden=\"true\" focusable=\"false\">\n    <path d=\"M27.888 5.277c-4.948-.517-7.311 3.558-9.925 4.379a8.437 8.437 0 0 1-.914.021c.014.005.028.012.042.016 2.73.236 6.145-1.23 9.742 1.73 6.453 5.312 2.005 15.359-9.25 19.367a28.16 28.16 0 0 0 2.295.697c1.538.397 3.192.024 4.496-.888C38.28 20.855 38.076 6.347 27.888 5.277z\" fill=\"#00E5D0\" />\n    <path d=\"M27.888 5.277c-4.948-.517-7.311 3.558-9.925 4.379a8.437 8.437 0 0 1-.914.021c.014.005.028.012.042.016 2.73.236 6.145-1.23 9.742 1.73 6.453 5.312 2.005 15.359-9.25 19.367a28.16 28.16 0 0 0 2.295.697c1.538.397 3.192.024 4.496-.888C38.28 20.855 38.076 6.347 27.888 5.277z\" fill=\"url(#a)\" />\n    <path d=\"M7.321 5.277c4.947-.517 7.311 3.558 9.925 4.379.296.026.601.028.913.021-.014.005-.027.012-.041.016-2.73.236-6.146-1.23-9.742 1.73-6.453 5.312-2.005 15.359 9.249 19.367-.735.259-1.501.492-2.294.697-1.538.397-3.192.024-4.497-.888C-3.07 20.855-2.867 6.347 7.321 5.277z\" fill=\"url(#b)\" />\n    <path d=\"M17.585 30.79a30.87 30.87 0 0 1-2.399.737C7.493 27.925 3.303 21.452 5.312 16.469c-.677 5.202 3.962 11.402 12.273 14.321z\" fill=\"url(#c)\" />\n    <path d=\"M26.833 11.423c-3.597-2.961-7.013-1.494-9.742-1.73-.014-.005-.028-.012-.042-.016-2.56-.056-5.622-.93-8.828 1.711-6.471 5.33-1.973 15.422 9.36 19.402 11.257-4.008 15.705-14.055 9.252-19.367z\" fill=\"url(#d)\" />\n    <path d=\"M12.872 3.953c-1.505-.842-1.694-2.681-.199-2.979a5.078 5.078 0 0 1 3.755.72c1.9 1.232 2.391 4.324 1.49 6.197-.192.398-.715.372-.979.019-1.119-1.503-2.563-3.114-4.067-3.957z\" fill=\"url(#e)\" />\n    <defs>\n        <radialGradient id=\"a\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"rotate(-33.658 34.068 -24.922) scale(22.8641 23.0496)\">\n            <stop offset=\".537\" stop-color=\"#1CDFCD\" />\n            <stop offset=\"1\" stop-color=\"#00AA9C\" />\n        </radialGradient>\n        <radialGradient id=\"b\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"rotate(178.58 9 5.763) scale(18.1446 18.2918)\">\n            <stop stop-color=\"#1DDFCE\" />\n            <stop offset=\".992\" stop-color=\"#2B5AE0\" />\n        </radialGradient>\n        <radialGradient id=\"d\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"rotate(-151.073 18.22 8.492) scale(25.7248 25.9335)\">\n            <stop offset=\".088\" stop-color=\"#2B59E0\" />\n            <stop offset=\".797\" stop-color=\"#1DDFCE\" />\n        </radialGradient>\n        <radialGradient id=\"e\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"matrix(6.88307 4.5002 -4.353 6.65794 13.462 3.598)\">\n            <stop offset=\".192\" stop-color=\"#2B59E0\" />\n            <stop offset=\".793\" stop-color=\"#1DDFCE\" />\n        </radialGradient>\n        <linearGradient id=\"c\" x1=\"15.396\" y1=\"30.976\" x2=\"5.758\" y2=\"21.463\" gradientUnits=\"userSpaceOnUse\">\n            <stop stop-color=\"#2B59E0\" />\n            <stop offset=\"1\" stop-color=\"#071037\" stop-opacity=\"0\" />\n        </linearGradient>\n    </defs>\n</svg>";
  let svgSerial = 0;
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function sourceIcon(platform, grayscale) {
    const icon = element('span', 'tdb-review-source-icon' + (grayscale ? ' is-grayscale' : ''));
    icon.setAttribute('aria-hidden', 'true');
    let svg;
    if (platform === 'Doctify') {
      const template = document.createElement('template');
      template.innerHTML = DOCTIFY_SVG;
      svg = template.content.firstElementChild;
    } else {
      // Reuse the actual coloured SVG already drawn in the review badge.
      const originals = [...document.querySelectorAll('.button.is-review .vendor svg')];
      const original = originals.find(el => (el.getAttribute('data-src') || '').includes('-' + platform.toLowerCase() + '-'));
      svg = original?.cloneNode(true);
    }
    if (svg) {
      // Preserve gradients while avoiding duplicate IDs in cloned SVGs.
      const prefix = 'tdb-review-svg-' + (++svgSerial) + '-';
      const ids = new Map([...svg.querySelectorAll('[id]')].map(el => [el.id, prefix + el.id]));
      svg.querySelectorAll('*').forEach(el => {
        for (const attr of [...el.attributes]) {
          let value = attr.value;
          ids.forEach((replacement, old) => {
            value = value.split('url(#' + old + ')').join('url(#' + replacement + ')');
            if ((attr.name === 'href' || attr.name === 'xlink:href') && value === '#' + old) value = '#' + replacement;
          });
          if (attr.name === 'id' && ids.has(value)) value = ids.get(value);
          if (value !== attr.value) el.setAttribute(attr.name, value);
        }
      });
      svg.removeAttribute('id');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      icon.append(svg);
    } else {
      icon.textContent = platform;
    }
    return icon;
  }
  const animated = [];
  let frame = 0;
  function updateFade() {
    frame = 0;
    let settling = false;
    animated.forEach(state => {
      if (!state.el.getClientRects().length) return;
      const rect = state.el.getBoundingClientRect();
      const target = opacityAtProgress((innerHeight - rect.top) / innerHeight);
      state.opacity = state.opacity + (target - state.opacity) * .5;
      state.el.style.opacity = state.opacity.toFixed(3);
      if (Math.abs(target - state.opacity) > .001) settling = true;
    });
    if (settling) frame = requestAnimationFrame(updateFade);
  }
  function scheduleFade() { if (!frame) frame = requestAnimationFrame(updateFade); }
  function updateBadge(badge) {
    if (badge.dataset.tdbReviewUpdated) return;
    const vendorRow = [...badge.children].find(el => el.querySelector('.vendor'));
    const score = [...badge.children].find(el => /^\d(?:\.\d+)?$/.test(el.textContent.trim()));
    const tally = [...badge.children].find(el => /^\(\d+\)$/.test(el.textContent.trim()));
    if (!vendorRow || !score || !tally) return;
    score.textContent = data.average.toFixed(2);
    tally.textContent = '(' + data.total + ')';
    const doctify = element('span', 'testimonial15_rating-icon vendor');
    doctify.title = 'Doctify';
    const doctifyIcon = sourceIcon('Doctify', false);
    doctifyIcon.className = 'icon-embed-xsmall yellow vendor';
    doctify.append(doctifyIcon);
    vendorRow.append(doctify);
    // Existing component is aria-hidden; make the new tally available to AT.
    badge.removeAttribute('aria-hidden');
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', 'Combined preview rating ' + data.average.toFixed(2) + ' out of 5; ' + data.total + ' reviews across Google, Facebook, Yell and Doctify.');
    badge.dataset.tdbReviewUpdated = version;
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
  }
  window.TDBPowerSnippets = Object.freeze({ version, mode: data.mode, capturedOn: data.capturedOn });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

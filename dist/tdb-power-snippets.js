/* TDB Power Snippets v1.1.0 — staging design preview, no carousel. */
(function () {
  'use strict';

  // Match parallax timing on desktop; smaller breakpoints retain 400ms.
  function carouselDuration(width) {
    return matchMedia('(min-width:992px)').matches
      ? Math.round(Math.min(950, Math.max(650, 400 * Math.sqrt(width / 375)))) : 400;
  }
  function contextForPath(path) {
    path = path.toLowerCase().replace(/\/+$/, '') || '/';
    if (/facial-aesthetics/.test(path)) return null;
    if (path === '/location') return 'location';
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
  if (!['dentalbarns.webflow.io','thedentalbarns.com','www.thedentalbarns.com','thedentalbarns.co.uk','www.thedentalbarns.co.uk'].includes(location.hostname) || window.TDBPowerSnippets) return;
  const version = '1.1.0';
  const dataNode = document.querySelector('[data-tdb-review-preview-data]');
  if (!dataNode) return;
  let data;
  try { data = JSON.parse(dataNode.textContent); } catch (_) { return; }
  if (data.mode !== 'staging-snapshot') return;
  // Bundled critical CSS is installed before any review DOM becomes visible.
  // The Webflow embed runs this inline during parsing, with no CDN round trip.
  const css = document.createElement('style');
  css.dataset.tdbReviewStyles = version;
  css.textContent = "/* TDB Power Snippets v1.1.0 \u2014 uses existing quotation typography and brand colour. */\n[data-tdb-power-snippet]:not([data-tdb-review-ready]){display:none}\n[data-tdb-power-snippet][data-tdb-review-ready]{display:block;height:auto;min-height:0;text-align:center}\n.is-review:has(> .button[data-tdb-review-updated]){flex-direction:column;height:auto}\n.tdb-power-quote{margin:0 auto;max-width:100%}\n.tdb-power-quote-mark{display:block;margin:0 auto 2rem}\n.tdb-power-quote-mark svg{display:block;width:100%;height:100%}\n.tdb-power-quote-body{border:0;padding:0;margin:0;font:inherit}\n.tdb-power-quote-body p{margin:0;white-space:normal;text-wrap:pretty}\n.tdb-power-quote-attribution{display:flex;align-items:center;justify-content:center;gap:.65rem;margin-top:2rem;font-style:normal;opacity:0;will-change:opacity}\n.tdb-review-source-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:1.35rem;height:1.35rem;aspect-ratio:1;overflow:hidden;line-height:1}\n.tdb-review-source-icon svg,.tdb-review-source-icon img{display:block;width:100%;height:100%;object-fit:contain}\n.tdb-review-source-icon.is-grayscale{filter:grayscale(1)}\n.tdb-review-history{font-size:.75rem;line-height:1.5;margin:1rem 0 0;color:#6b655e}\n.tdb-review-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}\n@media(max-width:479px){\n .button.is-review[data-tdb-review-updated]{column-gap:.45rem;row-gap:.35rem;flex-wrap:wrap;justify-content:center;padding-left:.85rem;padding-right:.85rem;max-width:100%}\n .button.is-review[data-tdb-review-updated] .testimonial15_rating-wrapper{column-gap:.15rem}\n .tdb-power-quote-mark{margin-bottom:1.5rem}\n .tdb-power-quote-attribution{margin-top:1.5rem;letter-spacing:.08em}\n}\n\n/* Follow the existing native dark subhero variant. */\n[data-wf--hero---headline--variant=\"dark\"] .tdb-power-quote-mark{opacity:.35}\n\n[data-tdb-review-open]{cursor:pointer;touch-action:manipulation}\n[data-tdb-review-open]:focus-visible{outline:2px solid currentColor;outline-offset:.5rem}\n[data-tdb-review-open][aria-busy=\"true\"]{cursor:progress}\n.tdb-review-load-error{font-size:.85rem;text-align:center}\n\n.tdb-review-carousel{display:flow-root;position:relative;width:100%;min-height:300px;text-align:center}\n.tdb-rc-viewport{min-height:calc(300px + var(--tdb-rc-star-gap,0px));margin-top:calc(-1 * var(--tdb-rc-star-gap,0px));display:grid;overflow:hidden;touch-action:pan-y pinch-zoom}\n.tdb-rc-card{grid-area:1/1;min-width:0;display:flex;align-items:center;justify-content:center;padding:0;box-sizing:border-box;visibility:hidden}\n.tdb-rc-open{width:100%;cursor:pointer;outline-offset:-2px;opacity:0;transition:opacity 400ms ease-out}\n.tdb-rc-card.is-settled .tdb-rc-open{opacity:1}\n.tdb-rc-quote{margin:0;text-wrap:pretty}\n.tdb-rc-name{display:flex;align-items:center;justify-content:center;gap:.65rem;margin-top:2rem;will-change:opacity}\n.tdb-rc-dots{position:absolute;top:100%;left:0;right:0;display:flex;justify-content:center;gap:6px;margin-top:0}\n.tdb-rc-dot{display:grid;place-items:center;width:1rem;height:44px;border:0;padding:0;background:transparent;cursor:pointer}\n.tdb-rc-dot span{width:1rem;height:1rem;border-radius:50%;background:var(--base-color-brand--orange-2,#ebe2d2)}\n.tdb-rc-dot[aria-pressed=\"true\"] span{background:var(--base-color-brand--orange-3,#d6cab4)}\n.tdb-review-carousel :focus-visible{outline:1px solid currentColor;outline-offset:3px}\n.tdb-rc-pause:focus{position:static;width:auto;height:auto;clip:auto;white-space:normal;padding:.5rem;background:transparent;border:1px solid currentColor}\n";
  css.textContent += "\n.tdb-patient-quotes .tdb-rc-open{transition:opacity 400ms ease-out!important}\n.tdb-patient-quotes .tdb-rc-card.is-first-entry .tdb-rc-open{transition:none!important}\n.tdb-patient-position{position:absolute;top:100%;left:0;right:0;min-height:44px;justify-content:center;color:var(--base-color-brand--orange-3,#d6cab4);letter-spacing:.06em;font-size:1rem;line-height:1.5}\n";
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
      svg.setAttribute('width', '24');
      svg.setAttribute('height', '24');
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
  function setInitialFade() {
    animated.forEach(state => {
      state.opacity = opacityAtProgress((innerHeight - state.el.getBoundingClientRect().top) / innerHeight);
      state.el.style.opacity = state.opacity.toFixed(3);
    });
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
    badge.setAttribute('role', 'button');
    badge.tabIndex = 0;
    badge.setAttribute('aria-haspopup', 'dialog');
    badge.setAttribute('aria-expanded', 'false');
    badge.dataset.tdbReviewOpen = '';
    badge.addEventListener('click', () => openDrawer(badge));
    badge.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDrawer(badge); } });
    badge.setAttribute('aria-label', 'Read ' + data.total + ' patient reviews. Combined rating ' + data.average.toFixed(2) + ' out of 5.');
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
    figure.setAttribute('role', 'button');
    figure.tabIndex = 0;
    figure.setAttribute('aria-haspopup', 'dialog');
    figure.setAttribute('aria-expanded', 'false');
    figure.setAttribute('aria-label', 'Read the full review by ' + review.reviewer);
    figure.dataset.tdbReviewOpen = review.id;
    figure.addEventListener('click', () => openDrawer(figure, review.id));
    figure.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDrawer(figure, review.id); } });
    slot.replaceChildren(figure);
    host.dataset.tdbReviewContext = context;
    host.dataset.tdbReviewId = review.id;
    host.dataset.tdbReviewReady = version;
    animated.push({ el: caption, opacity: 0 });
  }
  // Home and Location include both section padding and heading margin above its subhero.
  // Match that combined distance below the attribution without changing templates.
  function matchOuterSpacing() {
    if (!['', '/location'].includes(location.pathname.replace(/\/+$/, ''))) return;
    const host = document.querySelector('[data-tdb-power-snippet][data-tdb-review-ready]');
    const root = host?.parentElement;
    const section = root?.closest('section');
    const heading = root?.querySelector('h2');
    if (!section || !heading || !host.getClientRects().length) return;
    const gap = heading.getBoundingClientRect().top - section.getBoundingClientRect().top;
    if (gap > 0 && Math.abs((parseFloat(root.style.marginBottom) || 0) - gap) > .5) root.style.marginBottom = gap + 'px';
  }
  let drawerPromise;
  function loadDrawer() {
    if (window.TDBReviewDrawer) return Promise.resolve(window.TDBReviewDrawer);
    if (!drawerPromise) drawerPromise = new Promise((resolve, reject) => {
      const source = data;
      if (!source.drawerScript) { reject(new Error('Review drawer is unavailable.')); return; }
      const script = document.createElement('script');
      script.src = source.drawerScript; script.crossOrigin = 'anonymous';
      if (source.drawerIntegrity) script.integrity = source.drawerIntegrity;
      script.onload = () => window.TDBReviewDrawer ? resolve(window.TDBReviewDrawer) : reject(new Error('Review drawer did not load.'));
      script.onerror = () => { script.remove(); reject(new Error('Please try opening the reviews again.')); };
      document.head.append(script);
    }).catch(error => { drawerPromise = null; throw error; });
    return drawerPromise;
  }
  async function openDrawer(trigger, reviewId) {
    if (trigger.getAttribute('aria-busy') === 'true') return;
    trigger.setAttribute('aria-busy', 'true');
    try { document.querySelector('[data-tdb-review-error]')?.remove(); await (await loadDrawer()).open(trigger, reviewId); }
    catch (error) {
      let status = document.querySelector('[data-tdb-review-error]');
      if (!status) { status = element('p', 'tdb-review-load-error'); status.dataset.tdbReviewError = ''; status.setAttribute('role', 'status'); trigger.insertAdjacentElement('afterend', status); }
      status.textContent = 'The reviews could not load. Please tap again.';
    } finally { trigger.removeAttribute('aria-busy'); }
  }
  function start() {
    document.querySelectorAll('.button.is-review').forEach(updateBadge);
    document.querySelectorAll('[data-tdb-review-quote]').forEach(render);
    matchOuterSpacing();
    setInitialFade();
    document.querySelectorAll('[data-tdb-review-open]').forEach(trigger => {
      trigger.addEventListener('pointerenter', () => loadDrawer().catch(() => {}), {once:true});
      trigger.addEventListener('focus', () => loadDrawer().catch(() => {}), {once:true});
    });
    document.fonts?.ready.then(matchOuterSpacing);
    addEventListener('resize', matchOuterSpacing, { passive: true });
    addEventListener('pageshow', matchOuterSpacing);
    addEventListener('scroll', scheduleFade, { passive: true });
    addEventListener('resize', scheduleFade, { passive: true });
    addEventListener('pageshow', setInitialFade);
  }

  function mountReviewTrio(old, records, context) {
    const root = element('div','tdb-review-carousel tdb-patient-quotes');
    root.setAttribute('role','region'); root.setAttribute('aria-label','Featured patient reviews'); root.setAttribute('aria-roledescription','carousel');
    root.dataset.tdbPatientQuotes = '1.2.0'; root.dataset.reviewContext=context; root.dataset.quoteCount = records.length;
    const viewport = element('div','tdb-rc-viewport'), count = element('div','tdb-patient-position');
    count.setAttribute('role','status'); count.setAttribute('aria-live','polite'); count.setAttribute('aria-atomic','true');
    viewport.tabIndex = 0; viewport.setAttribute('aria-label','Patient reviews. Use left and right arrow keys to change review.');
    // Start at 01 with hidden text. First view brings in 02 already opaque.
    let active=0, reveal=0, moving=null, gesture=null, entryTimer=0, entryObserver=null;
    let entryPending=records.length>1, suppressUntil=0;
    root.dataset.tdbSliderFirstView = entryPending?'pending':'drawn';
    function cancelEntry() {
      clearTimeout(entryTimer);entryTimer=0;entryObserver?.disconnect();
      if(entryPending){entryPending=false;root.dataset.tdbSliderFirstView='manual';}
    }
    const slides = records.map((record,i) => {
      const card = element('div','tdb-rc-card'); card.dataset.reviewId = record.id;
      card.setAttribute('role','group'); card.setAttribute('aria-roledescription','slide'); card.setAttribute('aria-label',(i+1)+' of '+records.length);
      const content = element('div','tdb-rc-open');
      content.tabIndex=0;content.setAttribute('role','button');content.setAttribute('aria-haspopup','dialog');content.setAttribute('aria-label','Read the full review by '+record.name);content.dataset.tdbReviewOpen=record.id;
      content.append(element('p','tdb-rc-quote text-size-large',record.excerpt));
      content.addEventListener('click',()=>{if(performance.now()>suppressUntil&&!moving){cancelEntry();settle(0);openDrawer(content,record.id);}});
      content.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();cancelEntry();settle(0);openDrawer(content,record.id);}});
      const name = element('div','tdb-rc-name text-style-tagline-restored'); name.append(sourceIcon(record.platform,true),element('span','',record.name));
      name.style.opacity='0'; content.append(name); animated.push({el:name,opacity:0});
      card.append(content); viewport.append(card); return card;
    });
    root.append(viewport); if (records.length>1) root.append(count);
    function updateCount(index,direction=1) {
      if(window.TDBTicker) window.TDBTicker.count(count,index+1,records.length,direction);
      else count.textContent=String(index+1).padStart(2,'0')+' — '+String(records.length).padStart(2,'0');
    }
    function paint() {
      slides.forEach((node,i)=>{node.inert=i!==active;node.setAttribute('aria-hidden',String(i!==active));node.style.transform='translateX('+(i===active?0:100)+'%)';node.style.visibility=i===active?'visible':'hidden';});
      updateCount(active);
      scheduleFade();
    }
    function settle(delay=100) {
      clearTimeout(reveal); const target=active;
      reveal=setTimeout(()=>{if(!moving&&!gesture&&active===target)slides[target].classList.add('is-settled');},delay);
    }
    function finish() { if(!moving)return;const state=moving;moving=null;state.animations.forEach(a=>a.cancel());active=state.target;paint();if(state.entry){slides[active].classList.remove('is-first-entry');root.dataset.tdbSliderFirstView='drawn';} }
    function go(target,direction=1,offset=0,entry=false) {
      clearTimeout(reveal); finish();
      if(target===active){paint();settle();return;}
      updateCount(target,direction);
      const from=slides[active],to=slides[target],width=viewport.clientWidth;
      slides.forEach(n=>n.classList.remove('is-settled'));
      if(entry)to.classList.add('is-first-entry','is-settled');
      to.style.visibility='visible';to.inert=true;
      const duration=Math.max(120,carouselDuration(width)*(1-Math.min(Math.abs(offset)/width,.8)));
      const animations=[from.animate([{transform:'translateX('+offset+'px)'},{transform:'translateX('+(-direction*width)+'px)'}],{duration,easing:'ease',fill:'forwards'}),to.animate([{transform:'translateX('+(direction*width+offset)+'px)'},{transform:'translateX(0px)'}],{duration,easing:'ease',fill:'forwards'})];
      const state=moving={target,animations,entry};
      Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(moving!==state)return;finish();if(!entry)settle(direction<0?140:100);});
    }
    viewport.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0||records.length<2)return;
      cancelEntry();finish();clearTimeout(reveal);gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,horizontal:false};
    });
    viewport.addEventListener('pointermove',event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      if(!gesture.horizontal){
        if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){gesture=null;paint();settle();return;}
        if(Math.abs(dx)<12)return;
        gesture.horizontal=true;viewport.setPointerCapture(event.pointerId);slides.forEach(n=>n.classList.remove('is-settled'));
      }
      event.preventDefault();gesture.dx=dx;
      const direction=dx<0?1:-1,target=(active+direction+slides.length)%slides.length;
      slides.forEach((node,i)=>{if(i!==active&&i!==target)node.style.visibility='hidden';});
      slides[active].style.transform='translateX('+dx+'px)';slides[target].style.visibility='visible';slides[target].style.transform='translateX('+(direction*viewport.clientWidth+dx)+'px)';
    },{passive:false});
    function end(event,cancel) {
      if(!gesture||gesture.id!==event.pointerId)return;
      const previous=gesture;gesture=null;if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
      if(previous.horizontal)suppressUntil=performance.now()+600;
      const direction=previous.dx<0?1:-1;
      if(previous.horizontal&&!cancel&&Math.abs(previous.dx)>40)go((active+direction+slides.length)%slides.length,direction,previous.dx);
      else {paint();settle(60);}
    }
    viewport.addEventListener('pointerup',event=>end(event,false));viewport.addEventListener('pointercancel',event=>end(event,true));
    root.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();cancelEntry();const direction=event.key==='ArrowRight'?1:-1;finish();go((active+direction+slides.length)%slides.length,direction);}});
    if(!entryPending)slides[active].classList.add('is-settled');paint();
    old.replaceWith(root);
    if(entryPending){
      entryObserver=new IntersectionObserver(entries=>{
        const visible=entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.2);
        clearTimeout(entryTimer);
        if(!visible||!entryPending)return;
        entryTimer=setTimeout(()=>{
          if(!entryPending||gesture||moving)return;
          entryPending=false;entryObserver.disconnect();root.dataset.tdbSliderFirstView='moving';
          go(1,1,0,true);
        },120);
      },{threshold:.2});
      entryObserver.observe(viewport);
    }
    const ornament=root.parentElement.querySelector('.testimonial15_rating-wrapper');
    function centre(){if(!ornament)return;root.style.setProperty('--tdb-rc-star-gap',Math.max(0,root.getBoundingClientRect().top-ornament.getBoundingClientRect().bottom)+'px');}
    centre();new ResizeObserver(centre).observe(root.parentElement);document.fonts?.ready.then(centre);
  }
  function initReviewCarousels(){
    const context=contextForPath(location.pathname)||'default';
    const featuredId=data.contexts[context]?.id;
    const records=(data.carousels?.[context]||data.carousels?.default||[]).filter(record=>record.id!==featuredId).slice(0,3);
    if(!records.length)return;
    document.querySelectorAll('.testimonial_slider.w-slider').forEach(old=>{
      if(!old.parentElement.querySelector('.testimonial15_rating-wrapper')||!old.querySelector('.w-slider-nav'))return;
      mountReviewTrio(old,records,context);
    });
  }
  // Replace only the five-star patient testimonial component, before Webflow initialises it.
  const carouselObserver=new MutationObserver(initReviewCarousels);
  carouselObserver.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{initReviewCarousels();carouselObserver.disconnect();},{once:true});
  else{initReviewCarousels();carouselObserver.disconnect();}
  window.TDBPowerSnippets = Object.freeze({ version, mode: data.mode, capturedOn: data.capturedOn, sourceIcon, quoteMark: QUOTE_MARK, contextForPath, preview: data, loadDrawer });
  // The quote slot and its preceding badge already exist at this script position.
  // Populate their final layout now, not at DOMContentLoaded or after a download.
  start();
})();


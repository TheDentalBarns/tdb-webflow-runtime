/* TDB Power Snippets v1.1.0 — staging design preview, no carousel. */
(function () {
  'use strict';
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
  if (location.hostname !== 'dentalbarns.webflow.io' || window.TDBPowerSnippets) return;
  const version = '1.2.0';
  const platformIcons = {
  "Google": "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" class=\"injected-svg\" data-src=\"https://static.elfsight.com/icons/app-all-in-one-reviews-icons-google-multicolor.svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" role=\"img\">\n  <path fill=\"url(#a-488)\" d=\"M6.592 13.918a6.04 6.04 0 0 1-.307-1.909H2.208c0 1.517.343 2.946.947 4.227l.124.254v.01a10.063 10.063 0 0 0 1.889 2.604l4.47-1.674a6.12 6.12 0 0 1-3.046-3.512Z\"></path>\n  <path fill=\"url(#b-489)\" d=\"M18.883 4.619C17.148 3 14.896 2.01 12.198 2.01c-.531 1.11-.62 2.771 0 3.981 1.472 0 2.78.51 3.824 1.491l2.86-2.863Z\"></path>\n  <path fill=\"url(#c-490)\" d=\"M12.198 5.991h.095l-.095-3.981a9.936 9.936 0 0 0-7.645 3.577c.257 1.483.97 2.435 3.12 2.586 1.084-1.324 2.71-2.182 4.525-2.182Z\"></path>\n  <path fill=\"url(#d-491)\" d=\"M15.568 17.073c-.89.6-2.026.963-3.37.963-.784 1.262-1.31 2.562 0 3.972 2.53 0 4.675-.783 6.295-2.14l.318-.278c1.482-1.37 2.473-3.244 2.83-5.46.098-.607.148-1.24.148-1.894l-2.265.3-1.912 1.35-.037.177a4.596 4.596 0 0 1-1.813 2.871l-.194.139Z\"></path>\n  <path fill=\"#3086FF\" d=\"M12.207 10.195v3.864l5.368.004a7.211 7.211 0 0 1-.013.067h4.08a11.894 11.894 0 0 0-.034-3.94h-6.902v.005h-2.499Z\"></path>\n  <path fill=\"url(#e-492)\" d=\"m6.532 10.336.072-.227a6.136 6.136 0 0 1 1.719-2.616c-.93-.157-3.263-1.525-3.567-2.14a10.066 10.066 0 0 0-1.477 2.174 9.885 9.885 0 0 0-1.07 4.694c.723.313 3.082.37 4.08 0a5.926 5.926 0 0 1 .243-1.885Z\"></path>\n  <path fill=\"url(#f-493)\" d=\"M8.24 2.828 9.954 6.45c-.754.322-1.43.8-1.99 1.392l-3.77-1.798A10.016 10.016 0 0 1 8.24 2.828Z\"></path>\n  <path fill=\"url(#g-494)\" d=\"M12.198 18.036a5.733 5.733 0 0 1-3.046-.879l-1.562-.043c-1.839.489-2.372.882-2.538 1.872a9.935 9.935 0 0 0 7.146 3.022v-3.972Z\"></path>\n  <path fill=\"url(#h-487)\" d=\"M12.198 22.008c.421 0 .832-.022 1.231-.064v-4.017a6.84 6.84 0 0 1-1.23.109c-.413 0-.815-.045-1.203-.128v4.028c.394.047.795.072 1.202.072Z\" opacity=\".5\"></path>\n\n  <defs>\n    <radialGradient id=\"a-488\" cx=\"0\" cy=\"0\" r=\"1\" gradientTransform=\"matrix(-.39758 -10.0212 14.2947 -.60136 9.548 18.953)\" gradientUnits=\"userSpaceOnUse\">\n      <stop offset=\".142\" stop-color=\"#1ABD4D\"></stop>\n      <stop offset=\".248\" stop-color=\"#6EC30D\"></stop>\n      <stop offset=\".312\" stop-color=\"#8AC502\"></stop>\n      <stop offset=\".366\" stop-color=\"#A2C600\"></stop>\n      <stop offset=\".446\" stop-color=\"#C8C903\"></stop>\n      <stop offset=\".54\" stop-color=\"#EBCB03\"></stop>\n      <stop offset=\".616\" stop-color=\"#F7CD07\"></stop>\n      <stop offset=\".699\" stop-color=\"#FDCD04\"></stop>\n      <stop offset=\".771\" stop-color=\"#FDCE05\"></stop>\n      <stop offset=\".861\" stop-color=\"#FFCE0A\"></stop>\n    </radialGradient>\n\n    <radialGradient id=\"b-489\" cx=\"0\" cy=\"0\" r=\"1\" gradientTransform=\"matrix(6.98058 -.00002 -.00001 8.69619 18.606 7.276)\" gradientUnits=\"userSpaceOnUse\">\n      <stop offset=\".408\" stop-color=\"#FB4E5A\"></stop>\n      <stop offset=\"1\" stop-color=\"#FF4540\"></stop>\n    </radialGradient>\n\n    <radialGradient id=\"c-490\" cx=\"0\" cy=\"0\" r=\"1\" gradientTransform=\"matrix(-9.69141 5.2869 7.2839 12.9533 14.943 .736)\" gradientUnits=\"userSpaceOnUse\">\n      <stop offset=\".231\" stop-color=\"#FF4541\"></stop>\n      <stop offset=\".312\" stop-color=\"#FF4540\"></stop>\n      <stop offset=\".458\" stop-color=\"#FF4640\"></stop>\n      <stop offset=\".54\" stop-color=\"#FF473F\"></stop>\n      <stop offset=\".699\" stop-color=\"#FF5138\"></stop>\n      <stop offset=\".771\" stop-color=\"#FF5B33\"></stop>\n      <stop offset=\".861\" stop-color=\"#FF6C29\"></stop>\n      <stop offset=\"1\" stop-color=\"#FF8C18\"></stop>\n    </radialGradient>\n\n    <radialGradient id=\"d-491\" cx=\"0\" cy=\"0\" r=\"1\" gradientTransform=\"matrix(-17.1723 -22.6195 -8.27448 6.39613 12.433 20.73)\" gradientUnits=\"userSpaceOnUse\">\n      <stop offset=\".132\" stop-color=\"#0CBA65\"></stop>\n      <stop offset=\".21\" stop-color=\"#0BB86D\"></stop>\n      <stop offset=\".297\" stop-color=\"#09B479\"></stop>\n      <stop offset=\".396\" stop-color=\"#08AD93\"></stop>\n      <stop offset=\".477\" stop-color=\"#0AA6A9\"></stop>\n      <stop offset=\".568\" stop-color=\"#0D9CC6\"></stop>\n      <stop offset=\".667\" stop-color=\"#1893DD\"></stop>\n      <stop offset=\".769\" stop-color=\"#258BF1\"></stop>\n      <stop offset=\".801\" stop-color=\"#3086FF\"></stop>\n    </radialGradient>\n\n    <radialGradient id=\"e-492\" cx=\"0\" cy=\"0\" r=\"1\" gradientTransform=\"matrix(-1.20393 10.4774 14.3481 1.68074 11.206 4)\" gradientUnits=\"userSpaceOnUse\">\n      <stop offset=\".366\" stop-color=\"#FF4E3A\"></stop>\n      <stop offset=\".458\" stop-color=\"#FF8A1B\"></stop>\n      <stop offset=\".54\" stop-color=\"#FFA312\"></stop>\n      <stop offset=\".616\" stop-color=\"#FFB60C\"></stop>\n      <stop offset=\".771\" stop-color=\"#FFCD0A\"></stop>\n      <stop offset=\".861\" stop-color=\"#FECF0A\"></stop>\n      <stop offset=\".915\" stop-color=\"#FECF08\"></stop>\n      <stop offset=\"1\" stop-color=\"#FDCD01\"></stop>\n    </radialGradient>\n\n    <radialGradient id=\"f-493\" cx=\"0\" cy=\"0\" r=\"1\" gradientTransform=\"matrix(-3.50908 3.94959 -10.9464 -10.0725 9.582 3.782)\" gradientUnits=\"userSpaceOnUse\">\n      <stop offset=\".316\" stop-color=\"#FF4C3C\"></stop>\n      <stop offset=\".604\" stop-color=\"#FF692C\"></stop>\n      <stop offset=\".727\" stop-color=\"#FF7825\"></stop>\n      <stop offset=\".885\" stop-color=\"#FF8D1B\"></stop>\n      <stop offset=\"1\" stop-color=\"#FF9F13\"></stop>\n    </radialGradient>\n\n    <radialGradient id=\"g-494\" cx=\"0\" cy=\"0\" r=\"1\" gradientTransform=\"matrix(-9.59942 -5.20588 7.21476 -12.7547 14.895 23.203)\" gradientUnits=\"userSpaceOnUse\">\n      <stop offset=\".231\" stop-color=\"#0FBC5F\"></stop>\n      <stop offset=\".312\" stop-color=\"#0FBC5F\"></stop>\n      <stop offset=\".366\" stop-color=\"#0FBC5E\"></stop>\n      <stop offset=\".458\" stop-color=\"#0FBC5D\"></stop>\n      <stop offset=\".54\" stop-color=\"#12BC58\"></stop>\n      <stop offset=\".699\" stop-color=\"#28BF3C\"></stop>\n      <stop offset=\".771\" stop-color=\"#38C02B\"></stop>\n      <stop offset=\".861\" stop-color=\"#52C218\"></stop>\n      <stop offset=\".915\" stop-color=\"#67C30F\"></stop>\n      <stop offset=\"1\" stop-color=\"#86C504\"></stop>\n    </radialGradient>\n\n    <linearGradient id=\"h-487\" x1=\"10.996\" x2=\"13.429\" y1=\"19.958\" y2=\"19.958\" gradientUnits=\"userSpaceOnUse\">\n      <stop stop-color=\"#0FBC5C\"></stop>\n      <stop offset=\"1\" stop-color=\"#0CBA65\"></stop>\n    </linearGradient>\n  </defs>\n</svg>",
  "Facebook": "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" class=\"injected-svg\" data-src=\"https://static.elfsight.com/icons/app-all-in-one-reviews-icons-facebook-multicolor.svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" aria-hidden=\"true\" role=\"img\">\n  <circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"#0076FB\"></circle>\n  <path fill=\"#fff\" fill-rule=\"evenodd\" d=\"M16.167 6.167v2.639h-1.842a1.04 1.04 0 0 0-1.048 1.03v2.04h2.843l-.393 2.935h-2.45v7.108a10.113 10.113 0 0 1-2.982-.064v-7.044H7.833v-2.934h2.462V9.412c0-1.792 1.477-3.245 3.298-3.245h2.574Z\" clip-rule=\"evenodd\"></path>\n</svg>",
  "Yell": "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" class=\"injected-svg\" data-src=\"https://static.elfsight.com/icons/app-all-in-one-reviews-icons-yell-multicolor.svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"><path fill=\"#FCDB00\" d=\"M3.47 3.525a1.637 1.637 0 0 1 1.145-.488h3.337c.024.583.054 1.167.033 1.75a3.755 3.755 0 0 1-.192 1.1c-.179.496-.475.94-.795 1.355-.556.715-1.206 1.35-1.829 2.007-.058.06-.055.154-.018.224a.719.719 0 0 0 .308.279c.296.155.644.192.972.143.426-.063.817-.275 1.145-.55C8.19 8.836 8.76 8.272 9.39 7.78c.243-.188.551-.288.858-.279.32.018.64.116.904.3.292.202.518.482.725.767.348.487.648 1.005.962 1.514.896 1.46 1.789 2.92 2.7 4.37.15.23.284.469.45.687.257.342.598.627.999.784.351.14.734.187 1.111.178.035-.001.08-.008.095-.045.01-.043-.016-.082-.032-.12-.839-1.765-1.694-3.524-2.541-5.286-.64-1.33-1.282-2.66-1.915-3.993-.156-.333-.315-.666-.465-1.002a50.816 50.816 0 0 1-1.038-2.6l-.006-.022c.346.008.693.001 1.039.004h5.839c.206.002.415-.013.618.033a1.645 1.645 0 0 1 1.306 1.683v14.583c.002.353-.118.705-.333.985a1.643 1.643 0 0 1-1.23.644c-.149.003-.297.001-.446.002H4.838c-.15-.001-.3.006-.447-.018a1.646 1.646 0 0 1-1.113-.705A1.613 1.613 0 0 1 3 19.352V4.651c.002-.418.176-.83.47-1.126Zm6.942 5.125c-.13.021-.199.144-.267.243-1.134 1.73-2.27 3.458-3.392 5.194-.18.277-.363.563-.448.887-.073.279-.052.591.094.844.14.24.399.386.663.45a.33.33 0 0 0 .34-.095c.055-.066.108-.135.162-.203.782-1.009 1.547-2.03 2.315-3.05.713-.948 1.425-1.897 2.135-2.848.043-.054.083-.128.05-.198-.075-.183-.21-.332-.337-.48-.22-.236-.457-.466-.746-.617-.175-.086-.371-.16-.57-.127Zm-5.789 9.072c.001.274.07.548.205.786.276.5.828.835 1.4.836l11.508.005c.5.003.99-.246 1.292-.642.217-.28.34-.63.336-.985H4.624Z\"></path><path fill=\"#000\" d=\"M7.952 3.037h4.099c.043 0 .087.002.13-.004l.022.021c.33.874.661 1.747 1.038 2.601.15.336.309.669.465 1.002.633 1.334 1.274 2.663 1.915 3.993.847 1.762 1.702 3.52 2.541 5.287.016.037.042.076.032.119-.014.037-.06.044-.095.045-.377.01-.76-.037-1.111-.178a2.353 2.353 0 0 1-1-.784c-.165-.218-.3-.457-.448-.687-.912-1.45-1.805-2.91-2.7-4.37-.315-.509-.615-1.027-.963-1.514-.207-.285-.433-.565-.725-.766a1.751 1.751 0 0 0-.904-.301 1.347 1.347 0 0 0-.858.28c-.63.491-1.199 1.055-1.814 1.564-.328.275-.719.487-1.145.55a1.59 1.59 0 0 1-.972-.143.719.719 0 0 1-.308-.279c-.038-.07-.04-.165.018-.224.623-.656 1.273-1.292 1.829-2.007.32-.416.616-.86.795-1.356.126-.352.176-.726.192-1.098.021-.584-.01-1.168-.033-1.751Z\"></path><path fill=\"#000\" d=\"M10.412 8.65c.198-.034.394.041.57.127.288.15.525.381.745.617.128.148.262.297.337.48.033.07-.006.144-.05.198-.71.95-1.422 1.9-2.135 2.848-.768 1.02-1.533 2.041-2.315 3.05l-.162.204a.328.328 0 0 1-.34.094c-.264-.064-.523-.21-.663-.45a1.126 1.126 0 0 1-.094-.844c.085-.324.267-.61.448-.887 1.123-1.736 2.258-3.465 3.392-5.194.068-.099.138-.222.267-.243Zm-5.789 9.072h14.741c.003.354-.12.706-.336.985a1.641 1.641 0 0 1-1.292.642l-11.508-.005a1.636 1.636 0 0 1-1.4-.836 1.61 1.61 0 0 1-.205-.786Z\"></path></svg>",
  "Star": "<svg width=\"100%\" viewBox=\"0 0 18 17\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M8.16379 0.551109C8.47316 -0.183704 9.52684 -0.183703 9.83621 0.551111L11.6621 4.88811C11.7926 5.19789 12.0875 5.40955 12.426 5.43636L17.1654 5.81173C17.9684 5.87533 18.294 6.86532 17.6822 7.38306L14.0713 10.4388C13.8134 10.6571 13.7007 10.9996 13.7795 11.3259L14.8827 15.8949C15.0696 16.669 14.2172 17.2809 13.5297 16.8661L9.47208 14.4176C9.18225 14.2427 8.81775 14.2427 8.52793 14.4176L4.47029 16.8661C3.7828 17.2809 2.93036 16.669 3.11727 15.8949L4.22048 11.3259C4.29928 10.9996 4.18664 10.6571 3.92873 10.4388L0.317756 7.38306C-0.294046 6.86532 0.0315611 5.87533 0.834562 5.81173L5.57402 5.43636C5.91255 5.40955 6.20744 5.19789 6.33786 4.88811L8.16379 0.551109Z\" fill=\"currentColor\"></path>\n</svg>"
}
;
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
      if(!svg&&platformIcons[platform]){const template=document.createElement('template');template.innerHTML=platformIcons[platform];svg=template.content.firstElementChild;}
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
      if (!data.drawerScript) { reject(new Error('Review drawer is unavailable.')); return; }
      const script = document.createElement('script');
      script.src = data.drawerScript; script.crossOrigin = 'anonymous';
      if (data.drawerIntegrity) script.integrity = data.drawerIntegrity;
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

  function initReviewCarousels(){
    const context=contextForPath(location.pathname)||'default';
    const records=data.carousels?.[context]||data.carousels?.default;
    if(!records?.length)return;
    document.querySelectorAll('.testimonial_slider.w-slider').forEach(old=>{
      if(!old.parentElement.querySelector('.testimonial15_rating-wrapper')||!old.querySelector('.w-slider-nav'))return;
      const root=element('div','tdb-review-carousel');root.setAttribute('role','region');root.setAttribute('aria-label','Featured patient reviews');root.setAttribute('aria-roledescription','carousel');
      root.dataset.reviewContext=context;
      const viewport=element('div','tdb-rc-viewport'),dots=element('div','tdb-rc-dots');
      let active=0,timer=0,reveal=0,moving=null,gesture=null,suppressUntil=0,inView=false,hover=false,focused=false,paused=false;
      const slides=records.map((r,i)=>{
        const card=element('div','tdb-rc-card');card.setAttribute('role','group');card.setAttribute('aria-roledescription','slide');card.setAttribute('aria-label',(i+1)+' of '+records.length);
        const quote=element('div','tdb-rc-open');quote.tabIndex=0;quote.setAttribute('role','button');quote.setAttribute('aria-haspopup','dialog');quote.setAttribute('aria-label','Read the full review by '+r.name);quote.dataset.tdbReviewOpen=r.id;
        quote.append(element('p','tdb-rc-quote text-size-large',r.excerpt));
        const name=element('div','tdb-rc-name text-style-tagline-restored');name.append(sourceIcon(r.platform,true),element('span','',r.name));quote.append(name);animated.push({el:name,opacity:0});
        quote.addEventListener('click',()=>{if(performance.now()>suppressUntil&&!moving)openDrawer(quote,r.id);});
        quote.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDrawer(quote,r.id);}});
        card.append(quote);viewport.append(card);return card;
      });
      const controls=records.map((r,i)=>{
        const b=element('button','tdb-rc-dot');b.type='button';b.setAttribute('aria-label','Show patient review '+(i+1)+' of '+records.length);b.append(element('span'));
        b.addEventListener('click',()=>go(i,i<active?-1:1));dots.append(b);return b;
      });
      const pause=element('button','tdb-rc-pause tdb-review-sr-only','Pause rotating reviews');pause.type='button';pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume rotating reviews':'Pause rotating reviews';schedule();});
      root.append(viewport,dots,pause);
      function paint(){
        slides.forEach((n,i)=>{n.inert=i!==active;n.setAttribute('aria-hidden',String(i!==active));n.style.transform='translateX('+(i===active?0:100)+'%)';n.style.visibility=i===active?'visible':'hidden';});
        controls.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===active)));
      }
      function schedule(){clearTimeout(timer);if(inView&&!hover&&!focused&&!paused&&!document.hidden)timer=setTimeout(()=>{if(document.querySelector('[data-tdb-review-overlay]:not([hidden])')){schedule();return;}go((active+1)%slides.length,1);},5000);}
      function finish(){if(!moving)return;const m=moving;moving=null;m.animations.forEach(a=>a.cancel());active=m.target;paint();}
      function go(target,direction=1,offset=0){
        if(moving)finish();if(target===active){schedule();return;}
        clearTimeout(reveal);clearTimeout(timer);
        const from=slides[active],to=slides[target];slides.forEach(n=>n.classList.remove('is-settled'));
        to.style.visibility='visible';to.inert=true;const width=viewport.clientWidth;
        const duration=Math.max(120,400*(1-Math.min(Math.abs(offset)/width,.8)));
        const animations=[from.animate([{transform:'translateX('+offset+'px)'},{transform:'translateX('+(-direction*width)+'px)'}],{duration,easing:'ease',fill:'forwards'}),to.animate([{transform:'translateX('+(direction*width+offset)+'px)'},{transform:'translateX(0px)'}],{duration,easing:'ease',fill:'forwards'})];
        const state=moving={target,animations};
        Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(moving!==state)return;finish();reveal=setTimeout(()=>slides[active].classList.add('is-settled'),direction<0?140:100);schedule();});
      }
      viewport.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;finish();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,horizontal:false};clearTimeout(timer);});
      viewport.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){gesture=null;schedule();return;}if(Math.abs(dx)<12)return;gesture.horizontal=true;viewport.setPointerCapture(e.pointerId);slides[active].classList.remove('is-settled');}
        e.preventDefault();gesture.dx=dx;const dir=dx<0?1:-1,target=(active+dir+slides.length)%slides.length;slides[active].style.transform='translateX('+dx+'px)';slides[target].style.visibility='visible';slides[target].style.transform='translateX('+(dir*viewport.clientWidth+dx)+'px)';
      },{passive:false});
      function end(e,cancel){if(!gesture||e.pointerId!==gesture.id)return;const g=gesture;gesture=null;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);if(g.horizontal){suppressUntil=performance.now()+600;const dir=g.dx<0?1:-1;if(!cancel&&Math.abs(g.dx)>40)go((active+dir+slides.length)%slides.length,dir,g.dx);else{paint();reveal=setTimeout(()=>slides[active].classList.add('is-settled'),60);schedule();}}else schedule();}
      viewport.addEventListener('pointerup',e=>end(e,false));viewport.addEventListener('pointercancel',e=>end(e,true));
      root.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const dir=e.key==='ArrowRight'?1:-1;if(moving)finish();go((active+dir+slides.length)%slides.length,dir);}});
      root.addEventListener('mouseenter',()=>{hover=true;clearTimeout(timer);});root.addEventListener('mouseleave',()=>{hover=false;schedule();});
      root.addEventListener('focusin',()=>{focused=true;clearTimeout(timer);});root.addEventListener('focusout',()=>{requestAnimationFrame(()=>{focused=root.contains(document.activeElement);schedule();});});
      document.addEventListener('visibilitychange',schedule);
      new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();},{threshold:.25}).observe(root);
      old.replaceWith(root);
      const fixedStars=root.parentElement.querySelector('.testimonial15_rating-wrapper');
      function centre(){if(!fixedStars)return;const gap=Math.max(0,root.getBoundingClientRect().top-fixedStars.getBoundingClientRect().bottom);root.style.setProperty('--tdb-rc-star-gap',gap+'px');}
      centre();new ResizeObserver(centre).observe(root.parentElement);
      paint();slides[0].classList.add('is-settled');setInitialFade();
    });
  }
  function ensureNervousCarousel(){
    if(contextForPath(location.pathname)!=='nervous'||document.querySelector('.tdb-review-carousel'))return;
    const original=document.querySelector('.section_standard-testimonial');
    if(!original)return;
    const copy=original.cloneNode(true);
    copy.querySelectorAll('[id],[data-w-id]').forEach(n=>{n.removeAttribute('id');n.removeAttribute('data-w-id');});
    const ornament=copy.querySelector('.testimonial_wrapper');
    const stars=element('div','testimonial15_rating-wrapper');
    const native=document.querySelector('.button.is-review .testimonial15_rating-icon:not(.vendor)');
    if(!ornament||!native)return;
    for(let i=0;i<5;i++)stars.append(native.cloneNode(true));
    const gap=element('div','margin-bottom margin-xlarge');gap.append(stars);ornament.replaceChildren(gap);
    original.before(copy);initReviewCarousels();
  }
  // Replace only the five-star patient testimonial component, before Webflow initialises it.
  const carouselObserver=new MutationObserver(initReviewCarousels);
  carouselObserver.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{initReviewCarousels();ensureNervousCarousel();carouselObserver.disconnect();},{once:true});
  else{initReviewCarousels();ensureNervousCarousel();carouselObserver.disconnect();}
  window.TDBPowerSnippets = Object.freeze({ version, mode: data.mode, capturedOn: data.capturedOn, sourceIcon, quoteMark: QUOTE_MARK, contextForPath, preview: data, loadDrawer });
  // The quote slot and its preceding badge already exist at this script position.
  // Populate their final layout now, not at DOMContentLoaded or after a download.
  start();
})();

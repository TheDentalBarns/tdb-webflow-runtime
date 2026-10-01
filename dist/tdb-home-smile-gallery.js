/* Homepage only: shared CMS cards and presentation, with a gallery introduction. */
(() => {
  'use strict';
  if (document.documentElement.dataset.wfPage !== '677cf86df9952f978d94d8a9') return;
  function mount() {
    const section = document.querySelector('.section_smile-gallery');
    const slider = section?.querySelector('[data-tdb-smile-slider]');
    const layout = slider?.closest('.testimonial15_slide-content');
    if (!layout || section.hasAttribute('data-tdb-home-smile')) return;
    const copy = [...layout.children].filter(node => node.classList.contains('testimonial15_content-right'));
    if (copy.length !== 2) return;
    const [intro, outro] = copy;
    section.dataset.tdbHomeSmile = '1.0.0';
    intro.classList.add('tdb-home-smile-intro');
    intro.innerHTML = '<div class="margin-bottom margin-small"><div class="text-style-tagline-restored">Smile gallery</div></div>' +
      '<div class="margin-bottom margin-small"><h2 class="heading-style-h2">See what’s possible for your smile.</h2></div>' +
      '<p class="text-size-medium opacity-75">Explore real patient transformations, with treatment details, time and costs alongside each case.</p>';
    outro.classList.add('tdb-home-smile-link');
    outro.innerHTML = '<a class="button is-icon is-secondary w-inline-block" href="/smile-gallery"><div>Explore the Smile Gallery</div>' +
      '<div class="icon-embed-xxsmall w-embed"><svg width="100%" height="100%" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="m18 6l-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10z"></path></svg></div></a>';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();

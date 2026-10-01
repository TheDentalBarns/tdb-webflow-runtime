/* Homepage only: shared CMS cards and presentation, with a gallery introduction. */
(() => {
  'use strict';
  if (document.documentElement.dataset.wfPage !== '677cf86df9952f978d94d8a9') return;
  function galleryCount(button, section) {
    const label = button.firstElementChild;
    async function update() {
      try {
        // Read the full published gallery, not the homepage's featured subset.
        // A template keeps its images and scripts inert; only the case count is used.
        const response = await fetch(button.getAttribute('href'), { credentials: 'same-origin', priority: 'low' });
        if (!response.ok) return;
        const template = document.createElement('template');
        template.innerHTML = await response.text();
        const total = template.content.querySelectorAll('[data-tdb-sg-list] [data-tdb-sg-case]').length;
        if (total > 0) label.textContent = 'See our ' + total.toLocaleString('en-GB') + (total === 1 ? ' smile' : ' smiles');
      } catch (_) { /* The gallery link remains usable if the count is unavailable. */ }
    }
    // Load ahead of the button without adding work to the homepage's first view.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();update();
      }, { rootMargin: '800px 0px' });
      observer.observe(section);
    } else update();
  }
  function mount() {
    const section = document.querySelector('.section_smile-gallery');
    const slider = section?.querySelector('[data-tdb-smile-slider]');
    const layout = slider?.closest('.testimonial15_slide-content');
    if (!layout || section.hasAttribute('data-tdb-home-smile')) return;
    const copy = [...layout.children].filter(node => node.classList.contains('testimonial15_content-right'));
    if (copy.length !== 2) return;
    const [intro, outro] = copy;
    section.dataset.tdbHomeSmile = '1.1.0';
    intro.classList.add('tdb-home-smile-intro');
    intro.innerHTML = '<div class="margin-bottom margin-small"><div class="text-style-tagline-restored">Smile gallery</div></div>' +
      '<div class="margin-bottom margin-small"><h2 class="heading-style-h2">See what’s possible for your smile.</h2></div>' +
      '<p class="text-size-medium opacity-75">Explore real patient transformations, with treatment details, time and costs alongside each case.</p>';
    outro.classList.add('tdb-home-smile-link');
    outro.innerHTML = '<a class="button is-icon is-secondary w-inline-block" href="/smile-gallery"><div>See our smiles</div>' +
      '<div class="icon-embed-xxsmall w-embed"><svg width="100%" height="100%" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="m18 6l-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10z"></path></svg></div></a>';
    galleryCount(outro.querySelector('a'), section);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();

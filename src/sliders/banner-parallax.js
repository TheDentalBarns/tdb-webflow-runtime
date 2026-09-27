/* Treatment-style CMS banners reuse the service parallax renderer and runtime. */
(() => {
  'use strict';
  if (window.TDBBannerParallax) return;
  const selector = '.highlight-swiper_component:not([data-tdb-smile-slider]):not([data-tdb-ig-feed]):has(.layout423_card:not(.smile))';
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const realLink = node => {
    const href = node?.getAttribute('href')?.trim();
    return href && href !== '#' && !/^javascript:/i.test(href) ? node : null;
  };
  function prepare(component) {
    if (!component.matches(selector)) return false;
    const swiperEl = component.querySelector(':scope > .swiper');
    const wrapper = swiperEl?.querySelector(':scope > .swiper-wrapper');
    if (!wrapper || swiperEl.swiper) return false;
    const slides = [...wrapper.children].filter(node => node.matches('.swiper-slide:not(.swiper-slide-duplicate)'));
    const sources = slides.map(slide => {
      const card = slide.querySelector('.layout423_card:not(.smile)');
      const title = card?.querySelector('h1,h2,h3,h4,.heading-style-h4');
      const image = card?.querySelector('.layout423_image');
      if (!card || !title || !image) return null;
      const link = realLink(card.querySelector('.layout423_card-content-bottom a[href]')) || realLink(card);
      const label = link?.getAttribute('href')?.startsWith('/treatments/') ? 'Discover treatment'
        : card.querySelector('.button')?.textContent.replace(/\s+/g, ' ').trim() || 'Learn more';
      return { title, image, link, label, paragraphs: [...card.querySelectorAll('.layout423_card-content-bottom p')] };
    });
    // Do not partially convert an unrelated or incomplete card collection.
    if (!sources.length || sources.some(source => !source)) return false;
    slides.forEach((slide, index) => {
      const source = sources[index];
      const card = make('div', 'showcase_card');
      const content = make('div', 'showcase-card_content text-color-alternate');
      const copy = make('div', 'max-width-xsmall service-card-mobile-copy');
      copy.setAttribute('data-fade-slide', 'true');
      source.paragraphs.forEach(paragraph => {
        copy.append(make('p', 'text-size-medium opacity-75', paragraph.textContent.trim()));
      });
      const bottom = make('div', 'showcase-content_btm');
      const title = make(source.title.tagName.toLowerCase(), 'heading-style-h4 service-card-mobile-title', source.title.textContent.trim());
      title.setAttribute('data-fade-slide', 'true');
      const buttonWrap = make('div', 'service-card-button-wrap');
      if (source.link) {
        const button = make('a', 'button is-icon is-secondary w-inline-block');
        for (const attr of ['href', 'target', 'rel']) {
          const value = source.link.getAttribute(attr);
          if (value) button.setAttribute(attr, value);
        }
        button.append(make('div', '', source.label));
        const icon = make('div', 'icon-embed-xxsmall w-embed');
        icon.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="m18 6l-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10z"/></svg>';
        button.append(icon);
        buttonWrap.append(button);
      }
      bottom.append(title, buttonWrap);
      content.append(copy, bottom);
      const image = source.image.cloneNode(true);
      image.className = 'showcase_image';
      image.removeAttribute('style');
      image.removeAttribute('id');
      image.setAttribute('data-swiper-parallax-x', '30%');
      image.setAttribute('sizes', '140vw');
      const overlay = make('div', 'image-overlay-layer is-showcase-card');
      card.append(content, image, overlay);
      slide.classList.remove('is-3-grid');
      slide.classList.add('is-showcase');
      slide.replaceChildren(card);
    });
    wrapper.classList.remove('is-3-grid');
    const controls = component.querySelector(':scope > .swiper_functions-btm');
    controls?.classList.add('hide');
    controls?.querySelectorAll('.is-dark').forEach(node => node.classList.remove('is-dark'));
    component.classList.remove('highlight-swiper_component');
    component.classList.add('parallax-swiper_component', 'tdb-banner-parallax', 'tdb-entry-pending');
    component.setAttribute('data-tdb-banner-parallax', '1.0.0');
    component.setAttribute('role', 'region');
    component.setAttribute('aria-roledescription', 'carousel');
    component.setAttribute('aria-label', sources.some(source => source.link?.getAttribute('href')?.startsWith('/treatments/')) ? 'Treatments' : 'Discover more');
    return true;
  }
  function refresh(root = document) {
    if (root instanceof Element && root.matches(selector)) prepare(root);
    root.querySelectorAll?.(selector).forEach(prepare);
  }
  window.TDBBannerParallax = Object.freeze({ version: '1.0.0', prepare, refresh });
  refresh();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => refresh(), { once: true });
})();

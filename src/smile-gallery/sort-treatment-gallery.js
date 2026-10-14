/* Preserve initial ordering before sliders mount. */
(() => {
  const path = window.location.pathname.toLowerCase();
  const map = {
    'composite-bonding': '.cb-priority',
    invisalign: '.invisalign-priority',
    veneers: '.veneers-priority',
  };
  const selector = Object.entries(map).find(([slug]) => path.includes(slug))?.[1];
  if (!selector) {
    document.documentElement.classList.remove('tdb-smile-sorting');
    return;
  }
  document.querySelectorAll('.gallery17_component .highlight-swiper_component').forEach(component => {
    const wrapper = component.querySelector('.swiper-wrapper');
    if (!wrapper) return;
    const slides = Array.from(wrapper.children);
    slides.sort((a, b) => {
      const aText = a.querySelector(selector)?.textContent.trim() || '';
      const bText = b.querySelector(selector)?.textContent.trim() || '';
      const ap = aText !== '' && !Number.isNaN(Number(aText)) ? Number(aText) : 999999;
      const bp = bText !== '' && !Number.isNaN(Number(bText)) ? Number(bText) : 999999;
      return ap - bp;
    });
    slides.forEach(slide => wrapper.appendChild(slide));
  });
  document.documentElement.classList.remove('tdb-smile-sorting');
})();

(() => {
  const path = window.location.pathname.toLowerCase();

  const treatmentPriorityMap = {
    'composite-bonding': '.cb-priority',
    invisalign: '.invisalign-priority',
    veneers: '.veneers-priority',
  };

  const prioritySelector = Object.entries(treatmentPriorityMap).find(([treatmentSlug]) =>
    path.includes(treatmentSlug),
  )?.[1];

  if (!prioritySelector) {
    document.documentElement.classList.remove('tdb-smile-sorting');
    return;
  }

  const components = document.querySelectorAll('.gallery17_component .highlight-swiper_component');

  components.forEach((component) => {
    const wrapper = component.querySelector('.swiper-wrapper');

    if (!wrapper) return;

    const slides = Array.from(wrapper.children);

    slides.sort((a, b) => {
      const aText = a.querySelector(prioritySelector)?.textContent.trim() || '';
      const bText = b.querySelector(prioritySelector)?.textContent.trim() || '';

      const aPriority = aText !== '' && !Number.isNaN(Number(aText)) ? Number(aText) : 999999;
      const bPriority = bText !== '' && !Number.isNaN(Number(bText)) ? Number(bText) : 999999;

      return aPriority - bPriority;
    });

    slides.forEach((slide) => {
      wrapper.appendChild(slide);
    });
  });

  document.documentElement.classList.remove('tdb-smile-sorting');
})();

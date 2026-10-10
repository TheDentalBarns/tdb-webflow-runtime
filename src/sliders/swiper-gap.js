/* Read Designer's responsive gap only during mount/resize/breakpoint work.
 * Swiper writes inline margins; briefly release only that override so the
 * native stylesheet remains the single source of responsive spacing. */
function nativeGap(root, fallback = 0, slideSelector) {
  const slide = slideSelector && root.querySelector(slideSelector);
  if (slideSelector && !slide) return fallback;
  let gap;
  if (slide) {
    const value = slide.style.getPropertyValue('margin-right');
    const priority = slide.style.getPropertyPriority('margin-right');
    slide.style.removeProperty('margin-right');
    try { gap = parseFloat(getComputedStyle(slide).marginRight); }
    finally { if (value) slide.style.setProperty('margin-right', value, priority); }
  } else {
    gap = parseFloat(getComputedStyle(root).columnGap);
  }
  return Number.isFinite(gap) ? gap : fallback;
}

/* Native sticky category and treatment headers share the disclosure/navbar
 * controllers. An approaching open treatment pushes its category out of view. */
(() => {
  function start() {
    const sections = [...document.querySelectorAll('[data-tdb-price-section]')];
    if (!sections.length) return;
    const navbar = document.querySelector('.navbar10_component');
    const categories = new Map(
      sections.map((section) => [
        section,
        {
          heading: section.querySelector(':scope > [data-tdb-disclosure-trigger]'),
          treatments: [...section.querySelectorAll('[data-tdb-price-trigger]')],
          closing: null,
        },
      ]),
    );
    let active = null;
    let anchor = null;
    let approaching = false;
    let waitingForScroll = false;
    let frame = 0;
    function pushCategoryHeadings(returningHeading) {
      // Read all geometry before writing. Native sticky positioning owns the
      // pin; this collision offset only makes room for an expanded treatment.
      const positions = [...categories.values()].map((category) => {
        const { heading, treatments } = category;
        let push = 0;
        if (heading?.getAttribute('aria-expanded') === 'true') {
          const height = heading.getBoundingClientRect().height;
          for (const trigger of treatments) {
            if (
              (trigger.getAttribute('aria-expanded') !== 'true' && trigger !== category.closing) ||
              trigger.closest('[hidden],[inert]')
            )
              continue;
            const item = trigger.closest('[data-tdb-disclosure-item]');
            if (!item) continue;
            const rect = item.getBoundingClientRect();
            if (trigger === category.closing && (rect.top >= height || rect.bottom <= 0))
              category.closing = null;
            push = Math.min(
              push,
              -Math.min(height, Math.max(0, height - rect.top), Math.max(0, rect.bottom)),
            );
          }
        }
        return { heading, value: `${Math.round(push * 100) / 100}px` };
      });
      for (const { heading, value } of positions) {
        if (heading && heading.style.getPropertyValue('--tdb-price-category-push') !== value) {
          if (
            heading === returningHeading &&
            parseFloat(value) >
              (parseFloat(heading.style.getPropertyValue('--tdb-price-category-push')) || 0)
          )
            heading.setAttribute('data-tdb-price-returning', '');
          heading.style.setProperty('--tdb-price-category-push', value);
        }
      }
    }
    function clearCategoryReturns() {
      for (const { heading } of categories.values())
        heading?.removeAttribute('data-tdb-price-returning');
    }
    for (const { heading } of categories.values())
      heading?.addEventListener('transitionend', (event) => {
        if (event.target === heading && event.propertyName === 'transform')
          heading.removeAttribute('data-tdb-price-returning');
      });
    const eligible = (section) => {
      const { heading, treatments } = categories.get(section);
      const categoryOpen = heading?.getAttribute('aria-expanded') === 'true';
      const treatmentOpen = treatments.some(
        (trigger) =>
          trigger.getAttribute('aria-expanded') === 'true' && !trigger.closest('[hidden],[inert]'),
      );
      if (!categoryOpen && !treatmentOpen) return false;
      const rect = section.getBoundingClientRect();
      const visible = rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
      if (section === anchor && visible) approaching = false;
      const categoryAtChrome = categoryOpen && rect.top <= (navbar?.offsetHeight || 0);
      return (
        (visible && (treatmentOpen || categoryAtChrome || section === anchor)) ||
        (section === anchor && approaching)
      );
    };
    function release() {
      if (!active) return;
      active = null;
      anchor = null;
      approaching = false;
      waitingForScroll = false;
      window.TDBNavScroll?.release({ respectDirection: true });
      document.documentElement.classList.remove('tdb-slider-focus');
    }
    function sync(returningHeading) {
      pushCategoryHeadings(returningHeading);
      const next = (anchor && eligible(anchor) && anchor) || sections.find(eligible);
      if (
        !waitingForScroll &&
        next === active &&
        (!next || document.documentElement.classList.contains('tdb-slider-focus'))
      )
        return;
      if (!next) return waitingForScroll ? undefined : release();
      active = next;
      waitingForScroll = false;
      // The shared focus class moves the handle away without discarding its
      // scroll pose. Only close a fully open form; a peek must survive release.
      if (document.querySelector('#tdb-vip-drawer.is-open')) window.TDBVIPDrawer?.close?.();
      window.TDBNavScroll?.focus(release, () => !!active && eligible(active));
      document.documentElement.classList.add('tdb-slider-focus');
    }
    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    }
    document.addEventListener('tdb:price-anchor', (event) => {
      if (!sections.includes(event.target)) return;
      anchor = event.target;
      approaching = true;
      sync();
    });
    // Native anchor scrolling owns movement/history/focus. A fresh gesture can
    // interrupt that journey; never leave an offscreen destination holding chrome.
    function interruptAnchor(event) {
      if (
        event.type === 'keydown' &&
        !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(
          event.key,
        )
      )
        return;
      // A click-driven return can ease into place; a fresh scroll gesture must
      // immediately resume the existing geometry-driven sticky handover.
      clearCategoryReturns();
      if (!approaching) return;
      approaching = false;
      sync();
    }
    for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown'])
      document.addEventListener(type, interruptAnchor, { capture: true, passive: true });
    document.addEventListener('tdb:disclosure-change', (event) => {
      const category = categories.get(event.target.closest('[data-tdb-price-section]'));
      if (!category) return;
      let returningHeading = null;
      category.heading?.removeAttribute('data-tdb-price-returning');
      if (event.target.hasAttribute('data-tdb-price-trigger')) {
        if (
          event.target.getAttribute('aria-expanded') === 'true' &&
          category.closing &&
          category.closing !== event.target
        )
          returningHeading = category.heading;
        // Closing is not scroll intent. Keep the row the user just pressed
        // uncovered until it naturally clears the sticky category's band.
        category.closing =
          event.target.getAttribute('aria-expanded') === 'false' &&
          parseFloat(category.heading?.style.getPropertyValue('--tdb-price-category-push')) < 0
            ? event.target
            : null;
      } else if (category.heading?.getAttribute('aria-expanded') !== 'true')
        category.closing = null;
      if (active && !sections.some(eligible)) {
        // Closing changes layout, not scroll intent. Leave every chrome surface
        // parked and restart the shared navigation distance counters. Observer
        // callbacks caused by the collapse must not reveal them either.
        waitingForScroll = true;
        window.TDBNavScroll?.focus(
          release,
          () => !waitingForScroll && !!active && eligible(active),
        );
        return;
      }
      sync(returningHeading);
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(sync);
      sections.forEach((section) => observer.observe(section));
    }
    // An observer may enter at the exact edge (zero visible area) and then
    // emit nothing as the section moves further in. Recheck on scroll in
    // either direction; closed categories never need a geometry read.
    window.addEventListener(
      'scroll',
      () => {
        if (waitingForScroll && !window.TDBNavScroll) return release();
        schedule();
      },
      { passive: true },
    );
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('pagehide', () => {
      cancelAnimationFrame(frame);
      frame = 0;
      clearCategoryReturns();
      release();
    });
    // The first disclosure pass may have opened a deep link before this owner
    // was listening. Replay only the current hash after all listeners exist.
    window.TDBDisclosure?.openHash(location.hash);
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

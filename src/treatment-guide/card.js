/* Enhance the native CMS card. Designer owns every resting element and its space. */
window.TDBTreatmentGuideCard ||= (() => {
  function mount(root, initial, navigate) {
    const panes = [...root.querySelectorAll('[data-tdb-guide-panel]')],
      content = root.querySelector('.treatment-guide_content'),
      pagination = root.querySelector('[data-tdb-guide-pagination]');
    if (panes.length !== 5 || !content || !pagination) return null;
    const events = new AbortController(),
      rows = panes.map((pane) => ({
        pane,
        title: pane.querySelector('[data-tdb-guide-title]'),
        summary: pane.querySelector('[data-tdb-guide-summary]'),
        button: pane.querySelector('[data-tdb-guide-open]'),
        icon: pane.querySelector('.treatment-guide_cta-icon'),
      }));
    if (rows.some((row) => !row.title || !row.summary || !row.button || !row.icon)) return null;
    // Reuse the Designer artwork inside a fixed-size ticker slot, not another card.
    const artwork = rows.map((row) => row.icon.firstElementChild.cloneNode(true));
    const iconTickers = rows.map((row, index) => {
      const ticker = window.TDBNativeTicker.mount(row.icon, {
        valueClass: 'treatment-guide_icon-value',
        incomingClass: 'treatment-guide_icon-incoming',
        render(node, value) {
          node.replaceChildren(artwork[Number(value) || 0].cloneNode(true));
        },
      });
      ticker.update(String(index), 1, false);
      row.button.setAttribute('aria-haspopup', 'dialog');
      row.button.setAttribute('aria-label', 'Learn more about ' + row.title.textContent.trim());
      return ticker;
    });
    const ticker = window.TDBNativeTicker.mount(
      pagination.querySelector('[data-tdb-guide-position]'),
      {
        valueClass: 'treatment-guide_number-value',
        incomingClass: 'treatment-guide_number-incoming',
      },
    );
    for (const button of root.querySelectorAll('[data-tdb-guide-nav]'))
      button.addEventListener('click', () => navigate(Number(button.dataset.tdbGuideNav)), {
        signal: events.signal,
      });
    let active = initial,
      animations = [],
      disposed = false;
    const stop = () => {
      animations.forEach((animation) => animation.cancel());
      animations = [];
    };
    function update(index, direction = 1, animate = true) {
      if (disposed || (active === index && animate)) return;
      const previous = active;
      stop();
      active = index;
      pagination.setAttribute('aria-label', `${index + 1} of ${rows.length}`);
      ticker.update(String(index + 1).padStart(2, '0'), direction, animate);
      iconTickers[index].update(String(previous), direction, false);
      iconTickers[index].update(String(index), direction, animate);
      rows.forEach((row, i) => {
        row.pane.style.visibility = i === index ? 'visible' : 'hidden';
        row.pane.style.pointerEvents = i === index ? 'auto' : 'none';
        row.pane.setAttribute('aria-hidden', String(i !== index));
      });
      const motion = window.TDBMotion;
      if (!animate || motion?.reduced?.matches || !content.animate) return;
      const duration = motion?.duration(content.clientWidth) || 400,
        easing = motion?.easing('travel', 'cubic-bezier(.3,0,.2,1)') || 'ease',
        old = rows[previous],
        next = rows[index];
      // Only text travels; the native tracks, pagination and controls do not move.
      animations.push(
        old.title.animate(
          [
            { transform: 'translateX(0)', opacity: 1, visibility: 'visible' },
            { transform: `translateX(${-direction * 100}%)`, opacity: 1, visibility: 'visible' },
          ],
          { duration, easing },
        ),
        next.title.animate(
          [{ transform: `translateX(${direction * 100}%)` }, { transform: 'translateX(0)' }],
          { duration, easing },
        ),
      );
      const fade = motion?.defaults || {},
        fadeEase = motion?.easing('fade', 'ease-out') || 'ease-out';
      animations.push(
        old.summary.animate(
          [
            { opacity: 1, visibility: 'visible' },
            { opacity: 0, visibility: 'visible' },
          ],
          { duration: fade.fadeOut || 120, easing: fadeEase },
        ),
        next.summary.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: fade.fadeIn || 350,
          delay: fade.entryDelay || 100,
          easing: fadeEase,
          fill: 'backwards',
        }),
      );
    }
    update(initial, 1, false);
    return {
      update,
      destroy() {
        disposed = true;
        stop();
        events.abort();
        ticker.destroy();
        iconTickers.forEach((ticker, i) => {
          ticker.destroy();
          rows[i].icon.replaceChildren(artwork[i]);
        });
        rows.forEach(({ pane }) => {
          pane.style.removeProperty('visibility');
          pane.style.removeProperty('pointer-events');
          pane.removeAttribute('aria-hidden');
        });
      },
    };
  }
  return Object.freeze({ mount });
})();

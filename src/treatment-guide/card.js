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
    const motion = window.TDBMotion,
      fades = motion.fadeController();
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
    const centreIcon = pagination.querySelector('[data-tdb-guide-centre-icon]');
    const centreBefore = centreIcon
      ? [...centreIcon.childNodes].map((node) => node.cloneNode(true))
      : null;
    const ticker = window.TDBNativeTicker.mount(
      centreIcon || pagination.querySelector('[data-tdb-guide-position]'),
      centreIcon
        ? {
            valueClass: 'treatment-guide_icon-value',
            incomingClass: 'treatment-guide_icon-incoming',
            render(node, value) {
              const icon = artwork[Number(value) || 0].cloneNode(true);
              icon.className =
                'treatment-guide_icon-art treatment-guide_centre-' + icon.dataset.guideArtwork;
              node.replaceChildren(icon);
            },
          }
        : {
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
      entryTimer = 0,
      disposed = false;
    const stop = () => {
      clearTimeout(entryTimer);
      entryTimer = 0;
      animations.forEach((animation) => animation.cancel());
      animations = [];
    };
    function update(index, direction = 1, animate = true) {
      if (disposed || (active === index && animate)) return;
      const previous = active;
      stop();
      active = index;
      pagination.setAttribute(
        'aria-label',
        `${index + 1} of ${rows.length}: ${rows[index].title.textContent.trim()}`,
      );
      ticker.update(
        centreIcon ? String(index) : String(index + 1).padStart(2, '0'),
        direction,
        animate,
      );
      iconTickers[index].update(String(previous), direction, false);
      iconTickers[index].update(String(index), direction, animate);
      rows.forEach((row, i) => {
        row.pane.style.visibility = i === index ? 'visible' : 'hidden';
        row.pane.style.pointerEvents = i === index ? 'auto' : 'none';
        row.pane.setAttribute('aria-hidden', String(i !== index));
      });
      if (!animate || motion.reduced.matches || !content.animate) {
        rows.forEach((row) => fades.to(row.summary, 1, 0));
        return;
      }
      const duration = motion.duration(content.clientWidth),
        easing = motion.easing('travel', 'cubic-bezier(.3,0,.2,1)'),
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
      // The shared controller samples the current opacity on interruption.
      // Only retain the outgoing pane's visibility locally; motion.js owns fades.
      rows.forEach((row, i) => {
        if (i !== previous) fades.to(row.summary, 0, 0);
      });
      fades.to(old.summary, 0, motion.defaults.fadeOut);
      animations.push(
        old.summary.animate([{ visibility: 'visible' }, { visibility: 'visible' }], {
          duration: motion.defaults.fadeOut,
        }),
      );
      entryTimer = setTimeout(() => {
        entryTimer = 0;
        fades.to(next.summary, 1, motion.reduced.matches ? 0 : motion.defaults.fadeIn);
      }, motion.defaults.entryDelay);
    }
    update(initial, 1, false);
    return {
      update,
      destroy() {
        disposed = true;
        stop();
        fades.destroy();
        events.abort();
        ticker.destroy();
        if (centreIcon) centreIcon.replaceChildren(...centreBefore);
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

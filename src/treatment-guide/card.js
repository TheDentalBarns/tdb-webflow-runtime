/* Temporary presentation patch. Native bound panes remain the source and fallback. */
window.TDBTreatmentGuideCard ||= (() => {
  function mount(root, initial) {
    const panes = [...root.querySelectorAll('[data-tdb-guide-panel]')],
      content = root.querySelector('.treatment-guide_content');
    if (panes.length !== 5 || !content) return null;
    const clone = (node) => {
      const copy = node.cloneNode(true);
      for (const child of [copy, ...copy.querySelectorAll('*')])
        for (const attr of [...child.attributes])
          if (attr.name === 'id' || attr.name === 'data-w-id') child.removeAttribute(attr.name);
      return copy;
    };
    const card = document.createElement('div');
    card.className = 'treatment-guide_teaser treatment-guide_card';
    card.setAttribute('data-tdb-guide-card', '');
    const pagination = clone(panes[0].querySelector('[data-tdb-guide-pagination]'));
    const titles = document.createElement('div'),
      summaries = document.createElement('div');
    titles.className = 'treatment-guide_title-stage';
    summaries.className = 'treatment-guide_summary-stage';
    const rows = panes.map((pane, index) => {
      const title = clone(pane.querySelector('[data-tdb-guide-title]')),
        summary = clone(pane.querySelector('[data-tdb-guide-summary]'));
      title.removeAttribute('data-tdb-guide-title');
      summary.removeAttribute('data-tdb-guide-summary');
      title.dataset.guideCardTitle = String(index);
      summary.dataset.guideCardSummary = String(index);
      titles.append(title);
      summaries.append(summary);
      return { title, summary };
    });
    const source = panes[0].querySelector('[data-tdb-guide-open]'),
      explore = document.createElement('button');
    explore.type = 'button';
    explore.className = source.className;
    explore.setAttribute('data-tdb-guide-open', '');
    explore.setAttribute('aria-haspopup', 'dialog');
    explore.append(...[...source.childNodes].map((node) => node.cloneNode(true)));
    card.append(pagination, titles, summaries, explore);
    content.append(card);
    const ticker = window.TDBNativeTicker.mount(
      pagination.querySelector('[data-tdb-guide-position]'),
      {
        valueClass: 'treatment-guide_number-value',
        incomingClass: 'treatment-guide_number-incoming',
      },
    );
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
      explore.dataset.tdbGuideTarget = String(index);
      explore.setAttribute('aria-label', 'Explore ' + rows[index].title.textContent.trim());
      pagination.setAttribute('aria-label', `${index + 1} of ${rows.length}`);
      ticker.update(String(index + 1).padStart(2, '0'), direction, animate);
      rows.forEach((row, i) => {
        for (const node of [row.title, row.summary]) {
          node.style.opacity = i === index ? '1' : '0';
          node.style.visibility = i === index ? 'visible' : 'hidden';
          node.setAttribute('aria-hidden', String(i !== index));
        }
      });
      const motion = window.TDBMotion;
      if (!animate || motion?.reduced?.matches || !titles.animate) return;
      const duration = motion?.duration(content.clientWidth) || 400,
        easing = motion?.easing('travel', 'cubic-bezier(.3,0,.2,1)') || 'ease';
      const old = rows[previous],
        next = rows[index];
      // Only title rows travel. Pagination, CTA and the card never enter/exit.
      animations.push(
        old.title.animate(
          [
            { transform: 'translateX(0)', opacity: 1, visibility: 'visible' },
            { transform: `translateX(${-direction * 100}%)`, opacity: 1, visibility: 'visible' },
          ],
          { duration, easing },
        ),
      );
      animations.push(
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
      );
      animations.push(
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
        ticker.destroy();
        card.remove();
      },
    };
  }
  return Object.freeze({ mount });
})();

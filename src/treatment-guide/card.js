/* Temporary presentation patch. Native bound panes remain the source and fallback. */
window.TDBTreatmentGuideCard ||= (() => {
  const artworkBase = 'https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/';
  const artwork = [
    ['diamond', '6aeddc640ce35bc2256782dc_tdb-diamond-small-1px.svg'],
    ['thumbprint', '6aef3d06504a979ca9cd538b_tdb-thumbprint-small-1px.svg'],
    ['lotus', '6aeddc643eed49cd4fac61a6_tdb-lotus-small-1px.svg'],
    ['quotation', '6ac7b973bb15c9b9f29a8d18_tdb-review-quote.svg'],
    ['barn-window', '6aede540e466c56cbce09cd0_tdb-barn-small-1px.svg'],
  ];
  let warmed = false;
  function createArtwork(index) {
    const [name, file] = artwork[index] || artwork[0];
    const art = document.createElement('span');
    art.className = 'treatment-guide_icon-art';
    art.dataset.guideArtwork = name;
    art.style.setProperty('--tdb-guide-artwork', `url("${artworkBase + file}")`);
    return art;
  }
  function controls(navigate, label) {
    const group = document.createElement('div');
    group.className = 'treatment-guide_arrows';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', label);
    for (const direction of [-1, 1]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'carousel-arrow treatment-guide_nav';
      button.dataset.tdbGuideNav = String(direction);
      button.setAttribute('aria-label', direction < 0 ? 'Previous chapter' : 'Next chapter');
      const icon = document.createElement('span');
      icon.className = 'carousel-arrow-icon' + (direction < 0 ? ' is-previous' : '');
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon);
      button.addEventListener('click', () => navigate(direction));
      group.append(button);
    }
    return group;
  }
  function mount(root, initial, navigate) {
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
    pagination.setAttribute('data-guide-centre-pagination', '');
    root.querySelector('.treatment-guide_centre').append(pagination);
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
    const explore = document.createElement('button');
    explore.type = 'button';
    explore.className = 'button is-alternate treatment-guide_learn-more';
    explore.setAttribute('data-tdb-guide-open', '');
    explore.setAttribute('aria-haspopup', 'dialog');
    const label = document.createElement('span'),
      icon = document.createElement('span');
    label.textContent = 'Learn more';
    icon.className = 'treatment-guide_cta-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = String(initial);
    explore.append(label, icon);
    const footer = document.createElement('div');
    footer.className = 'treatment-guide_card-footer';
    footer.append(explore, controls(navigate, 'Treatment guide chapters'));
    card.append(titles, summaries, footer);
    content.append(card);
    if (!warmed) {
      warmed = true;
      artwork.forEach(([, file]) => {
        const image = new Image();
        image.src = artworkBase + file;
        image.decode().catch(() => {});
      });
    }
    const iconTicker = window.TDBNativeTicker.mount(icon, {
      valueClass: 'treatment-guide_icon-value',
      incomingClass: 'treatment-guide_icon-incoming',
      render(node, value) {
        const art = createArtwork(Number(value));
        node.dataset.guideButtonIcon = art.dataset.guideArtwork;
        node.replaceChildren(art);
      },
    });
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
      explore.setAttribute(
        'aria-label',
        'Learn more about ' + rows[index].title.textContent.trim(),
      );
      pagination.setAttribute('aria-label', `${index + 1} of ${rows.length}`);
      ticker.update(String(index + 1).padStart(2, '0'), direction, animate);
      iconTicker.update(String(index), direction, animate);
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
        iconTicker.destroy();
        pagination.remove();
        card.remove();
      },
    };
  }
  return Object.freeze({ mount, controls, createArtwork });
})();

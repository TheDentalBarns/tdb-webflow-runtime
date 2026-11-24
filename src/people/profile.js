(() => {
  'use strict';
  if (window.TDBPersonProfile) return;
  const allowed = () => Boolean(window.TDBConsent?.allows());
  const value = (element, key) => {
    const text = element?.querySelector('[data-value="' + key + '"]')?.textContent.trim() || '';
    return text.includes('{{') ? '' : text;
  };
  function prepareParagraphs() {
    for (const copy of document.querySelectorAll('.tdb-supporting-cta-copy > p.text-size-small')) {
      const paragraphs = copy.textContent
        .trim()
        .split(/\n\s*\n/)
        .filter(Boolean);
      if (paragraphs.length < 2) continue;
      copy.replaceWith(
        ...paragraphs.map((text) => {
          const paragraph = copy.cloneNode(false);
          paragraph.textContent = text.trim();
          return paragraph;
        }),
      );
    }
  }
  function prepareGallery() {
    const section = document.getElementById('patient-stories');
    if (!section) return;
    const clinician =
      section.getAttribute('data-profile-clinician') || document.querySelector('h1')?.textContent;
    if (!clinician?.trim()) return;
    section.querySelectorAll('a[href*="/smile-gallery"]').forEach((link) => {
      const url = new URL(link.getAttribute('href'), location.href);
      url.searchParams.set('clinician', clinician.trim());
      link.href = url.pathname + url.search;
    });
  }
  function prepareReviews(profile) {
    const outer = document.querySelector('.tdb-first-review-break [data-tdb-review-section]');
    const carousel = outer?.querySelector('[data-tdb-review-quotes]');
    if (!carousel) return;
    const track = carousel.querySelector('[data-tdb-team-track]');
    const sample = track?.querySelector('[data-tdb-team-slide]');
    if (!sample) return;
    const chosen = (outer.getAttribute('data-tdb-profile-review-slugs') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const quoteRows = [
      ...document.querySelectorAll('[data-profile-source="reviews"] [data-profile-values]'),
    ];
    const own = quoteRows.filter(
      (row) =>
        value(row, 'person') === profile &&
        value(row, 'quote') &&
        value(row, 'review') &&
        value(row, 'author'),
    );
    const ordered = chosen.length
      ? chosen.map((id) => own.find((row) => value(row, 'review') === id)).filter(Boolean)
      : own;
    const cards = [];
    const seen = new Set();
    for (const row of ordered) {
      const id = value(row, 'review');
      if (seen.has(id) || cards.length === 3) continue;
      seen.add(id);
      const card = sample.cloneNode(true);
      const content = card.querySelector('[data-tdb-team-content]');
      card.dataset.reviewId = id;
      card.setAttribute('aria-hidden', String(cards.length > 0));
      content.classList.toggle('is-concealed', cards.length > 0);
      content.setAttribute('aria-label', 'Read full review by ' + value(row, 'author'));
      card.querySelector('[data-tdb-team-text]').textContent = value(row, 'quote');
      card.querySelector('[data-tdb-quotes-name]').textContent = value(row, 'author');
      const marker = document.createElement('span');
      marker.hidden = true;
      marker.dataset.tdbReviewRecordId = '';
      marker.textContent = id;
      card.append(marker);
      cards.push(card);
    }
    cards.forEach((card, i) => card.setAttribute('aria-label', i + 1 + ' of ' + cards.length));
    track.replaceChildren(...cards);
    carousel.dataset.tdbReviewNativeSelection = '';
    if (!cards.length) {
      outer.hidden = true;
      return;
    }
    const total = carousel.querySelector('[data-tdb-team-total]');
    if (total) total.textContent = String(cards.length).padStart(2, '0');
    outer.dataset.personReady = '';
  }
  window.TDBPersonProfile = Object.freeze({
    mount(root) {
      if (!allowed() || !root?.isConnected) return;
      const profile = location.pathname.split('/').filter(Boolean).at(-1);
      prepareParagraphs();
      prepareGallery();
      prepareReviews(profile);
      document
        .querySelectorAll(':is(#founder-story,#first-appointment) .button.is-secondary')
        .forEach((link) => {
          link.setAttribute('data-wf--button---secondary--variant', 'white');
          link.classList.add('w-variant-2c1240b5-df86-fb2f-664d-3ed8a9f54c3f');
        });
      document.querySelectorAll('[data-profile-source]').forEach((node) => node.remove());
    },
  });
})();

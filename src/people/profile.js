(() => {
  'use strict';
  if (window.TDBPersonProfile) return;
  const allowed = () => Boolean(window.TDBConsent?.allows());
  let disposePublishers;
  const normalized = (value) => (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
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
  function preparePublishers(track) {
    const credits = new Map();
    const pending = new Set();
    const houseLogo = document.querySelector('img.tdb-flat-footer-logo')?.getAttribute('src');
    async function readCredit(path, signal) {
      const response = await fetch(path, { credentials: 'same-origin', signal });
      if (!response.ok) throw Error('Article credit unavailable');
      const fragment = document.createElement('template');
      fragment.innerHTML = await response.text();
      const credit = fragment.content.querySelector('.tdb-post-publication');
      if (!credit) return null;
      const source = credit.querySelector('img.tdb-post-publication-logo');
      const name = credit.dataset.publicationName || source?.alt;
      const origin = normalized(credit.dataset.articleOrigin);
      const internal =
        origin === 'internal' || (!origin && normalized(name) === 'the dental barns');
      const logo =
        source && !source.classList.contains('w-dyn-bind-empty') && source.getAttribute('src');
      const src = internal ? houseLogo || (normalized(name) === 'the dental barns' && logo) : logo;
      if (!src) return null;
      return { src, name: internal ? 'The Dental Barns' : name || '' };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          if (!isIntersecting || !allowed()) continue;
          const badge = target.querySelector('[data-article-publisher]');
          const path = target.querySelector('.tdb-treatment-source')?.getAttribute('href');
          if (!badge || !path?.startsWith('/post/')) {
            observer.unobserve(target);
            continue;
          }
          if (!credits.has(path)) {
            const request = new AbortController();
            pending.add(request);
            credits.set(
              path,
              readCredit(path, request.signal)
                .catch((error) => {
                  credits.delete(path);
                  throw error;
                })
                .finally(() => pending.delete(request)),
            );
          }
          credits
            .get(path)
            .then((credit) => {
              if (!allowed() || !badge.isConnected) return;
              if (credit) {
                badge.alt = credit.name;
                badge.src = credit.src;
              }
              observer.unobserve(target);
            })
            .catch(() => {});
        }
      },
      { rootMargin: '450px 200px' },
    );
    function observe(slide) {
      if (slide.nodeType !== 1 || !slide.matches('.tdb-treatment-slide')) return;
      const content = slide.querySelector('.tdb-treatment-content');
      if (!content) return;
      let badge = content.querySelector('[data-article-publisher]');
      if (!badge) {
        badge = document.createElement('img');
        badge.dataset.articlePublisher = '';
        badge.alt = '';
        content.append(badge);
      }
      if (!badge.hasAttribute('src')) observer.observe(slide);
    }
    const changes = new MutationObserver((changes) => {
      for (const change of changes) {
        for (const slide of change.removedNodes)
          if (slide.nodeType === 1) observer.unobserve(slide);
        change.addedNodes.forEach(observe);
      }
    });
    const stop = () => {
      observer.disconnect();
      changes.disconnect();
      for (const request of pending) request.abort();
    };
    const unsubscribe = window.TDBConsent.subscribe(() => {
      if (!allowed()) {
        stop();
        return;
      }
      for (const slide of track.children) observe(slide);
      changes.observe(track, { childList: true });
    });
    return () => {
      unsubscribe();
      stop();
    };
  }
  function prepareArticles(profile, template) {
    const section = document.getElementById('latest-articles');
    if (!section) return;
    const cards = new Map();
    for (const slide of section.querySelectorAll('.tdb-treatment-slide')) {
      const path = slide.querySelector('.tdb-treatment-source')?.getAttribute('href');
      if (path) cards.set(path, { slide, date: Date.parse(value(slide, 'date')) || 0 });
    }
    for (const row of document.querySelectorAll(
      '[data-profile-source="features"] [data-profile-values]',
    )) {
      if (value(row, 'person') !== profile) continue;
      const slug = value(row, 'article');
      const title = value(row, 'title');
      if (!slug || !title) continue;
      const path = '/post/' + encodeURIComponent(slug);
      if (cards.has(path)) continue;
      const slide = template.content.firstElementChild.cloneNode(true);
      slide.querySelector('.tdb-treatment-title').textContent = title;
      slide.querySelector('.tdb-treatment-paragraph').textContent = value(row, 'summary');
      slide.querySelector('.tdb-treatment-source').setAttribute('href', path);
      const original = row.querySelector('img[data-value="image"]');
      const image = slide.querySelector('.tdb-treatment-image');
      if (original?.getAttribute('src') && !original.classList.contains('w-dyn-bind-empty')) {
        for (const attribute of ['alt', 'sizes', 'srcset', 'src']) {
          if (original.hasAttribute(attribute))
            image.setAttribute(attribute, original.getAttribute(attribute));
        }
        if (!image.hasAttribute('alt')) image.alt = '';
      } else image.remove();
      cards.set(path, { slide, date: Date.parse(value(row, 'date')) || 0 });
    }
    if (!cards.size) {
      section.hidden = true;
      return;
    }
    const viewport = section.querySelector('.tdb-treatment-viewport');
    let track = viewport?.querySelector('.tdb-treatment-wrapper');
    if (!track && viewport) {
      viewport.querySelector('.w-dyn-empty')?.remove();
      track = document.createElement('div');
      track.className = 'swiper-wrapper tdb-treatment-wrapper w-dyn-items';
      track.setAttribute('role', 'list');
      viewport.append(track);
    }
    const sorted = [...cards.values()].sort((a, b) => b.date - a.date);
    if (track) {
      track.replaceChildren(...sorted.map((item) => item.slide));
      disposePublishers = preparePublishers(track);
    }
    section.dataset.personReady = '';
  }
  window.TDBPersonProfile = Object.freeze({
    mount(template) {
      if (!allowed() || !template?.isConnected) return;
      const profile = location.pathname.split('/').filter(Boolean).at(-1);
      prepareParagraphs();
      prepareGallery();
      prepareReviews(profile);
      prepareArticles(profile, template);
      document
        .querySelectorAll(':is(#founder-story,#first-appointment) .button.is-secondary')
        .forEach((link) => {
          link.setAttribute('data-wf--button---secondary--variant', 'white');
          link.classList.add('w-variant-2c1240b5-df86-fb2f-664d-3ed8a9f54c3f');
        });
      template.remove();
      document.querySelectorAll('[data-profile-source]').forEach((node) => node.remove());
    },
    destroy() {
      disposePublishers?.();
    },
  });
})();

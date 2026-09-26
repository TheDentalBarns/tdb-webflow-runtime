/* TDB Instagram cards v0.1.0 — manual CMS snapshot, shared slider mechanics. */
(() => {
  'use strict';
  const data = window.TDBInstagramManualData;
  if (!data || window.TDBInstagramFeed) return;
  const VERSION = '0.1.0';
  const LOGO = 'https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/681c892759ed35c51acb5fe3_the-dental-barns-blackbrook-lichfield-logo.svg.svg';
  const iconPaths = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    comment: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
    share: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    next: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    previous: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none"/>'
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    // Reuse the site's existing modern Instagram glyph when available.
    const existing = name === 'instagram' && document.querySelector('a[href="https://www.instagram.com/thedentalbarns/"] svg');
    if (existing) {
      const svg = existing.cloneNode(true);
      svg.removeAttribute('id');
      svg.setAttribute('class', 'tdb-ig-icon');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      return svg;
    }
    const span = el('span', 'tdb-ig-icon-wrap');
    span.innerHTML = '<svg class="tdb-ig-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + iconPaths[name] + '</svg>';
    return span.firstElementChild;
  }

  function link(url, className, label, iconName) {
    const node = el('a', className);
    node.href = url;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
    node.setAttribute('aria-label', label);
    if (iconName) node.append(icon(iconName));
    return node;
  }

  function card(post, index, count) {
    const slide = el('div', 'swiper-slide tdb-ig-slide');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', (index + 1) + ' of ' + count);
    const article = el('article', 'tdb-ig-card');
    article.dataset.igPost = post.shortcode;
    const photo = el('img', 'tdb-ig-photo');
    photo.src = post.image;
    photo.alt = post.alt;
    photo.width = post.width;
    photo.height = post.height;
    photo.loading = 'lazy';
    photo.decoding = 'async';
    photo.draggable = false;

    const header = el('header', 'tdb-ig-bar tdb-ig-top');
    const profile = link('https://www.instagram.com/' + encodeURIComponent(post.account) + '/', 'tdb-ig-profile', 'Visit ' + post.account + ' on Instagram');
    const avatar = el('span', 'tdb-ig-avatar');
    const inner = el('span', 'tdb-ig-avatar-inner');
    const logo = el('img', 'tdb-ig-logo');
    logo.src = LOGO;
    logo.alt = '';
    logo.width = 52;
    logo.height = 52;
    logo.loading = 'lazy';
    inner.append(logo);
    avatar.append(inner);
    const details = el('span', 'tdb-ig-identity');
    details.append(el('span', 'tdb-ig-account', post.account));
    if (post.date) {
      const date = el('time', 'tdb-ig-date', new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(post.date)));
      date.dateTime = post.date.slice(0, 10);
      details.append(date);
    }
    profile.append(avatar, details);
    header.append(profile, link(post.url, 'tdb-ig-instagram', 'View this post on Instagram', 'instagram'));

    const footer = el('footer', 'tdb-ig-bar tdb-ig-bottom');
    const actions = el('div', 'tdb-ig-actions');
    actions.append(link(post.url, 'tdb-ig-action', 'Like this post on Instagram', 'heart'), link(post.url, 'tdb-ig-action', 'Comment on this post on Instagram', 'comment'));
    const share = el('button', 'tdb-ig-action tdb-ig-share');
    share.type = 'button';
    share.setAttribute('aria-label', 'Share this Instagram post');
    share.dataset.shareUrl = post.url;
    share.append(icon('share'));
    actions.append(share);
    const open = link(post.url, 'tdb-ig-open', 'View post on Instagram');
    open.append(el('span', '', 'View post'), icon('next'));
    footer.append(actions, open);
    article.append(photo, header, footer);
    slide.append(article);
    return slide;
  }

  function render(mount) {
    const config = data.feeds[mount.dataset.tdbIgWidget];
    if (!config || mount.dataset.tdbIgReady) return;
    const posts = config.posts.map(id => data.posts[id]).filter(Boolean);
    if (!posts.length) return;
    const root = el('div', 'highlight-swiper_component tdb-ig-feed');
    root.dataset.tdbIgFeed = config.key;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', config.label + ' Instagram gallery');
    const stage = el('div', 'tdb-ig-stage');
    const viewport = el('div', 'swiper tdb-ig-viewport');
    const wrapper = el('div', 'swiper-wrapper');
    posts.forEach((post, index) => wrapper.append(card(post, index, posts.length)));
    viewport.append(wrapper);
    stage.append(viewport);
    const controls = el('div', 'tdb-ig-controls');
    const previous = el('button', 'swiper-btn-prev tdb-ig-nav');
    previous.type = 'button';
    previous.setAttribute('aria-label', 'Previous ' + config.label.toLowerCase() + ' post');
    previous.append(icon('previous'));
    const counter = el('span', 'swiper-count tdb-ig-count', '1 of ' + posts.length);
    counter.setAttribute('aria-live', 'polite');
    counter.setAttribute('aria-atomic', 'true');
    const next = el('button', 'swiper-btn-next tdb-ig-nav');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next ' + config.label.toLowerCase() + ' post');
    next.append(icon('next'));
    controls.append(previous, counter, next);
    if (posts.length < 2) controls.hidden = true;
    const notice = el('span', 'tdb-ig-notice');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    root.append(stage, controls, notice);
    mount.replaceChildren(root);
    mount.dataset.tdbIgReady = VERSION;
    mount.removeAttribute('aria-busy');
  }

  function refresh() {
    document.querySelectorAll('[data-tdb-ig-widget]').forEach(render);
    window.TDBSliders?.refresh?.();
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('.tdb-ig-share');
    if (!button) return;
    const root = button.closest('.tdb-ig-feed');
    const notice = root?.querySelector('.tdb-ig-notice');
    const url = button.dataset.shareUrl;
    try {
      if (navigator.share && matchMedia('(pointer:coarse)').matches) {
        await navigator.share({ title: 'The Dental Barns on Instagram', url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        if (notice) { notice.textContent = 'Post link copied'; setTimeout(() => { notice.textContent = ''; }, 2500); }
      } else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      if (error.name !== 'AbortError' && notice) notice.textContent = 'Use View post to open and share on Instagram.';
    }
  });

  window.TDBInstagramFeed = Object.freeze({ version: VERSION, refresh, source: 'manual-cms-snapshot', importedAt: data.importedAt });
  refresh();
})();

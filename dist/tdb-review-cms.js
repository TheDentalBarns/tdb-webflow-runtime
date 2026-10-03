/* TDB CMS review source v1.1.0. No review records or credentials in this file. */
(() => {
  'use strict';
  if (window.TDBReviewCMS) return;
  const topicFields = {
    'nervous-patient-care': 'nervous', 'invisalign': 'invisalign', 'clear-aligners': 'clear-aligners',
    'composite-bonding': 'bonding', 'veneers': 'veneers', 'whitening': 'whitening', 'hygiene': 'hygiene',
    'natural-results': 'natural', 'comfort': 'comfort', 'clear-explanations': 'assessment',
    'welcoming-team': 'team', 'calm-environment': 'environment', 'location': 'location', 'technology': 'technology'
  };
  const platforms = { efe6db2067ed0fd456d38bc2e521b4bd: 'Google', '0d3340cdd96a32712e4c9d730e89df7d': 'Yell', a0c3d879d008891aec3a0bd741c1ea8c: 'Doctify', '17153ef92f97216cb750196d50c29c0d': 'Facebook', '9893e84e222a65c3ea16e8537dcc34e6': 'Direct testimonial', '18e8b0757d8babb418cb99c0b6830ea0': 'Other' };
  const normal = value => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  const numeric = value => value === null || String(value).trim() === '' ? NaN : Number(value);
  const shown = node => node && !node.matches('[hidden],.w-condition-invisible,[aria-hidden="true"]') && node.style.display !== 'none';
  function parse(doc) {
    const feed = doc.querySelector('[data-tdb-review-cms="v1"]');
    if (!feed) throw Error('Native CMS review content is unavailable');
    const records = [...feed.querySelectorAll('[data-tdb-review-record]')].map(node => {
      const field = key => node.querySelector(`[data-tdb-review-field="${key}"]`)?.textContent.trim() || '';
      const attr = key => node.getAttribute(`data-review-${key}`) || '';
      const flag = key => shown(node.querySelector(`[data-tdb-review-flag="${key}"]`));
      const rank = key => { const n = numeric(attr(key)); return Number.isFinite(n) && n > 0 ? n : 999; };
      const topics = [], excerpts = {};
      for (const [fieldName, topic] of Object.entries(topicFields)) {
        if (flag('topic-' + fieldName)) topics.push(topic);
        const excerpt = field('excerpt-' + fieldName); if (excerpt) excerpts[topic] = excerpt;
      }
      const rating = numeric(attr('star-rating'));
      return {
        id: attr('slug'), name: field('reviewer-display-name'), text: field('full-review'),
        excerpt: field('featured-excerpt'), platform: platforms[attr('platform-2')] || attr('platform-2'), date: attr('review-date'),
        rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
        approx: Boolean(flag('date-approximate')), historic: ['Dr Keely - historic practice', '78902de9c8ddcc3437156f6120e0cc9c'].includes(attr('review-subject')),
        rank: rank('editorial-priority'), snippetRank: rank('snippet-rank'),
        nRank: rank('nervous-priority'), iRank: rank('invisalign-priority'), lRank: rank('location-snippet-rank'),
        duplicate: attr('duplicate-group'), url: attr('source-url') || attr('source-profile-url'),
        direct: Boolean(attr('source-url')), topics, excerpts, response: '', showResponse: false
      };
    }).filter(record => record.id && record.name && record.text);
    // The native source is limited to 100 items. Fail visibly at the boundary until pagination is configured.
    if (records.length >= 100) throw Error('CMS review pagination needs configuring');
    const unique = new Map(records.map(record => [record.id, record]));
    for (const node of doc.querySelectorAll('[data-tdb-review-response-record]')) {
      const link = node.querySelector('[data-tdb-response-review]');
      const slug = node.getAttribute('data-review-slug') || (link?.getAttribute('href') || '').split(/[?#]/)[0].split('/').filter(Boolean).pop();
      const record = unique.get(slug);
      const response = node.querySelector('[data-tdb-review-response]')?.textContent.trim();
      if (record && response) { record.response = response; record.showResponse = true; }
    }
    const summary = doc.querySelector('[data-tdb-review-aggregate]');
    const average = numeric(summary?.getAttribute('data-review-average'));
    const total = numeric(summary?.getAttribute('data-review-total'));
    if (!Number.isFinite(average) || average < 0 || average > 5 || !Number.isInteger(total) || total < unique.size) {
      throw Error('The CMS review summary needs updating');
    }
    return { records: [...unique.values()], average, total, featured: [...doc.querySelectorAll('[data-tdb-review-featured]')].map(n=>n.getAttribute('data-tdb-review-featured')).filter(Boolean) };
  }
  let cached, cachedAt = 0, flight, sourceDoc;
  function load({ signal } = {}) {
    if (signal?.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
    if (cached && Date.now() - cachedAt < 60000) return Promise.resolve(cached);
    if (!flight) {
      const controller = new AbortController();
      const request = { controller, clients: 0, done: false };
      flight = request;
      request.promise = fetch('/review-content', { credentials: 'same-origin', signal: controller.signal })
        .then(response => { if (!response.ok) throw Error('CMS review request failed'); return response.text(); })
        .then(html => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const data = parse(doc);
          cached = data; cachedAt = Date.now(); sourceDoc = doc; return data;
        }).finally(() => { request.done = true; if (flight === request) flight = null; });
    }
    const request = flight; request.clients++;
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, value) => {
        if (done) return; done = true; signal?.removeEventListener('abort', abort);
        request.clients--; if (!request.done && !request.clients) { if (flight === request) flight = null; request.controller.abort(); }
        fn(value);
      };
      const abort = () => finish(reject, new DOMException('Cancelled', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      request.promise.then(data => finish(resolve, data), error => finish(reject, error));
    });
  }
  let serial = 0;
  function sourceIcon(platform, grayscale) {
    const node = document.createElement('span');
    node.className = 'tdb-review-source-icon' + (grayscale ? ' is-grayscale' : '');
    node.setAttribute('aria-hidden', 'true');
    const find = doc => [...(doc?.querySelectorAll('[data-tdb-review-icon]') || [])]
      .find(item => item.getAttribute('data-tdb-review-icon') === platform)?.querySelector('svg');
    const original = find(document) || find(sourceDoc);
    if (!original) { node.textContent = platform === 'Star' ? '★' : platform; return node; }
    const svg = original.cloneNode(true), prefix = `tdb-cms-svg-${++serial}-`;
    const ids = new Map([...svg.querySelectorAll('[id]')].map(item => [item.id, prefix + item.id]));
    for (const item of [svg, ...svg.querySelectorAll('*')]) for (const attr of [...item.attributes]) {
      let value = attr.value;
      for (const [id, replacement] of ids) value = value.replaceAll(`url(#${id})`, `url(#${replacement})`);
      if (attr.name === 'id' && ids.has(attr.value)) value = ids.get(attr.value);
      if (['href', 'xlink:href'].includes(attr.name) && ids.has(value.slice(1))) value = '#' + ids.get(value.slice(1));
      item.setAttribute(attr.name, value);
    }
    node.append(svg); return node;
  }
  function contextForPath(path) {
    if (/nervous/.test(path)) return 'nervous';
    if (/invisalign/.test(path)) return 'invisalign';
    if (/location/.test(path)) return 'location';
    for (const [needle, topic] of [['clear-aligners','clear-aligners'],['composite-bonding','bonding'],['veneers','veneers'],['whitening','whitening'],['hygiene','hygiene'],['first-visit','assessment'],['signature-assessment','assessment']]) if (path.includes(needle)) return topic;
    return 'default';
  }
  function resolveIdentity(records, root) {
    const name = normal(root?.querySelector('[data-tdb-review-author]')?.textContent);
    const excerpt = normal(root?.querySelector('[data-tdb-review-excerpt]')?.textContent);
    if (!name || !excerpt) return '';
    const matching = records.filter(record => normal(record.name) === name &&
      [record.excerpt, ...Object.values(record.excerpts || {})].some(value => normal(value) === excerpt));
    return matching.length === 1 ? matching[0].id : '';
  }
  window.TDBReviewCMS = Object.freeze({ version: '1.1.0', load, parse, sourceIcon, contextForPath, resolveIdentity,
    preview: Object.freeze({ contexts: Object.freeze({}) }),
    get quoteMark() { return (document.querySelector('[data-tdb-review-icon="Quote"] svg') || sourceDoc?.querySelector('[data-tdb-review-icon="Quote"] svg'))?.outerHTML || ''; }
  });
})();

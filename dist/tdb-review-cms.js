/* TDB CMS review source v1.3.1. No review records or credentials in this file. */
(() => {
  'use strict';
  if (window.TDBReviewCMS) return;
  const topicFields = {
    'nervous-patient-care': 'nervous', 'invisalign': 'invisalign', 'clear-aligners': 'clear-aligners',
    'composite-bonding': 'bonding', 'veneers': 'veneers', 'whitening': 'whitening', 'hygiene': 'hygiene',
    'natural-results': 'natural', 'comfort': 'comfort', 'clear-explanations': 'assessment',
    'welcoming-team': 'team', 'calm-environment': 'environment', 'location': 'location', 'technology': 'technology'
  };
  // One matching identity, preserving either CMS field and its authored excerpt.
  const canonicalTopic=value=>value==='invisalign'?'clear-aligners':value;
  const canonicalTopics=values=>[...new Set(values.map(canonicalTopic))];
  const platforms = { efe6db2067ed0fd456d38bc2e521b4bd: 'Google', '0d3340cdd96a32712e4c9d730e89df7d': 'Yell', a0c3d879d008891aec3a0bd741c1ea8c: 'Doctify', '17153ef92f97216cb750196d50c29c0d': 'Facebook', '9893e84e222a65c3ea16e8537dcc34e6': 'Direct testimonial', '18e8b0757d8babb418cb99c0b6830ea0': 'Other' };
  const normal = value => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  const numeric = value => value === null || String(value).trim() === '' ? NaN : Number(value);
  const shown = node => node && !node.matches('[hidden],.w-condition-invisible,[aria-hidden="true"]') && node.style.display !== 'none';
  function parseRecord(node) {
      const field = key => node.querySelector(`[data-tdb-review-field="${key}"]`)?.textContent.trim() || node.getAttribute('data-review-' + key) || '';
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
        direct: Boolean(attr('source-url')), topics:canonicalTopics(topics), excerpts:{...excerpts,'clear-aligners':excerpts['clear-aligners']||excerpts.invisalign||'',invisalign:excerpts.invisalign||excerpts['clear-aligners']||''}, response: '', showResponse: false
      };

  }
  function parseIndex(doc) {
    const feed=doc.querySelector('[data-tdb-review-index="v1"]');
    const records=[...(feed?.querySelectorAll('[data-tdb-review-index-record]')||[])].map(node=>{
      const attr=key=>node.getAttribute('data-review-'+key)||'';
      const rating=Number(attr('star-rating'));
      return {id:attr('slug'),platform:platforms[attr('platform-2')]||attr('platform-2'),
        date:attr('review-date'),rating:rating>=1&&rating<=5?rating:null,rank:Number(attr('editorial-priority'))||999,
        topics:canonicalTopics(Object.entries(topicFields).filter(([field])=>shown(node.querySelector('[data-tdb-review-flag="topic-'+field+'"]'))).map(([,topic])=>topic))};
    }).filter(record=>record.id);
    return {records,next:feed?.querySelector('.w-pagination-next:not([aria-disabled="true"])')?.getAttribute('href')||''};
  }
  function parseDetail(doc) {
    const node=doc.querySelector('[data-tdb-review-detail="v1"]');
    if(!shown(node)||shown(node.querySelector('[data-tdb-review-flag="exclude-from-display"]')))throw Error('Review is not available for display');
    const record=parseRecord(node);if(!record.id||!record.name||!record.text)throw Error('Incomplete review detail');return record;
  }
  function parse(doc) {
    const feed = doc.querySelector('[data-tdb-review-cms="v1"]');
    if (!feed) throw Error('Native CMS review content is unavailable');
    const records = [...feed.querySelectorAll('[data-tdb-review-record]')].map(parseRecord).filter(record => record.id && record.name && record.text);
    const nextLink = feed.querySelector('.w-pagination-next:not([aria-disabled="true"])');
    const next = nextLink?.getAttribute('href') || '';
    if (records.length >= 100 && !next && !feed.querySelector('.w-pagination-wrapper')) throw Error('CMS review pagination needs configuring');
    const unique = new Map(records.map(record => [record.id, record]));
    const responses = {};
    for (const node of doc.querySelectorAll('[data-tdb-review-response-record]')) {
      const link = node.querySelector('[data-tdb-response-review]');
      const slug = node.getAttribute('data-review-slug') || (link?.getAttribute('href') || '').split(/[?#]/)[0].split('/').filter(Boolean).pop();
      const record = unique.get(slug);
      const response = node.querySelector('[data-tdb-review-response]')?.textContent.trim();
      if (slug && response) responses[slug] = response;
      if (record && response) { record.response = response; record.showResponse = true; }
    }
    const summary = doc.querySelector('[data-tdb-review-aggregate]');
    const average = numeric(summary?.getAttribute('data-review-average'));
    const total = numeric(summary?.getAttribute('data-review-total'));
    if (!Number.isFinite(average) || average < 0 || average > 5 || !Number.isInteger(total) || total < unique.size) {
      throw Error('The CMS review summary needs updating');
    }
    return { records: [...unique.values()], average, total, next, responses, index:parseIndex(doc), featured: [...doc.querySelectorAll('[data-tdb-review-featured]')].map(n=>n.getAttribute('data-tdb-review-featured')).filter(Boolean) };
  }
  // Shared, abortable page requests. A withdrawn client cannot cancel another client.
  let cached, cachedAt = 0, sourceDoc;
  const requests = new Map();
  function requestPage(url, { signal } = {}) {
    if (signal?.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
    const target = new URL(url, location.href);
    if (target.origin !== location.origin || (target.pathname !== '/review-content' && !/^\/review-topics\/[a-z0-9-]+$/.test(target.pathname))) return Promise.reject(Error('Invalid review pagination URL'));
    const key = target.href;
    let request = requests.get(key);
    if (!request) {
      const controller = new AbortController();
      request = { controller, clients: 0, done: false };
      requests.set(key, request);
      request.promise = fetch(key, { credentials: 'same-origin', signal: controller.signal })
        .then(response => { if (!response.ok) throw Error('CMS review request failed'); return response.text(); })
        .then(html => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          return { doc, data: target.pathname === '/review-content' ? parse(doc) : parseDetail(doc), url: key };
        }).finally(() => { request.done = true; if (requests.get(key) === request) requests.delete(key); });
    }
    request.clients++;
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, value) => {
        if (done) return; done = true; signal?.removeEventListener('abort', abort);
        request.clients--; if (!request.done && !request.clients) { if (requests.get(key) === request) requests.delete(key); request.controller.abort(); }
        fn(value);
      };
      const abort = () => finish(reject, new DOMException('Cancelled', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      request.promise.then(data => finish(resolve, data), error => finish(reject, error));
    });
  }
  function session(first) {
    const records = first.data.records, seen = new Set(records.map(r => r.id));
    const visited = new Set([first.url]), listeners = new Set();
    let next = first.data.next;
    const recordCache=new Map(records.map(record=>[record.id,record]));
    const index=[...(first.data.index?.records||[])],indexSeen=new Set(index.map(record=>record.id));
    let indexNext=first.data.index?.next||'',indexLoaded=!!index.length&&!indexNext;
    const indexVisited=new Set();

    const data = { ...first.data, records,
      get filterIndex(){return index;},
      get indexReady(){return indexLoaded;},
      getCached(id){return recordCache.get(id);},
      async loadIndex({signal}={}){
        if(!index.length)throw Error('Native review index unavailable');
        while(indexNext){
          const url=new URL(indexNext,first.url).href;
          const page=await requestPage(url,{signal});if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
          if(indexVisited.has(url))continue;
          const added=page.data.index.records.filter(record=>!indexSeen.has(record.id));
          if(!added.length)throw Error('Review index pagination did not advance');
          const following=page.data.index.next?new URL(page.data.index.next,url).href:'';
          if(following&&(following===url||indexVisited.has(following)))throw Error('Review index pagination repeated a page');
          indexVisited.add(url);added.forEach(record=>{indexSeen.add(record.id);index.push(record);});indexNext=following;
          page.data.records.forEach(record=>recordCache.set(record.id,record));
        }
        indexLoaded=true;return index;
      },
      async fetchRecords(ids,{signal}={}){
        await data.loadIndex({signal});
        if(ids.some(id=>!indexSeen.has(id)))throw Error('Review is outside the published index');
        const missing=[...new Set(ids)].filter(id=>!recordCache.has(id));let cursor=0;
        const worker=async()=>{while(cursor<missing.length){
          if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
          const id=missing[cursor++],page=await requestPage('/review-topics/'+encodeURIComponent(id),{signal});
          if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
          if(page.data.id!==id)throw Error('Review detail identity mismatch');
          const record=page.data,response=first.data.responses?.[id];
          if(response){record.response=response;record.showResponse=true;}recordCache.set(id,record);
        }};
        await Promise.all(Array.from({length:Math.min(4,missing.length)},worker));
        return ids.map(id=>recordCache.get(id));
      },
      get hasMore() { return !!next; },
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      async loadMore({ signal } = {}) {
        if (!next) return data;
        const url = new URL(next, first.url).href;
        const page = await requestPage(url, { signal });
        if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
        // Concurrent clients share the request; only one merges/notifies for a page.
        if (visited.has(url)) return data;
        const added = page.data.records.filter(r => !seen.has(r.id));
        if (!added.length) throw Error('Review pagination did not advance');
        const following = page.data.next ? new URL(page.data.next, url).href : '';
        if (following && (following === url || visited.has(following))) throw Error('Review pagination repeated a page');
        visited.add(url); added.forEach(r => { seen.add(r.id); recordCache.set(r.id,r); records.push(r); }); next = following;
        for (const fn of listeners) fn(data);
        return data;
      },
      async ensure(ids, options) { while (next && ids.some(id => !seen.has(id))) await data.loadMore(options); return data; },
      async ensureIdentity(root, options) {
        if (!root?.querySelector('[data-tdb-review-author]')) return data;
        while (next && !resolveIdentity(records, root)) await data.loadMore(options);
        return data;
      },
      async loadAll(options) { while (next) await data.loadMore(options); return data; }
    };
    return data;
  }
  async function load({ signal } = {}) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (cached && Date.now() - cachedAt < 60000) return cached;
    const first = await requestPage('/review-content', { signal });
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    // Another permitted client may have installed this same session while awaiting.
    if (!cached || Date.now() - cachedAt >= 60000) { cached = session(first); cachedAt = Date.now(); sourceDoc = first.doc; }
    return cached;
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
    if (/invisalign|clear-aligners/.test(path)) return 'clear-aligners';
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
  window.TDBReviewCMS = Object.freeze({ version: '1.3.1', load, parse, sourceIcon, contextForPath, resolveIdentity, canonicalTopic,
    preview: Object.freeze({ contexts: Object.freeze({}) }),
    get quoteMark() { return (document.querySelector('[data-tdb-review-icon="Quote"] svg') || sourceDoc?.querySelector('[data-tdb-review-icon="Quote"] svg'))?.outerHTML || ''; }
  });
})();


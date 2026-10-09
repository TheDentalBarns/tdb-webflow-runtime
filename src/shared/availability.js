/* TDB shared appointment settings v1.1.0. One request and tab cache per channel. */
(() => {
  'use strict';
  if (window.TDBAvailability) return;
  const maxAge = 300000, entries = new Map(), formats = new Map();
  const channel = location.hostname === 'dentalbarns.webflow.io' && new URLSearchParams(location.search).has('banner-preview') ? 'preview' : 'active';
  const storageKey = slug => 'tdb-availability-v1:' + slug;
  const feedBase = document.querySelector('script[data-tdb-availability-feed]')?.dataset.tdbAvailabilityFeed;
  let compactFailed = false;
  const fields = ['slug','smile-release-time','smile-release-uk-time','next-signature-slot','next-signature-uk-time','smile-countdown-text','smile-waitlist-text','smile-booked-title','signature-heading','signature-availability-text'];
  const format = (key, options) => {
    if (!formats.has(key)) formats.set(key, new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London', ...options}));
    return formats.get(key);
  };
  function ukDate(date, clock) {
    if (!date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) return null;
    const day = Date.parse(date + ' 00:00:00 GMT');
    if (!Number.isFinite(day)) return null;
    const [h,m] = clock.split(':').map(Number), wall = day + (h * 60 + m) * 60000;
    const local = value => {
      const p = Object.fromEntries(format('parts', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(value).map(p => [p.type,p.value]));
      return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    };
    let utc = wall;
    for (let i=0;i<2;i++) utc = wall - (local(utc) - utc);
    return local(utc) === wall ? new Date(utc).toISOString() : null;
  }
  function parse(root, slug) {
    const values = {};
    for (const name of fields) {
      const nodes = root.querySelectorAll('[data-banner-field="' + name + '"]');
      if (nodes.length !== 1) throw Error('Incomplete appointment settings');
      values[name] = nodes[0].textContent.trim();
    }
    return parseValues(values,slug);
  }
  function parseValues(values,slug) {
    if (!values || fields.some(name => typeof values[name] !== 'string' || values[name].length > 2048)) throw Error('Incomplete appointment settings');
    if (values.slug !== slug) throw Error('Wrong appointment settings channel');
    for (const [d,t] of [['smile-release-time','smile-release-uk-time'],['next-signature-slot','next-signature-uk-time']]) {
      if ((values[d] || values[t]) && !ukDate(values[d],values[t])) throw Error('Invalid appointment date');
    }
    return {
      deadline:ukDate(values['smile-release-time'],values['smile-release-uk-time']),
      nextSlot:ukDate(values['next-signature-slot'],values['next-signature-uk-time']),
      title:values['smile-countdown-text'] || 'Smile Design · Appointments released in',
      rest:values['smile-waitlist-text'] || 'Join the waitlist',
      bookedTitle:values['smile-booked-title'] || 'Smile Design · Fully booked',
      signature:values['signature-heading'] || 'Signature Assessment ✦ Next appointment',
      action:values['signature-availability-text'] || 'Enquire about appointments'
    };
  }
  function validData(data) {
    if (!data || ['title','rest','bookedTitle','signature','action'].some(k => typeof data[k] !== 'string' || data[k].length > 2048)) return false;
    return ['deadline','nextSlot'].every(k => data[k] === null || (typeof data[k] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data[k]) && Number.isFinite(Date.parse(data[k]))));
  }
  function persist(e) {
    try { sessionStorage.setItem(storageKey(e.slug),JSON.stringify({version:1,channel:e.slug,checkedAt:e.checkedAt,data:e.data})); } catch(_) {}
  }
  function entry(slug = channel) {
    if (!['active','preview'].includes(slug) || (slug === 'preview' && location.hostname !== 'dentalbarns.webflow.io')) throw Error('Invalid settings channel');
    if (!entries.has(slug)) {
      const e={slug,data:null,checkedAt:0,state:'idle',flight:null,listeners:new Set(),timer:0};
      try {
        const saved=JSON.parse(sessionStorage.getItem(storageKey(slug)) || 'null');
        const age=Date.now()-saved?.checkedAt;
        if(saved?.version===1 && saved.channel===slug && Number.isFinite(saved.checkedAt) && age>=0 && age<maxAge && validData(saved.data)) {
          e.data=Object.freeze(saved.data);e.checkedAt=saved.checkedAt;e.state='ready';
        } else sessionStorage.removeItem(storageKey(slug));
      } catch(_) {}
      entries.set(slug,e);
    }
    return entries.get(slug);
  }
  const fresh = e => !!e.data && Date.now() >= e.checkedAt && Date.now() - e.checkedAt < maxAge;
  const snapshot = e => ({data:e.data,checkedAt:e.checkedAt,state:e.state,fresh:fresh(e)});
  function emit(e) { for (const fn of e.listeners) { try { fn(snapshot(e)); } catch(error) { console.error('TDB availability subscriber failed',error); } } }
  function schedule(e) {
    clearTimeout(e.timer);e.timer=0;
    if (document.hidden || !e.listeners.size) return;
    const delay = e.state === 'unavailable' ? 30000 : Math.max(1000, maxAge - (Date.now() - e.checkedAt));
    e.timer = setTimeout(() => read({slug:e.slug}).catch(() => {}),delay);
  }
  function seed(root = document, slug = channel) {
    const e = entry(slug);
    if (e.data) return snapshot(e);
    const row = [...root.querySelectorAll('[data-tdb-banner-item]')].find(n => (n.getAttribute('data-tdb-banner-item') || n.querySelector('[data-banner-field="slug"]')?.textContent.trim()) === slug);
    if (row) { try { e.data=Object.freeze(parse(row,slug));e.checkedAt=Date.now();e.state='ready';persist(e); } catch(_) {} }
    return snapshot(e);
  }
  async function request(url) {
    const controller=new AbortController(),timeout=setTimeout(() => controller.abort(),4000);
    try {
      const response=await fetch(url,{credentials:'omit',cache:'no-store',signal:controller.signal});
      if (!response.ok) throw Error('Appointment settings unavailable');
      return await response.text();
    } finally {clearTimeout(timeout);}
  }
  async function fetchSettings(slug,force) {
    if(feedBase && !compactFailed) {
      try {
        const url=new URL(slug+'.json',feedBase);
        if(url.protocol!=='https:') throw Error('Invalid settings endpoint');
        if(force)url.searchParams.set('refresh','1');
        const payload=JSON.parse(await request(url.href));
        const age=Date.now()-payload.checkedAt;
        if(payload.version!==1 || payload.channel!==slug || !Number.isFinite(payload.checkedAt) || age < -5000 || age>=maxAge) throw Error('Invalid settings response');
        return {data:parseValues(payload.fields,slug),checkedAt:Math.min(Date.now(),payload.checkedAt)};
      } catch(_) { compactFailed=true; }
    }
    // The CMS page remains a fallback until the compact endpoint is configured.
    const html=await request('/banner-settings/'+slug);
    const nodes=html.match(/<div[^>]*data-banner-field="[^"]+"[^>]*>[^<]*<\/div>/g);
    return {data:parse(new DOMParser().parseFromString(nodes?.join('') || '', 'text/html').body,slug),checkedAt:Date.now()};
  }
  async function read({slug=channel,force=false} = {}) {
    const e=entry(slug);
    if (e.flight) return e.flight;
    if (!force && fresh(e) && e.state === 'ready') { schedule(e);return snapshot(e); }
    clearTimeout(e.timer);e.state='loading';
    e.flight=(async () => {
      try {
        const result=await fetchSettings(slug,force);
        e.data=Object.freeze(result.data);e.checkedAt=result.checkedAt;e.state='ready';persist(e);return snapshot(e);
      } catch(error) {
        e.state='unavailable';
        try {sessionStorage.removeItem(storageKey(slug));} catch(_) {}
        throw error;
      }
      finally { e.flight=null;emit(e);schedule(e); }
    })();
    return e.flight;
  }
  function subscribe(fn,{slug=channel}={}) {
    const e=entry(slug);e.listeners.add(fn);schedule(e);
    return () => { e.listeners.delete(fn);schedule(e); };
  }
  function refreshVisible() {
    for(const e of entries.values()) {
      clearTimeout(e.timer);e.timer=0;
      if(!document.hidden && e.listeners.size) read({slug:e.slug}).catch(() => {});
    }
  }
  document.addEventListener('visibilitychange',refreshVisible);
  addEventListener('online',refreshVisible);
  addEventListener('pageshow',refreshVisible);
  addEventListener('pagehide',()=>entries.forEach(e=>{clearTimeout(e.timer);e.timer=0;}));
  function assessmentSlot(value) {
    const at=Date.parse(value);
    if(!Number.isFinite(at))return null;
    const p=Object.fromEntries(format('slot',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at).map(p=>[p.type,p.value]));
    return {at,day:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute};
  }
  window.TDBAvailability=Object.freeze({version:'1.1.0',channel,read,seed,subscribe,ukDate,assessmentSlot,maxAge,snapshot:(slug=channel)=>snapshot(entry(slug))});
  dispatchEvent(new Event('tdb:availability-ready'));
})();

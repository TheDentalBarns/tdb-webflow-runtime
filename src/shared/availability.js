/* TDB shared appointment settings v1.0.0. Public CMS data, one request/cache per channel. */
(() => {
  'use strict';
  if (window.TDBAvailability) return;
  const maxAge = 300000, entries = new Map(), formats = new Map();
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
  function entry(slug = 'active') {
    if (!['active','preview'].includes(slug) || (slug === 'preview' && location.hostname !== 'dentalbarns.webflow.io')) throw Error('Invalid settings channel');
    if (!entries.has(slug)) entries.set(slug,{slug,data:null,checkedAt:0,state:'idle',flight:null,listeners:new Set(),timer:0});
    return entries.get(slug);
  }
  const fresh = e => !!e.data && Date.now() - e.checkedAt < maxAge;
  const snapshot = e => ({data:e.data,checkedAt:e.checkedAt,state:e.state,fresh:fresh(e)});
  function emit(e) { for (const fn of e.listeners) { try { fn(snapshot(e)); } catch(error) { console.error('TDB availability subscriber failed',error); } } }
  function schedule(e) {
    clearTimeout(e.timer);e.timer=0;
    if (document.hidden || !e.listeners.size) return;
    const delay = e.state === 'unavailable' ? 30000 : Math.max(1000, maxAge - (Date.now() - e.checkedAt));
    e.timer = setTimeout(() => read({slug:e.slug}).catch(() => {}),delay);
  }
  function seed(root = document, slug = 'active') {
    const e = entry(slug);
    if (e.data) return snapshot(e);
    const row = [...root.querySelectorAll('[data-tdb-banner-item]')].find(n => (n.getAttribute('data-tdb-banner-item') || n.querySelector('[data-banner-field="slug"]')?.textContent.trim()) === slug);
    if (row) { try { e.data=parse(row,slug);e.checkedAt=Date.now();e.state='ready'; } catch(_) {} }
    return snapshot(e);
  }
  async function read({slug='active',force=false} = {}) {
    const e=entry(slug);
    if (e.flight) return e.flight;
    if (!force && fresh(e) && e.state === 'ready') { schedule(e);return snapshot(e); }
    clearTimeout(e.timer);e.state='loading';
    e.flight=(async () => {
      const controller=new AbortController(),timeout=setTimeout(() => controller.abort(),4000);
      try {
        const response=await fetch('/banner-settings/'+slug,{credentials:'omit',cache:'no-store',signal:controller.signal});
        if (!response.ok) throw Error('Appointment settings unavailable');
        // Parse only data fields, never execute or retain the fetched page.
        const html=await response.text(), nodes=html.match(/<div[^>]*data-banner-field="[^"]+"[^>]*>[^<]*<\/div>/g);
        e.data=parse(new DOMParser().parseFromString(nodes?.join('') || '', 'text/html').body,slug);
        e.checkedAt=Date.now();e.state='ready';return snapshot(e);
      } catch(error) { e.state='unavailable';throw error; }
      finally { clearTimeout(timeout);e.flight=null;emit(e);schedule(e); }
    })();
    return e.flight;
  }
  function subscribe(fn,{slug='active'}={}) {
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
  window.TDBAvailability=Object.freeze({version:'1.0.0',read,seed,subscribe,ukDate,maxAge,snapshot:(slug='active')=>snapshot(entry(slug))});
  dispatchEvent(new Event('tdb:availability-ready'));
})();

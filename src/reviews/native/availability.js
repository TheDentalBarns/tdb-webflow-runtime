/* TDB native resource availability v1.1.0. Shared CMS cache with the announcement. */
(() => {
  'use strict';
  const root=document.querySelector('[data-tdb-availability]');
  if(!root || root.dataset.ready) return;
  const slot=root.querySelector('[data-tdb-availability-value]'),button=root.querySelector('[data-tdb-availability-refresh]');
  if(!slot || !button) return;
  root.dataset.ready='true';
  const source=new URL('tdb-availability.js',document.currentScript.src);
  const day=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',day:'numeric',month:'short'});
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  let busy=false,subscribed=false,expiry=0,availability;
  function render(snapshot) {
    clearTimeout(expiry);expiry=0;
    if(snapshot.state==='unavailable') {
      slot.textContent='Unable to check availability. Tap refresh to retry.';
      slot.removeAttribute('title');return;
    }
    if(snapshot.state!=='ready' || !snapshot.data) return;
    const time=Date.parse(snapshot.data.nextSlot),live=time>Date.now();
    slot.textContent=live?day.format(time)+' · '+clock.format(time):snapshot.data.action;
    slot.title='Availability checked at '+clock.format(snapshot.checkedAt);
    if(live) expiry=setTimeout(()=>{render(availability.snapshot());refresh(true);},Math.min(time-Date.now()+1000,2147483647));
  }
  async function refresh(force=false) {
    if(busy)return;
    busy=true;button.setAttribute('aria-busy','true');
    const spin=!window.TDBMotion.reduced.matches?button.querySelector('svg')?.animate([{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],{duration:700,iterations:Infinity}):null;
    try {
      if(!window.TDBAvailability) await window.TDBModules.load(source,{ready:()=>Boolean(window.TDBAvailability)});
      availability=window.TDBAvailability;
      if(!subscribed) {availability.seed();availability.subscribe(render);subscribed=true;}
      render(await availability.read({force}));
    } catch(_) {render({state:'unavailable'});}
    finally {spin?.cancel();busy=false;button.removeAttribute('aria-busy');}
  }
  for(const type of ['click','keydown'])button.addEventListener(type,event=>{
    if(type==='keydown'&&!['Enter',' '].includes(event.key))return;
    event.preventDefault();refresh(true);
  });
  addEventListener('pagehide',()=>{clearTimeout(expiry);expiry=0;});
  refresh();
})();

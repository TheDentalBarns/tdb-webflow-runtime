/* Shared availability header for Calculator, Smile Gallery and Five Senses. */
(() => {
  'use strict';
  const root=document.getElementById('calculator-next-assessment');
  if(!root || root.dataset.availabilityReady) return;
  const slot=root.querySelector('[aria-live]'),button=root.querySelector('button');
  if(!slot || !button)return;
  root.dataset.availabilityReady='true';
  const source=new URL('tdb-availability.js',document.currentScript.src);
  const day=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',day:'numeric',month:'short'});
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  let availability,subscribed=false,busy=false,expiry=0;
  function render(snapshot) {
    clearTimeout(expiry);expiry=0;
    const time=Date.parse(snapshot.data?.nextSlot),future=time>Date.now();
    const fresh=snapshot.state==='ready' && snapshot.fresh;
    slot.dataset.live=String(future && fresh);
    slot.dataset.stale=String(!fresh);
    if(snapshot.data) slot.textContent=future?day.format(time)+' · '+clock.format(time):snapshot.data.action;
    else slot.textContent='Unable to check availability. Please try again.';
    slot.title=fresh?'Availability checked at '+clock.format(snapshot.checkedAt):'Unable to refresh availability. Please try again.';
    const remaining=Math.min(future?time-Date.now()+1000:Infinity,snapshot.checkedAt+availability.maxAge-Date.now()+1);
    if(remaining>0 && Number.isFinite(remaining)) expiry=setTimeout(()=>render(availability.snapshot()),Math.min(remaining,2147483647));
  }
  async function refresh(force=false) {
    if(busy)return;
    busy=true;button.disabled=true;button.setAttribute('aria-busy','true');
    slot.textContent='Checking live availability';slot.dataset.live='false';
    const icon=button.querySelector('svg');
    const spin=icon?.animate?.([{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],{duration:700,easing:'linear',iterations:Infinity});
    try {
      if(!window.TDBAvailability) await window.TDBModules.load(source,{ready:()=>Boolean(window.TDBAvailability)});
      availability=window.TDBAvailability;
      if(!subscribed) {availability.seed();availability.subscribe(render);subscribed=true;}
      render(await availability.read({force}));
    } catch(_) {
      if(availability)render({...availability.snapshot(),state:'unavailable'});
      else {slot.textContent='Unable to check availability. Please try again.';slot.dataset.stale='true';}
    } finally {
      // Text is current immediately; preserve the existing two-turn motion.
      button.removeAttribute('aria-busy');
      try {
        if(spin) {spin.effect.updateTiming({iterations:Math.max(2,Math.ceil((spin.currentTime||0)/700))});await spin.finished;}
      } catch(_) {}
      spin?.cancel();busy=false;button.disabled=false;
    }
  }
  button.addEventListener('click',()=>refresh(true));
  addEventListener('pagehide',()=>{clearTimeout(expiry);expiry=0;});
  addEventListener('pageshow',event=>{if(event.persisted && availability)render(availability.snapshot());});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && availability)render(availability.snapshot());});
  refresh();
})();

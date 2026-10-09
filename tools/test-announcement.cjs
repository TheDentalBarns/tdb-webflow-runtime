/* Behaviour checks for cache recovery, UK clocks, banner pausing and VIP fallback.
 * TDB_JSDOM_MODULE may point to an installed jsdom package. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require(process.env.TDB_JSDOM_MODULE || 'jsdom');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fields={slug:'active','smile-release-time':'','smile-release-uk-time':'','next-signature-slot':'October 28, 2026','next-signature-uk-time':'13:40','smile-countdown-text':'Smile Design · Appointments released in','smile-waitlist-text':'Join VIP','smile-booked-title':'Smile Design · Fully booked','signature-heading':'Signature Assessment','signature-availability-text':'Enquire about appointments'};
const feed=(overrides={})=>Object.entries({...fields,...overrides}).map(([k,v])=>`<div data-banner-field="${k}">${v}</div>`).join('');
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function env(html='',route='/') {
  const dom=new JSDOM(html,{url:'https://dentalbarns.webflow.io'+route,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;let now=Date.parse('2026-10-09T12:00:00Z'),id=0;
  const timers=new Map();w.Date.now=()=>now;
  Object.defineProperty(w.performance,'now',{value:()=>now});
  w.setTimeout=(fn,delay=0)=>{timers.set(++id,{fn,at:now+Number(delay)});return id;};
  w.clearTimeout=n=>timers.delete(n);
  w.requestAnimationFrame=fn=>w.setTimeout(()=>fn(now),16);w.cancelAnimationFrame=w.clearTimeout;
  w.Element.prototype.animate=function(){const a={cancelled:false,cancel(){this.cancelled=true;}};this.lastAnimation=a;return a;};
  const advance=async ms=>{const until=now+ms;let count=0;while(true){const next=[...timers].filter(([,v])=>v.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;if(++count>2000)throw Error('Timer loop');now=next[1].at;timers.delete(next[0]);next[1].fn();await flush();}now=until;await flush();};
  return {w,advance,run:p=>w.eval(read(p)),close:()=>dom.window.close()};
}
test('shared feed deduplicates, refreshes stale data and recovers from invalid responses',async()=>{
  const e=env();let calls=0,invalid=false,resolve;
  e.w.fetch=async()=>{calls++;await new Promise(r=>resolve=r);return {ok:true,text:async()=>invalid?feed({slug:'wrong'}):feed()};};
  e.run('src/shared/availability.js');const api=e.w.TDBAvailability;
  const a=api.read(),b=api.read();assert.equal(calls,1);resolve();await Promise.all([a,b]);
  await api.read();assert.equal(calls,1);
  const states=[];api.subscribe(s=>states.push(s.state));
  Object.defineProperty(e.w.document,'hidden',{configurable:true,value:true});
  e.w.document.dispatchEvent(new e.w.Event('visibilitychange'));
  await e.advance(300001);assert.equal(calls,1);
  Object.defineProperty(e.w.document,'hidden',{configurable:true,value:false});
  invalid=true;e.w.document.dispatchEvent(new e.w.Event('visibilitychange'));assert.equal(calls,2);
  resolve();await flush();assert.equal(api.snapshot().state,'unavailable');
  invalid=false;e.w.dispatchEvent(new e.w.Event('online'));assert.equal(calls,3);
  resolve();await flush();assert.equal(api.snapshot().state,'ready');assert.deepEqual(states,['unavailable','ready']);
  e.close();
});
test('UK dates account for DST and preview data remains separate',async()=>{
  const e=env();let calls=0;e.w.fetch=async url=>{calls++;return {ok:true,text:async()=>feed({slug:url.endsWith('preview')?'preview':'active'})};};
  e.run('src/shared/availability.js');const api=e.w.TDBAvailability;
  assert.equal(api.ukDate('July 1, 2026','13:40'),'2026-07-01T12:40:00.000Z');
  assert.equal(api.ukDate('October 28, 2026','13:40'),'2026-10-28T13:40:00.000Z');
  assert.equal(api.ukDate('March 29, 2026','01:30'),null);
  await Promise.all([api.read(),api.read({slug:'preview'})]);assert.equal(calls,2);
  assert.notEqual(api.snapshot().data,api.snapshot('preview').data);
  assert.equal(api.snapshot().data.deadline,null);e.close();
});
test('navigation reuses the original timestamp and refreshes at the original expiry',async()=>{
  const first=env();first.w.fetch=async()=>({ok:true,text:async()=>feed()});first.run('src/shared/availability.js');
  const initial=await first.w.TDBAvailability.read(),saved=first.w.sessionStorage.getItem('tdb-availability-v1:active');first.close();
  const next=env();await next.advance(260000);let calls=0;
  next.w.sessionStorage.setItem('tdb-availability-v1:active',saved);
  next.w.fetch=async()=>{calls++;return {ok:true,text:async()=>feed()};};next.run('src/shared/availability.js');
  const api=next.w.TDBAvailability,result=await api.read();api.subscribe(()=>{});
  assert.equal(calls,0);assert.equal(result.checkedAt,initial.checkedAt);
  await next.advance(39999);assert.equal(calls,0);
  await next.advance(2);assert.equal(calls,1);assert(api.snapshot().checkedAt>initial.checkedAt);next.close();
});
test('invalid, expired and cross-channel session records are rejected; storage remains optional',async()=>{
  const initial=env();initial.w.fetch=async()=>({ok:true,text:async()=>feed()});initial.run('src/shared/availability.js');await initial.w.TDBAvailability.read();
  const saved=JSON.parse(initial.w.sessionStorage.getItem('tdb-availability-v1:active'));initial.close();
  for(const changes of [{version:2},{channel:'preview'},{checkedAt:saved.checkedAt+1},{checkedAt:saved.checkedAt-300000},{data:{...saved.data,nextSlot:'garbage'}}]){
    const e=env();let calls=0;e.w.fetch=async()=>{calls++;return {ok:true,text:async()=>feed()};};
    e.w.sessionStorage.setItem('tdb-availability-v1:active',JSON.stringify({...saved,...changes}));e.run('src/shared/availability.js');
    await e.w.TDBAvailability.read();assert.equal(calls,1);e.close();
  }
  const e=env();Object.defineProperty(e.w,'sessionStorage',{get(){throw Error('blocked');}});
  e.w.fetch=async()=>({ok:true,text:async()=>feed()});e.run('src/shared/availability.js');assert.equal((await e.w.TDBAvailability.read()).state,'ready');e.close();
});
test('preview is consistently selected and a failed refresh invalidates the navigation cache',async()=>{
  const e=env('','/?banner-preview');const calls=[];let fail=false;
  e.w.fetch=async url=>{calls.push(url);if(fail)throw Error('offline');return {ok:true,text:async()=>feed({slug:'preview'})};};e.run('src/shared/availability.js');
  const api=e.w.TDBAvailability;await api.read();assert.equal(api.channel,'preview');assert.equal(calls[0],'/banner-settings/preview');
  assert(e.w.sessionStorage.getItem('tdb-availability-v1:preview'));assert.equal(e.w.sessionStorage.getItem('tdb-availability-v1:active'),null);
  fail=true;await assert.rejects(api.read({force:true}));assert.equal(e.w.sessionStorage.getItem('tdb-availability-v1:preview'),null);e.close();
});
test('compact JSON preserves its source timestamp and falls back safely if invalid',async()=>{
  const html='<script data-tdb-availability-feed="https://availability.example.test/"></script>',e=env(html),urls=[];
  e.w.fetch=async url=>{urls.push(url);return {ok:true,text:async()=>JSON.stringify({version:1,channel:'active',checkedAt:e.w.Date.now()-60000,fields})};};
  e.run('src/shared/availability.js');const result=await e.w.TDBAvailability.read();assert.equal(result.checkedAt,e.w.Date.now()-60000);
  assert.equal(urls[0],'https://availability.example.test/active.json');
  await e.w.TDBAvailability.read({force:true});assert.match(urls[1],/refresh=1/);e.close();
  const f=env(html),fallback=[];f.w.fetch=async url=>{fallback.push(url);return {ok:true,text:async()=>url.startsWith('/')?feed():'{"version":2}'};};
  f.run('src/shared/availability.js');assert.equal((await f.w.TDBAvailability.read()).state,'ready');assert.equal(fallback.length,2);
  await f.w.TDBAvailability.read({force:true});assert.equal(fallback.length,3);assert.equal(fallback[2],'/banner-settings/active');f.close();
});
test('resource header shares banner results and shows updates before its spinner finishes',async()=>{
  const e=await mount(),w=e.w;
  w.document.body.insertAdjacentHTML('beforeend','<section id="calculator-next-assessment"><span aria-live="polite"></span><button><svg></svg></button></section>');
  Object.defineProperty(w.document,'currentScript',{value:{src:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@test/dist/tdb-availability-header.js'}});
  let finish,turns;w.Element.prototype.animate=()=>({currentTime:100,effect:{updateTiming(value){turns=value.iterations;}},finished:new Promise(r=>finish=r),cancel(){}});
  e.run('src/shared/availability-header.js');await flush();
  const root=w.document.getElementById('calculator-next-assessment'),button=root.querySelector('button'),slot=root.querySelector('[aria-live]');
  assert.equal(e.fetchCalls,1);assert.match(slot.textContent,/28 Oct.*13:40/);assert.equal(turns,2);
  assert(button.disabled);assert(!button.hasAttribute('aria-busy'));finish();await flush();assert(!button.disabled);
  w.fetch=async()=>{e.fetchCalls++;return {ok:true,text:async()=>feed({'next-signature-slot':'October 30, 2026','next-signature-uk-time':'10:15'})};};
  button.click();await flush();assert.equal(e.fetchCalls,2);assert.match(slot.textContent,/30 Oct.*10:15/);assert(button.disabled);
  assert.match(w.document.querySelector('.tdb-announcement-slot').textContent,/30 Oct.*10:15/);finish();await flush();assert(!button.disabled);e.close();
});
async function mount(route='/') {
  const e=env(read('src/banner/designer/announcement.html'),route),w=e.w;
  e.fetchCalls=0;w.fetch=async()=>{e.fetchCalls++;return {ok:true,text:async()=>feed()};};
  w.TDBConsent={status:()=>({elfsight:true})};
  w.TDBMotion={reduced:{matches:false},defaults:{base:500}};
  w.TDBNativeTicker={mount:node=>({update:value=>node.textContent=value,settle(){}})};
  let definition;
  w.TDBSwiper={register:(_name,d)=>definition=d,mount:(_name,t)=>definition.mount(t),create:(viewport,options)=>{
    const handlers={};const swiper={slides:[...viewport.querySelectorAll('[data-message]')],activeIndex:0,realIndex:0,allowClick:true,params:options,width:1000,snapGrid:[0,1000],snapIndex:0,on:(n,fn)=>handlers[n]=fn,setTransition(){},setTranslate(){},transitionEnd:()=>options.on.transitionEnd()};
    const slide=()=>{options.on.beforeTransitionStart();swiper.activeIndex=swiper.realIndex=1-swiper.activeIndex;options.on.slideChange(swiper);options.on.transitionEnd();};
    swiper.slideNext=slide;swiper.slidePrev=slide;return swiper;
  }};
  w.TDBVIPDrawerLoader={open:source=>e.openSource=source};
  w.document.documentElement.style.setProperty('--tdb-ui-ready','1');
  e.run('src/shared/availability.js');e.run('src/banner/announcement.js');
  w.TDBAnnouncement.mount(w.document.querySelector('[data-tdb-announcement]'));
  await flush();await e.advance(32);return e;
}
test('Signature Assessment stays static; home pauses its ring while inert and manual navigation stays manual',async()=>{
  const sa=await mount('/services/signature-assessment/');
  assert.equal(sa.w.TDBAnnouncement.status().rotating,false);
  assert.equal(sa.w.document.querySelectorAll('[data-message]').length,1);
  await sa.advance(16000);assert.equal(sa.w.TDBAnnouncement.status().mode,'signature');sa.close();
  const e=await mount(),w=e.w,api=w.TDBAnnouncement,shell=w.document.querySelector('[data-tdb-announcement]');
  const progress=shell.querySelector('.tdb-announcement-progress');
  assert.equal(api.status().rotating,true);await e.advance(2000);
  const animation=progress.lastAnimation;w.document.body.setAttribute('inert','');await flush();
  assert.equal(api.status().rotating,false);assert.equal(animation.cancelled,true);
  const offset=progress.style.strokeDashoffset;await e.advance(12000);
  assert.equal(api.status().mode,'signature');assert.equal(progress.style.strokeDashoffset,offset);
  w.document.body.removeAttribute('inert');await flush();await e.advance(6001);assert.equal(api.status().mode,'rest');
  const button=shell.querySelector('.tdb-announcement');
  button.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  assert.equal(api.status().manual,true);assert.equal(api.status().rotating,false);
  button.click();assert.equal(e.openSource,button);e.close();
});
test('shared VIP opener restores a pointer trigger and falls back to the form on failure',async()=>{
  const e=env('<a id="trigger" href="/vip">Announcement</a><section id="VIP"><input></section><div id="tdb-vip-drawer" data-tdb-vip-native="1"><button class="tdb-vip-drawer-handle">Close</button><div class="tdb-vip-drawer-body"><input></div></div>');
  const w=e.w,drawer=w.document.querySelector('#tdb-vip-drawer'),trigger=w.document.querySelector('#trigger');
  w.TDBMotionPolicy={reduced:{matches:false,addEventListener(){}}};w.HTMLElement.prototype.getClientRects=()=>[{width:10,height:10}];
  let scrolled=false;w.document.querySelector('#VIP').scrollIntoView=()=>scrolled=true;
  Object.defineProperty(w.document,'currentScript',{value:{src:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@test/dist/tdb-footer-runtime.min.js'}});
  w.TDBFooterInitialScrollY=0;w.tdbPreloadVIPScript=()=>{};w.tdbEnsureUI=w.tdbEnsureVIPUI=()=>Promise.resolve();
  w.tdbUIIsReady=()=>true;w.tdbLoadVIPScript=()=>Promise.reject(Error('offline'));w.console.error=()=>{};
  e.run('src/vip-drawer/vip-focus.js');
  const source=read('src/runtime/site-asset-loader.js');w.eval(source.slice(source.indexOf('function prepareVIPDrawerLoader()'),source.indexOf('function prepareSliderLoader()'))+'\nprepareVIPDrawerLoader();');
  await w.TDBVIPDrawerLoader.open(trigger);assert.equal(scrolled,true);assert.equal(w.document.activeElement,w.document.querySelector('#VIP input'));
  w.TDBVIPDrawer={open:()=>drawer.classList.add('is-open')};
  await w.TDBVIPDrawerLoader.open(trigger);await flush();
  assert.equal(w.document.activeElement,drawer.querySelector('button'));
  drawer.classList.remove('is-open');await flush();await e.advance(16);
  assert.equal(w.document.activeElement,trigger);e.close();
});

test('native availability display reuses the banner cache and refreshes both consumers',async()=>{
  const e=await mount(),w=e.w;
  w.document.body.insertAdjacentHTML('beforeend','<div data-tdb-availability><span data-tdb-availability-value></span><button data-tdb-availability-refresh>Refresh</button></div>');
  Object.defineProperty(w.document,'currentScript',{value:{src:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@test/dist/tdb-review-availability.js'}});
  e.run('src/reviews/native/availability.js');await flush();assert.equal(e.fetchCalls,1);
  assert.match(w.document.querySelector('[data-tdb-availability-value]').textContent,/28 Oct.*13:40/);
  w.fetch=async()=>{e.fetchCalls++;return {ok:true,text:async()=>feed({'next-signature-slot':'October 30, 2026','next-signature-uk-time':'10:15'})};};
  w.document.querySelector('[data-tdb-availability-refresh]').click();await flush();assert.equal(e.fetchCalls,2);
  assert.match(w.document.querySelector('[data-tdb-availability-value]').textContent,/30 Oct.*10:15/);
  assert.match(w.document.querySelector('.tdb-announcement-slot').textContent,/30 Oct.*10:15/);e.close();
});
test('desktop homepage navbar visibility is reflected in the banner pause state',async()=>{
  const e=env('<nav class="navbar10_component" style="transform:translateY(0px)"></nav><div id="tdb-elfsight-timer-shell"></div>'),w=e.w;
  Object.defineProperty(w,'scrollY',{value:5000});w.innerHeight=900;
  w.matchMedia=query=>({matches:query==='(min-width:992px)',addEventListener(){}});
  w.requestIdleCallback=()=>0;
  const source=read('src/runtime/site-asset-loader.js');
  w.eval(source.slice(0,source.indexOf("\n(() => {\n  const path = window.location.pathname")));
  w.dispatchEvent(new w.PageTransitionEvent('pageshow'));await flush();
  assert.equal(w.document.documentElement.classList.contains('tdb-timer-hidden'),true);
  w.document.querySelector('nav').style.transform='translateY(-100%)';await flush();await e.advance(16);
  assert.equal(w.document.documentElement.classList.contains('tdb-timer-hidden'),false);e.close();
});

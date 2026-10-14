const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
function fixture({choice,back=false,landscape=false,legacy=false,vip=false}={}) {
 const native=`<div class="parallax-swiper_component tdb-service-parallax" id="services"><div class="swiper"><div class="swiper-wrapper"><div class="swiper-slide"><div class="tdb-service-card"><div class="tdb-service-content"><div data-tdb-service-copy>Copy</div><h3 class="service-card-mobile-title">First</h3><div class="service-card-button-wrap"><a href="/first">First</a></div></div></div></div><div class="swiper-slide"><div class="tdb-service-card"><div class="tdb-service-content"><h3 class="service-card-mobile-title">Second</h3><div class="service-card-button-wrap"><a href="/second">Second</a></div></div></div></div></div></div><div class="tdb-service-controls"><button class="swiper-btn-prev carousel-arrow">Prev</button><button class="swiper-btn-next carousel-arrow">Next</button></div><div class="tdb-service-cta"><a data-tdb-parallax-cta href="/first"><span>Discover</span></a></div><div data-tdb-native-progress><span></span><span></span></div></div>`;
 const legacyMarkup=`<div class="highlight-swiper_component" id="legacy"><div class="swiper"><div class="swiper-wrapper is-3-grid"><div class="swiper-slide is-3-grid"><a class="layout423_card" href="/treatments/veneers"><h3>Veneers</h3><img class="layout423_image" src="/image.webp"><div class="layout423_card-content-bottom"><p>Copy</p></div></a></div></div></div><div class="swiper_functions-btm"></div></div>`;
 const vipMarkup=`<a id="vip-trigger" href="#vip">Join</a><div id="tdb-vip-drawer" data-tdb-vip-native="1"><button class="tdb-vip-drawer-handle">VIP</button><div class="tdb-vip-drawer-body"><input></div></div>`;
 const dom=new JSDOM('<html data-wf-page="677cf86df9952f978d94d8a9"><head><script data-tdb-attribution-js src="/attribution.js"></script></head><body>'+read('src/consent/banner.html')+native+(legacy?legacyMarkup:'')+(vip?vipMarkup:'')+'</body></html>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,idles=new Map(),timers=new Map(),ios=[],errors=[];let current,id=0,now=0;
 Object.defineProperty(d,'readyState',{get:()=> 'complete'});Object.defineProperty(d,'currentScript',{get:()=>current});
 Object.defineProperty(w.screen,'width',{value:landscape?844:1280});Object.defineProperty(w.screen,'height',{value:landscape?390:900});
 Object.defineProperty(w.screen,'orientation',{value:{type:landscape?'landscape-primary':'portrait-primary',addEventListener(){}}});
 w.matchMedia=q=>({matches:landscape? /pointer: coarse|orientation:landscape|orientation: landscape/.test(q):/min-width:992px/.test(q),addEventListener(){},removeEventListener(){}});
 w.performance.getEntriesByType=()=>[{type:back?'back_forward':'navigate'}];
 if(back)w.history.replaceState({tdbParallax:{'/:0':{index:1,href:'/second',held:true}}},'');
 w.setTimeout=(fn,delay=0)=>{timers.set(++id,{fn,at:now+delay});return id};w.clearTimeout=id=>timers.delete(id);
 w.requestAnimationFrame=fn=>w.setTimeout(fn,16);w.cancelAnimationFrame=w.clearTimeout;
 w.requestIdleCallback=fn=>{idles.set(++id,fn);return id};w.cancelIdleCallback=id=>idles.delete(id);
 w.IntersectionObserver=class{constructor(fn,options){this.fn=fn;this.options=options;this.nodes=new Set();ios.push(this)}observe(n){this.nodes.add(n)}unobserve(n){this.nodes.delete(n)}disconnect(){this.nodes.clear()}};
 w.ResizeObserver=class{observe(){}disconnect(){}};
 w.Element.prototype.getAnimations=()=>[];w.Element.prototype.animate=()=>({finished:Promise.resolve(),cancel(){}});
 w.console.warn=(...args)=>errors.push(args);w.console.error=(...args)=>errors.push(args);
 function evaluate(p,node){current=node||Object.assign(d.createElement('script'),{src:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@'+'b'.repeat(40)+'/dist/'+p.split('/').pop()});if(!current.isConnected)d.head.append(current);w.eval(read(p));current=null;}
 if(choice)d.cookie='CookieScriptConsent='+encodeURIComponent(JSON.stringify({action:choice,categories:choice==='accept'?['strict','performance','functionality']:['strict']}));
 evaluate('dist/tdb-consent.js');evaluate('dist/tdb-foundation.js');
 const request=name=>[...d.scripts].find(s=>s.src.endsWith('/'+name));
 async function advance(ms){await tick();const end=now+ms;for(;;){const pair=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!pair)break;timers.delete(pair[0]);now=pair[1].at;pair[1].fn();await tick()}now=end;await tick()}
 async function drain(){let n=0;for(;;){await tick();const pair=idles.entries().next().value;if(!pair)break;idles.delete(pair[0]);pair[1]({didTimeout:false,timeRemaining:()=>20});assert(++n<100)}}
 async function runtime(){const r=request('tdb-runtime.js');assert(r);evaluate('dist/tdb-runtime.js',r);r.dispatchEvent(new w.Event('load'));await advance(150);await drain();}
 return {w,d,ios,errors,evaluate,request,advance,drain,runtime,close(){w.TDBRuntime?.destroy();w.close()}};
}
for(const choice of ['accept','reject'])test('full bundle: '+choice+' releases feature loaders after closing and idle',async()=>{
 const f=fixture();try{
  assert(f.w.TDBParallax);assert(!f.w.TDBRenderedProgress);assert(!f.w.TDBSliderLoader);assert(!f.request('tdb-footer-runtime.min.js'));
  f.w.CookieScript.instance[choice==='accept'?'acceptAllAction':'rejectAllAction']();await f.advance(469);assert(!f.request('tdb-runtime.js'));
  await f.advance(1);await f.runtime();assert(f.w.TDBSliderLoader);assert(!f.w.TDBRenderedProgress);assert(!f.request('tdb-parallax.js'));
  assert(f.ios.some(o=>o.options.rootMargin==='800px 0px'));assert.equal(f.errors.length,0);
 }finally{f.close()}
});
test('foundation preserves browser Back destination, initial pose and held state before runtime',()=>{
 const f=fixture({back:true});try{const c=f.d.querySelector('[data-tdb-parallax-cta]');assert.equal(c.getAttribute('href'),'/second');assert(c.classList.contains('is-touch-held'));assert.equal(f.d.querySelector('.swiper').style.getPropertyValue('--tdb-parallax-initial-index'),'1');assert(f.d.querySelector('.swiper-wrapper').classList.contains('tdb-parallax-initial-pose'));assert(!f.w.TDBSliderLoader)}finally{f.close()}
});
test('foundation preserves native landscape layout and legacy conversion',()=>{
 const f=fixture({landscape:true,legacy:true});try{assert(f.d.querySelector('.tdb-service-content').classList.contains('is-phone-landscape'));assert(f.d.querySelector('#legacy').classList.contains('tdb-banner-parallax'));assert(f.d.querySelector('#legacy .showcase_card'));assert.equal(f.d.querySelector('#legacy [data-tdb-parallax-cta]').getAttribute('href'),'/treatments/veneers');}finally{f.close()}
});
test('early arrow intent is held until the existing loader binds the component',async()=>{
 const f=fixture();try{
  const root=f.d.getElementById('services'),button=root.querySelector('.swiper-btn-next');let next=0;
  button.dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(root.getAttribute('aria-busy'),'true');
  const control=f.w.TDBParallax.prepare(root);const swiper={slides:[...root.querySelectorAll('.swiper-slide')],activeIndex:0,on(){},off(){},slideNext(){next++},slidePrev(){}};
  f.w.TDBSliderLoader={load:async()=>{control.bind(swiper)}};f.w.TDBSwiper={mount(){}};f.w.dispatchEvent(new f.w.Event('tdb:slider-loader-ready'));await tick();await tick();assert.equal(next,1);assert(!root.hasAttribute('aria-busy'));
 }finally{f.close()}
});
test('VIP click and early scroll seed survive runtime handoff',async()=>{
 const f=fixture({vip:true});try{
  Object.defineProperty(f.w,'scrollY',{value:1000,writable:true});f.w.dispatchEvent(new f.w.Event('scroll'));f.w.scrollY=700;f.w.dispatchEvent(new f.w.Event('scroll'));
  const trigger=f.d.getElementById('vip-trigger');trigger.dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(f.w.TDBEarlyPageState.vipIntent,trigger);assert.equal(f.w.TDBEarlyPageState.vipScrollSeed.peek,true);
  let source;f.w.TDBVIPDrawerLoader={open:n=>{source=n}};f.w.dispatchEvent(new f.w.Event('tdb:features-ready'));assert.equal(source,trigger);assert.equal(f.w.TDBEarlyPageState.vipIntent,null);
 }finally{f.close()}
});
test('parallax progress can load separately without mounting during download',()=>{
 const f=fixture();try{const progress=f.d.querySelector('[data-tdb-native-progress]');const before=progress.outerHTML;f.evaluate('dist/tdb-parallax-progress.js');assert.equal(progress.outerHTML,before);assert(!f.w.TDBRenderedProgress);f.evaluate('dist/tdb-rendered-progress.js');f.w.TDBParallax.refresh();assert(f.ios.some(o=>o.options.rootMargin==='100px'));assert.equal(f.errors.length,0)}finally{f.close()}
});
test('existing attribution marker prevents a second version request',()=>{
 const f=fixture();try{assert.equal(f.d.querySelectorAll('script[data-tdb-attribution-js]').length,1);assert.equal(f.d.querySelector('script[data-tdb-attribution-js]').getAttribute('src'),'/attribution.js');assert(!f.request('tdb-consent.min.js'))}finally{f.close()}
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
function fixture({choice,back=false,landscape=false,legacy=false,vip=false,attribution=false}={}) {
 const native=`<div class="parallax-swiper_component tdb-service-parallax" id="services"><div class="swiper"><div class="swiper-wrapper"><div class="swiper-slide"><div class="tdb-service-card"><div class="tdb-service-content"><div data-tdb-service-copy>Copy</div><h3 class="service-card-mobile-title">First</h3><div class="service-card-button-wrap"><a href="/first">First</a></div></div></div></div><div class="swiper-slide"><div class="tdb-service-card"><div class="tdb-service-content"><h3 class="service-card-mobile-title">Second</h3><div class="service-card-button-wrap"><a href="/second">Second</a></div></div></div></div></div></div><div class="tdb-service-controls"><button class="swiper-btn-prev carousel-arrow">Prev</button><button class="swiper-btn-next carousel-arrow">Next</button></div><div class="tdb-service-cta"><a data-tdb-parallax-cta href="/first"><span>Discover</span></a></div><div data-tdb-native-progress><span></span><span></span></div></div>`;
 const legacyMarkup=`<div class="highlight-swiper_component" id="legacy"><div class="swiper"><div class="swiper-wrapper is-3-grid"><div class="swiper-slide is-3-grid"><a class="layout423_card" href="/treatments/veneers"><h3>Veneers</h3><img class="layout423_image" src="/image.webp"><div class="layout423_card-content-bottom"><p>Copy</p></div></a></div></div></div><div class="swiper_functions-btm"></div></div>`;
 const vipMarkup=`<a id="vip-trigger" href="#vip">Join</a><div id="tdb-vip-drawer" data-tdb-vip-native="1"><button class="tdb-vip-drawer-handle">VIP</button><div class="tdb-vip-drawer-body"><input></div></div>`;
 const dom=new JSDOM('<html data-wf-page="677cf86df9952f978d94d8a9"><head>'+(attribution?'<script data-tdb-attribution-js src="/attribution.js"></script>':'')+'</head><body>'+read('src/consent/banner.html')+native+(legacy?legacyMarkup:'')+(vip?vipMarkup:'')+'</body></html>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
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
 evaluate('dist/tdb-consent.js');evaluate('dist/tdb-navbar-loader.js');
 const request=name=>[...d.scripts].find(s=>s.src.endsWith('/'+name));
 async function advance(ms){await tick();const end=now+ms;for(;;){const pair=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!pair)break;timers.delete(pair[0]);now=pair[1].at;pair[1].fn();await tick()}now=end;await tick()}
 async function drain(){let n=0;for(;;){await tick();const pair=idles.entries().next().value;if(!pair)break;idles.delete(pair[0]);pair[1]({didTimeout:false,timeRemaining:()=>20});assert(++n<100)}}
 async function runtime(){const r=request('tdb-runtime.js');assert(r);evaluate('dist/tdb-runtime.js',r);r.dispatchEvent(new w.Event('load'));await advance(150);await drain();}
 return {w,d,ios,errors,evaluate,request,advance,drain,runtime,close(){w.TDBRuntime?.destroy();w.close()}};
}

function registerParallax(f) {
 f.w.TDBSwiper ||= {register(){},refresh(){}};
 f.w.TDBMotion ||= {reduced:{matches:false}};
 f.evaluate('dist/tdb-rendered-progress.js');
 f.evaluate('dist/tdb-parallax.js');
 f.w.TDBParallaxPlugin.beforeObserve(f.d.getElementById('services'));
}
for(const choice of ['accept','reject'])test('full bundle: '+choice+' releases features after closing and idle',async()=>{
 const f=fixture();try{
  assert(!f.w.TDBParallax);assert(!f.w.TDBRuntimePageState);assert(!f.w.TDBSliderLoader);
  assert.equal(f.d.querySelectorAll('script[data-tdb-attribution-js]').length,0);
  f.w.CookieScript.instance[choice==='accept'?'acceptAllAction':'rejectAllAction']();await f.advance(469);assert(!f.request('tdb-runtime.js'));
  await f.advance(1);await f.runtime();assert(f.w.TDBSliderLoader);assert(f.w.TDBRuntimePageState);assert(!f.w.TDBParallax);assert(!f.request('tdb-parallax.js'));
  assert(f.ios.some(o=>o.options.rootMargin==='800px 0px'));assert(f.ios.some(o=>o.options.rootMargin==='600px 0px'));
  assert.equal(f.d.querySelectorAll('script[data-tdb-attribution-js]').length,1);
  assert.match(f.d.querySelector('script[data-tdb-attribution-js]').src,new RegExp('tdb-webflow-runtime@'+'b'.repeat(40)+'/dist/tdb-attribution.min.js'));assert.equal(f.errors.length,0);
 }finally{f.close()}
});
test('parallax owns Back restoration and prepares it before observing',()=>{
 const f=fixture({back:true});try{
  const c=f.d.querySelector('[data-tdb-parallax-cta]');assert.equal(c.getAttribute('href'),'/first');assert(!f.w.TDBParallax);
  registerParallax(f);assert.equal(c.getAttribute('href'),'/second');assert(c.classList.contains('is-touch-held'));
  assert.equal(f.d.querySelector('.swiper').style.getPropertyValue('--tdb-parallax-initial-index'),'1');
  assert(f.d.querySelector('.swiper-wrapper').classList.contains('tdb-parallax-initial-pose'));
 }finally{f.close()}
});
test('landscape layout works without resurrecting the removed legacy conversion',()=>{
 const f=fixture({landscape:true,legacy:true});try{
  assert(f.d.documentElement.classList.contains('tdb-phone-landscape'));
  assert(f.d.querySelector('style[data-tdb-phone-landscape-css]'),'landscape visibility CSS is installed with its orientation owner');
  registerParallax(f);f.w.TDBParallax.refresh();
  assert(f.d.querySelector('.tdb-service-content').classList.contains('is-phone-landscape'));
  assert(f.d.querySelector('#legacy .layout423_card'));assert(!f.d.querySelector('#legacy .showcase_card'));assert(!f.w.TDBLegacyParallax);
 }finally{f.close()}
});
for(const intent of ['arrow','stamp'])test(`runtime retains a ${intent} click while the parallax module downloads`,async()=>{
 const f=fixture({choice:'reject'});try{
  await f.runtime();f.w.eval('tdbEnsureUI=tdbEnsureSliderUI=tdbEnsureSliderFocus=()=>Promise.resolve()');
  const root=f.d.getElementById('services');
  if(intent==='stamp')root.insertAdjacentHTML('beforeend','<a data-tdb-treatment-stamp href="/first">First treatment</a>');
  const button=root.querySelector(intent==='stamp'?'[data-tdb-treatment-stamp]':'.swiper-btn-next');let next=0,complete,bound=false;
  f.w.Swiper=function(){};
  const swiper={slides:[...root.querySelectorAll('.swiper-slide')],activeIndex:0,on(){},off(){},slideNext(){next++},slidePrev(){}};
  f.w.TDBSwiper={create(){},register(){},refresh(){},prune(){},mount(){f.w.TDBParallax.prepare(root).bind(swiper);if(!bound){bound=true;button.addEventListener("click",e=>{e.preventDefault();swiper.slideNext()})}}};
  f.w.TDBModules={load:async url=>{if(String(url).endsWith('/tdb-parallax.js'))await new Promise(r=>{complete=r});}};
  button.dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,cancelable:true}));await tick();
  assert.equal(root.getAttribute('aria-busy'),'true');assert.equal(next,0);assert(complete);
  registerParallax(f);complete();await f.drain();await tick();await f.drain();
  assert.equal(next,1);assert(!root.hasAttribute('aria-busy'));
 }finally{f.close()}
});
test('VIP gesture capture begins with runtime, not the early navbar',()=>{
 const f=fixture({choice:'reject',vip:true});try{
  const trigger=f.d.getElementById('vip-trigger');assert(!f.w.TDBRuntimePageState);
  f.evaluate('dist/tdb-runtime.js',f.request('tdb-runtime.js'));
  Object.defineProperty(f.w,'scrollY',{value:1000,writable:true});f.w.dispatchEvent(new f.w.Event('scroll'));f.w.scrollY=700;f.w.dispatchEvent(new f.w.Event('scroll'));
  trigger.dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(f.w.TDBRuntimePageState.vipIntent,trigger);assert.equal(f.w.TDBRuntimePageState.vipScrollSeed.peek,true);
  let source;f.w.TDBVIPDrawerLoader={open:n=>{source=n}};f.w.dispatchEvent(new f.w.Event('tdb:features-ready'));assert.equal(source,trigger);
 }finally{f.close()}
});
test('parallax carries its progress without an extra progress-module request',()=>{
 const f=fixture();try{registerParallax(f);assert(f.w.TDBParallaxProgress);assert(f.ios.some(o=>o.options.rootMargin==='100px'));assert(!f.request('tdb-parallax-progress.js'));assert.equal(f.errors.length,0)}finally{f.close()}
});
test('existing attribution remains the only version after runtime release',async()=>{
 const f=fixture({choice:'reject',attribution:true});try{await f.runtime();assert.equal(f.d.querySelectorAll('script[data-tdb-attribution-js]').length,1);assert.equal(f.d.querySelector('script[data-tdb-attribution-js]').getAttribute('src'),'/attribution.js')}finally{f.close()}
});
test('gallery bundle sorts treatment priorities before plugin registration',()=>{
 const dom=new JSDOM('<html><body><div class="gallery17_component"><div class="highlight-swiper_component"><div class="swiper-wrapper"><div id="later"><span class="cb-priority">2</span></div><div id="earlier"><span class="cb-priority">1</span></div></div></div></div></body></html>',{url:'https://dentalbarns.webflow.io/treatments/composite-bonding',runScripts:'outside-only'});
 try{let sorted=false;dom.window.TDBSwiper={register(){sorted=dom.window.document.querySelector('.swiper-wrapper').firstElementChild.id==='earlier'}};dom.window.eval(read('dist/tdb-gallery.js'));assert(sorted);}finally{dom.window.close()}
});

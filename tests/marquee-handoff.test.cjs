const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const {JSDOM} = require('jsdom');
const read = file => fs.readFileSync(file, 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const track = id => `<section class="section_logo-features"><div class="logo-slider"><div class="partner-featured_component" id="${id}"><a class="tdb-partner-logo" href="#leave"><img class="logo_image" alt="Partner"></a></div></div></section>`;
function fixture({choice, count=2, intersection=true}={}) {
  const dom = new JSDOM('<!doctype html><html><body>'+read('src/consent/banner.html')+Array.from({length:count},(_,i)=>track('track'+i)).join('')+'</body></html>',
    {url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,timers=new Map(),idles=new Map(),observers=[],warnings=[];
  let now=0,id=0,current;
  Object.defineProperty(d,'readyState',{get:()=> 'complete'});
  Object.defineProperty(d,'currentScript',{get:()=>current});
  w.setTimeout=(fn,delay=0)=>{timers.set(++id,{fn,at:now+delay});return id;};w.clearTimeout=id=>timers.delete(id);
  w.requestAnimationFrame=fn=>w.setTimeout(fn,16);w.cancelAnimationFrame=w.clearTimeout;
  w.requestIdleCallback=fn=>{idles.set(++id,fn);return id;};w.cancelIdleCallback=id=>idles.delete(id);
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.Element.prototype.getAnimations=()=>[];
  w.Element.prototype.animate=()=>({finished:Promise.resolve(),cancel(){}});
  w.console.warn=(...args)=>warnings.push(args);
  if(intersection)w.IntersectionObserver=class {
    constructor(cb,options){this.cb=cb;this.options=options;this.targets=new Set();observers.push(this);}
    observe(node){this.targets.add(node);}unobserve(node){this.targets.delete(node);}disconnect(){this.targets.clear();}
    fire(node,on=true){this.cb([{target:node,isIntersecting:on}]);}
  };
  function evaluate(file,node) {
    current=node||Object.assign(d.createElement('script'),{src:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@'+'b'.repeat(40)+'/dist/'+file.split('/').pop()});
    if(!current.isConnected)d.head.append(current);
    w.eval(read(file));current=null;
  }
  if(choice)d.cookie='CookieScriptConsent='+encodeURIComponent(JSON.stringify({action:choice,categories:choice==='accept'?['strict','performance','functionality']:['strict']}));
  evaluate('dist/tdb-consent.js');evaluate('src/shared/logo-navigation-guard.js');
  async function advance(ms){await tick();const end=now+ms;for(;;){const row=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!row)break;now=row[1].at;timers.delete(row[0]);row[1].fn();await tick();}now=end;await tick();}
  async function idle(){await tick();const row=idles.entries().next().value;if(!row)return false;idles.delete(row[0]);row[1]({didTimeout:false,timeRemaining:()=>20});await tick();return true;}
  async function drain(){let n=0;while(await idle())assert(++n<50);}
  const request=name=>[...d.scripts].find(s=>s.src.endsWith('/'+name));
  const runtime=()=>request('tdb-runtime.js');
  async function loadRuntime(){evaluate('dist/tdb-runtime.js',runtime());runtime().dispatchEvent(new w.Event('load'));await advance(150);await drain();}
  function motion(){w.TDBMotion={reduced:w.matchMedia(),duration:()=>500,ddText:()=>({destroy(){}})};}
  async function completeDependencies(){
    motion();w.TDBSwiper={create(){throw Error('Logo-only fixture must not create a card swiper');}};
    for(const name of ['tdb-motion.js','tdb-swiper-8.4.7.min.js'])request(name)?.dispatchEvent(new w.Event('load'));
    await drain();
  }
  function completeModule(){const node=request('tdb-logo-marquee.min.js');assert(node);evaluate('dist/tdb-logo-marquee.min.js',node);node.dispatchEvent(new w.Event('load'));}
  return {w,d,warnings,observers,evaluate,advance,idle,drain,request,runtime,loadRuntime,completeDependencies,completeModule,motion,
    close(){w.TDBRuntime?.destroy();w.close();}};
}

for(const choice of ['accept','reject'])test('new '+choice+': settlement then proximity then scheduled module and track startup',async()=>{
  const f=fixture();try{
    assert.equal(f.runtime(),undefined);assert.equal(f.w.TDBLogoMarqueeLoader,undefined);
    f.w.CookieScript.instance[choice==='accept'?'acceptAllAction':'rejectAllAction']();
    await f.advance(469);assert.equal(f.runtime(),undefined);await f.advance(1);assert(f.runtime());
    await f.loadRuntime();assert.equal(f.observers.length,1);assert.equal(f.observers[0].options.rootMargin,'600px 0px');
    assert.equal(f.request('tdb-motion.js'),undefined);
    f.observers[0].fire(f.d.getElementById('track0'));await f.drain();
    assert(f.request('tdb-motion.js'));assert(f.request('tdb-swiper-8.4.7.min.js'));assert.equal(f.request('tdb-logo-marquee.min.js'),undefined);
    await f.completeDependencies();f.completeModule();await tick();
    assert.equal(f.w.TDBLogoMarquee.status().instances.length,0);assert.equal(f.observers.length,1,'download cannot start discovery');
    await f.drain();assert.equal(f.observers.length,2);
    f.observers[1].fire(f.d.getElementById('track0'));f.observers[1].fire(f.d.getElementById('track1'));
    await tick();assert.equal(f.w.TDBLogoMarquee.status().instances.length,0);
    await f.idle();assert.equal(f.w.TDBLogoMarquee.status().instances.length,1);
    await f.idle();assert.equal(f.w.TDBLogoMarquee.status().instances.length,2);
    assert.equal(f.warnings.length,0);
    const removed=f.d.getElementById('track0');removed.remove();await f.w.TDBLogoMarquee.refresh();
    assert.equal(f.w.TDBLogoMarquee.status().instances.length,1);assert.equal(removed.querySelector('[data-tdb-logo-marquee-clone]'),null);
  }finally{f.close();}
});

for(const choice of ['accept','reject'])test('saved '+choice+' still waits for proximity',async()=>{
  const f=fixture({choice});try{assert(f.runtime());await f.loadRuntime();assert.equal(f.request('tdb-motion.js'),undefined);assert.equal(f.w.TDBLogoMarqueeLoader.status().started,true);}finally{f.close();}
});

test('no marquee adds no marquee observers; explicit refresh discovers new tracks',async()=>{
  const f=fixture({choice:'reject',count:0});try{
    await f.loadRuntime();assert.equal(f.observers.length,0);assert.equal(f.request('tdb-logo-marquee.min.js'),undefined);
    f.d.body.insertAdjacentHTML('beforeend',track('later'));await f.w.TDBLogoMarqueeLoader.refresh();assert.equal(f.observers.length,1);
    const node=f.d.getElementById('later');node.remove();await f.w.TDBLogoMarqueeLoader.refresh();assert.equal(f.observers[0].targets.size,0);
  }finally{f.close();}
});

test('failed dependency retries online through the shared registry; destroyed runtime cannot mount late module',async()=>{
  const f=fixture({choice:'reject'});try{
    await f.loadRuntime();f.observers[0].fire(f.d.getElementById('track0'));await f.drain();
    f.request('tdb-motion.js').dispatchEvent(new f.w.Event('error'));await tick();assert.equal(f.w.TDBLogoMarqueeLoader.status().failed,true);
    f.w.dispatchEvent(new f.w.Event('online'));await f.drain();await f.completeDependencies();
    f.w.TDBRuntime.destroy();f.completeModule();await f.drain();assert.equal(f.w.TDBLogoMarquee.status().instances.length,0);
    assert.equal(f.observers[0].targets.size,0);
  }finally{f.close();}
});

test('missing registry is caught, and later online recovery works',async()=>{
  const f=fixture({choice:'reject'});try{
    await f.loadRuntime();const registry=f.w.TDBModules;delete f.w.TDBModules;
    f.observers[0].fire(f.d.getElementById('track0'));await f.drain();assert.equal(f.w.TDBLogoMarqueeLoader.status().failed,true);
    f.w.TDBModules=registry;f.w.dispatchEvent(new f.w.Event('online'));await f.drain();assert(f.request('tdb-motion.js'));
  }finally{f.close();}
});

test('fallback without IntersectionObserver preserves scheduled startup',async()=>{
  const f=fixture({choice:'reject',intersection:false});try{
    await f.loadRuntime();assert(f.request('tdb-motion.js'));await f.completeDependencies();f.completeModule();
    assert.equal(f.w.TDBLogoMarquee.status().instances.length,0);await f.drain();assert.equal(f.w.TDBLogoMarquee.status().instances.length,2);
  }finally{f.close();}
});

test('early guard blocks logo navigation and preserves explicit tooltip links',()=>{
  const f=fixture();try{
    const item=f.d.querySelector('.tdb-partner-logo');item.insertAdjacentHTML('beforeend','<span class="tdb-partner-source"><span id="source-link">Visit</span></span>');
    for(const type of ['click','auxclick']){
      const event=new f.w.MouseEvent(type,{bubbles:true,cancelable:true});item.querySelector('img').dispatchEvent(event);assert(event.defaultPrevented);
      const normal=new f.w.MouseEvent(type,{bubbles:true,cancelable:true});f.d.getElementById('source-link').dispatchEvent(normal);assert(!normal.defaultPrevented);
    }
  }finally{f.close();}
});

test('homepage lazy partner cards remain absent after marquee startup',async()=>{
  const f=fixture({choice:'reject',intersection:false,count:1});try{
    f.d.querySelector('.section_logo-features').insertAdjacentHTML('beforeend','<div class="tdb-partner-stage" data-tdb-partner-mount></div>');
    await f.loadRuntime();await f.completeDependencies();f.completeModule();await f.drain();
    assert.equal(f.w.TDBLogoMarquee.status().instances.length,1);
    assert.match(f.d.querySelector('.tdb-partner-logo').getAttribute('aria-label'),/show details/);
    assert.equal(f.request('tdb-partner-card.js'),undefined);
    assert.equal(f.d.querySelector('.tdb-partner-tooltip'),null);
    assert.equal(f.d.querySelector('link[href$="tdb-partner-card.css"]'),null);
  }finally{f.close();}
});

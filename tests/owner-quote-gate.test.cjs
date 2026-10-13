/* Real consent/registry/quote/Swiper builds, with controlled network completions. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const read = file => fs.readFileSync(file, 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const base = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@test/dist/';
const accept = {action:'accept', categories:['strict','functionality']};
const reject = {action:'reject', categories:['strict']};
function markup(id) {
  return `<section data-tdb-team-quotes data-tdb-team-cms id="${id}">
    <div data-tdb-team-viewport tabindex="0"><div class="tdb-team-quotes_track" data-tdb-team-track>
    ${[0,1,2].map(i => `<div class="tdb-team-quotes_slide" data-tdb-team-slide><div class="tdb-team-quotes_content is-visible" data-tdb-team-content><p>Quote ${i}</p><div class="tdb-team-quotes_byline is-static" data-tdb-team-author-line>Author ${i}</div></div></div>`).join('')}
    </div></div><div data-tdb-team-position><span data-tdb-team-current>01</span><span data-tdb-team-total>03</span></div></section>`;
}
function fixture({choice, roots = 2, consent = true, observer = true} = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body>'+Array.from({length:roots},(_,i)=>markup('quote'+i)).join('')+'</body></html>', {
    url:'https://dentalbarns.webflow.io/', runScripts:'outside-only', pretendToBeVisual:true
  });
  const w=dom.window, d=w.document, observers=[], settings=[], warnings=[];
  let currentScript, state=choice || {categories:['strict']};
  Object.defineProperty(d,'currentScript',{get:()=>currentScript});
  w.console.warn=message=>warnings.push(message);
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.ResizeObserver=class{observe(){} disconnect(){}};
  if(observer) w.IntersectionObserver=class {
    constructor(cb,options){this.cb=cb;this.options=options;this.targets=new Set();observers.push(this);}
    observe(root){this.targets.add(root);} unobserve(root){this.targets.delete(root);} disconnect(){this.targets.clear();}
  };
  for(const viewport of d.querySelectorAll('[data-tdb-team-viewport]')) {
    viewport.getBoundingClientRect=()=>({width:393.4,height:300,top:2000,left:0,right:393.4,bottom:2300});
    Object.defineProperty(viewport,'clientWidth',{value:393});
  }
  w.CookieScript={instance:{currentState:()=>state,show:()=>settings.push('open')}};
  function evaluate(file,node={src:base+file.split('/').pop(),dataset:{}}) {
    currentScript=node;
    try { w.eval(read(file)); } finally { currentScript=null; }
  }
  evaluate('dist/tdb-modules.js');
  function bootConsent(){evaluate('dist/tdb-consent.js');d.dispatchEvent(new w.Event('DOMContentLoaded'));}
  if(consent) bootConsent();
  const assets=()=>[...d.scripts].filter(n=>n.src);
  const find=file=>assets().find(n=>new URL(n.src).pathname.endsWith('/'+file));
  function complete(file) {
    const node=find(file);assert(node,file+' must have been requested');
    if(file==='tdb-motion.js') w.TDBMotion={duration:()=>0,carousel:{nextDelay:0,previousDelay:0,settleDelay:0},ddText:()=>({enter(){},destroy(){}})};
    else if(file==='tdb-ticker.js') w.TDBNativeTicker={mount:node=>({update:value=>node.textContent=value,destroy(){}})};
    else evaluate('dist/'+file,node);
    node.dispatchEvent(new w.Event('load'));
  }
  const root=d.querySelector('#quote0'), second=d.querySelector('#quote1');
  function choose(value,event='CookieScriptCurrentState'){state=value;w.dispatchEvent(new w.CustomEvent(event,{detail:value}));}
  function intent(type='pointerdown',key, target=root.querySelector('[data-tdb-team-viewport]')) {
    const event=key ? new w.KeyboardEvent(type,{key,bubbles:true,cancelable:true}) : new w.Event(type,{bubbles:true,cancelable:true});
    target.dispatchEvent(event);return event;
  }
  async function engine() {
    await tick();complete('tdb-motion.js');await tick();
    complete('tdb-ticker.js');complete('tdb-swiper-8.4.7.min.js');await tick();await tick();
  }
  function near(target=root) {
    const observer=observers.find(o=>o.options?.rootMargin==='800px' && o.targets.has(target));
    assert(observer,'owner root must be observed');observer.cb([{target,isIntersecting:true,intersectionRatio:1}]);
  }
  return {w,d,root,second,observers,settings,warnings,evaluate,assets,find,complete,choose,intent,engine,near,bootConsent,
    close(){w.TDBQuoteCarousel?.destroy();w.close();}};
}
for(const choice of [undefined,{action:'close',categories:['strict']},{action:'invalid',categories:['functionality']}]) {
  test('no owner runtime, dependencies or observers before a valid decision: '+JSON.stringify(choice),async()=>{
    const f=fixture({choice});try {
      await tick();f.choose(choice || {categories:['strict']},'CookieScriptClose');await tick();
      assert.equal(f.assets().length,0);assert.equal(f.observers.length,0);
      assert(f.root.querySelector('[data-tdb-team-content]').classList.contains('is-visible'));
      assert(f.root.querySelector('[data-tdb-team-author-line]').classList.contains('is-static'));
    } finally {f.close();}
  });
}
for(const choice of [accept,reject]) for(const saved of [true,false]) {
  test((saved?'saved ':'new ')+choice.action+' releases one engine, then waits for proximity',async()=>{
    const f=fixture({choice:saved?choice:undefined});try {
      if(!saved) f.choose(choice,choice.action==='reject'?'CookieScriptReject':'CookieScriptAccept');
      await tick();assert.equal(f.assets().length,1);f.complete('tdb-quote-carousel.js');await tick();
      assert.equal(f.assets().length,1);assert.equal(f.observers.length,1);
      for(let i=0;i<3;i++){f.w.TDBQuoteCarousel.refresh();f.w.TDBConsent.settle();}
      await tick();assert.equal(f.assets().length,1,'refresh cannot bypass proximity');
      f.near();await f.engine();
      assert(f.w.TDBQuoteCarousel.isMounted(f.root));assert(!f.w.TDBQuoteCarousel.isMounted(f.second));
      assert.equal(f.root.querySelector('[data-tdb-team-viewport]').swiper.params.width,393.4);
      assert.equal(f.root.dataset.tdbSliderFirstView,'pending');
      const active=f.root.querySelector('[data-tdb-team-viewport]').swiper;
      assert(active.slides[active.activeIndex].querySelector('[data-tdb-team-content]').classList.contains('is-visible'));
    } finally {f.close();}
  });
}
for(const event of ['pointerdown','touchstart','focusin','keydown']) test(event+' can start one owner before consent without changing consent',async()=>{
  const f=fixture();try {
    const first=f.intent(event,event==='keydown'?'ArrowRight':undefined);
    if(event==='keydown') assert(first.defaultPrevented);
    await tick();assert.equal(f.assets().length,1);f.complete('tdb-quote-carousel.js');await f.engine();
    const swiper=f.root.querySelector('[data-tdb-team-viewport]').swiper;
    assert(f.w.TDBQuoteCarousel.isMounted(f.root));assert(!f.w.TDBQuoteCarousel.isMounted(f.second));
    assert.equal(swiper.realIndex,event==='keydown'?1:0);
    assert.notEqual(f.root.dataset.tdbSliderFirstView,'pending');
    assert.equal(f.observers.length,0,'explicit interaction must not arm other owner roots or an automatic introduction');
    assert.equal(f.w.TDBConsent.currentState().decided,false);assert.equal(f.d.cookie,'');assert.deepEqual(f.settings,[]);
    assert.equal(f.assets().length,4);assert(!f.assets().some(n=>/vimeo|google|facebook|intellimize/.test(n.src)));
  } finally {f.close();}
});
test('focus followed by an arrow while dependencies load retains that arrow exactly once',async()=>{
  const f=fixture();try {
    f.intent('focusin');f.complete('tdb-quote-carousel.js');await tick();
    f.intent('keydown','ArrowRight');await f.engine();
    const swiper=f.root.querySelector('[data-tdb-team-viewport]').swiper;
    assert.equal(swiper.realIndex,1);
    f.intent('keydown','ArrowRight');assert.equal(swiper.realIndex,2,'mounted keyboard handler owns subsequent keys');
  } finally {f.close();}
});
test('a review consumer can share the quote request without starting owners',async()=>{
  const f=fixture();try {
    const reviewFlight=f.w.TDBModules.load(base+'tdb-quote-carousel.js',{ready:()=>!!f.w.TDBQuoteCarousel});
    f.intent();assert.equal(f.assets().length,1,'one canonical in-flight quote request');
    f.complete('tdb-quote-carousel.js');await reviewFlight;await f.engine();
    assert(f.w.TDBQuoteCarousel.isMounted(f.root));assert(!f.w.TDBQuoteCarousel.isMounted(f.second));
  } finally {f.close();}
});
test('loading the shared engine for another consumer remains passive until the owner gate opens',async()=>{
  const f=fixture({consent:false});try {
    f.evaluate('dist/tdb-quote-carousel.js');f.d.dispatchEvent(new f.w.Event('DOMContentLoaded'));
    f.w.TDBQuoteCarousel.refresh();await tick();assert.equal(f.assets().length,0);assert.equal(f.observers.length,0);
    f.choose(reject);f.bootConsent();await tick();
    assert.equal(f.assets().length,0,'already present engine is reused');assert.equal(f.observers.length,1);
  } finally {f.close();}
});
for(const failed of ['tdb-quote-carousel.js','tdb-motion.js']) test(failed+' failure retains native content and retries on interaction',async()=>{
  const f=fixture();try {
    f.intent();await tick();
    if(failed!=='tdb-quote-carousel.js'){f.complete('tdb-quote-carousel.js');await tick();}
    const node=f.find(failed);node.dispatchEvent(new f.w.Event('error'));await tick();await tick();
    assert(f.root.querySelector('[data-tdb-team-content]').classList.contains('is-visible'));
    assert(f.root.querySelector('[data-tdb-team-author-line]').classList.contains('is-static'));
    f.intent();await tick();assert.notEqual(f.find(failed),node);
    if(failed==='tdb-quote-carousel.js')f.complete('tdb-quote-carousel.js');
    await f.engine();assert(f.w.TDBQuoteCarousel.isMounted(f.root));
    assert.equal(f.assets().length,4,'failed scripts are removed, not duplicated');
  } finally {f.close();}
});
test('destroy during dependency loading prevents a late mount and supports a clean retry',async()=>{
  const f=fixture();try {
    f.intent();f.complete('tdb-quote-carousel.js');await tick();
    f.w.TDBQuoteCarousel.destroy();await f.engine();
    assert(!f.w.TDBQuoteCarousel.isMounted(f.root));
    f.intent();await tick();await tick();assert(f.w.TDBQuoteCarousel.isMounted(f.root));
    f.w.TDBQuoteCarousel.destroy();f.intent();await tick();await tick();
    const swiper=f.root.querySelector('[data-tdb-team-viewport]').swiper;
    f.intent('keydown','ArrowRight');assert.equal(swiper.realIndex,1,'destroy/remount must not retain duplicate keyboard handlers');
    assert.equal(f.assets().length,4,'loaded dependencies are reused');
  } finally {f.close();}
});
test('removing a quote during loading cannot mount a detached component',async()=>{
  const f=fixture();try {
    f.intent();f.complete('tdb-quote-carousel.js');await tick();f.root.remove();await f.engine();
    assert(!f.w.TDBQuoteCarousel.isMounted(f.root));
  } finally {f.close();}
});
test('pages with no owner quotes do not request their runtime',async()=>{
  const f=fixture({choice:reject,roots:0});try {await tick();assert.equal(f.assets().length,0);} finally {f.close();}
});
test('without IntersectionObserver the same consent boundary still applies',async()=>{
  const f=fixture({observer:false,roots:1});try {
    await tick();assert.equal(f.assets().length,0);f.choose(reject);f.complete('tdb-quote-carousel.js');
    await f.engine();assert(f.w.TDBQuoteCarousel.isMounted(f.root));
  } finally {f.close();}
});

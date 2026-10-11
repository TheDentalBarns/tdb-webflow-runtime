const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const read = path => fs.readFileSync(path, 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const logo = name => `<div class="tdb-partner-logo"><img class="logo_image" src="https://cdn.example.com/${name}.svg" alt="${name}"></div>`;
const record = name => `<div class="tdb-partner-logo"><img class="logo_image" src="https://cdn.example.com/${name}.svg"><div class="tdb-partner-source"><div class="tooltip2_card-wrapper"><div class="tooltip2_image-wrapper"><img class="tooltip2_image" src="https://cdn.example.com/${name}.webp"></div><div class="tdb-partner-copy"><div class="text-style-tagline-restored">${name}</div><div class="tdb-partner-copy-body">${name} content</div></div></div><a data-tdb-partner-link href="https://${name}.example.com/" target="_blank" rel="noopener"></a></div></div>`;
const feed = `<div data-tdb-partner-records>${record('B')}${record('A')}</div>`;
function setup({native=false}={}) {
 const stage = native ? read('src/logo-marquee/card-template.html') : '';
 const items = native ? record('A')+record('B') : logo('A')+logo('B');
 const dom = new JSDOM(`<html><head></head><body><section class="section_logo-features"><div class="logo-slider"><div class="partner-featured_component">${items}</div></div><div class="tdb-partner-stage" ${native?'':'data-tdb-partner-mount data-tdb-partner-source-url="/partner-content"'}>${stage}</div></section></body></html>`,{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,doc=w.document,observers=[],calls=[],swipers=[];
 const media={matches:false,addEventListener(){},removeEventListener(){}};
 w.matchMedia=()=>media;
 w.TDBMotion={reduced:media,duration:()=>300,ddText:()=>({destroy(){}})};
 w.IntersectionObserver=class {constructor(fn,options){this.fn=fn;this.options=options;observers.push(this);}observe(node){this.node=node;}unobserve(){}disconnect(){}};
 w.ResizeObserver=class {observe(){}disconnect(){}};
 w.requestAnimationFrame=()=>1; w.cancelAnimationFrame=()=>{};
 w.KeyframeEffect=class {getComputedTiming(){return {progress:1};}updateTiming(){}};
 w.Animation=class {constructor(effect){this.effect=effect;this.playState='finished';}play(){}cancel(){}};
 w.Element.prototype.animate=()=>({finished:Promise.resolve(),cancel(){}});
 Object.defineProperty(w.HTMLElement.prototype,'offsetLeft',{get(){return this.hasAttribute('data-tdb-logo-marquee-clone')?200:0;}});
 Object.defineProperty(w.HTMLElement.prototype,'offsetWidth',{get(){return 400;}});
 Object.defineProperty(w.HTMLElement.prototype,'offsetHeight',{get(){return 500;}});
 let fetchMode='ok',responseFeed=feed,fetchResolve;
 w.fetch=async(url)=>{
  calls.push(String(url));
  if(fetchMode==='hold') await new Promise(resolve=>fetchResolve=resolve);
  if(fetchMode==='error') throw Error('offline');
  return {ok:true,text:async()=>responseFeed};
 };
 w.TDBSwiper={create(root,options){
  const slides=[...root.querySelectorAll('.tooltip2_card-wrapper')];
  slides.forEach((s,i)=>s.dataset.swiperSlideIndex=i);
  const sw={slides,params:{speed:300},realIndex:0,activeIndex:0,
   update(){},loopFix(){},destroy(){},
   slideToLoop(i){this.realIndex=this.activeIndex=i;options.on.slideChange();},
   slideTo(i){this.slideToLoop(i);},slideNext(){this.slideToLoop((this.realIndex+1)%slides.length);},
   slidePrev(){this.slideToLoop((this.realIndex+slides.length-1)%slides.length);}
  };swipers.push(sw);return sw;
 }};
 const script=doc.createElement('script');script.src='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@test/dist/tdb-logo-marquee.min.js';
 Object.defineProperty(doc,'currentScript',{value:script});
 w.eval(read('src/shared/modules.js'));
 w.eval(read('dist/tdb-logo-marquee.min.js'));
 const handled=new WeakSet();
 async function pump({css='load'}={}) {
  for(let i=0;i<10;i++) {
   for(const node of doc.head.querySelectorAll('script,link')) {
    if(handled.has(node)||node.tagName==='LINK'&&css==='hold')continue;
    handled.add(node);
    if(node.src?.endsWith('tdb-partner-card.js')) w.eval(read('dist/tdb-partner-card.js'));
    node.dispatchEvent(new w.Event(node.tagName==='LINK'&&css==='error'?'error':'load'));
   }
   await tick();
  }
 }
 async function boot(){await tick();for(const ob of [...observers]) if(ob.options.rootMargin==='600px 0px')ob.fn([{target:ob.node,isIntersecting:true}]);await tick();}
 return {w,doc,calls,swipers,observers,pump,boot,logo:i=>doc.querySelectorAll('.tdb-partner-logo:not([data-tdb-logo-marquee-clone])')[i],
  mode:value=>fetchMode=value,feed:value=>responseFeed=value,release:()=>fetchResolve?.(),close:()=>w.close()};
}
test('lazy marquee has no card/CSS/CMS warm-up on load, proximity, hover or focus',async()=>{
 const f=setup();try{await f.boot();
  for(const ob of f.observers)ob.fn([{target:ob.node,isIntersecting:true}]);
  for(const type of ['pointerover','focusin'])f.logo(0).dispatchEvent(new f.w.Event(type,{bubbles:true}));
  await f.pump();
  assert.equal(f.calls.length,0);assert.equal(f.doc.querySelectorAll('link,script').length,0);
  assert.equal(f.doc.querySelectorAll('.tdb-partner-tooltip,.tdb-partner-source').length,0);
 }finally{f.close();}
});
test('first click waits for CSS, matches shuffled CMS records, and uses one shared card on reopen',async()=>{
 const f=setup();try{await f.boot();f.logo(0).click();await f.pump({css:'hold'});
  assert.equal(f.doc.querySelector('.tdb-partner-tooltip'),null);assert.equal(f.logo(0).getAttribute('aria-busy'),'true');
  await f.pump();assert.equal(f.calls.length,1);assert.equal(f.swipers.length,1);
  assert.equal(f.doc.querySelector('[data-tdb-partner-visit]').href,'https://A.example.com/'.toLowerCase());
  assert.equal(f.doc.querySelectorAll('.tdb-partner-source').length,0);
  f.doc.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await f.pump();
  f.logo(1).click();await f.pump();
  assert.equal(f.doc.querySelectorAll('.tdb-partner-tooltip').length,1);assert.equal(f.calls.length,1);
  assert.equal(f.doc.querySelectorAll('link').length,1);assert.equal(f.swipers[0].realIndex,1);
  assert.equal(f.doc.querySelector('[data-tdb-partner-visit]').href,'https://b.example.com/');
 }finally{f.close();}
});
test('latest click wins and Escape cancels an open during the first CMS request',async()=>{
 const f=setup();try{await f.boot();f.mode('hold');f.logo(0).click();await f.pump();f.logo(1).click();await f.pump();
  f.release();await f.pump();assert.equal(f.swipers[0].realIndex,1);assert.equal(f.calls.length,1);
 }finally{f.close();}
 const g=setup();try{await g.boot();g.mode('hold');g.logo(0).click();await g.pump();
  g.doc.dispatchEvent(new g.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));g.release();await g.pump();
  assert.equal(g.doc.querySelector('.tdb-partner-tooltip').getAttribute('aria-hidden'),'true');
  assert.equal(g.doc.querySelectorAll('[aria-busy]').length,0);
  g.logo(1).click();await g.pump();assert.equal(g.swipers[0].realIndex,1);
 }finally{g.close();}
});
test('CMS or stylesheet failure leaves the mount empty and can be retried',async()=>{
 for(const failure of ['fetch','css']){
  const f=setup();try{await f.boot();if(failure==='fetch')f.mode('error');
   f.logo(0).click();await f.pump({css:failure==='css'?'error':'load'});
   assert.equal(f.doc.querySelector('.tdb-partner-tooltip'),null);assert.equal(f.logo(0).hasAttribute('aria-busy'),false);
   assert.match(f.logo(0).getAttribute('aria-label'),/try again/);
   f.mode('ok');f.logo(0).click();await f.pump();assert.equal(f.swipers.length,1);
   assert.equal(f.doc.querySelectorAll('link').length,1);
  }finally{f.close();}
 }
});
test('mismatched CMS records cannot show another partner and retry uses refreshed data',async()=>{
 const f=setup();try{await f.boot();f.feed(`<div data-tdb-partner-records>${record('A')}</div>`);
  f.logo(1).click();await f.pump();assert.equal(f.doc.querySelector('.tdb-partner-tooltip'),null);
  assert.equal(f.swipers.length,0);
  f.feed(feed);f.logo(1).click();await f.pump();assert.equal(f.swipers[0].realIndex,1);
  assert.equal(f.calls.length,2);
 }finally{f.close();}
});
test('native pages retain their existing card and proximity preparation without deferred assets',async()=>{
 const f=setup({native:true});try{await f.boot();for(const ob of f.observers)ob.fn([{target:ob.node,isIntersecting:true}]);await f.pump();
  assert.equal(f.swipers.length,1);assert.equal(f.calls.length,0);assert.equal(f.doc.querySelectorAll('link,script').length,0);
  f.logo(1).click();await f.pump();assert.equal(f.swipers[0].realIndex,1);
 }finally{f.close();}
});
test('shared next/previous controls and keyboard navigation stay connected',async()=>{
 const f=setup();try{await f.boot();f.logo(0).click();await f.pump();
  f.doc.querySelector('.tdb-partner-next').click();await f.pump();assert.equal(f.swipers[0].realIndex,1);
  f.doc.querySelector('.tdb-partner-prev').click();await f.pump();assert.equal(f.swipers[0].realIndex,0);
  f.doc.querySelector('.tdb-partner-tooltip').dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  await f.pump();assert.equal(f.swipers[0].realIndex,1);
 }finally{f.close();}
});

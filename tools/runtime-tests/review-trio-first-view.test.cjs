const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../../dist/tdb-power-snippets.js'),'utf8');
function fixture(t,{pathname='/',width=390,reduced=true,total=3}={}){
 let now=0,id=0;const timers=new Map(),observers=[],animations=[],counts=[];
 const records=Array.from({length:total},(_,i)=>({id:'review-'+i,name:'Patient '+i,excerpt:'Review '+i,platform:'Google'}));
 const featured={id:'featured',name:'Featured patient',excerpt:'Opening review',platform:'Google'};
 const data={mode:'staging-snapshot',contexts:Object.fromEntries(['default','assessment','location','nervous'].map(c=>[c,{id:featured.id}])),carousels:{default:[featured,...records]}};
 const html='<script type="application/json" data-tdb-review-preview-data>'+JSON.stringify(data)+'</script><section class="section_standard-testimonial"><div class="testimonial_wrapper"><div class="testimonial15_rating-wrapper"></div><div class="testimonial_slider w-slider"><div class="w-slider-nav"></div></div></div></section>';
 const dom=new JSDOM(html,{url:'https://dentalbarns.webflow.io'+pathname,runScripts:'outside-only',pretendToBeVisual:true,beforeParse(w){
  w.matchMedia=()=>({matches:reduced});w.innerWidth=width;
  w.setTimeout=(cb,delay)=>{timers.set(++id,{cb,at:now+delay});return id;};w.clearTimeout=id=>timers.delete(id);
  w.requestAnimationFrame=()=>++id;w.cancelAnimationFrame=()=>{};
  w.IntersectionObserver=class{constructor(cb){this.cb=cb;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}};
  w.ResizeObserver=class{observe(){}};
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get:()=>width});
  w.HTMLElement.prototype.setPointerCapture=function(){};w.HTMLElement.prototype.hasPointerCapture=()=>false;
  w.HTMLElement.prototype.animate=function(frames,options){let resolve;const animation={finished:new Promise(r=>resolve=r),cancel(){},resolve,options,frames};animations.push(animation);return animation;};
  w.TDBTicker={count(node,current,total,direction){counts.push({current,total,direction});node.textContent=String(current).padStart(2,'0')+' — '+String(total).padStart(2,'0');}};
 }});
 t.after(()=>dom.window.close());const w=dom.window;w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const root=w.document.querySelector('.tdb-patient-quotes'),viewport=root.querySelector('.tdb-rc-viewport');
 const tick=ms=>{now+=ms;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.cb();}};
 const finish=async()=>{animations.forEach(a=>a.resolve());await Promise.resolve();await Promise.resolve();await Promise.resolve();};
 const pointer=(type,x,y=0)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y});viewport.dispatchEvent(e);};
 return {w,root,viewport,animations,counts,tick,finish,pointer,observer:observers[0]};
}
test('first view starts at hidden 01 then slides to opaque 02 without a text fade',async t=>{
 for(const width of [390,1440]){
  const a=fixture(t,{width});assert.equal(a.root.dataset.tdbSliderFirstView,'pending');assert.equal(a.root.querySelector('[data-tdb-review-open=featured]'),null);assert.equal(a.root.querySelector('.tdb-rc-dots'),null);
  const initial=a.root.querySelector('[aria-hidden="false"]');
  assert.equal(initial.getAttribute('aria-label'),'1 of 3');assert.ok(!initial.classList.contains('is-settled'));
  assert.equal(a.w.getComputedStyle(initial.querySelector('.tdb-rc-open')).opacity,'0');
  assert.equal(a.root.querySelector('.tdb-patient-position').textContent,'01 — 03');assert.deepEqual(a.counts.map(c=>c.current),[1]);
  assert.equal(a.animations.length,0);a.tick(30000);assert.equal(a.animations.length,0);
  a.observer.cb([{isIntersecting:true,intersectionRatio:.5}]);a.tick(120);
  const incoming=a.root.querySelectorAll('.tdb-rc-card')[1];
  assert.equal(a.w.getComputedStyle(incoming.querySelector('.tdb-rc-open')).opacity,'1');
  assert.equal(a.w.getComputedStyle(incoming.querySelector('.tdb-rc-open')).transition,'none');
  assert.equal(a.animations.length,2);assert.equal(a.animations[0].options.duration,400);
  await a.finish();assert.equal(a.root.dataset.tdbSliderFirstView,'drawn');assert.equal(incoming.inert,false);
  assert.ok(incoming.classList.contains('is-settled'));assert.ok(!incoming.classList.contains('is-first-entry'));
  assert.equal(a.root.querySelector('.tdb-patient-position').textContent,'02 — 03');
  a.observer.cb([{isIntersecting:true,intersectionRatio:1}]);a.tick(30000);assert.equal(a.animations.length,2);
  a.viewport.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(a.animations.length,4);await a.finish();
  assert.ok(!a.root.querySelector('[aria-hidden="false"]').classList.contains('is-settled'));a.tick(101);
  assert.equal(a.root.querySelector('[aria-hidden="false"]').getAttribute('aria-label'),'3 of 3');assert.ok(a.root.querySelector('[aria-hidden="false"]').classList.contains('is-settled'));
  a.viewport.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));await a.finish();
  assert.equal(a.root.querySelector('[aria-hidden="false"]').getAttribute('aria-label'),'2 of 3');assert.ok(a.counts.some(c=>c.current===2&&c.direction===-1));
 }
});
test('manual swipes cancel the pending first-view action across page-specific quote sets',async t=>{
 for(const pathname of ['/first-visit','/location','/services/nervous-patient-care']){
  const a=fixture(t,{pathname});a.pointer('pointerdown',220);a.pointer('pointermove',100);a.pointer('pointerup',100);await a.finish();
  assert.equal(a.root.querySelector('[aria-hidden="false"]').getAttribute('aria-label'),'2 of 3');a.observer.cb([{isIntersecting:true,intersectionRatio:1}]);a.tick(10000);assert.equal(a.animations.length,2);
 }
});
test('leaving view during the entry delay waits for the next real appearance',async t=>{
 const a=fixture(t);a.observer.cb([{isIntersecting:true,intersectionRatio:.5}]);
 a.observer.cb([{isIntersecting:false,intersectionRatio:0}]);a.tick(500);assert.equal(a.animations.length,0);
 a.observer.cb([{isIntersecting:true,intersectionRatio:.5}]);a.tick(120);assert.equal(a.animations.length,2);await a.finish();
 assert.equal(a.root.querySelector('.tdb-patient-position').textContent,'02 — 03');
});
test('a single quote is visible immediately and has no pagination',t=>{
 const a=fixture(t,{total:1});assert.equal(a.root.querySelector('[aria-hidden="false"]').getAttribute('aria-label'),'1 of 1');assert.ok(a.root.querySelector('.tdb-rc-card').classList.contains('is-settled'));assert.equal(a.root.querySelector('.tdb-patient-position'),null);assert.equal(a.animations.length,0);
});

test('drag release does not open a review and later activation opens the selected review',async t=>{
 const a=fixture(t);let opened=[];a.w.TDBReviewDrawer={open:(trigger,id)=>opened.push(id)};
 a.pointer('pointerdown',220);a.pointer('pointermove',100);a.pointer('pointerup',100);await a.finish();
 const selected=a.root.querySelector('[aria-hidden="false"] .tdb-rc-open');selected.click();await Promise.resolve();assert.equal(opened.length,0);
 selected.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await Promise.resolve();await Promise.resolve();assert.deepEqual(opened,['review-1']);
});

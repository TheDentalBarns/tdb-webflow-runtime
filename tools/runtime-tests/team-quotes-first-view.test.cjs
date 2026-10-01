const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../../dist/tdb-team-quotes.js'),'utf8');
function fixture(t,{pathname='/',width=390,reduced=true}={}){
 let now=0,id=0;const timers=new Map(),observers=[],animations=[],counts=[];
 const quotes=['Care and welcome','Designed for comfort','A non-clinical setting'];
 const html='<section class="section_standard-testimonial"><div class="testimonial_wrapper"><div class="icon-embed-medium"></div><div class="testimonial_slider w-slider"></div></div></section><div data-tdb-team-quote-feed><div class="w-dyn-item"><span data-tdb-team-author>Dr Keely Thorne</span><span data-tdb-team-role>Principal Dentist</span><div data-tdb-team-quote-content>'+quotes.map((q,i)=>'<h3>'+q+'</h3><blockquote>Quote '+i+'</blockquote><p>Page: '+pathname+'</p><p>Rank: '+(i+1)+'</p>').join('')+'</div></div></div>';
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
 const root=w.document.querySelector('.tdb-team-quotes'),viewport=root.querySelector('.tdb-rc-viewport');
 const tick=ms=>{now+=ms;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.cb();}};
 const finish=async()=>{animations.forEach(a=>a.resolve());await Promise.resolve();await Promise.resolve();await Promise.resolve();};
 const pointer=(type,x,y=0)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y});viewport.dispatchEvent(e);};
 return {w,root,viewport,animations,counts,tick,finish,pointer,observer:observers[0]};
}
test('first visible entry advances exactly once on desktop and mobile, including reduced motion',async t=>{
 for(const width of [390,1440]){
  const a=fixture(t,{width});assert.equal(a.root.dataset.tdbSliderFirstView,'pending');a.tick(5000);assert.equal(a.animations.length,0);
  a.observer.cb([{isIntersecting:true}]);a.tick(121);assert.equal(a.root.dataset.tdbSliderFirstView,'advanced');assert.equal(a.animations.length,2);assert.equal(a.animations[0].options.duration,400);
  await a.finish();assert.equal(a.root.querySelector('[aria-hidden="false"]').getAttribute('aria-label'),'2 of 3');
  assert.equal(a.root.querySelector('.tdb-team-position').textContent,'02 — 03');assert.equal(a.root.querySelectorAll('.tdb-rc-dot,.tdb-rc-pause').length,0);
  a.tick(30000);a.observer.cb([{isIntersecting:false}]);a.observer.cb([{isIntersecting:true}]);a.tick(30000);assert.equal(a.animations.length,2);
  a.viewport.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await a.finish();assert.equal(a.root.querySelector('[aria-hidden="false"]').getAttribute('aria-label'),'3 of 3');
  a.viewport.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));await a.finish();assert.equal(a.root.querySelector('[aria-hidden="false"]').getAttribute('aria-label'),'2 of 3');assert.ok(a.counts.some(c=>c.current===2&&c.direction===-1));
 }
});
test('manual swipe before entry consumes auto advance and page-specific quotes still work',async t=>{
 for(const pathname of ['/first-visit','/location','/services/nervous-patient-care']){
  const a=fixture(t,{pathname});a.observer.cb([{isIntersecting:true}]);a.pointer('pointerdown',220);a.pointer('pointermove',100);a.pointer('pointerup',100);await a.finish();
  assert.equal(a.root.dataset.tdbSliderFirstView,'skipped-interaction');assert.equal(a.root.querySelector('[aria-hidden="false"]').getAttribute('aria-label'),'2 of 3');
  a.tick(10000);assert.equal(a.animations.length,2);
 }
});

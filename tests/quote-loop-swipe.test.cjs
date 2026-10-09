const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
async function setup() {
  const dom = new JSDOM(`<section class="section_standard-testimonial"><div data-tdb-team-quotes data-tdb-team-cms>
  <div data-tdb-team-viewport><div class="tdb-team-quotes_track" data-tdb-team-track>${[0,1,2].map(i=>`<div class="tdb-team-quotes_slide" data-tdb-team-slide><div data-tdb-team-content><p>Quote ${i}</p><div data-tdb-team-author-line>Author ${i}</div></div></div>`).join('')}</div></div>
  <div data-tdb-team-position><span data-tdb-team-current></span><span data-tdb-team-total></span></div></div></section>`, {url:'https://dentalbarns.webflow.io/', runScripts:'outside-only', pretendToBeVisual:true});
  const w=dom.window, root=w.document.querySelector('[data-tdb-team-quotes]'), viewport=root.querySelector('[data-tdb-team-viewport]');
  const timers=new Map(); let sequence=0;
  w.setTimeout=(fn,delay)=>{timers.set(++sequence,{fn,delay});return sequence};w.clearTimeout=id=>timers.delete(id);
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.ResizeObserver=class{observe(){} disconnect(){}};
  w.IntersectionObserver=class{observe(){} unobserve(){} disconnect(){}};
  viewport.getBoundingClientRect=()=>({width:393,height:300,top:100,left:0,right:393,bottom:400});
  Object.defineProperty(viewport,'clientWidth',{value:393});
  w.TDBMotion={duration:()=>700,carousel:{nextDelay:100,previousDelay:140,settleDelay:60,entryStart:120},ddText:()=>({enter(nodes){nodes.forEach(n=>n.style.opacity='.5')},destroy(){}})};
  w.TDBNativeTicker={mount:node=>({update(value){node.textContent=value},destroy(){}})};
  w.TDBModules={load:()=>Promise.resolve()};
  w.eval(read('dist/tdb-swiper-8.4.7.min.js'));
  const script=w.document.createElement('script');script.src='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@fixture/dist/tdb-team-quotes.js';
  Object.defineProperty(w.document,'currentScript',{value:script});
  w.eval(read(process.env.TDB_QUOTE_RUNTIME || 'dist/tdb-team-quotes.js'));w.TDBTeamQuotes.refresh();
  root.dispatchEvent(new w.Event('focusin'));
  for(let i=0;i<8;i++)await Promise.resolve();
  const s=viewport.swiper;assert(s,'owner quotes mounted');
  const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();const tasks=[...timers.values()];timers.clear();tasks.forEach(t=>t.fn());};
  s.emit('touchStart');s.emit('touchEnd');await flush();
  return {w,root,s,timers,flush,close(){w.TDBTeamQuotes.destroy();w.close()}};
}
const visible=s=>s.querySelector('[data-tdb-team-content]').classList.contains('is-visible');
test('loop boundary preserves visible quote across original and duplicate in both directions',async()=>{
 const t=await setup();try{
  for(const direction of ['prev','next'])for(let i=0;i<7;i++){
   t.s.swipeDirection=direction;t.s[direction==='prev'?'slidePrev':'slideNext'](0);await t.flush();
   const copies=t.w.TDBSwiper.matchingSlides(t.s);assert(copies.every(visible),'all logical copies are revealed');
   t.s.loopFix();assert(visible(t.s.slides[t.s.activeIndex]),'silent loop correction keeps quote visible');
   assert.equal([...t.s.slides].filter(s=>s.getAttribute('aria-hidden')==='false').length,1,'only physical active slide exposed');
  }
 }finally{t.close()}
});
test('short swipe snap-back restores quote after generic transition end',async()=>{
 const t=await setup();try{
  const index=t.s.realIndex;t.s.emit('touchStart');t.s.emit('sliderFirstMove');assert(!visible(t.s.slides[t.s.activeIndex]));
  t.s.animating=true;t.s.emit('touchEnd');await t.flush();assert(!visible(t.s.slides[t.s.activeIndex]),'no reveal during snap-back');
  t.s.animating=false;t.s.emit('transitionEnd');await t.flush();
  assert.equal(t.s.realIndex,index);assert(t.w.TDBSwiper.matchingSlides(t.s).every(visible));
 }finally{t.close()}
});
test('interruption, release without movement, and teardown do not strand or resurrect text',async()=>{
 const t=await setup();try{
  t.s.emit('touchStart');t.s.emit('sliderFirstMove');t.s.emit('transitionEnd');await t.flush();
  assert(!visible(t.s.slides[t.s.activeIndex]),'still dragging: no stale reveal');
  t.s.emit('touchEnd');await t.flush();assert(t.w.TDBSwiper.matchingSlides(t.s).every(visible));
  let called=0;const stop=t.w.TDBSwiper.onSettled(t.s,()=>called++);
  t.s.emit('touchEnd');stop();await t.flush();assert.equal(called,0);
 }finally{t.close()}
});
test('shared slide matching handles non-loop slides and missing active slides',async()=>{
 const t=await setup();try{
  const slide=t.w.document.createElement('div');assert.deepEqual([...t.w.TDBSwiper.matchingSlides({slides:[slide],activeIndex:0})],[slide]);
  assert.equal(t.w.TDBSwiper.matchingSlides({slides:[],activeIndex:0}).length,0);
 }finally{t.close()}
});

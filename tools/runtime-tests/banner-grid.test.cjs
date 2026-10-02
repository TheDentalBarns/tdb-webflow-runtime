const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/sliders/sliders.js'),'utf8');
const helper=source.slice(source.indexOf('  function bindBannerGrid('),source.indexOf('  function initParallaxSwiper('));
const swiperSource=fs.readFileSync(process.env.TDB_SWIPER_TEST_FILE || require.resolve('swiper/swiper-bundle.js'),'utf8');
function fixture(t,width=1440){
 const dom=new JSDOM('<div class="banner"><div class="swiper"><div class="swiper-wrapper">'+Array.from({length:6},(_,i)=>`<div class="swiper-slide" style="box-sizing:border-box">${i}</div>`).join('')+'</div></div></div>',{runScripts:'outside-only',pretendToBeVisual:true});
 t.after(()=>dom.window.close()); const w=dom.window;w.innerWidth=width;
 w.matchMedia=q=>({matches:width>=Number(q.match(/\d+/)?.[0]||0),addEventListener(){},removeEventListener(){}});
 const baseComputed=w.getComputedStyle.bind(w), p=w.HTMLElement.prototype;
 const natural=el=>el.classList.contains('swiper-slide')?(el.hasAttribute('data-tdb-banner-wide')?840:405):1275;
 const size=el=>el._motion ? el._motion.from+(el._motion.to-el._motion.from)*el._motion.progress:natural(el);
 Object.defineProperty(p,'clientWidth',{get(){return size(this);}});Object.defineProperty(p,'offsetWidth',{get(){return size(this);}});
 p.getBoundingClientRect=function(){return {width:size(this),height:700,x:0,y:0,left:0,top:0,right:size(this),bottom:700};};
 w.getComputedStyle=el=>{const style=baseComputed(el);return new Proxy(style,{get(target,key){if(key==='transitionTimingFunction')return 'cubic-bezier(0.25, 0.1, 0.25, 1)';if(key==='getPropertyValue')return name=>name==='width'?size(el)+'px':target.getPropertyValue(name);return Reflect.get(target,key);}});};
 p.animate=function(frames,opts){const el=this;let resolve;const a={from:parseFloat(frames[0].width),to:parseFloat(frames[1].width),progress:0,opts,finished:new Promise(r=>resolve=r),cancel(){if(el._motion===a)el._motion=null;resolve();}};el._motion=a;return a;};
 w.eval(swiperSource);w.eval(helper+';window.bindBannerGrid=bindBannerGrid;window.bindParallaxInterruptions=bindParallaxInterruptions;');
 const el=w.document.querySelector('.swiper');
 const swiper=new w.Swiper(el,{init:false,slidesPerView:1,centeredSlides:true,loop:true,loopAdditionalSlides:1,loopPreventsSlide:false,preventInteractionOnTransition:false,speed:800,spaceBetween:30,breakpoints:{992:{slidesPerView:'auto',centeredSlides:false},0:{slidesPerView:1,centeredSlides:true}}});
 w.bindBannerGrid(el.parentElement,el,swiper);swiper.init();w.bindParallaxInterruptions(swiper);swiper.getTranslate=()=>swiper.translate;
 function finish(){for(const s of swiper.slides)if(s._motion){s._motion.progress=1;s._motion.cancel();}swiper.transitionEnd();}
 return {w,el,swiper,finish,size};
}
test('desktop active spans two columns plus gap; incoming and outgoing animate together at native cadence',t=>{
 const {swiper:s,finish}=fixture(t);assert.equal(s.realIndex,0);assert.equal(s.slides[s.activeIndex].swiperSlideSize,840);
 s.slideNext();assert.equal(s.realIndex,1);const incoming=s.slides[s.activeIndex], outgoing=s.slides[s.activeIndex-1];
 assert.deepEqual([incoming._motion.from,incoming._motion.to],[405,840]);assert.deepEqual([outgoing._motion.from,outgoing._motion.to],[840,405]);
 assert.equal(incoming._motion.opts.duration,800);assert.equal(incoming._motion.opts.easing,'cubic-bezier(0.25, 0.1, 0.25, 1)');
 assert.equal(s.translate,-s.slidesGrid[s.activeIndex]);finish();
});
test('repeated next/previous selections cross both loop joins with correct final widths and alignment',t=>{
 const {swiper:s,finish}=fixture(t);
 for(const direction of [1,-1])for(let i=0;i<15;i++){const expected=(s.realIndex+direction+6)%6;direction===1?s.slideNext():s.slidePrev();assert.equal(s.realIndex,expected,JSON.stringify({direction,i,active:s.activeIndex,translate:s.translate,snaps:s.snapGrid}));assert.equal(s.slides[s.activeIndex].swiperSlideSize,840);assert.equal(s.translate,-s.slidesGrid[s.activeIndex]);finish();}
});
test('rapid interrupted selection continues from visible widths instead of snapping',t=>{
 const {swiper:s}=fixture(t);s.slideNext();for(const slide of s.slides)if(slide._motion)slide._motion.progress=.4;
 const outgoing=s.slides[s.activeIndex];s.slideNext();assert.equal(s.realIndex,2);assert.equal(outgoing._motion.from,579);assert.equal(outgoing._motion.to,405);
});
test('selecting the already moving target leaves its existing motion running',t=>{
 const {swiper:s}=fixture(t);s.slideNext();
 const active=s.slides[s.activeIndex], motion=active._motion;
 s.slideTo(s.activeIndex);
 assert.equal(active._motion,motion);
 assert.equal(s.wrapperEl.style.transitionDuration,'800ms');
});
test('mobile retains native full-width centred slides with no width animations',t=>{
 const {swiper:s,finish}=fixture(t,390);assert.equal(s.params.slidesPerView,1);assert.equal(s.params.centeredSlides,true);
 s.slideNext();assert.equal(s.realIndex,1);assert.equal([...s.slides].some(slide=>slide._motion),false);finish();
});
test('rapid previous across a loop join follows the selected card rather than falling back to index zero',t=>{
 const {swiper:s}=fixture(t);
 s.slidePrev();assert.equal(s.realIndex,5);
 // The transition is only part-way to the cloned last card, not at its snap.
 let read=0;const target=s.translate;
 s.getTranslate=()=>++read===1?target-180:s.translate;
 s.slidePrev();
 assert.equal(s.realIndex,4);
 assert.equal(s.translate,-s.slidesGrid[s.activeIndex]);
});
test('mobile rapid previous also preserves the logical selection at the loop join',t=>{
 const {swiper:s}=fixture(t,390);s.slidePrev();assert.equal(s.realIndex,5);
 const target=s.translate;let read=0;s.getTranslate=()=>++read===1?target-180:s.translate;
 s.slidePrev();assert.equal(s.realIndex,4);
 assert.equal([...s.slides].some(slide=>slide._motion),false);
});

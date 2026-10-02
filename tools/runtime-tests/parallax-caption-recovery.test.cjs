const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/sliders/sliders.js'),'utf8');
const swiperSource=fs.readFileSync(process.env.TDB_SWIPER_TEST_FILE||require.resolve('swiper/swiper-bundle.js'),'utf8');
function fixture(t,width){
 const dom=new JSDOM('<div class="parallax-swiper_component"><div class="swiper"><div class="swiper-wrapper">'+Array.from({length:5},(_,i)=>`<div class="swiper-slide"><div class="service-card-mobile-copy" data-fade-slide>${i}</div></div>`).join('')+'</div></div></div>',{runScripts:'outside-only',pretendToBeVisual:true});
 t.after(()=>dom.window.close());const w=dom.window;
 w.innerWidth=width;w.matchMedia=q=>({matches:q.includes('prefers-reduced-motion')?false:q.includes('max-width')?width<768:width>=Number(q.match(/\d+/)?.[0]||0),addEventListener(){},removeEventListener(){}});
 for(const prop of ['clientWidth','offsetWidth'])Object.defineProperty(w.HTMLElement.prototype,prop,{get(){return width;}});
 w.HTMLElement.prototype.getBoundingClientRect=function(){return {width,height:700,left:0,top:0,right:width,bottom:700};};
 w.eval(swiperSource);
 let busy=false;w.TDBParallaxControls={prepare:()=>({skipEntry:true,bind(){},setBusy(value){busy=value;}})};
 w.eval(`const REDUCED_MOTION_QUERY='(prefers-reduced-motion:reduce)',DESKTOP_QUERY='(min-width:768px)',MOBILE_PORTRAIT_QUERY='(max-width:767px) and (orientation:portrait)';
 const isInitialised=()=>false,getSwiperElement=c=>c.querySelector('.swiper');
 const isDesktopEntryPage=()=>false,isMobileEntryPage=()=>false;
 const desktopGridGap=(c,f)=>f,parallaxDuration=()=>400,bindGridGap=()=>{},bindParallaxDuration=()=>{},markInitialised=()=>{};`
 +source.slice(source.indexOf('  function isHomeTreatment('),source.indexOf('  function bindParallaxDuration('))
 +source.slice(source.indexOf('  function bindBannerGrid('),source.indexOf('  function initByType('))
 +';window.initParallaxSwiper=initParallaxSwiper;');
 const c=w.document.querySelector('.parallax-swiper_component');w.initParallaxSwiper(c);
 const s=c.querySelector('.swiper').swiper;s.getTranslate=()=>s.translate;
 return {s,c,busy:()=>busy};
}
const tick=()=>new Promise(r=>setTimeout(r,85));
for(const width of [390,1363])for(const crossesIndex of [false,true])test(`service captions recover after ${crossesIndex?'threshold-crossing':'short'} snap-back at ${width}px`,async t=>{
 const {s,c,busy}=fixture(t,width);const initial=s.activeIndex;
 s.emit('touchStart');s.emit('sliderMove');
 // Reproduce watchSlidesProgress changing activeIndex while the pointer is held.
 s.setTranslate(s.translate-(crossesIndex?width*.65:width*.15));s.updateActiveIndex();
 assert.equal(s.activeIndex,initial+(crossesIndex?1:0));
 s.emit('touchEnd');s.slideTo(s.activeIndex,400);
 await tick();assert.equal(s.slides[s.activeIndex].querySelector('[data-fade-slide]').classList.contains('is-visible'),false);
 s.transitionEnd(true,'reset');await tick();
 assert.equal(c.classList.contains('is-moving'),false);assert.equal(busy(),false);
 assert.equal(s.slides[s.activeIndex].querySelector('[data-fade-slide]').classList.contains('is-visible'),true);
 // A subsequent ordinary navigation must still fade out and recover normally.
 s.slideNext();assert.equal(c.classList.contains('is-moving'),true);s.transitionEnd();
 await new Promise(r=>setTimeout(r,155));
 assert.equal(s.slides[s.activeIndex].querySelector('[data-fade-slide]').classList.contains('is-visible'),true);
});

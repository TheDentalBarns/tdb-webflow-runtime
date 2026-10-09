const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup() {
  const dom = new JSDOM('<main></main>', {runScripts:'outside-only',pretendToBeVisual:true});
  const w = dom.window;
  w.eval(fs.readFileSync(path.join(__dirname,'../dist/tdb-swiper-8.4.7.min.js'),'utf8'));
  const root = w.document.querySelector('main');
  root.innerHTML = [0,1,0,2].map((id,index) => `<section data-swiper-slide-index="${id}" ${index===3?'aria-hidden="true" inert':''}><a href="#">Card ${id}</a><button>Details</button></section>`).join('');
  const events = new Map();
  const swiper = {slides:[...root.children],activeIndex:0,realIndex:0,animating:false,
    on(names,fn){names.split(' ').forEach(name=>{if(!events.has(name))events.set(name,[]);events.get(name).push(fn);});},
    off(names,fn){names.split(' ').forEach(name=>{const list=events.get(name)||[],index=list.indexOf(fn);if(index>=0)list.splice(index,1);});},
    emit(name){(events.get(name)||[]).forEach(fn=>fn());}
  };
  swiper.visibleSlides = swiper.slides.slice(0,3);
  return {dom,w,root,swiper,events};
}
test('only visible logical cards are exposed; loop correction transfers focus without scrolling',()=>{
  const {dom,w,swiper:s}=setup();
  try {
    const api=w.TDBCarouselVisibility.bind(s);
    assert.equal(w.TDBCarouselVisibility.bind(s),api);
    assert.deepEqual(s.slides.map(n=>n.getAttribute('aria-hidden')),['false','false','true','true']);
    s.slides[0].querySelector('button').focus();
    let focusOptions;
    const target=s.slides[2].querySelector('button'),focus=target.focus.bind(target);
    target.focus=options=>{focusOptions=options;focus(options);};
    s.activeIndex=2;s.visibleSlides=[s.slides[1],s.slides[2]];s.emit('loopFix');
    assert.equal(w.document.activeElement,target);
    assert.equal(focusOptions.preventScroll,true);
    assert.equal(s.slides[0].hasAttribute('inert'),true);
    assert.equal(s.slides[2].hasAttribute('inert'),false);
    api.destroy();
    assert.deepEqual(s.slides.map(n=>n.getAttribute('aria-hidden')),[null,null,null,'true']);
    assert.deepEqual(s.slides.map(n=>n.hasAttribute('inert')),[false,false,false,true]);
  } finally {dom.window.close();}
});
test('active-only drawers retain their policy and detached or retired slides restore original attributes',()=>{
  const {dom,w,root,swiper:s}=setup();
  try {
    const api=w.TDBCarouselVisibility.bind(s,{activeOnly:true});
    assert.equal(s.slides.filter(n=>!n.hasAttribute('inert')).length,1);
    const retired=s.slides[1];s.slides.splice(1,1);api.update();
    assert.equal(retired.hasAttribute('inert'),false);
    assert.equal(retired.getAttribute('aria-hidden'),null);
    root.remove();api.update();
    let followingCleanup=0;s.on('beforeDestroy',()=>followingCleanup++);s.emit('beforeDestroy');
    assert.equal(followingCleanup,1,'visibility cleanup must not skip later Swiper listeners');
    assert.deepEqual(s.slides.map(n=>n.getAttribute('aria-hidden')),[null,null,'true']);
    assert.notEqual(w.TDBCarouselVisibility.bind(s),api,'explicit remount gets a fresh binding');
  } finally {dom.window.close();}
});
test('overflow layouts keep neighbouring cards interactive using cached bounds during drag',()=>{
  const {dom,w,root,swiper:s}=setup();
  try {
    let measurements=0;
    s.el=root;s.isHorizontal=()=>true;s.translate=-800;s.slidesSizesGrid=[350,350,350,350];
    s.slides.forEach((slide,index)=>slide.swiperSlideOffset=index*400);
    s.activeIndex=2;root.getBoundingClientRect=()=>{measurements++;return {left:40};};
    w.innerWidth=900;
    const api=w.TDBCarouselVisibility.bind(s,{overflowViewport:true});
    assert.deepEqual(s.slides.map(n=>n.getAttribute('aria-hidden')),['true','true','false','false']);
    s.translate=-700;s.emit('setTranslate');s.emit('setTranslate');
    assert.deepEqual(s.slides.map(n=>n.getAttribute('aria-hidden')),['true','false','false','false']);
    assert.equal(measurements,1,'drag must not remeasure layout');
    w.innerWidth=430;s.emit('resize');
    assert.equal(measurements,2);assert.equal(s.slides[3].hasAttribute('inert'),true);
    api.destroy();
  } finally {dom.window.close();}
});
test('settlement waits for the completed release, ignores loop corrections and cancels safely on destroy',async()=>{
  const {dom,w,swiper:s,events}=setup();
  try {
    const reasons=[];
    const stop=w.TDBSwiper.onSettled(s,reason=>reasons.push(reason));
    s.emit('touchStart');s.emit('touchEnd');s.animating=true;await flush();
    assert.equal(reasons.length,0);
    s.animating=false;s.emit('transitionEnd');await flush();
    assert.deepEqual(reasons,['transition']);
    s.emit('beforeLoopFix');s.emit('transitionEnd');s.emit('loopFix');await flush();
    assert.equal(reasons.length,1);
    s.emit('touchStart');s.emit('touchEnd');await flush();
    assert.deepEqual(reasons,['transition','release']);
    s.emit('transitionEnd');let next=0;s.on('beforeDestroy',()=>next++);s.emit('beforeDestroy');await flush();
    assert.equal(next,1);assert.equal(reasons.length,2);stop();
    const extra=w.TDBSwiper.onSettled(s,()=>{});extra();
    assert.equal(events.get('transitionEnd').length,1,'manual cleanup removes only its own listener');
  } finally {dom.window.close();}
});

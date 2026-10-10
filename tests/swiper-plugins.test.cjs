const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function setup() {
  const dom = new JSDOM('<main></main>', {url:'https://dentalbarns.webflow.io/', runScripts:'outside-only', pretendToBeVisual:true});
  const w = dom.window;
  w.matchMedia = query => ({matches:query.includes('min-width'), addEventListener(){}, removeEventListener(){}});
  w.ResizeObserver = class {observe(){} disconnect(){}};
  w.eval(read('dist/tdb-motion.js'));
  w.eval(read('dist/tdb-swiper-8.4.7.min.js'));
  return {dom, w};
}
function carousel(w, kind) {
  const root=w.document.createElement('section');root.className=kind+'-swiper_component';
  root.innerHTML='<div class="swiper"><div class="swiper-wrapper">'+[0,1,2].map(i=>`<div class="swiper-slide"><p data-fade-slide>Slide ${i}</p></div>`).join('')+'</div></div><button class="swiper-btn-prev"></button><button class="swiper-btn-next"></button><span class="swiper-count"></span>';
  w.document.querySelector('main').append(root);
  const viewport=root.querySelector('.swiper');
  Object.defineProperty(viewport,'clientWidth',{value:900});
  Object.defineProperty(viewport,'clientHeight',{value:500});
  return {root,viewport};
}
test('one engine mounts each plugin once, keeps its options and can remount after destruction', () => {
  const {dom,w}=setup();
  try {
    w.eval(read('dist/tdb-parallax.js'));w.eval(read('dist/tdb-gallery.js'));
    for(const [name,kind] of [['parallax','parallax'],['gallery','highlight']]) {
      const {root,viewport}=carousel(w,kind);
      const s=w.TDBSwiper.mount(name,root);
      assert.equal(s,viewport.swiper);
      assert.equal(w.TDBSwiper.mount(name,root),s);
      assert.equal(w.TDBSwiper.create(viewport,{}),s);
      assert.equal(s.params.loop,true);
      assert.equal(s.params.loopPreventsSlide,false);
      assert.equal(s.params.preventInteractionOnTransition,false);
      assert.equal(s.params.speed,w.TDBMotion.duration(name==='gallery'?w.innerWidth:900));
      assert.equal(s.params.parallax.enabled,name==='parallax');
      assert.equal(root.getAttribute('data-tdb-carousel-plugin'),name);
      s.slideNext(0);assert.equal(s.realIndex,1);
      s.slidePrev(0);assert.equal(s.realIndex,0);
      s.destroy(true,true);
      assert.equal(root.hasAttribute('data-tdb-slider-init'),false);
      const remounted=w.TDBSwiper.mount(name,root);
      assert.notEqual(remounted,s);assert.equal(remounted.destroyed,undefined);
      remounted.destroy(true,true);
    }
  } finally {dom.window.close();}
});
test('frozen feature APIs retain their methods and release their cached instance on destroy', () => {
  const {dom,w}=setup();
  try {
    const root=w.document.querySelector('main');let mounts=0,destroys=0;
    const plugin={mount(){mounts++;return Object.freeze({open:value=>value, destroy(){destroys++;}});}};
    w.TDBSwiper.register('review-fixture',plugin);
    const first=w.TDBSwiper.mount('review-fixture',root);
    assert.equal(first.open('review-id'),'review-id');
    assert.equal(w.TDBSwiper.mount('review-fixture',root),first);
    assert.equal(mounts,1);first.destroy();assert.equal(destroys,1);
    assert.notEqual(w.TDBSwiper.mount('review-fixture',root),first);assert.equal(mounts,2);
    assert.equal(w.TDBSwiper.register('review-fixture',plugin),plugin);
    assert.throws(()=>w.TDBSwiper.register('review-fixture',{mount(){}}),/already registered/);
  } finally {dom.window.close();}
});
test('parallax captions use unchanged directional delays and settle only after snap-back',async()=>{
  const {dom,w}=setup();
  try {
    w.TDBParallax={prepare:()=>({skipEntry:true,bind(){},setBusy(){}}),bind(){},setMoving(){},setEntry(){}};
    w.eval(read('dist/tdb-parallax.js'));
    const {root}=carousel(w,'parallax'),delays=[],timer=w.setTimeout.bind(w);
    w.setTimeout=(fn,delay)=>{delays.push(delay);return timer(fn,delay);};
    const s=w.TDBSwiper.mount('parallax',root),flush=()=>new Promise(resolve=>setImmediate(resolve));
    s.slideNext(0);await flush();assert.equal(delays.at(-1),w.TDBMotion.carousel.nextDelay);
    s.swipeDirection='prev';s.slidePrev(0);await flush();assert.equal(delays.at(-1),w.TDBMotion.carousel.previousDelay);
    delays.length=0;s.emit('touchStart');s.emit('sliderMove');assert(root.classList.contains('is-moving'));
    s.emit('touchEnd');s.animating=true;await flush();assert.equal(delays.length,0);assert(root.classList.contains('is-moving'));
    s.animating=false;s.emit('transitionEnd');await flush();assert.equal(delays.at(-1),w.TDBMotion.carousel.settleDelay);assert(!root.classList.contains('is-moving'));
    s.destroy(true,true);
  }finally{dom.window.close();}
});

test('native galleries rely on resize geometry while legacy galleries retain mutation compatibility',()=>{
 const {dom,w}=setup();try{
  w.eval(read('dist/tdb-gallery.js'));
  for(const kind of ['smile','instagram','legacy']){
   const {root}=carousel(w,'highlight');
   if(kind==='smile'){root.classList.add('tdb-smile-carousel');root.querySelectorAll('.swiper-slide').forEach(s=>s.classList.add('smile'));}
   if(kind==='instagram')root.setAttribute('data-tdb-ig-native','');
   root.style.columnGap='19px';
   const swiper=w.TDBSwiper.mount('gallery',root);assert.equal(swiper.params.observer,kind==='legacy');assert.equal(swiper.params.observeParents,kind==='legacy');assert.equal(swiper.params.resizeObserver,true);
   swiper.slideNext(0);assert.equal(swiper.realIndex,1);
   if(kind==='instagram'){root.style.columnGap='11px';swiper.emit('beforeResize');assert.equal(swiper.params.spaceBetween,11);}
   swiper.destroy(true,true);assert.equal(root.hasAttribute('data-tdb-slider-init'),false);
  }
 }finally{dom.window.close();}
});

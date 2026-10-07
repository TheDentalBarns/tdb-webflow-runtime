const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const read = name => fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function setup() {
  const dom = new JSDOM('<main></main>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, animations=[];
  w.matchMedia=query=>({matches:query.includes('min-width'),addEventListener(){},removeEventListener(){}});
  w.ResizeObserver=class{observe(){}disconnect(){}};
  w.Element.prototype.animate=function(frames,timing){const a={target:this,frames,timing,cancelled:false,cancel(){this.cancelled=true},onfinish:null};animations.push(a);return a;};
  w.eval(read('dist/tdb-motion.js'));w.eval(read('dist/tdb-ticker.js'));
  w.TDBModules={load:()=>Promise.resolve()};
  return {dom,w,animations};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('shared ticker supports native Gallery templates without changing review defaults; interruptions settle to the latest value',()=>{
  const {dom,w,animations}=setup();
  try {
    const host=w.document.querySelector('main');
    host.innerHTML='<div data-tdb-ticker-template><span class="review-number_value"></span><span class="review-number_incoming"></span></div><div data-review><span>01</span></div><div data-gallery><span>From £1,580</span></div><div data-template><span class="tdb-smile-fact-value"></span></div>';
    const review=host.querySelector('[data-review]'),gallery=host.querySelector('[data-gallery]');
    const r=w.TDBNativeTicker.mount(review),g=w.TDBNativeTicker.mount(gallery,{template:host.querySelector('[data-template]'),valueClass:'tdb-smile-fact-value',incomingClass:'tdb-smile-fact-value',normalize:x=>x.toUpperCase()});
    r.update('02');g.update('FROM £1,580');
    assert.equal(animations.length,2,'case-only changes must not animate Gallery facts');
    assert.ok(review.querySelector('.review-number_incoming'));
    assert.equal(animations[0].timing.duration,400);
    g.update('From £2,990',-1);g.update('From £7,945',1);
    assert.ok(animations[2].cancelled && animations[3].cancelled);
    assert.equal(gallery.children.length,2,'rapid changes never accumulate ticker nodes');
    animations.at(-1).onfinish();assert.equal(gallery.textContent,'From £7,945');
    assert.equal(gallery.children.length,1);g.destroy();r.destroy();
    assert.equal(gallery.textContent,'From £7,945');assert.equal(review.textContent,'02');
  } finally {dom.window.close();}
});
function fixture(w) {
  const root=w.document.createElement('div');root.className='highlight-swiper_component tdb-smile-carousel';root.setAttribute('data-tdb-smile-slider','true');
  const keys=['price','duration','clinician'];
  root.innerHTML='<div class="swiper"><div class="swiper-wrapper">'+Array.from({length:4},(_,i)=>'<div class="swiper-slide smile tdb-smile-slide" style="margin-right:31px"><div class="tdb-smile-overlay"></div><div class="tdb-smile-details"></div><h3 class="tdb-smile-heading" data-fade-slide>Case '+i+'</h3><span class="tdb-smile-image-label" data-fade-slide>Before</span>'+keys.map(k=>'<div data-tdb-smile-source-fact="'+k+'"><span class="tdb-smile-source-value">'+k+' '+i+'</span></div>').join('')+'<div class="tdb-smile-treatments" data-fade-slide><div class="tdb-smile-treatment"></div><div class="tdb-smile-treatment w-condition-invisible"></div></div></div>').join('')+'</div></div><button class="swiper-btn-prev"></button><button class="swiper-btn-next"></button><div data-tdb-smile-presentation><div class="tdb-smile-counter-current"><span class="tdb-smile-counter-value">01</span></div><span class="tdb-smile-counter-total"></span><span class="tdb-smile-counter-label"></span><div class="tdb-smile-static-facts">'+keys.map(()=>'<span class="tdb-smile-fact-ticker"><span class="tdb-smile-fact-slot"><span class="tdb-smile-fact-value"></span></span></span>').join('')+'</div><div data-tdb-smile-ticker-template><span class="tdb-smile-counter-value"></span><span class="tdb-smile-fact-value"></span></div></div>';
  w.document.querySelector('main').append(root);
  const viewport=root.querySelector('.swiper');Object.defineProperty(viewport,'clientWidth',{value:420});Object.defineProperty(viewport,'clientHeight',{value:680});
  return {root,viewport};
}
test('Gallery preserves CMS values through loop copies, rapid navigation, sorting, destroy and remount',async()=>{
  const {dom,w,animations}=setup();
  try {
    w.eval(read('dist/tdb-swiper-8.4.7.min.js'));w.eval(read('dist/tdb-gallery.js'));
    const {root,viewport}=fixture(w),s=w.TDBSwiper.mount('gallery',root);await flush();
    assert.equal(w.TDBSmileCards.prepare(root),w.TDBSmileCards.prepare(root));
    animations.forEach(animation=>animation.onfinish?.());
    assert.equal(root.querySelector('.tdb-smile-counter-total').textContent,'04');
    assert.equal(root.querySelectorAll('.tdb-smile-fact-sizer').length,0,'fixed Designer slots need no runtime sizing nodes');
    assert.equal(root.style.getPropertyValue('--tdb-smile-extra-lines'),'');
    for(let i=0;i<7;i++)s.slideNext(0);
    await flush();
    assert.equal(root.querySelector('.tdb-smile-counter-label').textContent,'Smile '+(s.realIndex+1)+' of 4');
    assert.equal(root.querySelector('.tdb-smile-static-facts').getAttribute('aria-label'),'Treatment summary: price '+s.realIndex+', duration '+s.realIndex+', clinician '+s.realIndex);
    s.slides.forEach(slide=>assert.equal(slide.classList.contains('is-muted'),Number(slide.getAttribute('data-swiper-slide-index'))!==s.realIndex));
    const track=root.querySelector('.swiper-wrapper');track.append(track.querySelector('.swiper-slide:not(.swiper-slide-duplicate)'));await flush();
    assert.equal(root.querySelectorAll('.tdb-smile-fact-sizer').length,0);
    const api=w.TDBSmileCards.prepare(root);s.destroy(true,true);api.destroy();
    const remount=w.TDBSwiper.mount('gallery',root);await flush();assert.equal(remount,viewport.swiper);assert.notEqual(remount,s);
    remount.destroy(true,true);root.remove();w.TDBSmileCards.prune();
  } finally {dom.window.close();}
});

test('Gallery total ticks from the native initial value after the shared ticker loads, without restarting on refresh',async()=>{
  const {dom,w,animations}=setup();
  try {
    let ready;
    w.TDBModules={load:()=>new Promise(resolve=>{ready=resolve;})};
    w.eval(read('dist/tdb-swiper-8.4.7.min.js'));w.eval(read('dist/tdb-gallery.js'));
    const {root}=fixture(w),total=root.querySelector('.tdb-smile-counter-total');
    total.textContent='01';
    const api=w.TDBSmileCards.prepare(root);
    assert.equal(total.textContent,'01','preserve the Designer value until the ticker can animate it');
    ready();await flush();
    const transitions=animations.filter(animation=>animation.target.parentElement===total);
    assert.equal(transitions.length,2);
    assert.deepEqual(transitions.map(animation=>animation.target.textContent),['01','04']);
    assert.equal(transitions[1].timing.duration,400);
    api.refresh();
    assert.equal(animations.filter(animation=>animation.target.parentElement===total).length,2);
    assert.equal(transitions[1].cancelled,false,'refresh must not cancel the initial total animation');
    transitions[1].onfinish();
    assert.equal(total.textContent,'04');
    assert.equal(total.children.length,1);
    api.destroy();
    assert.equal(total.textContent,'04','teardown must retain the resolved total');
  } finally {dom.window.close();}
});

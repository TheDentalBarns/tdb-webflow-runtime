const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
function setup(width=1363){
 const dom=new JSDOM('<style>.swiper-slide{width:407px;height:600px;box-sizing:border-box}.swiper-slide.is-wide{width:844px}.swiper-wrapper{display:flex}.parallax-swiper_component{column-gap:30px}</style><main></main>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.innerWidth=width;w.matchMedia=q=>({matches:(!/min-width:\s*(\d+)/.test(q)||width>=+q.match(/min-width:\s*(\d+)/)[1])&&(!/max-width:\s*(\d+)/.test(q)||width<=+q.match(/max-width:\s*(\d+)/)[1])&&!q.includes('prefers-reduced'),addEventListener(){},removeEventListener(){}});
 w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}disconnect(){}};
 w.HTMLElement.prototype.animate=function(){return {effect:{target:this},finished:Promise.resolve(),cancel(){}}};
 w.HTMLElement.prototype.getBoundingClientRect=function(){let width=parseFloat(w.getComputedStyle(this).width)||900;return {left:this.offsetLeft||0,top:0,width,height:600,right:(this.offsetLeft||0)+width,bottom:600};};
 Object.defineProperty(w.HTMLElement.prototype,'offsetWidth',{get(){return parseFloat(w.getComputedStyle(this).width)||900}});
 Object.defineProperty(w.HTMLElement.prototype,'offsetLeft',{get(){let x=0;for(let s=this.previousElementSibling;s;s=s.previousElementSibling)x+=s.offsetWidth+30;return x}});
 const root=w.document.createElement('section');root.className='parallax-swiper_component tdb-treatment-parallax';root.setAttribute('data-tdb-treatment','');root.setAttribute('data-tdb-banner-parallax','native');
 root.innerHTML='<div class="swiper"><div class="swiper-wrapper">'+Array.from({length:6},(_,i)=>`<div class="swiper-slide tdb-treatment-slide"><div class="tdb-treatment-card"><h3 class="tdb-treatment-title">Treatment ${i}</h3><div data-tdb-service-copy>Copy ${i}</div><div class="tdb-treatment-source" style="display:none"><a href="/treatments/${i}"></a></div><div class="tdb-treatment-blur"></div></div></div>`).join('')+'</div></div><div class="tdb-treatment-controls"><button class="swiper-btn-prev"></button><button class="swiper-btn-next"></button></div><div data-tdb-native-progress><span></span><span></span></div><div class="tdb-treatment-cta"><a data-tdb-parallax-cta href="/treatments/0"><span>Discover treatment</span></a></div>';
 w.document.querySelector('main').append(root);const viewport=root.querySelector('.swiper');Object.defineProperty(viewport,'clientWidth',{get:()=>width});Object.defineProperty(viewport,'clientHeight',{value:600});
 for(const file of ['dist/tdb-motion.js','dist/tdb-swiper-8.4.7.min.js','src/shared/rendered-progress.js','src/sliders/parallax.js','dist/tdb-parallax.js'])w.eval(read(file));
 const cta=root.querySelector('[data-tdb-parallax-cta]'),label=cta.firstChild;
 const s=w.TDBSwiper.mount('parallax',root);
 return {w,dom,root,viewport,cta,label,s,resize(n){width=n;w.innerWidth=n;s.emit('beforeResize');s.setBreakpoint();s.update();}};
}
test('treatments retain a single native CTA through wrapping and responsive clone budgets',()=>{
 const f=setup();try{
  assert.equal(f.root.querySelectorAll('.swiper-slide').length,14);
  assert.equal(f.s.loopedSlides,4);
  for(let n=0;n<20;n++){
   f.s.slideNext(0); const i=f.s.realIndex;
   assert.equal(f.cta.getAttribute('href'),'/treatments/'+i);
   assert.equal(f.cta.getAttribute('aria-label'),'Discover treatment: Treatment '+i);
   assert.equal(f.cta.firstChild,f.label);assert.equal(f.root.querySelectorAll('[data-tdb-parallax-cta]').length,1);
  }
  for(let n=0;n<20;n++){f.s.slidePrev(0);assert.equal(f.cta.getAttribute('href'),'/treatments/'+f.s.realIndex);}
  for(const width of [390,1363,820,390,1363]){
   const index=f.s.realIndex;f.resize(width);
   assert.equal(f.s.realIndex,index,'resizing preserves treatment');
   assert.equal(f.root.querySelectorAll('.swiper-slide').length,width>=992?14:10);
  }
  f.s.emit('slideChangeTransitionStart');assert.equal(f.cta.getAttribute('aria-disabled'),'true');
  f.s.emit('slideChangeTransitionEnd');assert.equal(f.cta.hasAttribute('aria-disabled'),false);
 }finally{f.dom.window.close()}
});
test('shared visibility exposes visible loop copies once and restores on teardown',()=>{
 const f=setup();try{
  const s=f.s,slides=Array.from(s.slides),same=slides.filter(e=>e.dataset.swiperSlideIndex==='0');
  s.activeIndex=slides.indexOf(same[1]);s.visibleSlides=[same[0],same[1],slides.find(e=>e.dataset.swiperSlideIndex==='1')];
  const api=f.w.TDBCarouselVisibility.bind(s);api.update();
  assert.equal(same[1].getAttribute('aria-hidden'),'false');assert.equal(same[0].getAttribute('aria-hidden'),'true');
  assert.equal(f.root.querySelectorAll('.swiper-slide[aria-hidden="false"]').length,2);
  assert.equal(same[0].hasAttribute('inert'),true);
  api.destroy();assert.equal(f.root.querySelectorAll('.swiper-slide[aria-hidden]').length,0);
 }finally{f.dom.window.close()}
});

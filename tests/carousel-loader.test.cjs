const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(__dirname+'/../src/runtime/site-asset-loader.js','utf8');
const start=source.indexOf('function prepareSliderLoader() {'),end=source.indexOf('\nprepareFormsLoader();',start);
const code=source.slice(start,end)+'\nprepareSliderLoader();';
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,0));};
test('carousel kinds load on demand, share dependencies and discover later galleries',async()=>{
 const dom=new JSDOM('<section class="parallax-swiper_component"><button>Next</button></section>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'}),w=dom.window;
 try{
  const requests=[],flights=new Map(),observers=[],refreshes=[];
  w.IntersectionObserver=class{constructor(cb,options){this.cb=cb;this.options=options;this.roots=new Set();observers.push(this)}observe(root){this.roots.add(root)}unobserve(root){this.roots.delete(root)}disconnect(){this.roots.clear()}};
  w.TDBParallax={refresh(){}};
  w.TDBModules={load(url){const file=url.pathname.split('/').pop();if(flights.has(file))return flights.get(file);requests.push(file);const flight=Promise.resolve().then(()=>{if(file==='tdb-parallax.js')w.TDBParallaxPlugin={refresh:r=>refreshes.push(['parallax',r])};if(file==='tdb-gallery.js')w.TDBGallery={refresh:r=>refreshes.push(['gallery',r])};});flights.set(file,flight);return flight;}};
  w.eval("const TDBFooterModuleRoot=new URL('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@test/dist/');function tdbEnsureUI(){return Promise.resolve()}function tdbEnsureSliderUI(){return Promise.resolve()}function tdbEnsureSliderFocus(){return window.TDBModules.load(new URL('tdb-slider-focus.js',TDBFooterModuleRoot))}"+code);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));assert.equal(requests.length,0);
  const root=w.document.querySelector('section'),observer=observers[0];assert.equal(observer.options.rootMargin,'800px 0px');
  observer.cb([{target:root,isIntersecting:true}]);await flush();
  assert(requests.includes('tdb-parallax.js'));assert(!requests.includes('tdb-gallery.js'));assert(!requests.includes('tdb-sliders.js'));
  root.querySelector('button').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));await flush();assert.equal(requests.filter(n=>n==='tdb-parallax.js').length,1);
  const gallery=w.document.createElement('section');gallery.className='highlight-swiper_component';w.document.body.append(gallery);await flush();assert(observer.roots.has(gallery));
  observer.cb([{target:gallery,isIntersecting:true}]);await flush();assert(requests.includes('tdb-gallery.js'));assert.equal(requests.filter(n=>n.includes('swiper-')).length,1);assert.equal(requests.filter(n=>n==='tdb-slider-focus.js').length,1);
  const later=gallery.cloneNode();w.document.body.append(later);await flush();assert(refreshes.some(([kind,r])=>kind==='gallery'&&r===later));
  assert.deepEqual(Array.from(w.TDBSliderLoader.status().plugins),['parallax','gallery']);
 }finally{w.close()}
});

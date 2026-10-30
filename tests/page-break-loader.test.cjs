const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const source = fs.readFileSync('src/runtime/page-break-loader.js', 'utf8');
const html = '<section data-tdb-page-break><img data-tdb-page-break-image></section>';
function setup(markup=html, options={}) {
  const dom = new JSDOM(markup, {runScripts:'outside-only', url:'https://dentalbarns.webflow.io'});
  const w=dom.window, calls=[], owners=[], observers=[];
  w.console.warn=()=>{};
  class IO {
    constructor(callback, config) {this.callback=callback;this.config=config;this.nodes=[];observers.push(this);}
    observe(node){this.nodes.push(node);}
    disconnect(){this.disconnected=true;}
    near(){this.callback([{isIntersecting:true}]);}
  }
  if (!options.noIO) w.IntersectionObserver=IO;
  w.TDBMotion={pageBreaks(nodes){
    const owner={nodes, refreshed:0, destroyed:false,
      refresh(){this.refreshed++;}, destroy(){this.destroyed=true;},
      status(){return nodes.map(()=>({progress:0}));}};
    owners.push(owner);return owner;
  }};
  w.TDBModules={load(url, config){calls.push({url,config});return options.load?options.load():Promise.resolve();}};
  w.eval("const TDBRuntimeModuleRoot = new URL('https://cdn.example/pinned/dist/');\n"+source);
  return {dom,w,calls,owners,observers,start(){w.eval('preparePageBreakLoader()');return w.TDBPageBreaks;}};
}
test('definition is inert; nearby content mounts as one batch using runtime asset base',async()=>{
 const e=setup(html+html);assert.equal(e.w.TDBPageBreaks,undefined);
 const api=e.start();assert.equal(e.calls.length,0);assert.equal(e.observers[0].config.rootMargin,'600px 0px');
 e.observers[0].near();await api.refresh();
 assert.equal(e.calls.length,1);assert.equal(e.calls[0].url,'https://cdn.example/pinned/dist/tdb-motion.js');
 assert.equal(e.calls[0].config.ready(),true);e.w.TDBMotion.pageBreaks=true;assert.equal(e.calls[0].config.ready(),false);
 assert.equal(e.owners.length,1);assert.equal(e.owners[0].nodes.length,2);
 assert.equal(e.observers[0].disconnected,true);e.dom.window.close();
});

test('content poster opt-in leaves iframe, controls and unrelated videos outside scroll motion', async () => {
 const player='<div data-vimeo-content-init><img class="vimeo-player__placeholder"><iframe></iframe><button>Play</button></div>';
 const e=setup('<section data-tdb-video-poster-parallax>'+player+'</section>'+player);
 const api=e.start();assert.equal(e.calls.length,0);
 e.observers[0].near();await api.refresh();await api.refresh();
 assert.equal(e.owners.length,1);assert.equal(e.owners[0].nodes.length,1);
 const photo=e.owners[0].nodes[0];
 assert.equal(photo.wrapper,e.w.document.querySelector('section [data-vimeo-content-init]'));
 assert.equal(photo.wrapper.querySelectorAll(photo.selector).length,1);
 assert.equal(photo.wrapper.querySelector(photo.selector).tagName,'IMG');
 assert.equal(photo.allowEdges,false);
 api.destroy();assert.equal(e.owners[0].destroyed,true);e.dom.window.close();
});

test('shared Scroll media variant owns photo or ambient video independently of the section overlay', async () => {
 for(const [home, media] of [[true,'<img class="header111_background-image">'],[false,'<div class="vimeo-bg" data-vimeo-ambient-init><iframe></iframe><img class="vimeo-bg__placeholder"></div>']]) {
  const section='<header class="section_header111" data-wf--component-1---bg-image--variant="scroll-media" data-tdb-page-break="bg-image" data-tdb-parallax-mode="opacity"><h2>Title</h2><a>Action</a><div class="header111_background-image-wrapper"><div data-tdb-parallax-fade></div>'+media+'</div></header>';
  const e=setup(home?'<main data-tdb-home-photo-parallax>'+section+'</main>':section);
  const api=e.start();assert.equal(e.calls.length,0,'preserve preparation proximity');
  e.observers[0].near();await api.refresh();await api.refresh();
  assert.equal(e.owners.length,1);
  const nodes=e.owners[0].nodes, root=e.w.document.querySelector('header');
  assert.equal(nodes.length,2,'one overlay registration and one media registration');
  assert.equal(nodes[0],root);
  const photo=nodes[1];assert.equal(photo.wrapper,root);
  assert.equal(photo.frame,'.header111_background-image-wrapper');
  assert.equal(photo.allowEdges,false,'clip to native crop');
  const targets=[...root.querySelectorAll(photo.selector)];assert.equal(targets.length,1);
  assert.equal(targets[0].className,home?'header111_background-image':'vimeo-bg');
  assert.equal(targets.some(n=>['H2','A','IFRAME'].includes(n.tagName)),false);
  api.destroy();assert.equal(e.owners[0].destroyed,true);e.dom.window.close();
 }
});

test('Base background variants and unrelated ambient videos do not gain scroll translation', async () => {
 const e=setup('<main data-tdb-home-photo-parallax><header class="section_header111" data-wf--component-1---bg-image--variant="base"><img class="header111_background-image"></header></main><div class="vimeo-bg" data-vimeo-ambient-init><img></div>');
 const api=e.start();await api.refresh();assert.equal(e.owners.length,0);assert.equal(e.calls.length,0);e.dom.window.close();
});
test('feature-free pages do not rescan on user interaction, explicit refresh discovers additions',async()=>{
 const e=setup('');const api=e.start();let queries=0;
 const query=e.w.document.querySelectorAll.bind(e.w.document);
 e.w.document.querySelectorAll=(s)=>{queries++;return query(s);};
 for(const type of ['wheel','touchstart','pointerdown','online']) e.w.dispatchEvent(new e.w.Event(type));
 assert.equal(queries,0);assert.equal(e.calls.length,0);assert.equal(e.observers.length,0);
 e.w.document.body.innerHTML=html;
 const p=api.refresh();assert.equal(typeof p.then,'function');await p;
 assert.equal(e.owners.length,1);e.dom.window.close();
});
test('refresh mounts only new nodes and preserves existing controller',async()=>{
 const e=setup();const api=e.start();await api.refresh();const original=e.owners[0];
 e.w.document.body.insertAdjacentHTML('beforeend',html);await api.refresh();await api.refresh();
 assert.equal(e.owners.length,2);assert.equal(original.destroyed,false);
 assert.equal(original.refreshed,2);assert.equal(api.status().length,2);e.dom.window.close();
});
test('concurrent refreshes include new elements while loading without duplicate mounts',async()=>{
 let resolve;const e=setup(html,{load:()=>new Promise(r=>resolve=r)});const api=e.start();
 const first=api.refresh();e.w.document.body.insertAdjacentHTML('beforeend',html);
 const second=api.refresh();assert.equal(first,second);resolve();await first;
 assert.equal(e.calls.length,1);assert.equal(e.owners[0].nodes.length,2);e.dom.window.close();
});
test('failure shows static reveal image; online retries, then removes retry handlers',async()=>{
 let fail=true;const e=setup('<section data-tdb-page-break data-tdb-parallax-reveal-in=".7"><img style="opacity:0"></section>',
 {load:()=>fail?Promise.reject(Error('offline')):Promise.resolve()});
 const api=e.start();await api.refresh();assert.equal(e.w.document.querySelector('img').style.opacity,'1');
 e.w.dispatchEvent(new e.w.Event('pointerdown'));assert.equal(e.calls.length,1);
 fail=false;e.w.dispatchEvent(new e.w.Event('online'));await api.refresh();
 assert.equal(e.owners.length,1);const count=e.calls.length;
 e.w.dispatchEvent(new e.w.Event('online'));e.w.dispatchEvent(new e.w.Event('pointerdown'));
 assert.equal(e.calls.length,count);e.dom.window.close();
});
test('destroy during loading prevents mount and disconnects proximity observer',async()=>{
 let resolve;const e=setup(html,{load:()=>new Promise(r=>resolve=r)});const api=e.start();
 const promise=api.refresh();api.destroy();resolve();await promise;
 assert.equal(e.owners.length,0);assert.equal(e.observers[0].disconnected,true);
 await api.refresh();assert.equal(e.calls.length,1);e.dom.window.close();
});
test('no IntersectionObserver falls back to mounting and destroy releases owners',async()=>{
 const e=setup(html,{noIO:true});const api=e.start();await api.refresh();
 assert.equal(e.owners.length,1);api.destroy();assert.equal(e.owners[0].destroyed,true);
 assert.equal(api.status().length,0);e.dom.window.close();
});
test('opacity-only wrappers are eligible; incomplete image wrappers can mount on later refresh',async()=>{
 const e=setup('<header data-tdb-page-break data-tdb-parallax-mode="opacity"></header><section data-tdb-page-break></section>');
 const api=e.start();await api.refresh();assert.equal(e.owners[0].nodes.length,1);
 e.w.document.querySelector('section').innerHTML='<img>';await api.refresh();assert.equal(e.owners.length,2);
 e.start();assert.equal(e.w.TDBPageBreaks,api);e.dom.window.close();
});

test('Home speakers use existing images and opt into the native resting scale', async () => {
 const e=setup('<main data-tdb-home-photo-parallax><section class="section_3-image-layout">'+
  '<div class="aspect-ratio-portrait"><div data-tdb-audio-image-clip><img></div></div>'+
  '<div class="aspect-ratio-portrait"><img></div></section></main>');
 const api=e.start();await api.refresh();
 assert.deepEqual(Array.from(e.owners[0].nodes,n=>n.selector),['img','img']);
 assert.ok(e.owners[0].nodes.every(n=>n.restingScale==='--tdb-photo-scale'));
 assert.ok(e.owners[0].nodes.every(n=>!n.frame),'existing card remains the progress/crop frame');
 api.destroy();e.dom.window.close();
});

test('shared gallery scroll motion mounts on Home and Location without owning unrelated images', async () => {
 const gallery='<div class="tdb-service-parallax"><div class="swiper"><img class="showcase_image"></div></div>';
 for(const markup of [gallery,'<main data-tdb-home-photo-parallax>'+gallery+'</main>']) {
  const e=setup(markup+'<div class="swiper"><img class="showcase_image"></div><img>');
  const api=e.start();
  assert.equal(e.calls.length,0,'keeps the existing proximity gate');
  assert.equal(e.observers[0].nodes.length,1);
  e.observers[0].near();await api.refresh();await api.refresh();
  assert.equal(e.owners.length,1,'refresh must not double-own the gallery');
  const [photo]=e.owners[0].nodes;
  assert.equal(e.owners[0].nodes.length,1);
  assert.equal(photo.wrapper,e.w.document.querySelector('.tdb-service-parallax .swiper'));
  assert.equal(photo.selector,'.showcase_image');
  assert.equal(photo.allowEdges,false,'native crop remains bounded');
  api.destroy();assert.equal(e.owners[0].destroyed,true);e.dom.window.close();
 }
});

test('shared treatments and business carousels get one bounded photo-motion owner on every page', async () => {
  const gallery =
    '<div data-tdb-treatment data-tdb-banner-parallax="native"><div class="swiper"><img class="tdb-treatment-image"></div></div>';
  for (const markup of [gallery, '<main data-tdb-home-photo-parallax>' + gallery + '</main>']) {
    const e = setup(
      markup + '<div data-tdb-treatment-stamps><img class="tdb-treatment-image"></div>',
    );
    const api = e.start();
    assert.equal(e.calls.length, 0);
    e.observers[0].near();
    await api.refresh();
    await api.refresh();
    assert.equal(e.owners.length, 1);
    assert.equal(e.owners[0].nodes.length, 1);
    const photo = e.owners[0].nodes[0];
    assert.equal(photo.wrapper, e.w.document.querySelector('[data-tdb-treatment] > .swiper'));
    assert.equal(photo.selector, '.tdb-treatment-image');
    assert.equal(photo.allowEdges, false);
    api.destroy();
    assert.equal(e.owners[0].destroyed, true);
    e.dom.window.close();
  }
});

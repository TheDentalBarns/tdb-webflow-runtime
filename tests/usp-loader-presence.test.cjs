const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const {JSDOM} = require('jsdom');
const read = p => fs.readFileSync(p, 'utf8');
const tick = () => new Promise(r => setImmediate(r));
const markup = (id='one', lazy=true) => `<section id="${id}" data-tdb-usp ${lazy?'data-tdb-usp-lazy':''}><div data-tdb-usp-trigger-zone><span data-tdb-usp-label>Care</span><span class="feature-item_door-image"></span><a href="#" data-tdb-usp-launch="0" aria-label="Open Care"><span>Open</span></a></div></section>`;
function fixture({present=true,lazy=true,missing=false}={}) {
  const dom = new JSDOM('<html><head></head><body>'+(present?markup('one',lazy):'')+'</body></html>', {url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,requests=[],opens=[],ios=[],warnings=[];
  let script=null,fail=false,hold=false,complete;
  Object.defineProperty(d,'readyState',{value:'complete'});
  Object.defineProperty(d,'currentScript',{get:()=>script});
  w.console.warn=(...args)=>warnings.push(args);
  w.IntersectionObserver=class {constructor(fn,options){this.fn=fn;this.options=options;this.nodes=new Set();ios.push(this)}observe(n){this.nodes.add(n)}unobserve(n){this.nodes.delete(n)}disconnect(){this.nodes.clear()}};
  w.MutationObserver=class {constructor(){throw Error('USP must not observe the whole DOM')}};
  script=d.createElement('script');script.src='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@'+'a'.repeat(40)+'/dist/tdb-modules.js';
  w.eval(read('src/shared/modules.js'));
  const withBusy=w.TDBModules.withBusy;
  function adapter() {
    script=d.createElement('script');script.src='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@'+'b'.repeat(40)+'/dist/tdb-usp-drawer.js';
    w.eval(read('dist/tdb-usp-drawer.js'));
  }
  const modules={withBusy,load:async(url)=>{
    const name=String(url).split('/').pop(); requests.push(name);
    if(name==='tdb-usp-drawer.js') {
      if(hold)await new Promise(r=>{complete=r});
      if(fail)throw Error('Dependency unavailable: '+url);
      if(!w.TDBUSPDrawer)adapter();
    }
  }};
  w.TDBModules=missing?undefined:modules;
  w.TDBSwiper={register(){},mount:async(_,section)=>({open:async(index,trigger)=>opens.push({section,index,trigger}),close(){}})};
  w.TDBUSPDrawerTemplate={mount(){},records(){}};
  w.eval("const TDBRuntimeModuleRoot=new URL('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@"+'b'.repeat(40)+"/dist/');\n"+read('src/usp/loader.js'));
  return {w,d,requests,opens,ios,warnings,modules,adapter,trigger:()=>d.querySelector('[data-tdb-usp-launch]'),start:()=>w.eval('prepareUSPDrawerLoader()'),fail:v=>fail=v,hold:()=>hold=true,release:()=>complete(),close:()=>w.close()};
}
test('definition is inert; lazy sections request nothing at startup; startup is idempotent',()=>{
 const f=fixture();try{assert(!f.w.TDBUSPDrawerLoader);f.start();const api=f.w.TDBUSPDrawerLoader;f.start();assert.equal(f.w.TDBUSPDrawerLoader,api);assert.deepEqual(f.requests,[]);assert.equal(f.ios[0].nodes.size,0);assert.equal(f.trigger().tabIndex,0)}finally{f.close()}
});
test('feature-free pages install no DOM observer and request nothing',()=>{const f=fixture({present:false});try{f.start();assert.deepEqual(f.requests,[]);assert.equal(f.ios[0].nodes.size,0)}finally{f.close()}});
test('hover fetches only adapter; lazy content stays untouched until click',async()=>{
 const f=fixture();try{f.start();f.trigger().dispatchEvent(new f.w.Event('pointerover',{bubbles:true}));await tick();assert.deepEqual(f.requests,['tdb-usp-drawer.js']);assert.equal(f.opens.length,0);f.trigger().click();await tick();assert(f.requests.includes('tdb-usp-drawer-template.js'));assert(f.requests.includes('tdb-usp-drawer.css'));assert.equal(f.opens.length,1)}finally{f.close()}
});
for(const kind of ['click','Enter',' '])test('first '+kind+' survives pending download exactly once',async()=>{
 const f=fixture();try{f.start();f.hold();const t=f.trigger();const event=()=>kind==='click'?new f.w.MouseEvent('click',{bubbles:true,cancelable:true}):new f.w.KeyboardEvent('keydown',{key:kind,bubbles:true,cancelable:true});t.firstChild.dispatchEvent(event());t.firstChild.dispatchEvent(event());await tick();assert.equal(t.getAttribute('aria-busy'),'true');assert.equal(f.requests.length,1);f.release();await tick();await tick();assert.equal(f.opens.length,1);assert.equal(f.opens[0].trigger,t);assert(!t.hasAttribute('aria-busy'));assert(f.d.querySelector('.feature-item_door-image').classList.contains('is-usp-active'))}finally{f.close()}
});
test('failed prefetch has no retry loop; next activation retries and restores label',async()=>{
 const f=fixture();try{f.start();f.fail(true);f.trigger().dispatchEvent(new f.w.Event('pointerover',{bubbles:true}));await tick();f.trigger().dispatchEvent(new f.w.Event('pointerover',{bubbles:true}));await tick();assert.equal(f.requests.length,1);f.trigger().click();await tick();assert.match(f.trigger().getAttribute('aria-label'),/Try again/);assert(!f.trigger().hasAttribute('aria-busy'));f.fail(false);f.trigger().click();await tick();await tick();assert.equal(f.opens.length,1);assert.equal(f.trigger().getAttribute('aria-label'),'Open Care')}finally{f.close()}
});
test('missing registry fails safely and later activation works after dependency arrives',async()=>{
 const f=fixture({missing:true});try{f.start();f.trigger().click();await tick();assert.equal(f.warnings.length,1);f.w.TDBModules=f.modules;f.trigger().click();await tick();await tick();assert.equal(f.opens.length,1)}finally{f.close()}
});
test('late sections work through delegated activation and repeated refresh binds once',async()=>{
 const f=fixture({present:false});try{f.start();f.d.body.insertAdjacentHTML('beforeend',markup());f.trigger().click();await tick();await tick();assert.equal(f.opens.length,1);f.w.TDBUSPDrawer.refresh();f.w.TDBUSPDrawer.refresh();f.trigger().click();await tick();assert.equal(f.opens.length,2);f.d.body.insertAdjacentHTML('beforeend',markup('two'));const t=f.d.querySelector('#two [data-tdb-usp-launch]');t.click();await tick();await tick();assert.equal(f.opens.length,3);assert.equal(f.opens[2].section.id,'two')}finally{f.close()}
});
test('non-lazy sections retain 500px proximity preparation',async()=>{
 const f=fixture({lazy:false});try{f.start();assert.equal(f.ios[0].options.rootMargin,'500px');const s=f.d.querySelector('section');f.ios[0].fn([{isIntersecting:true,target:s}]);await tick();const own=f.ios.find((o,i)=>i>0&&o.nodes.has(s));assert(own);own.fn([{isIntersecting:true,target:s}]);await tick();assert(f.requests.includes('tdb-motion.js'));assert(!f.requests.includes('tdb-usp-drawer-template.js'))}finally{f.close()}
});
test('already discovered adapter handles clicks without a new loader request',async()=>{
 const f=fixture();try{f.adapter();f.start();f.trigger().click();await tick();assert.equal(f.opens.length,1);assert(!f.requests.includes('tdb-usp-drawer.js'))}finally{f.close()}
});
test('destroy during loading prevents delayed replay',async()=>{
 const f=fixture();try{f.start();f.hold();f.trigger().click();await tick();f.w.TDBUSPDrawerLoader.destroy();f.release();await tick();await tick();assert.equal(f.opens.length,0);assert(!f.trigger().hasAttribute('aria-busy'))}finally{f.close()}
});

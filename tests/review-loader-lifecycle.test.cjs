const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('src/reviews/native/loader.js','utf8');
const starter="const TDBRuntimeModuleRoot=new URL('https://cdn.example/dist/');"+fs.readFileSync('src/runtime/review-feature-loader.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
function setup(html='<section data-tdb-review-introduction><button data-tdb-review-trigger>Read</button><span data-tdb-review-status></span></section><div data-tdb-review-lazy></div>',options={}){
  const dom=new JSDOM(html,{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
  let permission=options.allowed!==false,dataLoads=0,mounts=0,destroys=0,templateMounts=0,opens=[],loads=[],unsubscribes=0,near;
  const subscribers=new Set();
  w.console.warn=()=>{};
  w.TDBConsent={allows:()=>permission,subscribe(fn){subscribers.add(fn);fn();return()=>{unsubscribes++;subscribers.delete(fn);};}};
  const observers=[];
  w.IntersectionObserver=class{constructor(fn,settings){near=fn;Object.assign(this,{fn,settings,nodes:new Set()});observers.push(this);}observe(node){this.nodes.add(node);}unobserve(node){this.nodes.delete(node);}disconnect(){this.nodes.clear();}};
  const data={records:[],total:85,average:4.95,featured:[],fetchRecords:async()=>{},ensureIdentity:async()=>{},ensure:async()=>{}};
  w.TDBReviewCMS={load:async()=>{dataLoads++;if(options.dataGate)await options.dataGate;return data;},resolveIdentity:()=>''};
  w.TDBMotion={ddText:()=>({destroy(){}})};
  w.TDBNativeTicker={mount:()=>({update(){},settle(){},destroy(){}})};
  w.TDBReviewCards={mount(){},async create(holder,{signal}){if(options.artworkGate)await options.artworkGate;if(signal.aborted)throw new w.DOMException('Cancelled','AbortError');const root=w.document.createElement('div');root.setAttribute('data-tdb-review-cards','');holder.append(root);return root;}};
  w.TDBReviewQuotes={mount(){}};
  w.TDBQuoteCarousel={mount(){}};
  w.TDBRenderedProgress={observe(){}};
  w.Swiper=function(){};
  w.TDBReviews={};
  w.TDBReviewIntroduction={mount(root){
    mounts++;
    return {destroy(){destroys++;}};
  }};
  w.TDBSwiper={create(){},register(){},mount(name,root){
    if(name==='review-drawer')return {open:async(trigger,id)=>{opens.push({trigger,id});},destroy(){destroys++;}};
    mounts++;return {destroy(){destroys++;}};
  }};
  w.TDBReviewDrawerTemplate={mount(host){templateMounts++;const root=w.document.createElement('div');root.setAttribute('data-tdb-reviews','');host.append(root);}};
  w.TDBModules={
    async load(url){loads.push(url.href);if(options.loadGate)await options.loadGate(url);},
    async withBusy(trigger,action,{signal,onError}={}){
      if(signal?.aborted||trigger.getAttribute('aria-busy')==='true')return;
      trigger.setAttribute('aria-busy','true');trigger.setAttribute('data-tdb-loading','true');
      try{return await action();}catch(error){if(!signal?.aborted&&error.name!=='AbortError')onError?.(error);}
      finally{trigger.removeAttribute('aria-busy');trigger.removeAttribute('data-tdb-loading');}
    }
  };
  return {w,dom,data,observers,run(){if(options.sharedIntent)w.eval(fs.readFileSync('src/shared/feature-loading.js','utf8'));w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));},
    permit(v){permission=v;for(const fn of subscribers)fn();},
    near(root){near([{target:root,isIntersecting:true}]);},
    stats:()=>({loads,opens,dataLoads,mounts,destroys,templateMounts,unsubscribes}),
    close(){w.TDBReviewLoader?.destroy();w.TDBReviewFeatureLoader?.destroy();w.close();}};
}
const drawerFiles=/tdb-(drawer|filters|reviews|review-drawer)/;
const entryPoints = [
 ['count', '<button data-tdb-review-trigger>Read our reviews</button>'],
 ['power', '<section data-tdb-review-introduction><button data-tdb-review-trigger>Power review</button></section>'],
 ['trio', '<section data-tdb-review-quotes><button data-tdb-quote-action>Trio review</button></section>'],
 ['embed', '<section data-tdb-review-cards><button data-tdb-cards-open>Read full review</button></section>'],
];
for (const [name, html] of entryPoints) test(name+' can be the first shared drawer preparation source', async()=>{
 const e=setup(html+'<div data-tdb-review-lazy></div>',{sharedIntent:true});
 try {
  e.run(); const trigger=e.w.document.querySelector('button');
  trigger.dispatchEvent(new e.w.Event('pointerdown',{bubbles:true}));await tick();
  assert.equal(e.stats().templateMounts,1);assert.equal(e.stats().dataLoads,1);
  assert.equal(e.stats().opens.length,0);
  await e.w.TDBReviewLoader.open({trigger,reviewId:'chosen'});
  assert.equal(e.stats().opens[0].id,'chosen');assert.equal(e.stats().dataLoads,1);
  assert.equal(e.stats().templateMounts,1);
 } finally { e.close(); }
});
test('dynamically inserted review embed trigger shares the already prepared drawer and data',async()=>{
 const e=setup('<div data-tdb-review-lazy></div>',{sharedIntent:true});
 try {
  e.run();const trigger=e.w.document.createElement('button');trigger.setAttribute('data-tdb-cards-open','');e.w.document.body.append(trigger);await tick();
  const io=e.observers.find(io=>io.settings.rootMargin==='700px 0px');assert(io.nodes.has(trigger));
  io.fn([{target:trigger,isIntersecting:true}]);await tick();
  assert.equal(e.stats().templateMounts,1);assert.equal(e.stats().dataLoads,1);assert.equal(e.stats().opens.length,0);
  for(const [,html] of entryPoints){const host=e.w.document.createElement('div');host.innerHTML=html;e.w.document.body.append(host);const button=host.querySelector('button');button.dispatchEvent(new e.w.Event('focusin',{bubbles:true}));await e.w.TDBReviewLoader.open({trigger:button});}
  assert.equal(e.stats().opens.length,4);assert.equal(e.stats().templateMounts,1);assert.equal(e.stats().dataLoads,1);
 }finally{e.close();}
});
test('shared decision blocks all loading, then proximity prepares inline content without drawer warm-up',async()=>{
  const e=setup(undefined,{allowed:false});e.run();const root=e.w.document.querySelector('section');e.near(root);await tick();
  assert.equal(e.stats().loads.length,0);e.permit(true);await tick();assert.equal(e.stats().mounts,1);
  for(const type of ['pointerover','focusin','pointerdown'])root.querySelector('button').dispatchEvent(new e.w.Event(type,{bubbles:true}));
  await tick();assert.equal(e.stats().loads.some(url=>drawerFiles.test(url)),false);assert.equal(e.stats().dataLoads,1);e.close();
});
test('existing native drawer also has no hover or idle preloading',async()=>{
 const e=setup('<section data-tdb-review-introduction><button data-tdb-review-trigger>Read</button></section><div data-tdb-reviews></div>');
 e.run();const root=e.w.document.querySelector('section');e.near(root);await tick();
 root.querySelector('button').dispatchEvent(new e.w.Event('pointerover',{bubbles:true}));await tick();
 assert.equal(e.stats().loads.some(url=>drawerFiles.test(url)),false);e.close();
});
test('lazy container inserted after initialization is mounted only on standalone activation',async()=>{
 const e=setup('<button data-tdb-review-trigger data-review-id="selected">Read</button>');e.run();
 const host=e.w.document.createElement('div');host.setAttribute('data-tdb-review-lazy','');e.w.document.body.append(host);
 const trigger=e.w.document.querySelector('button');trigger.click();await tick();
 assert.equal(e.stats().templateMounts,1);assert.equal(e.stats().opens[0].id,'selected');
 assert.equal(trigger.hasAttribute('aria-busy'),false);e.close();
});
test('concurrent preparations share CMS data and mount drawer template once',async()=>{
 const e=setup();e.run();
 await Promise.all([e.w.TDBReviewLoader.prepare(),e.w.TDBReviewLoader.prepare()]);
 assert.equal(e.stats().dataLoads,1);assert.equal(e.stats().templateMounts,1);e.close();
});
test('obsolete page overrides cannot split the release',async()=>{
 const e=setup('<script type="application/json" data-tdb-review-config>{"base":"https://cdn.example/components/","lazyBase":"https://cdn.example/drawer/"}</script><div data-tdb-review-lazy></div>');e.w.TDBRelease={base:'https://cdn.example/dist/'};e.run();
 await e.w.TDBReviewLoader.prepare();assert.ok(e.stats().loads.includes('https://cdn.example/dist/tdb-motion.js'));
 assert.ok(e.stats().loads.includes('https://cdn.example/dist/tdb-review-drawer-template.js'));e.close();
});
test('refresh does not overwrite mounted component accessibility state',async()=>{
 const e=setup();e.run();const root=e.w.document.querySelector('section');e.near(root);await tick();
 const button=root.querySelector('button');button.setAttribute('aria-disabled','true');button.tabIndex=-1;
 e.w.TDBReviewLoader.refresh();assert.equal(button.getAttribute('aria-disabled'),'true');assert.equal(button.tabIndex,-1);e.close();
});
test('pending detached component never mounts and refresh removes its state',async()=>{
 let resolve;const dataGate=new Promise(r=>resolve=r);const e=setup(undefined,{dataGate});e.run();
 const root=e.w.document.querySelector('section');e.near(root);await tick();root.remove();e.w.TDBReviewLoader.refresh();resolve();await tick();
 assert.equal(e.stats().mounts,0);assert.equal(e.w.TDBReviewLoader.status().instances,0);e.close();
});
test('permission revocation cancels pending mount, later decision retries cleanly',async()=>{
 let resolve;const dataGate=new Promise(r=>resolve=r);const e=setup(undefined,{dataGate});e.run();
 const root=e.w.document.querySelector('section');e.near(root);await tick();e.permit(false);resolve();await tick();
 assert.equal(e.stats().mounts,0);e.permit(true);await tick();assert.equal(e.stats().mounts,1);e.close();
});
test('failed load can retry on explicit open without permanently caching rejection',async()=>{
 let fail=true;const e=setup('<button data-tdb-review-trigger>Read</button><div data-tdb-review-lazy></div>',{loadGate:async()=>{if(fail)throw Error('offline');}});
 e.run();e.w.document.querySelector('button').click();await tick();assert.equal(e.stats().opens.length,0);
 fail=false;e.w.document.querySelector('button').click();await tick();assert.equal(e.stats().opens.length,1);e.close();
});
test('shared capture policy protects mounted handlers from modified click and duplicate native key activation',async()=>{
 const e=setup();e.run();const root=e.w.document.querySelector('section');e.near(root);await tick();
 const button=root.querySelector('button');let handlerCalls=0;
 root.addEventListener('click',()=>handlerCalls++);root.addEventListener('keydown',()=>handlerCalls++);
 const modified=new e.w.MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true});button.dispatchEvent(modified);
 const key=new e.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});button.dispatchEvent(key);
 assert.equal(handlerCalls,0);assert.equal(modified.defaultPrevented,false);assert.equal(key.defaultPrevented,false);
 button.click();assert.equal(handlerCalls,1);e.close();
});
test('custom trigger Enter opens once and ignores held-key repeats',async()=>{
 const e=setup('<div tabindex="0" role="button" data-tdb-review-trigger>Read</div><div data-tdb-review-lazy></div>');e.run();const trigger=e.w.document.querySelector('[role="button"]');
 trigger.dispatchEvent(new e.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
 await tick();trigger.dispatchEvent(new e.w.KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true,cancelable:true}));await tick();
 assert.equal(e.stats().opens.length,1);e.close();
});
test('destroy disconnects subscription and mounted consumers, restores trigger attributes',async()=>{
 const e=setup();e.run();e.near(e.w.document.querySelector('section'));await tick();
 e.w.TDBReviewLoader.destroy();assert.equal(e.stats().unsubscribes,1);assert.equal(e.stats().destroys,1);
 assert.equal(e.w.document.querySelector('button').hasAttribute('aria-disabled'),false);
 const before=e.stats().loads.length;e.w.document.querySelector('button').click();await tick();assert.equal(e.stats().loads.length,before);e.close();
});
test('runtime starter is definition-only, checks presence and waits for consent',async()=>{
 const e=setup('',{allowed:false});e.w.eval(starter);assert.equal(e.w.TDBReviewFeatureLoader,undefined);
 e.w.eval('prepareReviewFeatureLoader()');e.permit(true);await tick();assert.equal(e.stats().loads.length,0);e.close();
});
test('runtime starter retains first click during feature download and requested review id',async()=>{
 const e=setup('<button data-tdb-review-trigger data-review-id="first">Read</button>');let resolve,requested=0,opened;
 e.w.TDBModules.load=()=>{requested++;return new Promise(r=>resolve=r);};
 e.w.eval(starter+';prepareReviewFeatureLoader()');
 const trigger=e.w.document.querySelector('button');trigger.click();assert.equal(trigger.getAttribute('aria-busy'),'true');
 e.w.TDBReviewLoader={open:async options=>opened=options,refresh(){},destroy(){}};resolve();await tick();
 assert.equal(requested,1);assert.equal(opened.reviewId,'first');assert.equal(opened.trigger,trigger);assert.equal(trigger.hasAttribute('aria-busy'),false);e.close();
});
test('runtime starter teardown during download prevents a late opening',async()=>{
 const e=setup('<button data-tdb-review-trigger>Read</button>');let resolve,opens=0,destroys=0;
 e.w.TDBModules.load=()=>new Promise(r=>resolve=r);e.w.eval(starter+';prepareReviewFeatureLoader()');e.w.document.querySelector('button').click();
 e.w.TDBReviewFeatureLoader.destroy();e.w.TDBReviewLoader={open(){opens++;},destroy(){destroys++;}};resolve();await tick();
 assert.equal(opens,0);assert.equal(destroys,1);e.w.TDBReviewLoader=undefined;e.close();
});

test('combined CMS avoids an adapter request; an older pinned CMS retains its compatibility bridge',async()=>{
 for(const combined of [true,false]){
  let e;
  e=setup('<section data-tdb-review-quotes></section>',{loadGate:async url=>{
   if((combined && String(url).endsWith('/tdb-review-cms.js')) || String(url).endsWith('/tdb-review-quote-adapter.min.js')) e.w.TDBReviewQuotes={mount(){}};
  }});
  try{
   delete e.w.TDBReviewQuotes;e.run();
   await e.w.TDBReviewLoader.prepare({kind:'quotes',drawer:false});
   assert.equal(e.stats().loads.filter(url=>url.endsWith('/tdb-review-quote-adapter.min.js')).length,combined?0:1);
  }finally{e.close();}
 }
});

const feedHolder='<div data-tdb-review-placeholder><div class="tdb-review-holding-image">Reviews</div></div>';
test('external card holder waits for data and artwork, mounts once and restores on revocation',async()=>{
 let release;const artworkGate=new Promise(r=>release=r);const e=setup(feedHolder,{artworkGate,allowed:false});e.run();const root=e.w.document.querySelector('[data-tdb-review-placeholder]');e.near(root);await tick();assert.equal(e.stats().loads.length,0);e.permit(true);await tick();assert.equal(root.getAttribute('aria-busy'),'true');assert.equal(root.hasAttribute('data-review-state'),false);assert.equal(e.stats().mounts,0);release();await tick();assert.equal(root.getAttribute('data-review-state'),'ready');assert.equal(root.hasAttribute('aria-busy'),false);assert.equal(root.querySelector('.tdb-review-holding-image').getAttribute('aria-hidden'),'true');e.w.TDBReviewLoader.refresh();await tick();assert.equal(e.stats().mounts,1);assert.ok(e.stats().loads.some(url=>url.endsWith('tdb-review-cards.css')));assert.equal(e.stats().loads.some(url=>drawerFiles.test(url)),false);e.permit(false);assert.equal(root.querySelector('[data-tdb-review-cards]'),null);assert.equal(root.hasAttribute('data-review-state'),false);assert.equal(root.querySelector('.tdb-review-holding-image').hasAttribute('aria-hidden'),false);e.close();
});
test('failed external card assets stop busy state, retain the holder and retry on intent',async()=>{
 let fail=true;const e=setup(feedHolder,{loadGate:async()=>{if(fail)throw Error('Offline');}});e.run();const root=e.w.document.querySelector('[data-tdb-review-placeholder]');e.near(root);await tick();assert.equal(root.getAttribute('data-review-state'),'error');assert.equal(root.hasAttribute('aria-busy'),false);assert.equal(root.querySelector('[data-tdb-review-cards]'),null);fail=false;root.dispatchEvent(new e.w.Event('pointerover',{bubbles:true}));await tick();assert.equal(root.getAttribute('data-review-state'),'ready');assert.equal(e.stats().mounts,1);e.close();
});
test('revocation during card artwork loading cannot append late content',async()=>{
 let release;const artworkGate=new Promise(r=>release=r);const e=setup(feedHolder,{artworkGate});e.run();const root=e.w.document.querySelector('[data-tdb-review-placeholder]');e.near(root);await tick();e.permit(false);release();await tick();assert.equal(root.querySelector('[data-tdb-review-cards]'),null);assert.equal(root.hasAttribute('aria-busy'),false);assert.equal(e.stats().mounts,0);e.close();
});

test('power review reuses the native platform owner without nesting another icon wrapper', async () => {
 const e=setup('<section data-tdb-review-introduction><button data-tdb-review-trigger><blockquote data-tdb-review-excerpt></blockquote><span data-tdb-review-author></span><span class="review-intro_platform" data-tdb-lazy-platform="google" style="background-image:url(/google.svg)"></span></button></section>');
 try {
  e.data.power='power';e.data.getCached=()=>({id:'power',platform:'Facebook',name:'Example',excerpt:'Review',historic:false});
  e.w.TDBReviewCMS.sourceIcon=()=>{const wrap=e.w.document.createElement('span');const image=e.w.document.createElement('img');image.src='/facebook.svg';image.alt='';wrap.append(image);return wrap};
  e.run();e.near(e.w.document.querySelector('section'));await tick();
  const owner=e.w.document.querySelector('.review-intro_platform');
  assert.equal(owner.childElementCount,1);assert.equal(owner.firstElementChild.tagName,'IMG');
  assert.match(owner.firstElementChild.src,/facebook/);assert.equal(owner.style.backgroundImage,'none');
  assert.equal(owner.dataset.reviewPlatform,'Facebook');assert.equal(owner.getAttribute('aria-label'),'Facebook review');
  assert.equal(e.w.document.querySelector('[data-tdb-review-author]').textContent,'Example');
 } finally {e.close()}
});


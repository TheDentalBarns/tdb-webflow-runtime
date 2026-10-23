const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('src/instagram/native.js','utf8');
const ticker=fs.readFileSync('src/shared/native-ticker.js','utf8');
const starter="const TDBRuntimeModuleRoot=new URL('https://cdn.example/dist/');"+fs.readFileSync('src/runtime/instagram-feature-loader.js','utf8');
const tick=()=>new Promise(r=>setTimeout(r,15));
function markup({optional=true,nativeButton=false}={}){
 const tag=nativeButton?'button':'a';
 return '<section data-tdb-ig-native class="ig-native_feed"><div data-ig-cms><div data-ig-viewport><div data-ig-track role="list">'+
 Array.from({length:8},(_,i)=>'<article data-ig-slide role="listitem" data-ig-record-url="https://www.instagram.com/p/post'+i+'/" data-ig-record-date="January '+(i+1)+', 2026" data-ig-record-likes="'+i+'" data-ig-record-comments="0" data-ig-record-shares=""><img class="ig-native_photo" loading="lazy" src="/photo'+i+'.webp"><img class="ig-native_reflection-photo" loading="lazy" src="/photo'+i+'.webp"></article>').join('')+'</div></div></div>'+
 (optional?'<span data-ig-date><span class="ig-native_tick">1 Jan 2026</span></span><span data-ig-current><span class="ig-native_tick">01</span></span><span data-ig-total>08</span><span data-ig-label>Post 1 of 8</span><a data-ig-post-link href="https://www.instagram.com/p/post0/"></a>'+
 ['likes','comments','shares'].map(k=>'<a data-ig-action="'+k+'" href="#'+k+'" aria-label="'+k+'" tabindex="2"><span class="icon" tabindex="0"></span><span data-ig-metric="'+k+'"><span class="ig-native_tick">0</span></span></a>').join('')+'<span class="ig-native_notice"></span>':'')+
 '<'+tag+' data-ig-prev href="#previous"><span class="icon" tabindex="0"></span></'+tag+'><'+tag+' data-ig-next href="#next"><span class="icon" tabindex="0"></span></'+tag+'></section>';
}
function setup(options={}){
 const dom=new JSDOM(options.html??markup(options),{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 Object.defineProperty(d,'readyState',{value:'complete'});
 let permission=options.allowed!==false,fail=options.fail,loadFailure=!!options.loadFailure,mounts=0,destroys=0,resets=0,shares=0;
 const subscribers=new Set(),ios=[],loads=[];
 w.matchMedia=q=>({matches:q.includes('992')&&options.mobile!==true,addEventListener(){},removeEventListener(){}});
 w.console.warn=()=>{};
 w.TDBConsent={allows:()=>permission,subscribe(fn){subscribers.add(fn);fn();return()=>subscribers.delete(fn);}};
 w.IntersectionObserver=class {constructor(fn,opts){this.fn=fn;this.opts=opts;this.nodes=new Set();ios.push(this);}observe(node){this.nodes.add(node);}disconnect(){this.nodes.clear();}};
 w.TDBMotion={defaults:{entryDelay:0,ticker:400},reduced:{matches:false,addEventListener(){},removeEventListener(){}}};w.eval(ticker);
 w.TDBGallery={beforeObserve(root){root.setAttribute('data-tdb-slider-first-view','pending');},resetFirstView(root){resets++;root.removeAttribute('data-tdb-slider-first-view');}};
 w.TDBSwiper={create(){},mount(type,root){
   mounts++;const handlers=new Map(),track=root.querySelector('[data-ig-track]');
   const instance={realIndex:0,activeIndex:0,previousIndex:0,slides:[...track.children],destroyed:false,
     on(k,f){handlers.set(k,f);},off(k){handlers.delete(k);},
     destroy(){if(this.destroyed)return;destroys++;this.destroyed=true;handlers.get('beforeDestroy')?.();}};
   root.querySelector('[data-ig-viewport]').swiper=instance;
   if(fail==='throw'){track.append(track.firstElementChild.cloneNode(true));throw Error('mount failed');}
   if(fail==='null')return null;return instance;
 },onSettled(){return()=>{};}};
 w.TDBModules={async load(url){loads.push(String(url));if(options.gate)await options.gate;if(loadFailure)throw Error('offline');}};
 Object.defineProperty(w.navigator,'clipboard',{value:{async writeText(){shares++;if(options.shareGate)await options.shareGate;}}});
 return {w,d,ios,loads,run(){w.eval(source);},start(){w.eval(starter+';prepareInstagramFeatureLoader()');},
   near(){for(const io of ios)if(io.opts?.rootMargin==='1200px 0px')io.fn([...io.nodes].map(target=>({target,isIntersecting:true})));},
   permit(v){permission=v;[...subscribers].forEach(fn=>fn());},fix(){fail=false;loadFailure=false;},
   stats:()=>({mounts,destroys,resets,shares,subscribers:subscribers.size}),
   close(){w.TDBInstagramFeatureLoader?.destroy();w.TDBInstagramNative?.destroy();w.close();}};
}
test('shared decision then 1200px 0px proximity; native mount cannot bypass consent',async()=>{
 const e=setup({allowed:false});e.run();assert.equal(e.ios.length,0);assert.equal(e.loads.length,0);
 const root=e.d.querySelector('section');assert.equal(e.w.TDBInstagramNative.mount(root),null);
 e.permit(true);assert.equal(e.stats().mounts,0);assert.equal(e.ios[0].opts.rootMargin,'1200px 0px');
 e.near();await tick();assert.equal(e.stats().mounts,1);assert.equal(root.dataset.tdbIgReady,'2.2.0');
 assert.equal(root.querySelector('[data-ig-label]').textContent,'Post 8 of 8');e.close();
});
test('partial Swiper failure restores CMS order, controls, sources and tickers before a clean retry',async()=>{
 const e=setup({fail:'throw'}),root=e.d.querySelector('section'),slides=[...root.querySelectorAll('[data-ig-slide]')];
 e.run();e.near();await tick();
 assert.equal(root.className,'ig-native_feed');assert.deepEqual([...root.querySelectorAll('[data-ig-slide]')],slides);
 assert.equal(root.querySelector('[data-ig-next]').getAttribute('href'),'#next');
 assert.equal(root.querySelector('[data-ig-next]').hasAttribute('role'),false);
 assert.equal(root.querySelector('[data-ig-action="shares"]').getAttribute('tabindex'),'2');
 assert.equal(root.querySelectorAll('img[src]').length,16);assert.equal(root.querySelectorAll('img[data-ig-src]').length,0);
 assert.equal(root.querySelector('[data-ig-current]').textContent,'01');assert.equal(e.stats().destroys,1);
 e.fix();e.w.dispatchEvent(new e.w.Event('online'));e.near();await tick();
 assert.equal(root.dataset.tdbIgReady,'2.2.0');assert.equal(e.stats().mounts,2);e.close();
});
test('missing optional metrics, date, labels, video and notice do not prevent mounting',async()=>{
 const e=setup({optional:false});e.run();e.near();await tick();assert.equal(e.d.querySelector('section').dataset.tdbIgReady,'2.2.0');e.close();
});
test('required viewport is validated before structure mutation',()=>{
 const e=setup();e.d.querySelector('[data-ig-viewport]').removeAttribute('data-ig-viewport');
 const root=e.d.querySelector('section');e.run();const baseline=root.innerHTML;
 assert.throws(()=>e.w.TDBInstagramNative.mount(root),/viewport/);assert.equal(root.innerHTML,baseline);assert.equal(root.className,'ig-native_feed');e.close();
});
test('network failure retries online without private script injection',async()=>{
 const e=setup({loadFailure:true});e.run();e.near();await tick();assert.equal(e.stats().mounts,0);assert.equal(e.d.querySelectorAll('script').length,0);
 e.fix();e.w.dispatchEvent(new e.w.Event('online'));e.near();await tick();assert.equal(e.stats().mounts,1);e.close();
});
test('missing shared registry falls back and retries when it arrives',async()=>{
 const e=setup(),registry=e.w.TDBModules;delete e.w.TDBModules;e.run();e.near();await tick();
 assert.match(e.d.querySelector('section').dataset.tdbIgError,/shared module registry/);
 e.w.TDBModules=registry;e.w.TDBInstagramNative.refresh();e.near();await tick();assert.equal(e.stats().mounts,1);e.close();
});
test('revocation during download blocks stale mount; redecision and teardown work',async()=>{
 let resolve;const gate=new Promise(r=>resolve=r),e=setup({gate});e.run();e.near();e.permit(false);resolve();await tick();assert.equal(e.stats().mounts,0);
 e.permit(true);e.near();await tick();assert.equal(e.stats().mounts,1);e.permit(false);assert.equal(e.stats().destroys,1);
 assert.equal(e.d.querySelector('[data-ig-next]').getAttribute('href'),'#next');e.close();
});
test('refresh prunes a detached root',async()=>{
 const e=setup();e.run();e.near();await tick();e.d.querySelector('section').remove();e.w.TDBInstagramNative.refresh();assert.equal(e.stats().destroys,1);e.close();
});
test('URL identity ignores www, scheme, tracking query, fragment and trailing slash',()=>{
 const e=setup();e.run();e.d.querySelectorAll('[data-ig-slide]')[1].setAttribute('data-ig-record-url','http://instagram.com/p/post0?igsh=tracking#fragment');
 assert.throws(()=>e.w.TDBInstagramNative.readPosts(e.d.querySelector('section')),/unique/);e.close();
});
test('nested share control accepts Enter once and ignores repeats or concurrent sharing',async()=>{
 let resolve;const shareGate=new Promise(r=>resolve=r),e=setup({shareGate});e.run();e.near();await tick();
 const icon=e.d.querySelector('[data-ig-action="shares"] .icon');
 for(const repeat of [false,true,false])icon.dispatchEvent(new e.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true,repeat}));
 assert.equal(e.stats().shares,1);resolve();await tick();assert.equal(e.d.querySelector('.ig-native_notice').textContent,'Post link copied');e.close();
});
test('native buttons retain native key activation without a synthetic duplicate click',async()=>{
 const e=setup({nativeButton:true});e.run();e.near();await tick();const button=e.d.querySelector('[data-ig-next]');let clicks=0;button.addEventListener('click',()=>clicks++);
 const event=new e.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});button.dispatchEvent(event);
 assert.equal(clicks,0);assert.equal(event.defaultPrevented,false);button.click();assert.equal(clicks,1);e.close();
});
for(const [mobile,count] of [[false,5],[true,3]])test('image window preserves '+count+' initial posts and restores lazy images',async()=>{
 const e=setup({mobile});e.run();e.near();await tick();assert.equal(e.d.querySelectorAll('[data-ig-image-ready]').length,count);
 e.w.TDBInstagramNative.destroy();assert.equal(e.d.querySelectorAll('img[loading="lazy"]').length,16);assert.equal(e.d.querySelectorAll('img[src]').length,16);e.close();
});
test('starter is definition-only and waits for permission and native presence',async()=>{
 const e=setup({html:'',allowed:false});e.w.eval(starter);assert.equal(e.w.TDBInstagramFeatureLoader,undefined);
 e.w.eval('prepareInstagramFeatureLoader()');e.permit(true);await tick();assert.equal(e.loads.length,0);e.close();
});
test('starter does not compete with explicitly owned historical build',async()=>{
 const e=setup({html:markup()+'<script data-tdb-instagram-native src="/old.js"></script>'});e.start();await tick();assert.equal(e.loads.length,0);assert.equal(e.w.TDBInstagramFeatureLoader,undefined);e.close();
});
test('starter coalesces loading and destroys late arrival after teardown',async()=>{
 const e=setup();let resolve,destroyed=0;e.w.TDBModules.load=url=>{e.loads.push(String(url));return new Promise(r=>resolve=r);};
 e.start();await tick();e.w.TDBInstagramFeatureLoader.refresh();assert.equal(e.loads.length,1);e.w.TDBInstagramFeatureLoader.destroy();
 e.w.TDBInstagramNative={destroy(){destroyed++;}};resolve();await tick();assert.equal(destroyed,1);delete e.w.TDBInstagramNative;e.close();
});
test('Gallery releases and recreates first-view observer on retry',()=>{
 const e=setup();let created=0,destroyed=0;e.w.createGalleryExploreCount=()=>({refresh(){},prune(){}});e.w.TDBSwiper.register=()=>{};
 e.w.TDBSwiper.firstView=()=>{created++;return {arm(){},destroy(){destroyed++;}};};
 delete e.w.TDBGallery;e.w.eval(fs.readFileSync('src/sliders/gallery-plugin.js','utf8'));
 const root=e.d.querySelector('section');root.querySelector('[data-ig-viewport]').classList.add('swiper');
 e.w.TDBGallery.beforeObserve(root);e.w.TDBGallery.resetFirstView(root);e.w.TDBGallery.beforeObserve(root);
 assert.equal(created,2);assert.equal(destroyed,1);e.w.TDBGallery.resetFirstView(root);e.close();
});

test('prepared deferred roots skip a second proximity wait but retain first-view entrance gating',async()=>{
 const e=setup();e.run();const root=e.d.querySelector('section');
 try {
  await e.w.TDBInstagramNative.prepare();assert.equal(e.stats().mounts,0);
  e.w.TDBInstagramNative.refresh(root,{prepared:true});await tick();
  assert.equal(e.stats().mounts,1);assert.equal(root.dataset.tdbSliderFirstView,'pending');
  assert.equal(e.ios[0].nodes.size,0);
  e.w.TDBInstagramNative.refresh(root,{prepared:true});await tick();assert.equal(e.stats().mounts,1);
 }finally{e.close();}
});

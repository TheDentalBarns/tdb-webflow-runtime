const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('src/smile-gallery/feed.js','utf8').replace('__TDB_SMILE_TEMPLATE__',JSON.stringify(fs.readFileSync('src/smile-gallery/template.html','utf8')));
const loader="const TDBRuntimeModuleRoot=new URL('https://cdn.example/dist/');"+fs.readFileSync('src/runtime/smile-feature-loader.js','utf8');
const tick=()=>new Promise(r=>setTimeout(r,5));
function setup(options={}){
 const dom=new JSDOM('<div data-tdb-smile-placeholder="home" data-tdb-smile-feed="/tdb-content/v1/smiles.json"><a class="tdb-smile-holding-image" href="/smile-gallery">Explore smiles</a></div>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 let allowed=options.allowed!==false,fail=!!options.fail,mounts=0;
 const subscriptions=[],requests=[],loads=[],observers=[],images=[];
 const payload={version:1,feed:'smiles',checkedAt:Date.now(),total:options.count||7,cases:Array.from({length:options.count||7},(_,i)=>({
   id:'case'+i,title:i===0?'<b>Smile</b>':'Smile '+i,description:'Description '+i,price:'From £1,000',duration:'6 months',clinician:'Dr Keely Thorne',treatments:['Invisalign®'],
   image:{src:'https://cdn.prod.website-files.com/67837ee85ee175873126e461/smile'+i+'.webp',alt:'Smile '+i}
 }))};
 Object.defineProperty(d,'currentScript',{value:{src:'https://cdn.example/dist/tdb-smile-feed.js'}});
 w.console.warn=()=>{};
 w.matchMedia=()=>({matches:true});
 w.TDBMotion={reduced:{matches:false}};
 w.TDBConsent={allows:()=>allowed,subscribe(fn){subscriptions.push(fn);fn();return()=>{};}};
 w.IntersectionObserver=class{constructor(fn,config){Object.assign(this,{fn,config});observers.push(this)}observe(){}unobserve(){}disconnect(){}};
 w.fetch=async(url,config)=>{requests.push({url:String(url),config});if(options.gate)await options.gate;return {ok:!fail,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(payload)}};
 w.Image=class{set src(value){images.push(value);queueMicrotask(()=>this.onload?.())}decode(){return Promise.resolve()}};
 w.TDBModules={async load(url,config){loads.push({url:String(url),config});if(String(url).endsWith('tdb-smile-feed.js'))w.eval(source);if(fail)throw Error('offline')}};
 w.TDBSliderLoader={async load(){if(options.sliderGate)await options.sliderGate;}};
 w.TDBSwiper={prune(){},mount(name,root){assert.equal(name,'gallery');mounts++;w.TDBSmileFeed.presentation(root).update(0);root.setAttribute('data-tdb-slider-init','true')}};
 w.eval(source);
 const holder=d.querySelector('[data-tdb-smile-placeholder]');
 return {w,d,holder,payload,requests,loads,observers,images,mounts:()=>mounts,prepare:()=>w.TDBSmileFeed.prepare(holder),permit(value){allowed=value;subscriptions.forEach(fn=>fn())},fix(){fail=false},close(){w.TDBSmileFeatureLoader?.destroy();w.TDBSmileFeed.destroy();w.close()}};
}
test('Smile feed waits for consent and 1200px 0px proximity before fetching any cases or CSS',async()=>{
 const x=setup({allowed:false});x.w.eval(loader+';prepareSmileFeatureLoader()');await tick();
 assert.equal(x.requests.length,0);assert.equal(x.loads.length,0);
 x.permit(true);await tick();assert.equal(x.requests.length,0);
 const observer=x.observers.find(o=>o.config.rootMargin==='1200px 0px');assert.ok(observer);
 observer.fn([{target:x.holder,isIntersecting:true}]);await tick();await tick();
 assert.equal(x.mounts(),1);assert.equal(x.requests.length,1);assert.equal(x.holder.dataset.smileState,'ready');x.close();
});
test('one shared set of labels/details; seven lean cards; data stays text and only nearby images load',async()=>{
 const x=setup();await x.prepare();
 const root=x.holder.querySelector('[data-tdb-smile-feed-root]'),cards=root.querySelectorAll('.tdb-smile-card');
 assert.equal(cards.length,7);assert.equal(root.querySelectorAll('.tdb-smile-image-label').length,2);
 assert.equal(root.querySelectorAll('.tdb-smile-details').length,1);
 assert.equal(root.querySelectorAll('.tdb-smile-heading').length,1);
 assert.equal(root.querySelectorAll('[data-tdb-smile-source-fact],script').length,0);
 assert.ok([...cards].every(c=>!c.querySelector('.tdb-smile-image-label,.tdb-smile-details,.tdb-smile-heading')));
 assert.equal(root.querySelector('.tdb-smile-heading').textContent,'<b>Smile</b>');
 assert.equal(root.querySelector('.tdb-smile-heading b'),null);
 assert.equal(root.querySelectorAll('.tdb-smile-card img[src]').length,10);
 assert.equal(x.images.length,2);
 const presentation=x.w.TDBSmileFeed.presentation(root);
 presentation.open(true);assert.equal(root.querySelector('.tdb-smile-details').getAttribute('aria-hidden'),'false');
 presentation.open(false);assert.equal(root.querySelector('.tdb-smile-details').getAttribute('aria-hidden'),'true');
 await x.prepare();assert.equal(x.mounts(),1);
 x.w.TDBSmileFeed.destroy();assert.equal(x.holder.children.length,1);assert.equal(x.holder.dataset.smileState,undefined);x.close();
});
test('Shared feed preparation mounts directly after dependencies without a second proximity gate',async()=>{
 let release;const x=setup({sliderGate:new Promise(r=>release=r)});try{
  const preparing=x.prepare();await tick();assert.equal(x.mounts(),0);release();await preparing;
  assert.equal(x.mounts(),1);assert.equal(x.holder.dataset.smileState,'ready');
 }finally{x.close();}
});
test('late feed cannot mount after permission revocation',async()=>{
 let release;const x=setup({gate:new Promise(r=>release=r)});const flight=x.prepare();await tick();
 x.permit(false);assert.equal(x.requests[0].config.signal.aborted,true);release();await flight;
 assert.equal(x.mounts(),0);assert.equal(x.holder.children.length,1);x.close();
});

test('wide Smile layouts load visible cards and one extra card beyond the screen',async()=>{
 const x=setup({count:10});try{
   await x.prepare();
   const root=x.holder.querySelector('[data-tdb-smile-feed-root]'),cards=[...root.querySelectorAll('.tdb-smile-card')];
   x.w.innerWidth=1573;
   cards.forEach((card,index)=>{
     card.querySelectorAll('img').forEach(image=>image.removeAttribute('src'));
     const left=-200+index*400;
     card.closest('[data-smile-index]').getBoundingClientRect=()=>({left,right:left+380,width:380});
   });
   x.w.TDBSmileFeed.presentation(root).update(1);
   assert.ok(cards[4].querySelector('img[src]'),'right-hand partially visible card must load');
   assert.ok(cards[5].querySelector('img[src]'),'one card beyond the edge is prepared');
   assert.equal(cards[6].querySelector('img[src]'),null,'distant cards remain deferred');
 }finally{x.close();}
});
test('failed load retains the holding link and can retry',async()=>{
 const x=setup({fail:true});await x.prepare();assert.equal(x.holder.dataset.smileState,'error');
 assert.equal(x.holder.querySelector('a').getAttribute('href'),'/smile-gallery');assert.equal(x.mounts(),0);
 x.fix();x.w.Date.now=()=>Date.now()+6000;await x.prepare();assert.equal(x.mounts(),1);x.close();
});
test('unsafe, duplicated, stale and empty data never reaches the DOM',async()=>{
 for(const mutate of [p=>p.checkedAt-=3600001,p=>p.cases=[],p=>p.cases[0].image.src='javascript:alert(1)',p=>p.cases[1].id=p.cases[0].id]){
 const x=setup();mutate(x.payload);await x.prepare();assert.equal(x.mounts(),0);assert.equal(x.holder.children.length,1);assert.equal(x.images.length,0);x.close();
 }
 const x=setup();x.holder.setAttribute('data-tdb-smile-feed','https://other.example/tdb-content/v1/smiles.json');
 await x.prepare();assert.equal(x.requests.length,0);x.close();
});

test('Smile prepares carousel code during the feed request and decodes entry photos during CSS loading',async()=>{
 let releaseFeed,releaseStyle;
 const x=setup({gate:new Promise(r=>releaseFeed=r)}),styles=new Promise(r=>releaseStyle=r),kinds=[];
 const load=x.w.TDBModules.load;
 x.w.TDBModules.load=async(url,options)=>{await load(url,options);if(options?.type==='style')await styles;};
 x.w.TDBSliderLoader.prepare=async(kind)=>{kinds.push(kind);};
 try {
  const flight=x.prepare();await tick();assert.deepEqual(kinds,['gallery']);
  assert.equal(x.requests.length,1);assert.equal(x.images.length,0);assert.equal(x.mounts(),0);
  releaseFeed();await tick();assert.equal(x.images.length,2);assert.equal(x.mounts(),0);
  assert.equal(x.holder.children.length,1);
  releaseStyle();await flight;assert.equal(x.mounts(),1);assert.equal(x.holder.dataset.smileState,'ready');
 }finally{x.close();}
});

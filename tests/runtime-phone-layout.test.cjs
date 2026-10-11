const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const{JSDOM}=require('jsdom');
const code=fs.readFileSync('dist/tdb-immediate-runtime-batch.min.js','utf8');
async function fixture(options={}){
 const dom=new JSDOM(`<html data-wf-page="${options.otherPage?'other':'677cf86df9952f978d94d8a9'}"><head>
 <script data-tdb-consent-js></script><script data-tdb-attribution-js></script><script data-tdb-footer-runtime-js></script></head><body>
 <section class="tdb-service-parallax"><div class="tdb-service-content"><h3 class="tdb-service-title">Service</h3><p class="tdb-service-copy">Copy</p></div><div class="tdb-service-controls"><div class="tdb-service-buttons"></div></div><div class="tdb-service-cta"></div></section>
 <section data-tdb-treatment><div class="tdb-service-controls"><div class="tdb-service-buttons"></div></div><div class="tdb-service-cta"></div></section></body></html>`,{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;await new Promise(r=>w.addEventListener('load',r,{once:true}));
 const state={width:844,height:390,screenWidth:390,screenHeight:844,coarse:true,orientation:'landscape-primary',...options};
 const queries=new Map();
 const matches=q=>q.includes('pointer: coarse')?state.coarse:q.includes('max-width:767px')?state.width<=767&&state.height>state.width:q.includes('orientation:landscape')?state.width>state.height:q.includes('min-width:992px')?state.width>=992:false;
 w.matchMedia=q=>{if(!queries.has(q)){const m=new w.EventTarget();Object.defineProperty(m,'matches',{get:()=>matches(q)});queries.set(q,m)}return queries.get(q)};
 const orientation=new w.EventTarget();Object.defineProperty(orientation,'type',{get:()=>state.orientation});
 Object.defineProperties(w.screen,{width:{get:()=>state.screenWidth},height:{get:()=>state.screenHeight},orientation:{value:orientation}});
 Object.defineProperties(w,{innerWidth:{get:()=>state.width},innerHeight:{get:()=>state.height}});
 Object.defineProperty(w.document,'currentScript',{value:{src:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@test/dist/tdb-immediate-runtime-batch.min.js',dataset:{tdbRuntimeBase:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@405af73d4d62619c66bb1140ee6f1e6081b0559c/dist/'}}});
 w.TDBConsent={};w.TDBAttribution={};w.TDBFooterRuntime={};w.CookieScript={instance:{}};
 if(options.early)Object.defineProperty(w.document,'readyState',{value:'loading'});
 w.eval(code);
 return {w,state,roots:[...w.document.querySelectorAll('.tdb-service-parallax,[data-tdb-treatment]')],close(){w.close()}};
}
for(const [name,opts,expected]of[
 ['wide landscape phone',{},true],
 ['small landscape phone',{width:667,height:375,screenWidth:375,screenHeight:667},true],
 ['iPad-sized landscape',{width:1024,height:768,screenWidth:768,screenHeight:1024},false],
 ['portrait phone with keyboard',{width:390,height:300,orientation:'portrait-primary'},false],
 ['desktop',{width:1440,height:900,coarse:false,screenWidth:1440,screenHeight:900},false]
])test(name+' applies matching native classes to both sliders',async()=>{
 const f=await fixture(opts);try{
  for(const root of f.roots){assert.equal(root.dataset.tdbServiceLayout==='phone-landscape',expected);for(const n of root.querySelectorAll('.tdb-service-controls,.tdb-service-cta'))assert.equal(n.classList.contains('is-phone-landscape'),expected)}
  assert.equal(f.w.TDBImmediateRuntimeBatch.version,'0.11.12');assert.equal(f.w.document.querySelectorAll('script').length,3,'existing external dependencies reused');
 }finally{f.close()}
});
test('rotation updates both before carousel mount',async()=>{
 const f=await fixture();try{
  f.state.width=390;f.state.height=844;f.state.orientation='portrait-primary';f.w.dispatchEvent(new f.w.Event('orientationchange'));
  f.roots.forEach(r=>assert.equal(r.querySelector('.tdb-service-controls').classList.contains('is-phone-landscape'),false));
  f.state.width=844;f.state.height=390;f.state.orientation='landscape-primary';f.w.dispatchEvent(new f.w.Event('resize'));
  f.roots.forEach(r=>assert.equal(r.querySelector('.tdb-service-controls').classList.contains('is-phone-landscape'),true));
  assert.equal(f.w.document.querySelectorAll('[data-tdb-slider-init]').length,0);
 }finally{f.close()}
});
test('early explicit execution waits for DOMContentLoaded without a parser observer',async()=>{
 const f=await fixture({early:true});try{assert.equal(f.roots[1].dataset.tdbServiceLayout,undefined);f.w.document.dispatchEvent(new f.w.Event('DOMContentLoaded'));assert.equal(f.roots[1].dataset.tdbServiceLayout,'phone-landscape')}finally{f.close()}
});
test('non-home treatment layout remains unchanged',async()=>{
 const f=await fixture({otherPage:true});try{assert.equal(f.roots[1].dataset.tdbServiceLayout,undefined);f.w.dispatchEvent(new f.w.Event('resize'));assert.equal(f.roots[1].querySelector('.tdb-service-controls').classList.contains('is-phone-landscape'),false)}finally{f.close()}
});

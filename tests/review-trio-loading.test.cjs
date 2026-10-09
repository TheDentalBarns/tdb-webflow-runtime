const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const code=fs.readFileSync(__dirname+'/../dist/tdb-reviews-loader.js','utf8');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setTimeout(resolve,0));};
function setup(){
 const dom=new JSDOM('<script src="https://example.com/dist/tdb-reviews-loader.js"></script><div data-tdb-review-quotes><div data-tdb-quote-action data-review-id="older"></div></div><div data-tdb-reviews></div>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'});
 const w=dom.window,root=w.document.querySelector('[data-tdb-review-quotes]'),observers=[],calls=[],cache=new Map();
 let allowed=false,sync,resolveFetch,hooks;
 const data={featured:['recent','older','other'],records:[{id:'recent'}],total:85,average:4.94,
  fetchRecords(ids,{signal}){calls.push(['fetch',Array.from(ids)]);return new Promise(resolve=>{resolveFetch=()=>{if(!signal.aborted)ids.forEach(id=>cache.set(id,{id}));resolve(ids.map(id=>cache.get(id)));};});},
  getCached:id=>cache.get(id),ensure:async ids=>calls.push(['drawer-ensure',Array.from(ids)])};
 Object.defineProperty(w.document,'currentScript',{value:w.document.querySelector('script')});
 w.IntersectionObserver=class{constructor(fn){this.fn=fn;observers.push(this)}observe(){}unobserve(){}};
 w.TDBReviewOptions={permission:()=>allowed,subscribe:fn=>sync=fn};
 w.TDBModules={load:async url=>calls.push(['code',url.pathname.split('/').pop()])};
 w.TDBReviewCMS={load:async()=>data};w.TDBReviewQuotes={};w.TDBReviews={};
 w.TDBSwiper={register(){},create(){},mount(kind,node,received,options){
  if(kind==='review-testimonials'){hooks=options;calls.push(['mounted',received.featured.map(id=>received.getCached(id)?.id)]);return{destroy(){calls.push(['destroy'])}};}
  return{open:async(trigger,id)=>calls.push(['open',id]),destroy(){}};
 }};
 w.eval(code);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return{w,root,data,calls,near(){observers[0].fn([{target:root,isIntersecting:true}]);},permit(value){allowed=value;sync();},resolve(){resolveFetch();},get hooks(){return hooks;},close(){w.close();}};
}
test('trio waits for targeted records, preserves selection order and feed, and keeps drawer identity',async()=>{
 const t=setup();try{
  t.near();await flush();assert.equal(t.calls.length,0);
  t.permit(true);await flush();assert.deepEqual(t.calls.filter(c=>c[0]==='fetch'),[['fetch',['recent','older','other']]]);
  assert(!t.calls.some(c=>c[0]==='mounted'||c[0]==='drawer-ensure'));
  t.resolve();await flush();assert.deepEqual(t.calls.find(c=>c[0]==='mounted'),['mounted',['recent','older','other']]);
  assert.equal(t.data.records.length,1);assert(t.calls.some(c=>c[1]==='tdb-review-quote-adapter.min.js'));
  await t.hooks.openReviews({trigger:t.root.querySelector('[data-tdb-quote-action]'),reviewId:'older'});
  assert.deepEqual(t.calls.find(c=>c[0]==='open'),['open','older']);
  assert.deepEqual(t.calls.find(c=>c[0]==='drawer-ensure'),['drawer-ensure',['older']]);
 }finally{t.close();}
});
test('withdrawn permission prevents a pending trio fetch from mounting',async()=>{
 const t=setup();try{t.permit(true);t.near();await flush();t.permit(false);t.resolve();await flush();assert(!t.calls.some(c=>c[0]==='mounted'));}finally{t.close();}
});

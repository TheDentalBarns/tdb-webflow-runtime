const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.TDB_JSDOM_PATH || 'jsdom');
const record = (i) => ({id:`review-${i}`,name:`Reviewer ${i}`,text:`Published review ${i}`,excerpt:'Excerpt',
 platform:'Google',date:'2026-10-01',displayDate:'October 2026',rating:i===25?1:5,
 approx:false,historic:false,rank:i,snippetRank:i,nRank:999,iRank:999,lRank:999,
 duplicate:'',url:'https://www.google.com/maps/',direct:false,topics:['comfort'],
 excerpts:{comfort:'Comfortable visit'},response:i===25?'Published response':'',showResponse:i===25});
const payload = () => ({version:1,feed:'reviews',checkedAt:Date.now(),records:Array.from({length:45},(_,i)=>record(i+1)),average:4.91,total:45,featured:['review-1','review-25']});
function setup() {
 const dom = new JSDOM('<div data-tdb-reviews-feed="/tdb-content/v1/reviews.json"></div>',{url:'https://fixture.test/',runScripts:'outside-only'});
 for(const file of ['json.js','cms.js'])dom.window.eval(fs.readFileSync(path.join(__dirname,'../src/reviews/native',file),'utf8'));
 return dom;
}
const response = (body) => ({ok:true,headers:new Headers({'Content-Type':'application/json'}),text:async()=>JSON.stringify(body)});
test('JSON keeps 20-record batches, complete filters and late responses with one request',async()=>{
 const dom=setup(),w=dom.window,calls=[];
 w.fetch=async(url)=>{calls.push(url);return response(payload());};
 try {
  const d=await w.TDBReviewCMS.load(); assert.equal(d.records.length,20);assert.equal(d.filterIndex.length,45);assert(d.indexReady);
  assert.equal(d.getCached('review-25').response,'Published response');
  const [late]=await d.fetchRecords(['review-25']); assert(late.showResponse);
  let notifications=0;d.subscribe(()=>notifications++);
  await Promise.all([d.loadMore(),d.loadMore()]);assert.equal(d.records.length,40);assert.equal(notifications,1);
  await d.loadAll();assert.equal(d.records.length,45);assert.equal(d.hasMore,false);
  assert.equal((await w.TDBReviewCMS.load()),d);
  assert.deepEqual(calls,['https://fixture.test/tdb-content/v1/reviews.json']);
  await assert.rejects(d.fetchRecords(['unpublished']),/outside the published index/);
 } finally {w.close();}
});
test('JSON cancellation is per caller, and aborted requests cannot poison the shared cache',async()=>{
 const dom=setup(),w=dom.window;let release,networkSignal,count=0;
 w.fetch=(_,options)=>{count++;networkSignal=options.signal;return new Promise(resolve=>release=()=>resolve(response(payload())));};
 try {
  const a=new w.AbortController(),b=new w.AbortController();
  const first=w.TDBReviewCMS.load({signal:a.signal}),second=w.TDBReviewCMS.load({signal:b.signal});
  const aborted=assert.rejects(first,{name:'AbortError'});a.abort();await aborted;
  assert.equal(networkSignal.aborted,false);release();assert.equal((await second).records.length,20);assert.equal(count,1);
 } finally {w.close();}
 const retry=setup(),rw=retry.window;let finish;
 rw.fetch=()=>new Promise(resolve=>finish=()=>resolve(response(payload())));
 try {
  const c=new rw.AbortController(),promise=rw.TDBReviewCMS.load({signal:c.signal});
  const aborted=assert.rejects(promise,{name:'AbortError'});c.abort();await aborted;finish();await new Promise(r=>setTimeout(r,0));
  let fetched=0;rw.fetch=async()=>{fetched++;return response(payload());};
  await rw.TDBReviewCMS.load();assert.equal(fetched,1);
 } finally {rw.close();}
});
test('invalid or stale JSON fails cleanly without falling back to HTML or unsafe URLs',async()=>{
 for(const mutate of [p=>p.records.push(p.records[0]),p=>p.records[0].url='javascript:alert(1)',
  p=>p.checkedAt=Date.now()-3600001,p=>p.records[0].topics=['private-notes'],p=>p.featured=['unknown']]){
  const dom=setup(),w=dom.window,calls=[];const p=payload();mutate(p);
  w.fetch=async(url)=>{calls.push(url);return response(p);};
  try {await assert.rejects(w.TDBReviewCMS.load());assert.equal(calls.length,1);assert(calls[0].endsWith('/reviews.json'));}
  finally{w.close();}
 }
 const dom=setup(),w=dom.window;
 try {w.document.querySelector('[data-tdb-reviews-feed]').setAttribute('data-tdb-reviews-feed','https://other.test/tdb-content/v1/reviews.json');
  w.fetch=()=>assert.fail('cross-origin fetch');await assert.rejects(w.TDBReviewCMS.load(),/Invalid published/);
 } finally{w.close();}
});

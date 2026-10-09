const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require(process.env.TDB_JSDOM_PATH||'jsdom');
const source=fs.readFileSync(path.join(__dirname,'../src/reviews/native/cms.js'),'utf8');
// Synthetic records only. The full first response and lean continuation pages
// intentionally have different shapes, as the native Webflow feeds do.
const record=i=>`<article data-tdb-review-record data-tdb-review-detail="v1" data-review-slug="r-${i}" data-review-platform-2="Google" data-review-star-rating="${i===25?1:5}" data-review-review-date="2024-07-17"><span data-tdb-review-field="reviewer-display-name">Reviewer ${i}</span><p data-tdb-review-field="full-review">Full review ${i}</p><p data-tdb-review-field="featured-excerpt">Excerpt ${i}</p><span data-tdb-review-field="display-date">17 July 2024</span><span data-tdb-review-flag="topic-comfort"></span></article>`;
const index=i=>`<span data-tdb-review-index-record data-review-slug="r-${i}" data-review-platform-2="Google" data-review-star-rating="${i===25?1:5}"><span data-tdb-review-flag="topic-comfort"></span></span>`;
const summary='<div data-tdb-review-aggregate data-review-total="45" data-review-average="4.91"></div>';
const range=(start,length,fn)=>Array.from({length},(_,i)=>fn(start+i)).join('');
function feed(page=1,pagesPath='/review-pages'){
 return `<div data-tdb-review-cms="v1"${page===1?` data-tdb-review-pages="${pagesPath}"`:''}>${range((page-1)*20+1,page===3?5:20,record)}${page<3?`<a class="w-pagination-next" href="?reviews_page=${page+1}">Next</a>`:''}</div>${summary}`+(page===1?`<div data-tdb-review-index="v1">${range(1,45,index)}</div><div data-tdb-review-response-record data-review-slug="r-25"><p data-tdb-review-response>Original published response</p></div><span data-tdb-review-icon="Google"><svg viewBox="0 0 24 24"><defs><clipPath id="clip"><path d="M0 0h24v24H0z"/></clipPath></defs><g clip-path="url(#clip)"><path d="M1 1h20v20H1z"/></g></svg></span>`:'');
}
function setup(){const dom=new JSDOM('',{url:'https://fixture.test/',runScripts:'outside-only'});dom.window.eval(source);return dom;}
function respond(w,requests){w.fetch=async url=>{requests.push(url);const u=new URL(url);return {ok:true,text:async()=>u.pathname.startsWith('/review-topics/')?record(Number(u.pathname.split('-').at(-1))):feed(Number(u.searchParams.get('reviews_page'))||1)};};}
test('continuation pages preserve the complete index, date text and late responses',async()=>{
 const dom=setup(),w=dom.window,requests=[];respond(w,requests);
 try{
  const d=await w.TDBReviewCMS.load();assert.equal(d.records.length,20);assert.equal(d.filterIndex.length,45);assert.equal(d.indexReady,true);
  assert.equal(d.nextURL,'https://fixture.test/review-pages?reviews_page=2');
  let notifications=0;d.subscribe(()=>notifications++);
  await Promise.all([d.loadMore(),d.loadMore()]);
  assert.equal(d.records.length,40);assert.equal(notifications,1);assert.equal(requests.filter(u=>u.includes('reviews_page=2')).length,1);
  const late=d.getCached('r-25');assert.equal(late.response,'Original published response');assert.equal(late.showResponse,true);assert.equal(late.displayDate,'17 July 2024');
  await d.loadAll();assert.equal(d.records.length,45);assert.equal(new Set(d.records.map(r=>r.id)).size,45);assert.equal(d.hasMore,false);assert.equal(d.filterIndex.length,45);
  assert.equal(requests.length,3);assert(requests.slice(1).every(u=>new URL(u).pathname==='/review-pages'));
 }finally{dom.window.close();}
});
test('filtered detail requests reuse initial responses and retain shared artwork without its source document',async()=>{
 const dom=setup(),w=dom.window,requests=[];respond(w,requests);
 try{
  const d=await w.TDBReviewCMS.load();const [late]=await d.fetchRecords(['r-25']);
  assert.equal(late.response,'Original published response');assert.equal(late.showResponse,true);
  const a=w.TDBReviewCMS.sourceIcon('Google',false),b=w.TDBReviewCMS.sourceIcon('Google',true);
  assert.equal(a.firstElementChild.ownerDocument,w.document);assert.notEqual(a.querySelector('clipPath').id,b.querySelector('clipPath').id);
  assert.equal(a.querySelector('g').getAttribute('clip-path'),`url(#${a.querySelector('clipPath').id})`);
  await d.loadMore();assert(w.TDBReviewCMS.sourceIcon('Google').querySelector('svg'));assert.equal(d.records.find(r=>r.id==='r-25').response,late.response);
  const before=requests.length;await d.fetchRecords(['r-25']);assert.equal(requests.length,before);
 }finally{dom.window.close();}
});
test('a cancelled shared request leaves the other caller and retry path intact',async()=>{
 const dom=setup(),w=dom.window;let release,networkSignal,count=0;
 w.fetch=(_,options)=>{count++;networkSignal=options.signal;return new Promise(resolve=>release=()=>resolve({ok:true,text:async()=>feed()}));};
 try{
  const a=new w.AbortController(),b=new w.AbortController();
  const first=w.TDBReviewCMS.load({signal:a.signal}),second=w.TDBReviewCMS.load({signal:b.signal});
  const cancelled=assert.rejects(first,{name:'AbortError'});a.abort();await cancelled;assert.equal(networkSignal.aborted,false);release();
  const d=await second;assert.equal(d.records.length,20);await w.TDBReviewCMS.load();assert.equal(count,1);
  w.fetch=async()=>({ok:false});await assert.rejects(d.loadMore(),/request failed/);assert.equal(d.records.length,20);
  const requests=[];respond(w,requests);await d.loadMore();assert.equal(d.records.length,40);
 }finally{dom.window.close();}
});
test('the archive keeps its native pagination and invalid continuation origins are rejected',async()=>{
 const dom=setup(),w=dom.window;
 try{
  const doc=new w.DOMParser().parseFromString(feed(1,''),'text/html');
  const archive=w.TDBReviewCMS.fromDocument(doc,'https://fixture.test/reviews');assert.equal(archive.nextURL,'https://fixture.test/reviews?reviews_page=2');
  w.fetch=async()=>({ok:true,text:async()=>feed(1,'https://other.test/review-pages')});await assert.rejects(w.TDBReviewCMS.load(),/Invalid review page source/);
 }finally{dom.window.close();}
});

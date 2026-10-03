const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('assert/strict');
const code=fs.readFileSync(__dirname+'/../src/reviews/native/cms.js','utf8');
const record=i=>`<div data-tdb-review-record data-review-slug="review-${i}" data-review-star-rating="5"><span data-tdb-review-field="reviewer-display-name">Person ${i}</span><span data-tdb-review-field="full-review">Full ${i}</span><span data-tdb-review-field="featured-excerpt">Quote ${i}</span></div>`;
const page=(start,end,next='')=>`<div data-tdb-review-cms="v1">${Array.from({length:end-start+1},(_,i)=>record(start+i)).join('')}<div class="w-pagination-wrapper">${next?`<a class="w-pagination-next" href="${next}">Next</a>`:''}</div></div><div data-tdb-review-aggregate data-review-average="5" data-review-total="108"></div>`;
function fixture(handler){const dom=new JSDOM('',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'});dom.window.fetch=handler;dom.window.eval(code);return dom;}
(async()=>{
let calls=[],fail=false;
const dom=fixture(async(url)=>{calls.push(url);const n=+(new URL(url).searchParams.get('list_page')||1);if(fail){fail=false;throw Error('offline')}return {ok:true,text:async()=>page((n-1)*20+1,Math.min(n*20,108),n<6?`?list_page=${n+1}`:'')}});
const cms=dom.window.TDBReviewCMS, a=await cms.load({});assert.equal(a.records.length,20);assert(a.hasMore);let notifications=0;a.subscribe(()=>notifications++);
await Promise.all([a.loadMore({}),a.loadMore({})]);assert.equal(calls.length,2);assert.equal(a.records.length,40);assert.equal(notifications,1);
fail=true;await assert.rejects(a.loadMore({}),/offline/);assert.equal(a.records.length,40);await a.loadMore({});assert.equal(a.records.length,60);
await a.ensure(['review-105'],{});assert.equal(a.records.length,108);assert(!a.hasMore);assert.equal(new Set(a.records.map(r=>r.id)).size,108);assert.equal(notifications,5);
assert.equal(await cms.load({}),a);dom.window.close();
// No data delivered to a revoked client; another client can finish the same request.
let release,aborted=false,count=0;
const shared=fixture((url,{signal})=>{count++;return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Aborted','AbortError'))});release=()=>resolve({ok:true,text:async()=>page(1,20,'?list_page=2')})})});
const c=new shared.window.AbortController();const p=shared.window.TDBReviewCMS.load({signal:c.signal});const q=shared.window.TDBReviewCMS.load({});c.abort();await assert.rejects(p,{name:'AbortError'});assert(!aborted);release();assert.equal((await q).records.length,20);assert.equal(count,1);shared.window.close();
// Refuse a CMS pagination link to an unrelated origin.
const bad=fixture(async()=>({ok:true,text:async()=>page(1,20,'https://example.com/review-content?page=2')}));const b=await bad.window.TDBReviewCMS.load({});await assert.rejects(b.loadMore({}),/Invalid review pagination URL/);bad.window.close();
console.log('PASS: 108 records, concurrent deduplication, retry, permission abort, shared requests and same-origin pagination');
})().catch(e=>{console.error(e);process.exitCode=1});

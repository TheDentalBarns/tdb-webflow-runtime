const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.TDB_JSDOM_PATH || 'jsdom');
const source = fs.readFileSync(path.join(__dirname, '../src/reviews/review-cms-source.js'), 'utf8');
// Synthetic fixtures only: no patient data belongs in this repository.
const html = `<div data-tdb-review-cms="v1"><div data-tdb-review-record data-review-slug="sample" data-review-platform-2="efe6db2067ed0fd456d38bc2e521b4bd" data-review-star-rating="5" data-review-editorial-priority="2"><span data-tdb-review-field="reviewer-display-name">Sample Reviewer</span><span data-tdb-review-field="full-review">Sample complete review.</span><span data-tdb-review-field="featured-excerpt">Sample excerpt.</span><div data-tdb-review-flag="topic-comfort"></div><div class="w-condition-invisible" data-tdb-review-flag="topic-invisalign"></div></div></div><div data-tdb-review-response-record data-review-slug="sample"><p data-tdb-review-response>Sample response.</p></div><div data-tdb-review-aggregate data-review-average="5" data-review-total="1"></div>`;
function setup() { const dom = new JSDOM('', { url: 'https://dentalbarns.webflow.io/', runScripts: 'outside-only' }); dom.window.eval(source); return dom; }
test('native fields, references and conditional topic visibility become drawer records', () => {
  const dom=setup(), w=dom.window, doc=new w.DOMParser().parseFromString(html,'text/html');
  const data=w.TDBReviewCMS.parse(doc), r=data.records[0];
  assert.equal(r.name,'Sample Reviewer'); assert.equal(r.platform,'Google'); assert.equal(r.rating,5);
  assert.equal(r.response,'Sample response.'); assert.equal(r.showResponse,true);
  assert.deepEqual([...r.topics],['comfort']); assert.equal(data.total,1);
  doc.querySelector('[data-tdb-review-aggregate]').remove();
  assert.throws(()=>w.TDBReviewCMS.parse(doc),/summary needs updating/); dom.window.close();
});
test('requests coalesce, a cancelled caller cannot cancel another, and results cache', async () => {
  const dom=setup(), w=dom.window; let requests=0, release, networkSignal;
  w.fetch=(_,options)=>{requests++;networkSignal=options.signal;return new Promise(resolve=>release=()=>resolve({ok:true,text:async()=>html}));};
  const a=new w.AbortController(), b=new w.AbortController();
  const first=w.TDBReviewCMS.load({signal:a.signal}), second=w.TDBReviewCMS.load({signal:b.signal});
  const rejection=assert.rejects(first,{name:'AbortError'}); a.abort(); await rejection;
  assert.equal(networkSignal.aborted,false); release();
  assert.equal((await second).records.length,1); await w.TDBReviewCMS.load(); assert.equal(requests,1); dom.window.close();
});
test('last caller cancellation aborts network; a later attempt can retry', async () => {
  const dom=setup(),w=dom.window; let count=0,networkSignal;
  w.fetch=(_,options)=>{count++;networkSignal=options.signal;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new w.DOMException('Cancelled','AbortError'))));};
  const c=new w.AbortController(),pending=w.TDBReviewCMS.load({signal:c.signal});
  const rejected=assert.rejects(pending,{name:'AbortError'}); c.abort(); await rejected;
  assert.equal(networkSignal.aborted,true);
  w.fetch=async()=>{count++;return{ok:true,text:async()=>html};};
  await w.TDBReviewCMS.load(); assert.equal(count,2); dom.window.close();
});

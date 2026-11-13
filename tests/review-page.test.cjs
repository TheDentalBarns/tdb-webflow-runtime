const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setTimeout(resolve, 30));
async function setup() {
  const dom = new JSDOM(fs.readFileSync('src/reviews/native/archive.html', 'utf8') + fs.readFileSync('src/reviews/native/archive-drawer.html', 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://dentalbarns.webflow.io/reviews' });
  const w = dom.window, d = w.document;
  d.querySelector('[data-review-page-list-home]').innerHTML = `<div data-tdb-review-cms="v1"><div class="reviews-page_grid"><article class="reviews-page_item w-dyn-item"><div class="reviews-page_card"><div data-tdb-review-field="featured-excerpt"></div><div data-tdb-review-field="reviewer-display-name">Published fallback</div><div data-tdb-review-field="display-date"></div><div data-review-page-stars>${[0,1,2,3,4].map(n=>`<span data-tdb-star="${n}"></span>`).join('')}</div><a data-cards-platform-logo></a><div data-tdb-review-field="full-review">Native text</div><p data-review-page-historic></p><div data-review-page-response><div data-review-page-response-text></div></div><span data-review-page-number></span><a data-tdb-review-trigger href="#patient-reviews">Read more</a></div></article></div><div class="w-pagination-wrapper"><a href="?page=2">Next</a></div></div>`;
  const records = Array.from({length:91},(_,i)=>({id:'r'+i,name:'Patient '+i,text:'Full text '+i+'\n'+('Complete review paragraph. '.repeat(30)),excerpt:'Excerpt '+i,displayDate:'January '+(2000+i),date:`${2000+i}-01-01`,rating:i===90?null:i===89?1:5,platform:i%2?'Google':'Facebook',topics:i%2?['nervous','comfort']:['bonding'],historic:i===90,showResponse:i===89,response:i===89?'The full practice response.':'',url:'https://example.com/review/'+i}));
  Object.defineProperty(d, 'currentScript', { value: {src:'https://cdn.example/dist/tdb-review-page.js'} });
  w.HTMLElement.prototype.scrollIntoView = function(){};
  const reduced = new w.EventTarget(); reduced.matches = true;
  w.TDBMotion = {reduced,filterToggle:()=>({set(){},destroy(){}})};
  let locked = false;
  w.TDBScrollLock = {acquire:()=>{locked=true;return()=>{locked=false;};}};
  w.TDBSiteChrome = {acquire:()=>()=>{},settleBackground(){}};
  w.TDBModuleBootstrap = {ensure:async()=>({load:async()=>{}})};
  w.TDBNativeTicker = {mount:slot=>({update:v=>{slot.textContent=v;},destroy(){}})};
  let intersection;
  w.IntersectionObserver = class {constructor(fn){intersection=fn;}observe(){}disconnect(){}};
  w.eval(fs.readFileSync('src/reviews/native/cms.js','utf8'));
  const calls = []; let fail = false, deferred;
  const data = {loadIndex:async()=>records,fetchRecords:async(ids)=>{
    calls.push([...ids]);
    if(fail){fail=false;throw Error('Offline');}
    const result=ids.map(id=>records.find(r=>r.id===id));
    if(deferred){const pending=deferred;deferred=null;await pending;}
    return result;
  }};
  w.TDBReviewCMS = {...w.TDBReviewCMS,load:async()=>data};
  for(const file of ['src/shared/filters.js','src/shared/drawer.js','src/reviews/native/archive.js'])w.eval(fs.readFileSync(file,'utf8'));
  const api = await w.TDBReviewPage.mount();
  const choose = async(group,value,modal=false)=>{d.querySelector(`${modal?'[data-review-page-panel]':'[data-review-page-embedded]'} [data-review-page-group="${group}"][data-review-page-value="${value}"]`).click();await tick();};
  return {w,d,api,records,calls,choose,locked:()=>locked,fail:()=>{fail=true;},hold:()=>{let resolve;deferred=new Promise(r=>resolve=r);return resolve;},visible:()=>[...d.querySelector('.reviews-page_grid').children],intersect:()=>intersection([{isIntersecting:true}]),close:()=>{w.TDBReviewPage.destroy();w.close();}};
}
test('all 91 reviews load incrementally with complete text, numbering, responses and identity',async()=>{
  const x=await setup();try{
    assert.equal(x.visible().length,20);assert.equal(x.calls[0].length,20);
    for(let i=0;i<4;i++)await x.api.loadMore();
    const cards=x.visible();assert.equal(cards.length,91);assert.equal(new Set(cards.map(n=>n.dataset.reviewId)).size,91);
    cards.forEach((n,i)=>assert.equal(n.querySelector('[data-tdb-review-field="full-review"]').textContent,x.records[i].text));
    assert.equal(cards[90].querySelector('[data-review-page-number]').textContent,'91 / 91');
    assert.equal(cards[89].querySelector('[data-review-page-response]').hidden,false);
    assert.equal(cards[90].querySelector('[data-review-page-historic]').hidden,false);
    assert.equal(cards[90].querySelector('[data-review-page-stars]').hidden,true);
    assert.equal(x.d.querySelector('[data-review-page-more]').hidden,true);
    assert.equal(x.d.querySelector('[data-review-page-status]').textContent,'1–91 of 91 reviews');
    assert.deepEqual(x.calls.map(c=>c.length),[20,20,20,20,11]);
  }finally{x.close();}
});
test('shared disclosures, filter drawer drafts, count, apply and reset retain correct content',async()=>{
  const x=await setup();try{
    const d=x.d;
    d.querySelector('[data-review-page-embedded] [data-review-page-disclosure="treatment"]').click();
    await tick();assert.equal(d.querySelector('[data-review-page-embedded] [data-review-page-disclosure="treatment"]').getAttribute('aria-expanded'),'true');
    d.querySelector('[data-review-page-toggle]').click();await tick();assert.equal(x.locked(),true);
    await x.choose('rating','1',true);
    const ratingOption = d.querySelector('[data-review-page-panel] [data-review-page-group="rating"][data-review-page-value="1"]');
    const allRatings = d.querySelector('[data-review-page-panel] [data-review-page-group="rating"][data-review-page-value=""]');
    assert.ok([...ratingOption.querySelectorAll('.tdb-review-filter_mark,.tdb-review-filter_tick')].every(n=>n.classList.contains('is-checked')));
    assert.ok([...allRatings.querySelectorAll('.tdb-review-filter_mark,.tdb-review-filter_tick')].every(n=>!n.classList.contains('is-checked')));
    assert.equal(d.querySelector('[data-review-page-apply]').getAttribute('aria-label'),'View 1 review');
    assert.equal(x.visible().length,20);
    d.querySelector('[data-review-page-apply]').click();await tick();await tick();
    assert.equal(x.locked(),false);assert.equal(x.visible().length,1);assert.equal(x.visible()[0].dataset.reviewId,'r89');
    d.querySelector('[data-review-page-embedded] [data-review-page-reset]').click();await tick();
    assert.equal(x.visible().length,20);
    assert.ok([...allRatings.querySelectorAll('.tdb-review-filter_mark,.tdb-review-filter_tick')].every(n=>n.classList.contains('is-checked')));
    await x.choose('experience','nervous');await x.choose('experience','comfort');
    assert.ok(x.visible().every(n=>Number(n.dataset.reviewId.slice(1))%2===1));
  }finally{x.close();}
});
test('late batches cannot overwrite a newly selected filter; failed batches can be retried',async()=>{
  const x=await setup();try{
    const release=x.hold();const old=x.api.loadMore();await x.choose('rating','1');release();await old;
    assert.equal(x.visible().length,1);assert.equal(x.visible()[0].dataset.reviewId,'r89');
    x.d.querySelector('[data-review-page-embedded] [data-review-page-reset]').click();await tick();
    x.fail();await x.api.loadMore();assert.equal(x.visible().length,20);
    assert.match(x.d.querySelector('[data-review-page-status]').textContent,/could not/);
    x.intersect();await tick();assert.equal(x.visible().length,20);
    x.d.querySelector('[data-review-page-more]').click();await tick();assert.equal(x.visible().length,40);
  }finally{x.close();}
});
test('lowest-first includes low and unrated reviews and destroy restores the native fallback',async()=>{
  const x=await setup();try{
    await x.choose('sort','lowest');assert.equal(x.visible()[0].dataset.reviewId,'r89');
    await x.choose('rating','unrated');assert.equal(x.visible().length,1);assert.equal(x.visible()[0].dataset.reviewId,'r90');
    x.w.TDBReviewPage.destroy();assert.equal(x.visible().length,1);
    assert.equal(x.d.querySelector('[data-tdb-review-field="full-review"]').textContent,'Native text');
    assert.equal(x.d.querySelector('.w-pagination-wrapper').hidden,false);
    assert.equal(x.d.querySelector('.tdb-filter-sticky-rail'),null);
  }finally{x.close();}
});

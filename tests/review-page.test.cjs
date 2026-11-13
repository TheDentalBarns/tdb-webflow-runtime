const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise((resolve) => setTimeout(resolve, 30));
async function setup({lastReview}={}) {
  const dom = new JSDOM(fs.readFileSync('src/reviews/native/archive.html', 'utf8') + fs.readFileSync('src/reviews/native/archive-drawer.html', 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://dentalbarns.webflow.io/reviews' });
  const w = dom.window, d = w.document;
  if(lastReview)d.querySelector('[data-tdb-review-archive]').dataset.reviewPageLast=lastReview;
  else d.querySelector('[data-tdb-review-archive]').removeAttribute('data-review-page-last');
  d.querySelector('[data-review-page-list-home]').innerHTML = `<div data-tdb-review-cms="v1"><div class="reviews-page_grid"><article class="reviews-page_item w-dyn-item"><div class="reviews-page_card"><div data-tdb-review-field="featured-excerpt"></div><div data-tdb-review-field="reviewer-display-name">Published fallback</div><div data-tdb-review-field="display-date"></div><div data-review-page-stars>${[0,1,2,3,4].map(n=>`<span data-tdb-star="${n}"></span>`).join('')}</div><a data-cards-platform-logo></a><div data-tdb-review-field="full-review">Native text</div><p data-review-page-historic></p><div data-review-page-response><div data-review-page-response-text></div></div><span data-review-page-number><span data-review-page-current></span><span class="tdb-pagination-rule" aria-hidden="true"></span><span data-review-page-total></span></span></div></article></div><div class="w-pagination-wrapper"><a href="?page=2">Next</a></div></div>`;
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
  return {w,d,api,records,calls,choose,locked:()=>locked,fail:()=>{fail=true;},hold:()=>{let resolve;deferred=new Promise(r=>resolve=r);return resolve;},visible:()=>[...d.querySelector('.reviews-page_grid').children],intersect:()=>intersection?.([{isIntersecting:true}]),close:()=>{w.TDBReviewPage.destroy();w.close();}};
}
test('all 91 reviews load incrementally with complete text, numbering, responses and identity',async()=>{
  const x=await setup();try{
    assert.equal(x.visible().length,20);assert.equal(x.calls[0].length,20);
    x.intersect();x.w.dispatchEvent(new x.w.Event('scroll'));await tick();
    assert.equal(x.visible().length,20);assert.equal(x.calls.length,1);
    for(let i=0;i<4;i++){
      x.d.querySelector('[data-review-page-more]').click();await tick();
      assert.equal(x.visible().length,Math.min(40+i*20,91));
    }
    const cards=x.visible();assert.equal(cards.length,91);assert.equal(new Set(cards.map(n=>n.dataset.reviewId)).size,91);
    cards.forEach((n,i)=>assert.equal(n.querySelector('[data-tdb-review-field="full-review"]').textContent,x.records[i].text));
    assert.equal(cards[90].querySelector('[data-review-page-current]').textContent,'91');
    assert.equal(cards[90].querySelector('[data-review-page-total]').textContent,'91');
    assert.equal(cards[90].querySelector('[data-review-page-number]').getAttribute('aria-label'),'Review 91 of 91');
    assert.equal(cards[90].querySelector('[data-tdb-review-trigger]'),null);
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

test('the designated final review remains last in every sort, without dropping it from rating filters',async()=>{
  const x=await setup({lastReview:'r89'});try{
    for(const sort of ['recommended','lowest','highest','recent','oldest']){
      await x.choose('sort',sort);
      for(let i=0;i<4;i++)await x.api.loadMore();
      assert.equal(x.visible().length,91);
      assert.equal(x.visible().at(-1).dataset.reviewId,'r89');
      assert.equal(x.visible().at(-1).querySelector('[data-review-page-response]').hidden,false);
    }
    await x.choose('rating','1');
    assert.deepEqual(x.visible().map(n=>n.dataset.reviewId),['r89']);
    assert.equal(x.d.querySelector('[data-review-page-plural]').classList.contains('is-singular'),true);
    assert.equal(x.d.querySelector('[data-review-page-plural]').hidden,false);
  }finally{x.close();}
});

test('replacement keeps the current cards until the next batch is ready instead of clearing the page',async()=>{
  const x=await setup();try{
    const original=x.visible();
    const release=x.hold();
    await x.choose('rating','1');
    assert.equal(x.visible()[0],original[0]);
    assert.equal(x.d.querySelector('.reviews-page_grid').style.opacity,'0');
    release();await tick();
    assert.deepEqual(x.visible().map(n=>n.dataset.reviewId),['r89']);
    assert.equal(x.d.querySelector('.reviews-page_grid').style.opacity,'1');
  }finally{x.close();}
});

test('desktop lanes follow left-to-right order and appending leaves existing card positions stable',async()=>{
  const x=await setup();try{
    const grid=x.d.querySelector('.reviews-page_grid');
    grid.style.gridTemplateColumns='300px 300px 300px';
    grid.style.columnGap='30px';
    const originalRect=x.w.HTMLElement.prototype.getBoundingClientRect;
    x.w.HTMLElement.prototype.getBoundingClientRect=function(){
      if(this.matches('.reviews-page_card'))return {height:100+(Number(this.parentElement.dataset.reviewId.slice(1))%3)*100};
      return originalRect.call(this);
    };
    x.w.dispatchEvent(new x.w.Event('resize'));await tick();
    assert.deepEqual(x.visible().slice(0,6).map(n=>n.style.gridColumn),['1','2','3','1','2','3']);
    assert.deepEqual(x.visible().slice(0,6).map(n=>n.style.gridRow),['1 / span 100','1 / span 200','1 / span 300','131 / span 100','231 / span 200','331 / span 300']);
    const before=x.visible().map(n=>[n.style.gridColumn,n.style.gridRow]);
    x.d.querySelector('[data-review-page-more]').click();await tick();
    assert.equal(x.visible().length,40);
    assert.deepEqual(x.visible().slice(0,20).map(n=>[n.style.gridColumn,n.style.gridRow]),before);
    grid.style.gridTemplateColumns='300px';
    x.w.dispatchEvent(new x.w.Event('resize'));await tick();
    assert.equal(grid.classList.contains('is-masonry'),false);
    assert.ok(x.visible().every(n=>!n.style.gridColumn&&!n.style.gridRow));
    assert.deepEqual(x.visible().slice(0,4).map(n=>n.dataset.reviewId),['r0','r1','r2','r3']);
  }finally{x.close();}
});

/* Real shared Swiper; synthetic reviews. Covers finite edges, batch timing,
   retry, cached drawer data, selection handoff and native restoration. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const card=i=>`<div class="tdb-review-cards_slide" data-review-id="review-${i}"><article class="tdb-review-cards_card"><blockquote data-cards-render="excerpt">Native excerpt ${i}</blockquote><div data-cards-render="name">Native name ${i}</div><span data-cards-render="date"></span><span data-cards-render="icon"></span><span data-cards-render="rating">${[0,1,2,3,4].map(i=>`<span data-tdb-star="${i}">★</span>`).join('')}</span><div data-cards-render="text">Native text ${i}</div><span data-cards-render="historic">Historic</span><a role="button" tabindex="0" data-tdb-cards-open>Read more</a></article></div>`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.TDB_CHROMIUM,args:['--no-sandbox','--disable-gpu']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(`<style>*{box-sizing:border-box}body{margin:0}.tdb-review-cards_viewport{width:100vw;padding-left:3vw;height:600px;overflow:hidden}.tdb-review-cards_track{display:flex;width:100%;height:100%}.tdb-review-cards_slide{flex-shrink:0;width:calc((94vw - 4rem)/3 + 2rem);padding-right:2rem;height:100%}.tdb-review-cards_card{height:100%}@media(max-width:991px){.tdb-review-cards_slide{width:72vw;padding-right:2vw}}@media(max-width:478px){.tdb-review-cards_viewport{padding-left:5vw}.tdb-review-cards_slide{width:92vw}}@media(min-width:480px) and (max-width:991px) and (max-height:500px) and (orientation:landscape){.tdb-review-cards_slide{width:92vw}.tdb-review-cards_viewport{padding-left:5vw}}</style><section data-tdb-review-cards><div class="tdb-review-cards_viewport" data-tdb-cards-viewport tabindex="0"><div class="tdb-review-cards_track" data-tdb-cards-track>${Array.from({length:8},(_,i)=>card(i+1)).join('')}</div></div><nav data-tdb-cards-navigation><span data-tdb-cards-current>01</span><span data-tdb-cards-total>85</span><a role="button" tabindex="0" data-tdb-cards-prev>Previous</a><a role="button" tabindex="0" data-tdb-cards-next>Next</a></nav><div data-tdb-cards-progress style="position:relative;width:400px;height:5px"><span></span></div><p data-tdb-cards-status></p></section>`);
 for(const file of ['dist/tdb-motion-policy.js','dist/tdb-motion.js','dist/tdb-ticker.js','dist/tdb-swiper-8.4.7.min.js','dist/tdb-slider-focus.js','dist/tdb-rendered-progress.js','dist/tdb-review-cards.js'])await page.addScriptTag({path:path.join(root,file)});
 await page.evaluate(()=>{
  const all=Array.from({length:85},(_,i)=>({id:'review-'+(i+1),name:'Person '+(i+1),excerpt:'Quote '+(i+1),excerpts:{},text:'Full review '+(i+1),date:'2026-09-01',rating:i===84?1:5,platform:'Google',displayDate:'1 September 2026'}));
  window.loads=0;window.failNext=false;window.opened='';
  window.data={records:all.slice(0,20),total:85,get hasMore(){return this.records.length<all.length},async loadMore({signal}){loads++;await new Promise(r=>setTimeout(r,50));if(signal.aborted)throw Error('aborted');if(failNext){failNext=false;throw Error('offline')}this.records.push(...all.slice(this.records.length,this.records.length+20));}};
  window.TDBReviewCMS={contextForPath:()=>'',sourceIcon:()=>document.createElement('span')};
  window.mount=()=>window.instance=TDBReviewCards.mount(document.querySelector('[data-tdb-review-cards]'),data,{openReviews:async({reviewId})=>{window.opened=reviewId}});
  mount();window.s=document.querySelector('[data-tdb-cards-viewport]').swiper;s.params.speed=0;
 });
 assert.equal(await page.locator('.tdb-review-cards_slide').count(),8);
 assert.equal(await page.locator('[data-cards-render="excerpt"]').first().evaluate(n=>getComputedStyle(n).opacity),'0','first quote hidden before entry');
 await page.waitForFunction(()=>document.querySelector('[data-tdb-review-cards]').dataset.tdbSliderFirstView==='advanced'&&s.activeIndex===1);
 await page.waitForFunction(()=>getComputedStyle(s.slides[1].querySelector('[data-cards-render="excerpt"]')).opacity==='1');
 assert.equal(await page.locator('[data-cards-render="excerpt"]').first().evaluate(n=>getComputedStyle(n).opacity),'0','outgoing quote never revealed');
 await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>s.activeIndex),1,'entry advances only once');
 await page.evaluate(()=>s.slideTo(0,0));
 await page.locator('[data-tdb-cards-prev]').click({force:true});assert.equal(await page.evaluate(()=>s.activeIndex),0);
 await page.locator('[data-tdb-cards-prev]').press('ArrowRight');assert.equal(await page.evaluate(()=>s.activeIndex),1);
 assert(await page.evaluate(()=>document.documentElement.classList.contains('tdb-slider-focus')));
 await page.waitForTimeout(450);assert(await page.locator('[data-tdb-cards-next]').evaluate(n=>n.classList.contains('is-selected')),'selected arrow persists after press');
 await page.locator('[data-tdb-cards-prev]').click({force:true});
 assert(await page.locator('[data-tdb-cards-prev]').evaluate(n=>n.classList.contains('is-selected')),'other arrow takes selection');
 assert.equal(await page.locator('[data-tdb-cards-next]').evaluate(n=>n.classList.contains('is-selected')),false);
 // Desktop neighbour clicks focus without opening the drawer; drag clicks do neither.
 await page.locator('.tdb-review-cards_slide').nth(1).locator('[data-cards-render="name"]').click();
 assert.equal(await page.evaluate(()=>s.activeIndex),1,'adjacent card focuses');
 assert.equal(await page.evaluate(()=>opened),'','focus does not open drawer');
 await page.evaluate(()=>{s.allowClick=false;s.slides[2].querySelector('[data-cards-render="name"]').click();});
 assert.equal(await page.evaluate(()=>s.activeIndex),1,'drag-suppressed click does not focus');
 await page.evaluate(()=>{s.allowClick=true;s.slides[2].querySelector('[data-tdb-cards-open]').click();});
 assert.equal(await page.evaluate(()=>s.activeIndex),2,'neighbour review button focuses first');
 assert.equal(await page.evaluate(()=>opened),'');
 await page.evaluate(()=>s.slides[2].querySelector('[data-tdb-cards-open]').click());
 assert.equal(await page.evaluate(()=>opened),'review-3','focused review button opens drawer');
 await page.evaluate(()=>{opened='';});
 await page.evaluate(()=>s.slideTo(3,0));assert.equal(await page.evaluate(()=>loads),0);
 await page.evaluate(()=>s.slideTo(4,0));await page.waitForFunction(()=>s.slides.length===16);assert.equal(await page.evaluate(()=>loads),0,'use cached records before fetching another page');
 // Fetch enough data for a full eight-card batch across a 20-record page boundary.
 // A response arriving mid-animation waits for settlement, preserving position.
 await page.evaluate(()=>{s.params.speed=300;s.slideTo(12);});
 await page.waitForTimeout(90);assert.equal(await page.locator('.tdb-review-cards_slide').count(),16);
 await page.waitForFunction(()=>s.slides.length===24);assert.equal(await page.evaluate(()=>s.activeIndex),12);assert.equal(await page.evaluate(()=>loads),1);
 await page.evaluate(()=>{s.params.speed=0;s.slideTo(20,0);});await page.waitForFunction(()=>s.slides.length===32);
 await page.evaluate(()=>s.slideTo(28,0));await page.waitForFunction(()=>s.slides.length===40);
 await page.evaluate(()=>{failNext=true;s.slideTo(36,0);});
 await page.waitForFunction(()=>document.querySelector('[data-tdb-cards-status]').textContent.includes('could not'));
 assert.equal(await page.locator('.tdb-review-cards_slide').count(),40);
 await page.evaluate(()=>s.slideTo(39,0));await page.waitForFunction(()=>s.slides.length===48);
 for(const [index,count]of[[44,56],[52,64],[60,72],[68,80],[76,85]]){
  await page.evaluate(index=>s.slideTo(index,0),index);await page.waitForFunction(count=>s.slides.length===count,count);
 }
 for(const [width,height]of[[1440,900],[1024,768],[768,1024],[744,1133],[852,393],[667,375],[390,844],[320,568]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{s.update();s.slideTo(84,0)});
  const result=await page.evaluate(()=>({index:s.activeIndex,next:document.querySelector('[data-tdb-cards-next]').getAttribute('aria-disabled'),left:s.slides[84].getBoundingClientRect().left,expected:parseFloat(getComputedStyle(s.el).paddingLeft)}));
  assert.equal(result.index,84,`${width}: final review reachable`);assert(Math.abs(result.left-result.expected)<2,`${width}: final review aligned`);
 }
 await page.waitForTimeout(50);
 const progress=await page.locator('[data-tdb-cards-progress] > span').evaluate(n=>({width:parseFloat(n.style.width),x:parseFloat(n.style.transform.match(/[-\d.]+/)[0])}));
 assert(Math.abs(progress.width-400/85)<.01);assert(Math.abs(progress.x-(400-400/85))<1,'progress ends at total, not batch');
 await page.locator('[data-tdb-cards-next]').click({force:true});assert.equal(await page.evaluate(()=>s.activeIndex),84);
 await page.locator('.tdb-review-cards_slide').nth(84).locator('[data-tdb-cards-open]').click();assert.equal(await page.evaluate(()=>opened),'review-85');
 await page.evaluate(()=>instance.destroy());assert.equal(await page.locator('.tdb-review-cards_slide').count(),8);assert.match(await page.locator('[data-cards-render="name"]').first().textContent(),/Native/);
 // The drawer may already have all records cached. Cards still reveal eight at a time.
 await page.evaluate(()=>{mount();s=document.querySelector('[data-tdb-cards-viewport]').swiper;s.params.speed=0;});assert.equal(await page.locator('.tdb-review-cards_slide').count(),8);
 await page.evaluate(()=>s.slideTo(4,0));await page.waitForFunction(()=>s.slides.length===16);
 assert.equal(await page.evaluate(()=>loads),5);assert.deepEqual(errors,[]);
 console.log('PASS: finite navigation, eight-card batches across 20-record pages, final partial batch, mid-animation append, retry, 8 viewport sizes, drawer identity, native restoration and cached batches');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

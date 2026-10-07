/* Published Designer markup and real CMS/drawer integration. Staging only. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage'],proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
 try{
 const url=process.env.TDB_TEST_URL||'https://dentalbarns.webflow.io/?review-cards-check=28db8e7';
 const context=await browser.newContext({ignoreHTTPSErrors:true,hasTouch:true,viewport:{width:1440,height:1000}});
 await context.addCookies([{name:'CookieScriptConsent',value:encodeURIComponent(JSON.stringify({action:'reject',categories:[]})),url}]);
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  return ['dentalbarns.webflow.io','cdn.prod.website-files.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com','d3e54v103j8qbb.cloudfront.net'].includes(u.hostname)?route.continue():route.abort();
 });
 const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/review-content'))requests.push(r.url())});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 console.log('page loaded; native cards',await page.locator('[data-tdb-cards-track] > .tdb-review-cards_slide').count());
 await page.locator('[data-tdb-review-cards]').scrollIntoViewIfNeeded();
 try{await page.waitForFunction(()=>document.querySelector('[data-tdb-cards-viewport]')?.swiper&&window.TDBReviewCards?.version==='2.0.0',{},{timeout:45000});}
 catch(e){console.log(await page.evaluate(()=>({loader:window.TDBReviewLoader?.status(),cards:window.TDBReviewCards?.version,modules:window.TDBModules?.version,swiper:window.TDBSwiper?.version,status:document.querySelector('[data-tdb-cards-status]')?.textContent,scripts:[...document.scripts].map(n=>n.src).filter(s=>/review|swiper|modules/.test(s))})));throw e;}
 await page.waitForFunction(()=>!document.querySelector('[data-tdb-cards-viewport]').swiper.animating);
 assert.equal(await page.locator('[data-tdb-cards-track] > .tdb-review-cards_slide').count(),20);
 console.log('mounted',await page.evaluate(()=>({version:TDBReviewCards.version,count:document.querySelector('[data-tdb-cards-total]').textContent,loop:document.querySelector('[data-tdb-cards-viewport]').swiper.params.loop})),requests.length);
 const geometry=()=>page.evaluate(()=>{
  const root=document.querySelector('[data-tdb-review-cards]'),v=root.querySelector('[data-tdb-cards-viewport]'),s=v.swiper,card=s.slides[s.activeIndex].querySelector('.tdb-review-cards_card'),mark=root.querySelector('.tdb-review-cards_fixed-mark'),nav=root.querySelector('[data-tdb-cards-navigation]'),more=card.querySelector('[data-tdb-cards-open]');
  const c=card.getBoundingClientRect(),m=mark.getBoundingClientRect(),n=nav.getBoundingClientRect(),a=more.getBoundingClientRect();
  return {width:innerWidth,index:s.activeIndex,card:{left:c.left,width:c.width,height:c.height},mark:{left:m.left,width:m.width},nav:{left:n.left,width:n.width},actionInside:a.bottom<=c.bottom&&a.top>=c.top,bodyWidth:document.documentElement.scrollWidth,opacity:getComputedStyle(s.slides[s.activeIndex]).opacity,neighbourOpacity:getComputedStyle(s.slides[s.activeIndex+1]||s.slides[0]).opacity};
 });
 for(const [width,height]of[[1440,1000],[1024,768],[768,1024],[744,1133],[844,390],[667,375],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  const g=await geometry();console.log('geometry',JSON.stringify(g));
  assert(Math.abs(g.card.width-g.mark.width)<2,'quote width matches card');assert(Math.abs(g.card.left-g.mark.left)<2,'quote aligns to card');assert(Math.abs(g.card.width-g.nav.width)<2,'navigation width matches card');assert(g.actionInside,'read more inside card');
 }
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(300);
 await page.locator('[data-tdb-review-cards]').screenshot({path:'/workspace/scratch/5a79b01f3709/review-cards-desktop.png'});
 const cdp=await context.newCDPSession(page);
 const point=await page.evaluate(()=>{const r=document.querySelector('.tdb-review-cards_slide.swiper-slide-active').getBoundingClientRect();return{x:r.left+r.width*.8,y:r.top+130};});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
 for(const delta of [20,60,110,170,230,300]){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-delta,y:point.y}]});await page.waitForTimeout(30);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>{const s=document.querySelector('[data-tdb-cards-viewport]').swiper;return s.activeIndex===1&&!s.animating;});
 console.log('native cards touch swipe passed');
 await page.locator('[data-tdb-cards-next]').click();await page.waitForFunction(()=>!document.querySelector('[data-tdb-cards-viewport]').swiper.animating);
 assert(await page.evaluate(()=>document.documentElement.classList.contains('tdb-slider-focus')),'shared focus moves chrome away');
 const id=await page.evaluate(()=>{const s=document.querySelector('[data-tdb-cards-viewport]').swiper;return s.slides[s.activeIndex].dataset.reviewId;});
 await page.locator('.tdb-review-cards_slide.swiper-slide-active [data-tdb-cards-open]').click();
 await page.waitForFunction(()=>document.querySelector('[data-tdb-reviews-slider]')?.swiper);
 await page.waitForFunction(id=>{const s=document.querySelector('[data-tdb-reviews-slider]')?.swiper;return s?.slides[s.activeIndex]?.dataset.tdbReviewId===id;},id,{timeout:30000});
 console.log('selected review opened in existing drawer',id);
 await page.locator('[data-tdb-drawer]:has([data-tdb-reviews]) [data-tdb-drawer-close]').first().click();
 await page.waitForFunction(()=>!document.querySelector('[data-tdb-reviews]').closest('[data-tdb-drawer]').classList.contains('is-open'));
 for(const [index,count]of[[14,40],[34,60],[54,80],[74,85]]){
  await page.evaluate(index=>{const s=document.querySelector('[data-tdb-cards-viewport]').swiper;s.params.speed=0;s.slideTo(index,0);},index);
  await page.waitForFunction(count=>document.querySelector('[data-tdb-cards-viewport]').swiper.slides.length===count,count);
  console.log('live CMS batch',count);
 }
 await page.evaluate(()=>document.querySelector('[data-tdb-cards-viewport]').swiper.slideTo(84,0));
 assert.equal(await page.locator('[data-tdb-cards-next]').getAttribute('aria-disabled'),'true');
 assert.equal(await page.locator('.tdb-review-cards_slide.swiper-slide-active').getAttribute('data-review-rating'),'1');
 console.log('last review reached at 85, one star, no wrap');
 console.log('page errors',errors);
 assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

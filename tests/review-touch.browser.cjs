/* Staged native review drawer: touch-start stability and reading geometry.
 * TDB_TEST_URL defaults to staging; TDB_CHROMIUM selects a local test browser.
 * Set TDB_REVIEW_SOURCE to preview an unpublished drawer module.
 */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.TDB_CHROMIUM,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const url=process.env.TDB_TEST_URL||'https://dentalbarns.webflow.io/';
 await context.addCookies([{name:'CookieScriptConsent',value:encodeURIComponent(JSON.stringify({action:'reject',categories:[]})),url}]);
 await context.route('**/*',route=>{
  const target=new URL(route.request().url());
  if(process.env.TDB_REVIEW_SOURCE&&target.pathname.endsWith('/tdb-reviews.js'))return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.env.TDB_REVIEW_SOURCE,'utf8')});
  return [new URL(url).hostname,'cdn.prod.website-files.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com','d3e54v103j8qbb.cloudfront.net'].includes(target.hostname)?route.continue():route.abort();
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.TDBReviewLoader&&window.TDBModules);
 await page.evaluate(async()=>{await TDBReviewLoader.prepare();await TDBReviewLoader.open({trigger:document.querySelector('[data-tdb-review-introduction]')});});
 const settled=()=>page.waitForFunction(()=>{const s=document.querySelector('[data-tdb-reviews-slider]').swiper;return !s.animating&&+getComputedStyle(s.slides[s.activeIndex].querySelector('[data-review-render=excerpt]')).opacity>.995;});
 await settled();
 const geometry=()=>page.evaluate(()=>{
  const s=document.querySelector('[data-tdb-reviews-slider]').swiper,mark=document.querySelector('[data-tdb-review-static-mark]'),slide=s.slides[s.activeIndex],rect=mark.getBoundingClientRect(),space=slide.querySelector('.tdb-review-drawer_mark-space').getBoundingClientRect();
  return {index:s.activeIndex,marks:document.querySelectorAll('[data-tdb-review-static-mark]').length,parent:mark.parentElement.className,top:rect.top,spaceTop:space.top,left:rect.left,width:rect.width,opacity:+getComputedStyle(mark).opacity,scroll:slide.querySelector('[data-tdb-review-scroll]').scrollTop,coarse:matchMedia('(pointer:coarse)').matches};
 });
 const initial=await geometry();assert.equal(initial.marks,1);assert(Math.abs(initial.top-initial.spaceTop)<.75);console.log('ready',initial);
 await page.evaluate(()=>{window.markMoves=0;const mark=document.querySelector('[data-tdb-review-static-mark]');new MutationObserver(records=>{for(const r of records)if([...r.addedNodes,...r.removedNodes].includes(mark))markMoves++;}).observe(document.querySelector('[data-tdb-reviews]'),{subtree:true,childList:true});});
 const cdp=await context.newCDPSession(page);
 const points=async(list,end='touchEnd')=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:list[0],y:320}]});for(const x of list.slice(1)){await page.waitForTimeout(25);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:320}]});}await cdp.send('Input.dispatchTouchEvent',{type:end,touchPoints:[]});};
 await points([295,289,280,260,235,260,280,292]);await settled();assert.equal(await page.evaluate(()=>markMoves),0,'SVG must not be reparented on first drag or settlement');
 const cancelled=await geometry();assert(Math.abs(cancelled.top-initial.top)<.75);assert.equal(cancelled.opacity,1);console.log('cancelled drag stable');
 await points([310,275,225,170,110,60]);await settled();assert.equal(await page.evaluate(()=>markMoves),0);const swiped=await geometry();assert(Math.abs(swiped.top-swiped.spaceTop)<.75);console.log('full swipe stable',swiped.index);
 await page.evaluate(()=>{const s=document.querySelector('[data-tdb-reviews-slider]').swiper;s.slides[s.activeIndex].querySelector('[data-tdb-review-scroll]').scrollTop=60;});await page.waitForTimeout(100);const scrolled=await geometry();assert(Math.abs(scrolled.top-scrolled.spaceTop)<.75);assert(Math.abs(scrolled.top-(swiped.top-scrolled.scroll))<.75);console.log('portrait reading offset',scrolled.scroll);
 await page.locator('[data-tdb-reviews-next]').click();await settled();const clicked=await geometry();assert(Math.abs(clicked.top-clicked.spaceTop)<.75);console.log('arrow handoff stable',clicked.index);
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);let land=await geometry();assert(land.coarse);assert(Math.abs(land.top-land.spaceTop)<.75,'Landscape quote alignment');
 await page.evaluate(()=>{document.querySelector('[data-tdb-review-reading-pane]').scrollTop=90});await page.waitForTimeout(150);land=await geometry();assert(Math.abs(land.top-land.spaceTop)<.75,'Landscape reading alignment');console.log('landscape reading stable');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-tdb-reviews-next]').click();await settled();assert.equal((await geometry()).marks,1);assert.equal(await page.evaluate(()=>markMoves),0);assert.deepEqual(errors,[]);console.log('reduced motion and single SVG passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

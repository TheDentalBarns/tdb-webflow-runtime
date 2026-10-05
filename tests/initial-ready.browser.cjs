/* Verify the actual native page with local runtime overrides, or the published
 * staging release (TDB_INITIAL_MODE=live). No cached responses in live mode.
 */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..'),live=process.env.TDB_INITIAL_MODE==='live';
const baseline=process.env.TDB_INITIAL_BASELINE||'/tmp/tdb-initial-ready-baseline';
const out=process.env.TDB_INITIAL_RESULTS||'/tmp/tdb-initial-ready-results';fs.mkdirSync(out,{recursive:true});
const cache='/tmp/tdb-nav-http-cache';
const hosts=['dentalbarns.webflow.io','cdn.prod.website-files.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com','d3e54v103j8qbb.cloudfront.net'];
const local=/^tdb-(navbar-loader\.js|navbar\.min\.js|ui\.css|vimeo-loader\.js|vimeo\.css|reviews-loader\.js|reviews\.js)$/;
(async()=>{
 const b=await chromium.launch({executablePath:process.env.TDB_CHROMIUM||'/tmp/tdb-review-touch/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const width of [390,1440]){
  const ctx=await b.newContext({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390,ignoreHTTPSErrors:true});
  const requests=[],errors=[];
  // Exercise both decisions without a third-party consent dialog covering the menu.
  await ctx.addInitScript(()=>{window.testAction='';window.CookieScript={instance:{currentState:()=>({action:window.testAction,categories:[]}),show:()=>{window.testPrompts=(window.testPrompts||0)+1}}};});
  await ctx.route('**/*',async r=>{
   const u=r.request().url(),url=new URL(u),file=path.basename(url.pathname);requests.push(u);
   if(/tdb-consent\.js|tdb-cookie-consent/.test(u))return r.abort();
   if(!hosts.includes(url.hostname))return r.abort();
   if(live)return r.continue();
   if(r.request().isNavigationRequest()&&url.hostname==='dentalbarns.webflow.io'&&url.pathname==='/'){
    let html=fs.readFileSync(path.join(baseline,'home.html'),'utf8').replace(/tdb-navbar\.min\.js"/g,'tdb-navbar-loader.js"');
    html=html.replace(/<link\b[^>]*href="[^"]*\/tdb-ui\.css"[^>]*>/g,m=>m.replace('<link','<link data-tdb-ui-css'));
    return r.fulfill({contentType:'text/html',body:html});
   }
   if(local.test(file))return r.fulfill({contentType:file.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(path.join(repo,'dist',file))});
   const key=path.join(cache,crypto.createHash('sha256').update(u).digest('hex'));
   if(fs.existsSync(key)){const x=JSON.parse(fs.readFileSync(key));delete x.headers['content-encoding'];delete x.headers['content-length'];if(x._encoded){x.body=Buffer.from(x.body,'base64');delete x._encoded;}return r.fulfill(x);}
   try{const response=await r.fetch({timeout:45000}),body=await response.body();if(response.ok())fs.writeFileSync(key,JSON.stringify({status:response.status(),headers:response.headers(),body:body.toString('base64'),_encoded:true}));return r.fulfill({response,body});}catch{return r.abort();}
  });
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto('https://dentalbarns.webflow.io/',{waitUntil:'domcontentloaded',timeout:90000});
  await p.waitForFunction(()=>window.TDBNavbarLoader&&window.jQuery?.data(document.querySelector('.w-nav'),'.w-nav'));
  await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
  assert(!requests.some(u=>u.endsWith('/tdb-navbar.min.js')),'No enhancement request before a decision');
  assert(!requests.some(u=>u.endsWith('/tdb-vimeo.css')),'Shared UI avoids a second Vimeo stylesheet');
  assert(!requests.some(u=>u.includes('player.vimeo.com')),'No Vimeo request before functionality permission');
  assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--tdb-vimeo-ui-ready').trim()),'1');
  const toggle=p.locator(width===390?'.navbar10_menu-button':'.navbar10_dropdown-toggle').first();
  await toggle.click();await p.waitForTimeout(150);
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  const text=p.locator(width===390?'.navbar10_menu-left':'.navbar10_dropdown-content-left').first();
  assert.equal(await text.evaluate(e=>getComputedStyle(e).opacity),'1','Fallback menu text immediately visible');
  await p.screenshot({path:path.join(out,`${width}-fallback.png`)});
  await p.evaluate(action=>{window.testAction=action;document.cookie='CookieScriptConsent='+encodeURIComponent(JSON.stringify({action,categories:[]}))+'; path=/';dispatchEvent(new Event(action==='reject'?'CookieScriptReject':'CookieScriptAcceptAll'));},width===390?'reject':'accept');
  await p.waitForFunction(()=>TDBNavbarLoader.status().waitingForClose);
  assert.equal(await p.evaluate(()=>!!window.TDBNavbar),false,'No animation adoption halfway through an open menu');
  await p.keyboard.press('Escape');await p.waitForFunction(()=>TDBNavbarLoader.status().ready&&window.TDBNavbar);
  await p.waitForTimeout(400);
  assert.equal(await p.locator('[data-tdb-navbar-fallback]').count(),0);
  await toggle.click();await p.waitForTimeout(1400);
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  assert.equal(await text.evaluate(e=>getComputedStyle(e).opacity),'1');
  await p.screenshot({path:path.join(out,`${width}-enhanced.png`)});
  await p.keyboard.press('Escape');await p.waitForTimeout(1400);
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  if(width===390){await toggle.click();await toggle.click({force:true});await p.waitForTimeout(1400);assert.equal(await toggle.getAttribute('aria-expanded'),'true');await p.keyboard.press('Escape');await p.waitForTimeout(1400);}
  else{await toggle.focus();await p.keyboard.press('Enter');await p.waitForTimeout(1400);assert.equal(await toggle.getAttribute('aria-expanded'),'true');await p.locator('.tdb-desktop-nav-backdrop').click({position:{x:10,y:820}});await p.waitForTimeout(1400);assert.equal(await toggle.getAttribute('aria-expanded'),'false');}
  // Proximity prepares the intro; viewport/idle downloads drawer code only.
  await p.waitForFunction(()=>window.TDBReviewLoader);
  assert.equal(await p.evaluate(()=>TDBReviewLoader.status().prepared),false,'No hidden drawer mount at load');
  const intro=p.locator('[data-tdb-review-introduction]').first();await intro.scrollIntoViewIfNeeded();
  await p.waitForFunction(()=>TDBReviewLoader.status().instances>0);await p.waitForTimeout(600);
  assert.equal(await p.evaluate(()=>TDBReviewLoader.status().prepared),false,'Visible intro does not mount drawer');
  const trigger=intro.locator('[data-tdb-review-trigger]').first();await trigger.click();
  await p.waitForFunction(()=>document.querySelector('[data-tdb-reviews-slider]')?.swiper&&!document.querySelector('[data-tdb-reviews]').hidden);
  await p.waitForTimeout(1000);
  assert.equal(await p.evaluate(()=>TDBReviewLoader.status().prepared),true);
  const slider=()=>p.evaluate(()=>document.querySelector('[data-tdb-reviews-slider]').swiper.activeIndex);
  const start=await slider();await p.locator('[data-tdb-reviews-next]').click();await p.waitForTimeout(1200);assert.notEqual(await slider(),start,'Review next still navigates');
  await p.screenshot({path:path.join(out,`${width}-reviews.png`)});
  await p.keyboard.press('Escape');await p.waitForTimeout(1000);
  await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(600);
  await p.setViewportSize({width:width===390?844:390,height:width===390?390:844});await p.waitForTimeout(500);
  assert.equal(await p.evaluate(()=>document.documentElement.hasAttribute('data-tdb-nav-basic-open')),false);
  assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('tdb-desktop-nav-locked')),false);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,`${width}.json`),JSON.stringify({live,requests,errors},null,2));
  console.log('PASS',width,'native fallback, consent gates, closed-menu handoff, motion, keyboard, rapid taps, review intro/drawer, responsive lock cleanup');
  await ctx.close();
 }}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

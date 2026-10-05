/* Real published consent UI and review filter integration; third-party requests
 * are recorded but blocked. Vimeo streaming is covered separately by SDK tests.
 */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.TDB_CHROMIUM||'/tmp/tdb-review-touch/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const decision of (process.env.TDB_DECISIONS||'reject,accept').split(',')){
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,ignoreHTTPSErrors:true}),requests=[];
  await ctx.route('**/*',r=>{const u=r.request().url();requests.push(u);return ['dentalbarns.webflow.io','cdn.prod.website-files.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com','d3e54v103j8qbb.cloudfront.net'].includes(new URL(u).hostname)?r.continue():r.abort();});
  const p=await ctx.newPage();await p.goto('https://dentalbarns.webflow.io/',{waitUntil:'domcontentloaded',timeout:90000});
  await p.locator('#tdb-consent-root').waitFor({state:'visible',timeout:60000});
  await p.waitForFunction(()=>window.TDBNavbarLoader&&window.CookieScript?.instance);
  assert(!requests.some(u=>u.endsWith('/tdb-navbar.min.js')));assert(!requests.some(u=>u.includes('player.vimeo.com')));
  await p.locator(decision==='reject'?'#cookiescript_reject':'#cookiescript_accept').click();
  await p.waitForFunction(()=>window.TDBNavbarLoader.status().ready);
  assert.equal(await p.evaluate(()=>CookieScript.instance.currentState().action),decision);
  await p.locator('.navbar10_menu-button').click();await p.waitForTimeout(1300);
  await p.locator('.navbar10_dropdown-toggle').first().click();await p.waitForTimeout(400);assert.equal(await p.locator('.navbar10_dropdown-toggle').first().getAttribute('aria-expanded'),'true');
  await p.keyboard.press('Escape');await p.waitForTimeout(1300);
  assert.equal(await p.locator('.navbar10_dropdown-toggle').first().getAttribute('aria-expanded'),'false');
  if(await p.locator('.navbar10_menu-button').getAttribute('aria-expanded')==='true')await p.locator('.navbar10_menu-button').click();
  await p.waitForTimeout(1300);
  if(decision==='reject'){
   assert(!requests.some(u=>u.includes('player.vimeo.com')));
   const intro=p.locator('[data-tdb-review-introduction]').first();await intro.scrollIntoViewIfNeeded();await p.waitForFunction(()=>TDBReviewLoader.status().instances>0);
   await intro.locator('[data-tdb-review-trigger]').first().click();await p.waitForTimeout(1200);
   const toggle=p.locator('[data-tdb-filter-toggle]').first();await toggle.click();await p.waitForTimeout(900);assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   await p.waitForFunction(()=>document.querySelector('[data-tdb-filter-group="rating"][data-tdb-filter-value="5"]')?.disabled===false,{},{timeout:60000});
   const disclosure=p.locator('[data-tdb-filter-disclosure="rating"]');if(await disclosure.count())await disclosure.click();
   const rating=p.locator('[data-tdb-filter-group="rating"][data-tdb-filter-value="5"]');await rating.click();await p.waitForTimeout(500);assert.equal(await rating.getAttribute('aria-checked'),'true');
   const reset=p.locator('[data-tdb-filter-reset]');await reset.click();await p.waitForTimeout(500);assert.equal(await rating.getAttribute('aria-checked'),'false');
   await p.locator('[data-tdb-filter-apply]').click();await p.waitForTimeout(1000);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   await p.keyboard.press('Escape');await p.waitForTimeout(700);console.log('PASS real reject, nested menu, review filters/select/reset/apply');
  }else{
   await p.waitForFunction(()=>TDBVimeoLoader.status().ready);
   assert(requests.some(u=>u.includes('player.vimeo.com')),'Acceptance releases Vimeo');console.log('PASS real accept and Vimeo permission handoff');
  }
  await p.reload({waitUntil:'domcontentloaded',timeout:90000});await p.waitForFunction(()=>TDBNavbarLoader.status().ready);
  assert.equal(await p.evaluate(()=>window.CookieScript?.instance?.currentState()?.action||JSON.parse(decodeURIComponent(document.cookie.split('; ').find(v=>v.startsWith('CookieScriptConsent=')).split('=').slice(1).join('='))).action),decision);
  console.log('PASS saved',decision,'reload');await ctx.close();
 }}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

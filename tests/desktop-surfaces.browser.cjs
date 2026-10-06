const {chromium}=require('playwright'), fs=require('fs'), assert=require('assert/strict');
const sp=require(process.env.TDB_CHROMIUM_PACKAGE||'/tmp/tdb-browser/node_modules/@sparticuz/chromium');
const live=process.env.TDB_SURFACE_LIVE==='1';
const css=`.navbar10_dropdown-list.is-dropdown-clear{background-color:transparent;backdrop-filter:none}.navbar10_dropdown-list.is-dropdown-frosted{background-color:var(--_tdb-navbar---menu-glass);backdrop-filter:saturate(150%) blur(20px)}.navbar10_dropdown-list.is-dropdown-solid{background-color:var(--base-color-brand--orange-1);backdrop-filter:saturate(150%) blur(20px)}.navbar10_dropdown-list.is-dropdown-solid-clear{background-color:var(--base-color-brand--orange-1);backdrop-filter:none}`;
(async()=>{
 const b=await chromium.launch({executablePath:process.env.TDB_CHROMIUM||'/tmp/chromium',args:sp.args,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
 try {
 const p=await b.newPage({viewport:{width:1440,height:900},ignoreHTTPSErrors:true});
 await p.context().addCookies([{name:'CookieScriptConsent',value:encodeURIComponent(JSON.stringify({action:'reject',categories:[]})),domain:'dentalbarns.webflow.io',path:'/'}]);
 if(!live) await p.route('**/dist/tdb-navbar.min.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('dist/tdb-navbar.min.js')}));
 const result=[];
 for(const path of ['/','/contact']) {
 await p.goto('https://dentalbarns.webflow.io'+path,{waitUntil:'domcontentloaded',timeout:90000});
 if(!live) await p.addStyleTag({content:css});
 await p.waitForFunction(()=>window.TDBNavMotion?.surfaceEasing,{},{timeout:60000});
 await p.mouse.move(1400,850);await p.waitForTimeout(800);
 const transparent=await p.locator('.navbar10_component').getAttribute('transparent-nav');
 for(const scrolled of [false,true]) {
 if(scrolled){await p.evaluate(()=>scrollTo(0,900));await p.waitForTimeout(300);await p.evaluate(()=>scrollTo(0,500));await p.waitForTimeout(700);}
 for(let i=0;i<2;i++) {
 const toggle=p.locator('.navbar10_dropdown-toggle').nth(i), panel=p.locator('.navbar10_dropdown-list').nth(i);
 await toggle.click();await p.waitForTimeout(50);
 const snap=await panel.evaluate(e=>({classes:e.className,frames:e.getAnimations().map(a=>({frames:a.effect.getKeyframes(),timing:a.effect.getTiming()})),bg:getComputedStyle(e).backgroundColor,blur:getComputedStyle(e).backdropFilter}));
 const surface=snap.frames.find(a=>a.frames[0].backgroundColor!==undefined);assert(surface,'surface animation exists');
 const clear=transparent==='true'&&!scrolled;
 assert.equal(surface.frames[0].backdropFilter,clear?'none':'saturate(1.5) blur(20px)');
 assert.equal(surface.frames.at(-1).backgroundColor,'rgb(249, 242, 230)');
 assert.equal(surface.timing.easing,'cubic-bezier(0.4, 0, 0.2, 1)');
 await p.waitForTimeout(1000);assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 await p.keyboard.press('Escape');await p.waitForTimeout(60);
 assert.equal(await panel.getAttribute('data-tdb-desktop-panel'),'closing');
 assert(await panel.evaluate(e=>e.getBoundingClientRect().height>0),'appearance held during close');
 await p.waitForTimeout(1000);assert.equal(await panel.getAttribute('data-tdb-desktop-panel'),null);
 assert(!await panel.evaluate(e=>/is-dropdown-/.test(e.className)),'surface cleaned');
 console.log('cycle',path,scrolled,i);result.push({path,scrolled,i,from:surface.frames[0],to:surface.frames.at(-1),duration:surface.timing.duration});
 }
 }
 // Switch and reverse while motion is running.
 const toggles=p.locator('.navbar10_dropdown-toggle');
 await toggles.nth(0).click();await p.waitForTimeout(70);await toggles.nth(1).click();await p.waitForTimeout(70);await toggles.nth(1).click();await p.waitForTimeout(70);await toggles.nth(0).click();await p.waitForTimeout(1200);
 assert.equal(await toggles.nth(0).getAttribute('aria-expanded'),'true');
 assert.equal(await p.locator('[data-tdb-desktop-panel]').count(),1);
 await p.keyboard.press('Escape');await p.waitForTimeout(1000);
 await toggles.nth(0).focus();await p.keyboard.press('Enter');await p.waitForTimeout(1000);
 assert.equal(await toggles.nth(0).getAttribute('aria-expanded'),'true');
 await p.locator('.tdb-desktop-nav-backdrop').click({position:{x:10,y:850}});await p.waitForTimeout(1000);
 assert.equal(await toggles.nth(0).getAttribute('aria-expanded'),'false');
 for(const width of [1024,1280,1920]) {await p.setViewportSize({width,height:900});await toggles.nth(0).click();await p.waitForTimeout(1200);console.log('width',path,width,await toggles.nth(0).getAttribute('aria-expanded'),await p.locator('.navbar10_dropdown-list').first().getAttribute('data-tdb-desktop-panel'));assert.equal(await p.locator('[data-tdb-desktop-panel="open"]').count(),1);await p.keyboard.press('Escape');await p.waitForTimeout(900);}
 await toggles.nth(0).click();await p.waitForTimeout(70);await p.setViewportSize({width:390,height:844});await p.waitForTimeout(900);
 assert.equal(await p.locator('[data-tdb-desktop-panel]').count(),0);assert.equal(await p.locator('[class*="is-dropdown-"]').count(),0);
 assert(!await p.evaluate(()=>document.documentElement.classList.contains('tdb-desktop-nav-locked')));
 await p.setViewportSize({width:1440,height:900});
 }
 fs.writeFileSync('/tmp/tdb-desktop-surfaces-'+(live?'live':'preview')+'.json',JSON.stringify(result,null,2));console.log('PASS',live?'staging':'preview',result.length,'surface cycles; switching, interruptions, keyboard, outside close, widths, mobile resize');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

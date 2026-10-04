// Run with node tests/shared-filters.browser.cjs (Playwright Chromium required).
const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({...(process.env.TDB_CHROMIUM?{executablePath:process.env.TDB_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage();await page.setContent(`<style>.is-closed,.is-collapsed{display:none}.group{padding-bottom:0}.group.is-expanded{padding-bottom:14px}</style><button id="toggle">Filters</button><span id="badge" class="is-empty">0</span><button id="close">Main close</button><button id="behind">Underlying action</button><section id="panel" class="is-closed"><h2 tabindex="-1">Filters</h2><div class="group"><button id="disclosure">Category</button><div id="options" class="is-collapsed">Options</div></div></section><div id="shade" class="is-closed"></div>`);
 const root=path.resolve(__dirname,'..');for(const file of ['motion','filters'])await page.addScriptTag({path:path.join(root,'src/shared/'+file+'.js')});
 await page.evaluate(()=>{
 const by=id=>document.getElementById(id);window.changes=[];window.commits=0;window.underlying=0;window.errors=[];
 window.config={toggle:by('toggle'),backdrop:by('shade'),heading:document.querySelector('h2'),badge:by('badge'),blockedControls:[by('close')],escapeRoot:document.body,
 disclosures:[{key:'category',button:by('disclosure'),body:by('options')}],onChange:value=>changes.push(value),beforeClose:()=>{commits++;return new Promise(resolve=>window.finishCommit=resolve);},onError:e=>errors.push(e.message)};
 window.api=TDBFilters.mount(by('panel'),config);window.same=api===TDBFilters.mount(by('panel'),config);by('behind').addEventListener('click',()=>underlying++);
 });
 assert(await page.evaluate(()=>same));await page.locator('#toggle').click();assert(await page.evaluate(()=>api.isOpen));assert(await page.locator('#close').evaluate(n=>n.inert));
 await page.locator('#disclosure').click();const frames=await page.locator('.group').evaluate(n=>n.getAnimations().flatMap(a=>a.effect.getKeyframes()).map(k=>k.paddingBottom));assert(frames.includes('14px'));
 await page.locator('#toggle').click();await page.locator('#toggle').click();assert.equal(await page.evaluate(()=>commits),1);await page.evaluate(()=>finishCommit(false));await page.waitForTimeout(20);assert(await page.evaluate(()=>api.isOpen));
 await page.locator('#behind').click();await page.evaluate(()=>finishCommit(true));await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>underlying),0);assert.equal(await page.evaluate(()=>api.isOpen),false);
 await page.locator('#toggle').click();await page.evaluate(()=>{api.requestClose();});await page.waitForTimeout(10);await page.evaluate(()=>{window.stale=finishCommit;api.destroy();window.api=TDBFilters.mount(document.getElementById('panel'),config);stale(true);});await page.waitForTimeout(20);
 assert.equal(await page.locator('#close').evaluate(n=>n.inert),false);assert.equal(await page.evaluate(()=>api.isOpen),false);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#toggle').click();assert.equal(await page.evaluate(()=>api.isOpen),true);assert.equal(await page.locator('#panel').evaluate(n=>n.getAnimations({subtree:true}).length),0);await page.evaluate(()=>{api.setCount(3);api.destroy();});assert.equal(await page.locator('#badge').textContent(),'0');assert.equal(await page.locator('#toggle').getAttribute('aria-expanded'),null);assert.equal(await page.locator('#options').getAttribute('aria-controls'),null);assert.equal(await page.locator('#close').getAttribute('aria-disabled'),null);assert.deepEqual(await page.evaluate(()=>errors),[]);
 console.log('PASS generic panel, idempotent mount, measured native spacer, failed/duplicate/stale close, outside isolation, teardown/remount and reduced motion');
 // Multiple release URLs converge on the page's shared pin, even while loading.
 const registry=await browser.newPage(),requests=[];
 await registry.route('https://test.invalid/**',r=>r.fulfill({contentType:'text/html',body:'<script data-tdb-reviews-loader src="https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@current/dist/tdb-reviews-loader.js" type="application/json"></script>'}));
 await registry.goto('https://test.invalid/');await registry.addScriptTag({path:path.join(root,'src/shared/modules.js')});
 await registry.route('https://cdn.jsdelivr.net/**',r=>{requests.push(r.request().url());return r.fulfill({contentType:'text/javascript',body:'window.loadedCount=(window.loadedCount||0)+1;'});});
 await registry.evaluate(()=>Promise.all(['old','new'].map(pin=>TDBModules.load('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@'+pin+'/dist/tdb-filters.js'))));
 assert.deepEqual(requests,['https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@current/dist/tdb-filters.js']);assert.equal(await registry.evaluate(()=>loadedCount),1);
 console.log('PASS shared registry deduplicates concurrent differently pinned filters');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

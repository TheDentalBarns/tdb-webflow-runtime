/* Exercise the real Webflow page. Optional preview mode supplies the new runtime
   and native-style fixture against an unchanged staging HTML checkpoint. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const mode=process.env.TDB_NAV_MODE||'live';
const out=process.env.TDB_NAV_RESULTS||'/tmp/tdb-nav-check';fs.mkdirSync(out,{recursive:true});
const cacheDir='/tmp/tdb-nav-http-cache';fs.mkdirSync(cacheDir,{recursive:true});
const crypto=require('node:crypto');
const allowed=new Set(['dentalbarns.webflow.io','cdn.prod.website-files.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com','d3e54v103j8qbb.cloudfront.net']);
let activeBrowser;
const cases=process.env.TDB_NAV_CASES?.split(',')||['mobile','desktop','landscape'];
(async()=>{
 const browser=activeBrowser=await chromium.launch({executablePath:process.env.TDB_CHROMIUM||'/tmp/tdb-review-touch/chromium',proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const results={mode,cases:{}};
 for(const name of cases){
  const viewport=name==='desktop'?{width:1440,height:900}:name==='landscape'?{width:390,height:844}:{width:390,height:844};
  const context=await browser.newContext({viewport,isMobile:name!=='desktop',hasTouch:name!=='desktop',ignoreHTTPSErrors:true});
  if(!process.env.TDB_NAV_ISOLATE)await context.addCookies([{name:'CookieScriptConsent',value:encodeURIComponent(JSON.stringify({action:'reject',categories:[]})),domain:'dentalbarns.webflow.io',path:'/'}]);
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(process.env.TDB_NAV_ISOLATE&&/CookieScript|tdb-cookie-consent|tdb-footer-runtime|tdb-consent\.js/.test(req.url()))return route.abort();
   if(!allowed.has(url.hostname)||req.method()!=='GET')return route.abort();
   if(mode!=='live'&&req.isNavigationRequest()&&url.hostname==='dentalbarns.webflow.io'){
    const file=url.pathname==='/location'?'location.html':url.pathname==='/contact'?'contact.html':'home.html';
    let html=fs.readFileSync('/tmp/tdb-nav-audit/'+file,'utf8');
    if(mode==='preview'){
     const old=fs.readFileSync('/tmp/tdb-nav-audit/global-head.html','utf8').trim();
     const replacement=fs.readFileSync('/tmp/tdb-nav-head-after.html','utf8');
     assert(html.includes(old),'Global head checkpoint must match');html=html.replace(old,replacement);
     html=html.replace('<style data-tdb-navbar-motion-anchor>','<style>'+fs.readFileSync(path.join(root,'tests/fixtures/navbar-native.css'),'utf8')+'</style><style data-tdb-navbar-motion-anchor>');
     const nav=/<div\b[^>]*class="[^"]*navbar10_component[^>]*>/;
     assert(nav.test(html));html=html.replace(nav,m=>m+'<div class="tdb-desktop-nav-backdrop" aria-hidden="true"></div>');
    }
    return route.fulfill({status:200,contentType:'text/html',body:html});
   }
   if(mode==='preview'&&/\/dist\/tdb-(navbar|footer-runtime)\.min\.js$/.test(url.pathname))return route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(path.join(root,'dist',path.basename(url.pathname)))});
   const key=path.join(cacheDir,crypto.createHash('sha256').update(req.url()).digest('hex'));
   if(fs.existsSync(key)){const item=JSON.parse(fs.readFileSync(key,'utf8'));delete item.headers['content-encoding'];delete item.headers['content-length'];if(item._encoded){item.body=Buffer.from(item.body,'base64');delete item._encoded;}return route.fulfill(item);}
   try{const response=await route.fetch({timeout:60000});const body=await response.body();const item={status:response.status(),headers:response.headers(),body:body.toString('base64'),isBase64:true};
    // File cache uses a base64 marker handled on subsequent runs below.
    if(response.ok())fs.writeFileSync(key,JSON.stringify({status:item.status,headers:item.headers,body:body.toString('base64'),_encoded:true}));
    await route.fulfill({response,body});
   }catch{await route.abort();}
  });
  // Correct the binary-safe cached response handler without altering real assets.
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__navWheel=new Set();const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
   EventTarget.prototype.addEventListener=function(type,fn,options){if(this===document&&type==='wheel'&&options?.passive===false&&new Error().stack.includes('/tdb-navbar.min.js'))window.__navWheel.add(fn);return add.call(this,type,fn,options);};
   EventTarget.prototype.removeEventListener=function(type,fn,options){if(this===document&&type==='wheel')window.__navWheel.delete(fn);return remove.call(this,type,fn,options);};
  });
  await page.goto('https://dentalbarns.webflow.io'+(process.env.TDB_NAV_PATH||'/'),{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.TDBNavMotion&&window.Webflow?.require?.('navbar')&&window.jQuery?.data?.(document.querySelector('.w-nav'),'.w-nav'),{},{timeout:60000});
  await page.mouse.move(viewport.width-5,viewport.height-5);
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);
  const snapshots={};
  async function snap(label){
   snapshots[label]=await page.evaluate(()=>{
    const pick=s=>[...document.querySelectorAll(s)].map(e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return {class:e.className,rect:[r.x,r.y,r.width,r.height].map(n=>Math.round(n*100)/100),css:Object.fromEntries(['display','opacity','color','backgroundColor','backdropFilter','transform','visibility','fontSize','padding','position','transition','animation'].map(p=>[p,c[p]])),expanded:e.getAttribute('aria-expanded')};});
    return {nav:pick('.navbar10_component'),glass:pick('.tdb-nav-bar-glass'),menu:pick('.navbar10_menu'),line:pick('.navbar_line'),button:pick('.navbar10_menu-button'),logo:pick('.navbar10_logo'),icon:pick('.menu-icon5'),dropdown:pick('.navbar10_dropdown-list'),texts:pick('.navbar10_menu-left,.navbar10_dropdown-content-left'),clock:window.TDBNavMotion.current,config:window.jQuery.data(document.querySelector('.w-nav'),'.w-nav').config.duration,htmlOverflow:getComputedStyle(document.documentElement).overflow,bodyOverflow:getComputedStyle(document.body).overflow,lenis:document.body.getAttribute('data-lenis-prevent'),desktopCSS:document.querySelectorAll('[data-tdb-desktop-dropdowns]').length,wheel:window.__navWheel.size,backdrops:document.querySelectorAll('.tdb-desktop-nav-backdrop').length,navVersion:window.TDBNavbar?.version};
   });
   await page.screenshot({path:path.join(out,`${mode}-${name}-${label}.png`)});
   results.cases[name]={snapshots,errors};fs.writeFileSync(path.join(out,`${mode}.json`),JSON.stringify(results,null,2));
  }
  const settle=()=>page.waitForTimeout(1400);
  if(name==='landscape'){await page.locator('.navbar10_menu-button').click();await settle();await page.setViewportSize({width:844,height:390});await settle();await snap('rotated-open');await page.keyboard.press('Escape');await settle();await snap('rotated-closed');results.cases[name]={snapshots,errors};fs.writeFileSync(path.join(out,`${mode}.json`),JSON.stringify(results,null,2));await context.close();console.log('landscape rotation complete');continue;}
  await snap('closed');
  const toggle=name==='desktop'?page.locator('.navbar10_dropdown-toggle').first():page.locator('.navbar10_menu-button');
  await toggle.click();await settle();await snap('open');
  assert.equal(await toggle.getAttribute('aria-expanded'),'true',name+' opens');
  await page.keyboard.press('Escape');await page.mouse.move(viewport.width-5,viewport.height-5);await settle();await snap('escape');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false',name+' Escape closes');
  await page.evaluate(()=>scrollTo(0,1600));await page.waitForTimeout(600);await page.evaluate(()=>scrollTo(0,1150));await page.waitForTimeout(700);await snap('scrolled');
  if(process.env.TDB_NAV_PATH==='/contact'&&name==='desktop'){await page.evaluate(()=>scrollTo(0,0));await settle();}
  await toggle.click();await settle();await snap('scrolled-open');
  await toggle.click();await settle();await snap('scrolled-closed');
  if(name==='mobile'){
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(650);await toggle.click();await toggle.click({force:true});await settle();
   assert.equal(await toggle.getAttribute('aria-expanded'),'true','Rapid second tap must not interrupt opening');
   await page.keyboard.press('Escape');await settle();
  }
  if(mode!=='baseline'){
   if(name==='desktop'){await toggle.focus();await page.keyboard.press('Enter');await settle();assert.equal(await toggle.getAttribute('aria-expanded'),'true');await page.locator('.tdb-desktop-nav-backdrop').click({position:{x:10,y:viewport.height-20}});await settle();assert.equal(await toggle.getAttribute('aria-expanded'),'false','Outside click closes dropdown');}
   const wheelBefore=await page.evaluate(()=>window.__navWheel.size);
   await page.addScriptTag({content:fs.readFileSync(path.join(root,'dist/tdb-navbar.min.js'),'utf8')});
   assert.equal(await page.locator('[data-tdb-navbar-state]').count(),1,'Repeated module load must not duplicate state stylesheet');
   assert.equal(await page.evaluate(()=>window.__navWheel.size),wheelBefore);

   const unchanged=await page.evaluate(()=>{let writes=0;const observer=new MutationObserver(ms=>writes+=ms.length);observer.observe(document.documentElement,{attributes:true,attributeFilter:['style']});for(let i=0;i<50;i++)window.TDBNavMotion.refresh();return new Promise(resolve=>queueMicrotask(()=>{observer.disconnect();resolve(writes);}));});assert.equal(unchanged,0,'Unchanged clock must not rewrite root styles');
   await page.setViewportSize({width:1200,height:800});await page.waitForTimeout(800);assert.equal(await page.locator('[data-tdb-desktop-dropdowns]').count(),1);
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(800);assert.equal(await page.locator('[data-tdb-desktop-dropdowns]').count(),0);assert.equal(await page.evaluate(()=>window.__navWheel.size),0);
   assert.equal(await page.locator('.tdb-desktop-nav-backdrop').count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('tdb-desktop-nav-locked')),false);
  }
  results.cases[name]={snapshots,errors};fs.writeFileSync(path.join(out,`${mode}.json`),JSON.stringify(results,null,2));
  console.log(name,'complete',errors.length?'page errors: '+errors.join('; '):'no page errors');await context.close();
 }
 await browser.close();
})().catch(async e=>{console.error(e);await activeBrowser?.close();process.exitCode=1;});

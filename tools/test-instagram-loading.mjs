import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
const raw=process.env.HTTPS_PROXY||process.env.HTTP_PROXY,p=raw?new URL(raw):null,proxy=p?{server:p.origin,...(p.username?{username:decodeURIComponent(p.username),password:decodeURIComponent(p.password)}:{})}:undefined;
const browser=await chromium.launch({executablePath:process.env.TDB_CHROMIUM_EXECUTABLE||'/tmp/tdb-browser/chromium',args:['--no-sandbox','--disable-dev-shm-usage'],headless:true,proxy});
const repo=new URL('../',import.meta.url).pathname;
const output=process.env.TDB_IG_TEST_OUTPUT||'/tmp/tdb-instagram-loading';
await mkdir(output,{recursive:true});
const live=process.argv.includes('--live');
const mode=process.argv.includes('--failure')?'failure':process.argv.includes('--nojs')?'nojs':'normal';
const script=await readFile(repo+'dist/tdb-instagram-native.min.js','utf8');
const gallery=await readFile(repo+'dist/tdb-gallery.js','utf8');
const gate=await readFile(repo+'src/instagram/loading-head.html','utf8');
async function run(width){
 const context=await browser.newContext({viewport:{width,height:950},ignoreHTTPSErrors:true,javaScriptEnabled:mode!=='nojs'});
 const page=await context.newPage(),requests=new Set(),errors=[];
 page.on('request',r=>{if(r.resourceType()==='image')requests.add(r.url());});
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR '+e.message);});
 page.on('requestfailed',r=>{if(r.url().includes('tdb-'))console.log('FAILED '+r.url()+' '+r.failure()?.errorText);});
 await page.addInitScript(()=>{
  window.igWaste={mirroredSlides:0,forwarding:0};
  const observe=MutationObserver.prototype.observe;
  MutationObserver.prototype.observe=function(node,options){
   if(node.matches?.('[data-ig-slide]')&&options.subtree&&options.attributeFilter?.includes('aria-expanded'))igWaste.mirroredSlides++;
   return observe.call(this,node,options);
  };
  const listen=EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener=function(type,fn,options){
   if(this instanceof Element&&this.matches('[data-tdb-ig-native]')&&['mouseover','mouseout'].includes(type)&&(options===true||options?.capture))igWaste.forwarding++;
   return listen.call(this,type,fn,options);
  };
 });
 const cdp=await context.newCDPSession(page),network=[];await cdp.send('Network.enable');cdp.on('Network.requestWillBeSent',e=>{if(e.type==='Image')network.push(e);});
 if(!live)await page.route('https://dentalbarns.webflow.io/**',async route=>{
  if(!route.request().isNavigationRequest())return route.continue();
  const response=await route.fetch();
  await route.fulfill({response,body:(await response.text()).replace('</head>',gate+'<style>[data-tdb-ig-native]{column-gap:2rem}@media(max-width:991px){[data-tdb-ig-native]{column-gap:2vw}}</style></head>')});
 });
 if(!live)await page.route(/\/tdb-gallery\.js$/,route=>route.fulfill({contentType:'text/javascript',body:gallery}));
 if(!live||mode==='failure')await page.route(/\/tdb-instagram-native(?:\.min)?\.js$/,route=>mode==='failure'?route.abort():route.fulfill({contentType:'text/javascript',body:script}));
 await page.goto('https://dentalbarns.webflow.io/?ig-loading-check='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
 const root=page.locator('[data-tdb-ig-native="awards"]');
 if(!live)await root.locator('[data-ig-field="alt"],[data-ig-field="id"]').evaluateAll(nodes=>nodes.forEach(n=>n.remove()));
 const urls=await root.locator('.ig-native_photo').evaluateAll(nodes=>nodes.map(n=>n.src));
 const photoRequests=()=>[...requests].filter(url=>urls.includes(url));
 if(mode==='nojs'){
  await root.scrollIntoViewIfNeeded();await page.waitForTimeout(1500);
  assert.ok(await root.locator('.ig-native_photo').first().isVisible());
  assert.ok(photoRequests().length>0);
  await context.close();return{width,mode,requests:photoRequests().length,fallbackVisible:true};
 }
 if(mode!=='failure')await page.waitForFunction(()=>window.TDBInstagramNative?.version==='2.1.2',null,{timeout:30000});
 await page.locator('#cookiescript_reject').click({timeout:30000});
 await page.locator('#tdb-consent-root').waitFor({state:'hidden'});
 assert.equal(photoRequests().length,0,'No IG photos at top of page');
 await root.evaluate(r=>{r.__shareTick=r.querySelector('[data-ig-metric="shares"]').firstElementChild;});
 await root.scrollIntoViewIfNeeded();
 if(mode==='failure'){
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-tdb-ig-loading'),null,{timeout:18000});
  await page.waitForTimeout(1000);
  assert.ok(await root.locator('.ig-native_photo').first().isVisible());
  assert.ok(photoRequests().length>0);
  await context.close();return{width,mode,requests:photoRequests().length,fallbackVisible:true};
 }
 const settled=()=>page.waitForFunction(()=>{const r=document.querySelector('[data-tdb-ig-native]'),s=r.querySelector('[data-ig-viewport]').swiper;return r.dataset.tdbIgReady==='2.1.2'&&s&&!s.animating&&r.getAttribute('data-tdb-slider-first-view')!=='pending'},null,{timeout:30000});
 try{await settled();}catch(error){console.log('MOUNT FAILURE '+JSON.stringify(await root.evaluate(r=>({attrs:r.outerHTML.slice(0,700),swiper:!!r.querySelector('[data-ig-viewport]').swiper,modules:!!window.TDBModules,gallery:!!window.TDBGallery,scripts:[...document.scripts].filter(s=>s.src.includes('tdb-')).map(s=>s.src)})))+' ERRORS '+JSON.stringify(errors));throw error;}await page.waitForTimeout(1500);
 const initial=photoRequests().length,expected=width>=992?5:3;
 const state=await root.evaluate(r=>({guard:document.documentElement.hasAttribute('data-tdb-ig-loading'),label:r.querySelector('[data-ig-label]').textContent,loaded:[...r.querySelectorAll('[data-ig-slide][data-ig-image-ready]')].map(x=>x.dataset.igIndex),fallback:r.hasAttribute('data-ig-loading-fallback')}));
 console.log(JSON.stringify({width,initial,expected,state,indices:photoRequests().map(url=>urls.indexOf(url))}));
 await writeFile(output+'/debug-'+width+'.json',JSON.stringify({network:network.filter(e=>urls.includes(e.request.url)),images:await root.locator('[data-ig-slide] img').evaluateAll(nodes=>nodes.map(n=>({src:n.src,loading:n.loading,display:getComputedStyle(n).display,slide:n.closest('[data-ig-slide]').outerHTML.slice(0,500)})))},null,2));
 assert.equal(initial,expected,'Exact initial image window');
 assert.equal(state.label,'Post 1 of 16');
 assert.equal(state.fallback,false);
 assert.equal(await root.evaluate(r=>r.__shareTick===r.querySelector('[data-ig-metric="shares"]').firstElementChild),true,'No empty share-count ticker');
 await page.screenshot({path:output+'/initial-'+width+'.png'});
 await root.locator('[data-ig-next]').click();await settled();await page.waitForTimeout(600);
 assert.equal(await root.locator('[data-ig-label]').textContent(),'Post 2 of 16');
 assert.equal(photoRequests().length,expected+1,'One additional neighbour per next');
 await root.locator('[data-ig-prev]').focus();await page.keyboard.press('Enter');await settled();
 assert.equal(await root.locator('[data-ig-label]').textContent(),'Post 1 of 16');
 assert.equal(photoRequests().length,expected+1,'Reverse reuses downloaded photos');
 async function remount(stage){
  const result=await root.evaluate(r=>{
   const api=TDBInstagramNative.mount(r);api.destroy();api.destroy();
   const clean={ready:r.querySelectorAll('[data-ig-image-ready]').length,eager:r.querySelectorAll('[data-ig-slide] img[loading="eager"]').length,parked:r.querySelectorAll('[data-ig-src]').length,originals:r.querySelectorAll('[data-ig-slide]').length};
   const next=TDBInstagramNative.mount(r);
   return{clean,slides:next.swiper.slides.length,same:TDBInstagramNative.mount(r)===next,fallback:r.hasAttribute('data-ig-loading-fallback')};
  });
  assert.deepEqual(result.clean,{ready:0,eager:0,parked:0,originals:16},stage+' teardown');
  assert.equal(result.same,true);assert.equal(result.fallback,false);
  await settled();await page.waitForTimeout(700);
  const ready=await root.locator('[data-ig-slide][data-ig-image-ready] img').evaluateAll(ns=>ns.map(n=>({src:n.getAttribute('src'),complete:n.complete&&n.naturalWidth>0})));
  assert.ok(ready.length>0&&ready.every(n=>n.src&&n.complete),stage+' remount images');
  assert.equal(await root.locator('[data-ig-label]').textContent(),'Post 1 of 16');
 }
 await remount('partial');
 const waste=await page.evaluate(()=>igWaste);assert.deepEqual(waste,{mirroredSlides:0,forwarding:0});
 assert.equal(await root.locator('[data-share-url]').count(),0);
 await root.evaluate(r=>{const s=r.querySelector('[data-ig-viewport]').swiper;window.igExtraUpdates=0;const update=s.update;s.update=function(...args){igExtraUpdates++;return update.apply(this,args);};});
 for(const size of [1300,991,768,390,992,1440]){
  await page.setViewportSize({width:size,height:950});await page.waitForTimeout(180);
  const gap=await root.evaluate(r=>({native:parseFloat(getComputedStyle(r).columnGap),swiper:r.querySelector('[data-ig-viewport]').swiper.params.spaceBetween}));
  assert.ok(Math.abs(gap.native-gap.swiper)<0.05,JSON.stringify({size,gap}));
 }
 assert.equal(await page.evaluate(()=>igExtraUpdates),0,'No secondary full Swiper update on resize');
 // Cross the breakpoint, then exercise all loop positions without changing markup.
 await page.setViewportSize({width:width<992?1440:390,height:950});
 await page.waitForTimeout(500);
 for(let i=0;i<16;i++){
  await page.evaluate(()=>document.querySelector('[data-ig-viewport]').swiper.slideNext(0));
  await page.waitForTimeout(80);
 }
 await settled();await page.waitForTimeout(1000);
 assert.equal(photoRequests().length,16,'Every post remains reachable');
 const broken=await root.locator('[data-ig-slide][data-ig-image-ready] img').evaluateAll(nodes=>nodes.filter(n=>!n.complete||!n.naturalWidth).map(n=>n.src));
 assert.deepEqual(broken,[],'Main images and reflections complete');
 const final=await root.locator('[data-ig-label]').textContent();assert.equal(final,'Post 1 of 16');
 await remount('fully loaded');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async url=>{window.igCopied=url;}}}));
 await root.locator('[data-ig-action="shares"]').click();
 assert.equal(await page.evaluate(()=>igCopied),await root.locator('[data-ig-post-link]').getAttribute('href'),'Share still uses current post');
 const edge=await root.evaluate(r=>{
  const api=TDBInstagramNative.mount(r);api.destroy();
  const originals=[...r.querySelectorAll('[data-ig-slide]')],track=r.querySelector('[data-ig-track]');
  originals.slice(1).forEach(n=>n.remove());
  const single=TDBInstagramNative.mount(r),singleState={posts:single.posts,loop:single.swiper.params.loop,ready:r.querySelectorAll('[data-ig-image-ready]').length};
  single.destroy();single.destroy();
  originals[0].remove();TDBInstagramNative.mount(r);
  const empty=r.querySelector('.ig-native_frame').classList.contains('is-frame-empty');
  delete r.dataset.tdbIgReady;originals.forEach(n=>track.append(n));TDBInstagramNative.mount(r);
  return{singleState,empty};
 });
 assert.deepEqual(edge,{singleState:{posts:1,loop:false,ready:1},empty:true});
 assert.deepEqual(errors,[]);
 await context.close();return{width,initial,next:expected+1,total:16,final,errors};
}
try{const results=await Promise.all((mode==='normal'?[390,1440]:[390]).map(run));await writeFile(output+'/'+(live?'live-':'preview-')+mode+'.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}

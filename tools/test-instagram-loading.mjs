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
const script=await readFile(repo+'src/instagram/native.js','utf8');
const gate=await readFile(repo+'src/instagram/loading-head.html','utf8');
async function run(width){
 const context=await browser.newContext({viewport:{width,height:950},ignoreHTTPSErrors:true,javaScriptEnabled:mode!=='nojs'});
 const page=await context.newPage(),requests=new Set(),errors=[];
 page.on('request',r=>{if(r.resourceType()==='image')requests.add(r.url());});
 page.on('pageerror',e=>errors.push(e.message));
 const cdp=await context.newCDPSession(page),network=[];await cdp.send('Network.enable');cdp.on('Network.requestWillBeSent',e=>{if(e.type==='Image')network.push(e);});
 if(!live)await page.route('https://dentalbarns.webflow.io/**',async route=>{
  if(!route.request().isNavigationRequest())return route.continue();
  const response=await route.fetch();
  await route.fulfill({response,body:(await response.text()).replace('</head>',gate+'</head>')});
 });
 if(!live||mode==='failure')await page.route('**/tdb-instagram-native.js',route=>mode==='failure'?route.abort():route.fulfill({contentType:'text/javascript',body:script}));
 await page.goto('https://dentalbarns.webflow.io/?ig-loading-check='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
 const root=page.locator('[data-tdb-ig-native="awards"]');
 const urls=await root.locator('.ig-native_photo').evaluateAll(nodes=>nodes.map(n=>n.src));
 const photoRequests=()=>[...requests].filter(url=>urls.includes(url));
 if(mode==='nojs'){
  await root.scrollIntoViewIfNeeded();await page.waitForTimeout(1500);
  assert.ok(await root.locator('.ig-native_photo').first().isVisible());
  assert.ok(photoRequests().length>0);
  await context.close();return{width,mode,requests:photoRequests().length,fallbackVisible:true};
 }
 if(mode!=='failure')await page.waitForFunction(()=>window.TDBInstagramNative?.version==='2.1.0',null,{timeout:30000});
 await page.locator('#cookiescript_reject').click({timeout:30000});
 await page.locator('#tdb-consent-root').waitFor({state:'hidden'});
 assert.equal(photoRequests().length,0,'No IG photos at top of page');
 await root.scrollIntoViewIfNeeded();
 if(mode==='failure'){
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-tdb-ig-loading'),null,{timeout:18000});
  await page.waitForTimeout(1000);
  assert.ok(await root.locator('.ig-native_photo').first().isVisible());
  assert.ok(photoRequests().length>0);
  await context.close();return{width,mode,requests:photoRequests().length,fallbackVisible:true};
 }
 const settled=()=>page.waitForFunction(()=>{const r=document.querySelector('[data-tdb-ig-native]'),s=r.querySelector('[data-ig-viewport]').swiper;return r.dataset.tdbIgReady==='2.1.0'&&s&&!s.animating&&r.getAttribute('data-tdb-slider-first-view')!=='pending'},null,{timeout:30000});
 await settled();await page.waitForTimeout(1500);
 const initial=photoRequests().length,expected=width>=992?5:3;
 const state=await root.evaluate(r=>({guard:document.documentElement.hasAttribute('data-tdb-ig-loading'),label:r.querySelector('[data-ig-label]').textContent,loaded:[...r.querySelectorAll('[data-ig-slide][data-ig-image-ready]')].map(x=>x.dataset.igIndex),fallback:r.hasAttribute('data-ig-loading-fallback')}));
 console.log(JSON.stringify({width,initial,expected,state,indices:photoRequests().map(url=>urls.indexOf(url))}));
 await writeFile(output+'/debug-'+width+'.json',JSON.stringify({network:network.filter(e=>urls.includes(e.request.url)),images:await root.locator('[data-ig-slide] img').evaluateAll(nodes=>nodes.map(n=>({src:n.src,loading:n.loading,display:getComputedStyle(n).display,slide:n.closest('[data-ig-slide]').outerHTML.slice(0,500)})))},null,2));
 assert.equal(initial,expected,'Exact initial image window');
 assert.equal(state.label,'Post 1 of 16');
 assert.equal(state.fallback,false);
 await page.screenshot({path:output+'/initial-'+width+'.png'});
 await root.locator('[data-ig-next]').click();await settled();await page.waitForTimeout(600);
 assert.equal(await root.locator('[data-ig-label]').textContent(),'Post 2 of 16');
 assert.equal(photoRequests().length,expected+1,'One additional neighbour per next');
 await root.locator('[data-ig-prev]').focus();await page.keyboard.press('Enter');await settled();
 assert.equal(await root.locator('[data-ig-label]').textContent(),'Post 1 of 16');
 assert.equal(photoRequests().length,expected+1,'Reverse reuses downloaded photos');
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
 assert.deepEqual(errors,[]);
 await context.close();return{width,initial,next:expected+1,total:16,final,errors};
}
try{const results=await Promise.all((mode==='normal'?[390,1440]:[390]).map(run));await writeFile(output+'/'+(live?'live-':'preview-')+mode+'.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}

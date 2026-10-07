/* Shared opacity-only contract: no transform/layout writes; parser-time reload. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const motion=read('dist/tdb-motion.js'),memory=read('src/page-break/memory.js');
const fixture=`<!doctype html><style>html,body{margin:0;overflow-anchor:none}.hero{height:100vh;position:relative}.video{position:absolute;inset:0}.gap{height:200vh}</style>
<script>${memory}</script>
<header class="hero" data-tdb-page-break="hero" data-tdb-parallax-mode="opacity" data-tdb-parallax-fade-start=".5" data-tdb-parallax-fade-end=".85"><div data-tdb-parallax-fade=".25">Native content</div><div class="video" data-tdb-parallax-fade=".6"><img loading="lazy" alt="poster"></div></header>
<div class="gap"></div><script>${motion};window.mount=()=>window.pb=TDBMotion.pageBreaks(document.querySelectorAll('[data-tdb-page-break]'));</script>`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.TDB_TEST_CHROMIUM||'/tmp/tdb-chromium',args:['--no-sandbox','--disable-gpu']});
 try{for(const viewport of [{width:1440,height:900},{width:834,height:1112},{width:667,height:375},{width:390,height:844}]){
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fixture.test/**',r=>r.fulfill({contentType:'text/html',body:fixture}));
  const tick=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const opacity=()=>page.locator('[data-tdb-parallax-fade]').evaluateAll(ns=>ns.map(n=>+getComputedStyle(n).opacity));
  const scroll=async(y,user=true)=>{await page.evaluate(({y,user})=>{if(user)dispatchEvent(new WheelEvent('wheel'));scrollTo(0,y)},{y,user});await tick()};
  await page.goto('https://fixture.test/');assert.deepEqual(await opacity(),[1,1]);await page.evaluate(()=>mount());await tick();assert.deepEqual(await opacity(),[1,1]);
  await scroll(viewport.height*.35);const half=await opacity();assert(Math.abs(half[0]-.625)<.002);assert(Math.abs(half[1]-.8)<.002);
  await page.waitForTimeout(80);assert.deepEqual(await opacity(),half,'no idle animation');
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')));await page.reload();await tick();assert.deepEqual(await opacity(),half,'restored before controller');
  await scroll(viewport.height*.35,false);await page.evaluate(()=>mount());await tick();assert.deepEqual(await opacity(),half,'late scroll restoration retained');
  await scroll(viewport.height*.7);const ends=await opacity();assert(Math.abs(ends[0]-.25)<.002);assert(Math.abs(ends[1]-.6)<.002);
  assert.equal(await page.locator('.hero').evaluate(n=>getComputedStyle(n).transform),'none');assert.equal(await page.locator('img').getAttribute('loading'),'lazy');
  await page.setViewportSize({...viewport,height:viewport.height+20});await tick();assert.deepEqual(await opacity(),ends,'resize retains painted state');
  await page.evaluate(()=>pb.destroy());assert.deepEqual(await opacity(),[1,1]);
  await page.goto('https://fixture.test/?fresh');await scroll(viewport.height*.35,false);await page.evaluate(()=>mount());await tick();assert.deepEqual(await opacity(),[1,1],'late mount keeps native state');await scroll(viewport.height*.4);assert((await opacity())[0]<1);
  assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}x${viewport.height}: independent endpoints, native start, reload, late mount, resize, no transforms, lazy poster, teardown.`);await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

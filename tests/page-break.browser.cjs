const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../dist/tdb-motion.js'), 'utf8');
const fixture = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;font-size:16px;overflow-anchor:none} .space{height:1400px}
.page-break-wrapper{position:relative;display:flex;overflow:hidden;width:100%;height:50vh;align-items:center;justify-content:center}
.tdb-page-break-image{display:block;object-fit:cover;width:100%;height:55vh;min-height:calc(100% + 4vh);flex-shrink:0}
@media(max-width:767px){.page-break-wrapper{height:15rem}}
@media(max-width:479px){.page-break-wrapper{height:30vh}.tdb-page-break-image{height:35vh}}
</style><div class="space" id="before"></div>
<div class="page-break-wrapper" data-tdb-page-break><img class="tdb-page-break-image" alt="Flower fixture"></div>
<div class="space"></div><div class="page-break-wrapper" data-tdb-page-break><img class="tdb-page-break-image" alt="Headphones fixture"></div><div class="space"></div>`;

(async () => {
 const browser = await chromium.launch({executablePath:process.env.TDB_TEST_CHROMIUM || '/tmp/tdb-chromium',args:['--no-sandbox','--disable-gpu']});
 try {
  for (const viewport of [{width:1440,height:900},{width:834,height:1112},{width:667,height:375},{width:390,height:844}]) {
   const page = await browser.newPage({viewport});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(fixture);
   await page.addScriptTag({content:source});
   const tick = () => page.evaluate(() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const read = () => page.evaluate(() => [...document.querySelectorAll('[data-tdb-page-break]')].map(w=>{
    const n=w.querySelector('img'),a=w.getBoundingClientRect(),b=n.getBoundingClientRect();
    const matrix=getComputedStyle(n).transform;return{y:matrix==='none'?0:new DOMMatrixReadOnly(matrix).m42,top:a.top,bottom:a.bottom,height:a.height,imageTop:b.top,imageBottom:b.bottom};
   }));
   const scroll = async (y, user=true) => {await page.evaluate(({y,user})=>{if(user)window.dispatchEvent(new WheelEvent('wheel',{deltaY:y-window.scrollY}));window.scrollTo(0,y)},{y,user});await tick();};
   const mount = async () => {await page.evaluate(()=>{window.pb=TDBMotion.pageBreaks(document.querySelectorAll('[data-tdb-page-break]'));});await tick();};
   const status = () => page.evaluate(()=>pb.status());
   const close = (a,b,message) => assert(Math.abs(a-b)<.03,`${message}: ${a} / ${b}`);
   const coverage = rows => rows.forEach(r=>{assert(r.imageTop<=r.top+.03,'top crop covers wrapper');assert(r.imageBottom>=r.bottom-.03,'bottom crop covers wrapper');});

   // Already-visible on load: mounting and waiting cannot move the image.
   const start=1400-viewport.height*.2;
   await scroll(start,false);const initial=await read();await mount();
   close((await read())[0].y,initial[0].y,'visible mount is stationary');
   await page.waitForTimeout(150);close((await read())[0].y,initial[0].y,'no timed startup movement');
   assert((await status())[0].correcting);
   await scroll(start+120);const forward=(await read())[0].y;
   assert.notEqual(forward,initial[0].y,'scroll corrects the initial offset');
   const stopped=(await read())[0].y;await page.waitForTimeout(100);close((await read())[0].y,stopped,'no movement after scroll stops');
   const secondBefore=(await read())[1].y;
   await scroll(start+119);assert(Math.abs((await read())[0].y-forward)<.16,'direction reversal is continuous');
   close((await read())[1].y,secondBefore,'first image cannot move second image');
   coverage(await read());

   // End of first pass clears the correction; revisiting follows normal path.
   const height=(await read())[0].height;
   await scroll(1400+height+5);assert.equal((await status())[0].correcting,false);
   await scroll(start);const revisit=await read();
   const p=(viewport.height-revisit[0].top)/(viewport.height+revisit[0].height);
   close(revisit[0].y,viewport.height*.02*(2*p-1),'return pass uses normal parallax');coverage(revisit);

   // Re-mount at the lower part, reverse and exit upwards instead.
   await page.evaluate(()=>pb.destroy());await scroll(1400+height*.6,false);await mount();
   const upStart=await page.evaluate(()=>scrollY);await scroll(upStart-100);await scroll(1400-viewport.height-5);
   assert.equal((await status())[0].correcting,false,'upward first exit also clears correction');
   await scroll(start);assert.equal((await status())[0].correcting,false);

   // Simulate late browser restoration without any user input: preserve the
   // off-screen starting transform when that image becomes visible.
   await page.evaluate(()=>pb.destroy());await scroll(0,false);await mount();
   const offscreen=(await read())[0].y;
   await scroll(start,false);close((await read())[0].y,offscreen,'late restoration does not snap');
   await scroll(start+120);assert.notEqual((await read())[0].y,offscreen);

   // A layout shift, lazy-image load and pageshow cannot run a startup tween.
   const beforeShift=(await read())[0].y;
   await page.evaluate(()=>{document.querySelector('#before').style.height='1420px';});await tick();
   close((await read())[0].y,beforeShift,'layout rebase preserves transform');
   await page.evaluate(()=>document.querySelector('img').dispatchEvent(new Event('load')));await tick();
   close((await read())[0].y,beforeShift,'lazy-image arrival is stationary');
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await tick();
   close((await read())[0].y,beforeShift,'back-forward restoration is stationary');
   await page.setViewportSize({width:viewport.width,height:viewport.height+30});await tick();
   close((await read())[0].y,beforeShift,'viewport change preserves visible transform');coverage(await read());

   // Repeated clients do not duplicate listeners or tear down the live owner.
   await page.evaluate(()=>{window.pb2=TDBMotion.pageBreaks(document.querySelectorAll('[data-tdb-page-break]'));pb.destroy();});
   const beforeShared=(await read())[0].y;await scroll(start+220);assert.notEqual((await read())[0].y,beforeShared,'second client keeps controller active');
   await page.evaluate(()=>{pb2.destroy();pb2.destroy();});
   assert.deepEqual(await page.locator('img').evaluateAll(ns=>ns.map(n=>n.style.transform)),['','']);
   assert.deepEqual(errors,[]);
   console.log(`PASS ${viewport.width}x${viewport.height}: visible/offscreen load, restored scroll, bidirectional first pass, independence, stop, layout, resize, lazy load, BFCache, cleanup.`);
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

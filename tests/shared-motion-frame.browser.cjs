const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.env.TDB_MOTION_SOURCE || path.join(__dirname, '../dist/tdb-motion.js'), 'utf8');
const fixture = `<!doctype html><style>
html,body{margin:0;overflow-anchor:none}.space{height:800px}.tail{height:2000px}
.dd{height:80px;opacity:.8}.break{height:240px;overflow:hidden;position:relative}
.image{height:280px;width:100%;position:absolute;top:-20px;background:tan}
#nested{position:fixed;right:0;top:0;width:100px;height:200px;overflow:auto}
#nested .space{height:80px}#nested .tail{height:400px}
</style><div class="space"></div><div class="dd" id="dd"></div>
<div class="break" id="p1"><div class="image" data-tdb-page-break-image id="i1"></div></div>
<div class="break" id="p2"><div class="image" data-tdb-page-break-image id="i2"></div></div>
<div class="tail"></div><div id="nested"><div class="space"></div><div class="dd" id="dd2"></div><div class="tail"></div></div>`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.TDB_TEST_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport,reducedMotion:'reduce'}), errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(fixture);
   await page.evaluate(()=>{
    window.framesForTest=new Map();let id=0;
    window.requestAnimationFrame=fn=>{framesForTest.set(++id,fn);return id;};
    window.cancelAnimationFrame=id=>framesForTest.delete(id);
    window.eventsForTest=[];window.recordForTest=false;
    for(const node of document.querySelectorAll('.dd,.break,.image,#nested')){
     const rect=node.getBoundingClientRect.bind(node);
     node.getBoundingClientRect=()=>{if(recordForTest)eventsForTest.push('R:'+node.id);return rect();};
     for(const property of ['opacity','transform'])Object.defineProperty(node.style,property,{
      get:()=>node.style.getPropertyValue(property),
      set:value=>{if(recordForTest)eventsForTest.push('W:'+node.id);node.style.setProperty(property,value);}
     });
    }
    window.flushForTest=()=>{
     eventsForTest=[];recordForTest=true;
     const batch=[...framesForTest.values()];framesForTest.clear();
     batch.forEach(fn=>fn(performance.now()));recordForTest=false;
     return {callbacks:batch.length,events:eventsForTest.slice()};
    };
    window.scrollTo(0,700);
   });
   await page.addScriptTag({content:source});
   await page.evaluate(()=>{
    window.dd=TDBMotion.ddText([document.getElementById('dd')]);
    window.localDD=TDBMotion.ddRegion([document.getElementById('dd2')],{root:document.getElementById('nested')});
    window.pb1=TDBMotion.pageBreaks([document.getElementById('p1')]);
    window.pb2=TDBMotion.pageBreaks([document.getElementById('p2')]);
   });
   const flush=()=>page.evaluate(()=>flushForTest());
   for(let n=0;n<4;n++)await flush();
   assert.equal(await page.evaluate(()=>TDBMotion.reduced.matches),false);
   const read=()=>page.evaluate(()=>({opacity:+document.getElementById('dd').style.opacity,local:+document.getElementById('dd2').style.opacity,p1:pb1.status()[0].y,p2:pb2.status()[0].y}));
   const initial=await read();
   await page.waitForTimeout(350);for(let n=0;n<4;n++)await flush();
   assert.deepEqual(await read(),initial,'waiting at restored position cannot move or fade content');
   await page.evaluate(()=>{
    window.dispatchEvent(new WheelEvent('wheel',{deltaY:100}));scrollTo(0,800);dispatchEvent(new Event('scroll'));
    const nested=document.getElementById('nested');nested.dispatchEvent(new WheelEvent('wheel',{deltaY:40}));nested.scrollTop=40;nested.dispatchEvent(new Event('scroll'));
    pb1.refresh();pb2.refresh();
   });
   const first=await flush();
   assert.equal(first.callbacks,1,'all scroll controllers share one scheduled callback');
   const firstWrite=first.events.findIndex(e=>e.startsWith('W:'));
   assert(firstWrite>0,'the frame must exercise both reads and writes');
   assert(first.events.slice(firstWrite).every(e=>e.startsWith('W:')),'no geometry reads after the first style write: '+first.events.join(','));
   // Let interpolation settle, then verify scroll changes remain effective.
   for(let n=0;n<20;n++)await flush();
   assert.notEqual((await read()).opacity,initial.opacity,'DD responds to user scroll');
   assert.notEqual((await read()).local,initial.local,'nested DD responds to its own scroll');
   await page.evaluate(()=>{dispatchEvent(new WheelEvent('wheel',{deltaY:60}));scrollTo(0,860);dispatchEvent(new Event('scroll'));});
   await flush();assert.notEqual((await read()).p1,initial.p1,'parallax responds to user scroll');
   for(let n=0;n<20;n++)await flush();
   const restored=await read();
   await page.evaluate(()=>{dd.refresh();pb1.refresh();dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));});
   assert.equal((await flush()).callbacks,0,'pagehide cancels pending work');
   await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
   await flush();assert.deepEqual(await read(),restored,'BFCache resume preserves visible states');
   await page.evaluate(()=>{window.ddOther=TDBMotion.ddText([document.getElementById('dd')]);dd.destroy();});
   await page.evaluate(()=>{dispatchEvent(new WheelEvent('wheel',{deltaY:-160}));scrollTo(0,700);dispatchEvent(new Event('scroll'));});
   await flush();assert.notEqual((await read()).opacity,restored.opacity,'second client retains DD ownership');
   await page.evaluate(()=>{ddOther.destroy();localDD.destroy();pb1.destroy();pb2.destroy();});
   assert.equal((await flush()).callbacks,0,'destroy removes all queued motion work');
   assert.deepEqual(await page.locator('.dd').evaluateAll(nodes=>nodes.map(n=>n.style.opacity)),['','']);
   assert.deepEqual(await page.locator('.image').evaluateAll(nodes=>nodes.map(n=>n.style.transform)),['','']);
   assert.deepEqual(errors,[]);
   console.log(`PASS ${viewport.width}x${viewport.height}: one frame, reads before writes, full motion, nested roots, no startup tween, BFCache, shared ownership and cleanup.`);
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

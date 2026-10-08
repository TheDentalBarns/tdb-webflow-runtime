const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.TDB_CHROMIUM,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.setContent('<div id="track" style="width:100px;height:50px;transform:translateX(0);transition:transform 300ms linear"></div>');
  await page.addScriptTag({path:path.join(__dirname,'../src/shared/rendered-progress.js')});
  await page.evaluate(()=>{window.samples=[];window.sampler=TDBRenderedProgress.observe({track:document.querySelector('#track'),paint:()=>samples.push(document.querySelector('#track').getBoundingClientRect().left)});sampler.schedule()});
  await page.waitForTimeout(100);const initial=await page.evaluate(()=>samples.length);
  await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>samples.length),initial,'idle performs no reads');
  await page.evaluate(()=>document.querySelector('#track').style.transform='translateX(300px)');
  await page.waitForTimeout(450);const moved=await page.evaluate(()=>samples);
  assert(moved.some(x=>x>28&&x<288),'CSS compositor movement sampled between endpoints');
  assert(Math.abs(moved.at(-1)-308)<1,'final position painted');
  await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>samples.length),moved.length,'sampling stops after transition');
  await page.evaluate(()=>{const t=document.querySelector('#track');t.style.transition='none';t.style.transform='translateX(50px)'});
  await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>samples.at(-1)),58,'zero-speed update wakes sampler');
  await page.evaluate(()=>{sampler.destroy();document.querySelector('#track').style.transform='translateX(90px)'});
  await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>samples.at(-1)),58,'destroy disconnects sampler');
  console.log('PASS: shared progress idle, compositor movement, settlement, zero-speed and disposal');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

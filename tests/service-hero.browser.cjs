const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const memory = source('src/page-break/memory.js'), motion = source('src/shared/motion.js');
const fixture = `<!doctype html><style>
html,body{margin:0;overflow-anchor:none}.hero{position:relative;height:70vh;overflow:hidden}
.image{position:absolute;top:-2vh;left:0;width:100%;height:80vh;object-fit:cover}
.gradient{position:relative;z-index:5;height:70vh;background:linear-gradient(180deg,#0001,transparent)}
.space{height:2000px}</style><script>${memory}</script>
<div class="hero" data-tdb-page-break="service-hero" data-tdb-parallax-from="0vh" data-tdb-parallax-to="2vh" data-tdb-parallax-fade-start="0.6352941176470588" data-tdb-parallax-fade-end="0.8470588235294118"><div class="gradient" data-tdb-parallax-fade></div><img class="image" src="hero.webp" data-tdb-page-break-image data-tdb-parallax-fade></div><div class="space"></div><script>${motion};window.pb=TDBMotion.pageBreaks(document.querySelectorAll('[data-tdb-page-break]'));</script>`;
(async () => {
 const browser = await chromium.launch({executablePath:process.env.TDB_TEST_CHROMIUM || '/tmp/tdb-chromium',args:['--no-sandbox','--disable-gpu']});
 try { for(const viewport of [{width:1440,height:900},{width:834,height:1112},{width:667,height:375},{width:390,height:844}]) {
  const page = await browser.newPage({viewport}), errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.route('**/*', r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:fixture}):r.abort());
  const tick=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const scroll=async y=>{await page.evaluate(y=>{dispatchEvent(new WheelEvent('wheel'));scrollTo(0,y)},y);await tick()};
  const read=()=>page.evaluate(()=>{const w=document.querySelector('.hero').getBoundingClientRect(),n=document.querySelector('.image'),b=n.getBoundingClientRect();return{...pb.status()[0],opacity:+getComputedStyle(n).opacity,gradient:+getComputedStyle(document.querySelector('.gradient')).opacity,covered:b.top<=w.top+.05&&b.bottom>=w.bottom-.05}});
  await page.goto('https://service-fixture.test');await tick();let value=await read();assert.equal(value.y,0);assert.equal(value.opacity,1);
  await page.waitForTimeout(100);assert.equal((await read()).y,0,'no idle startup movement');
  await scroll(20);value=await read();assert(value.y>0,'first scroll moves immediately');assert(value.covered);assert.equal(value.opacity,1);
  // Original image-height progress: .7 = (view + scroll)/(view + .8view).
  await scroll(Math.round(viewport.height*.26));value=await read();assert(Math.abs(value.opacity-.5)<.01,'original fade midpoint retained');assert.equal(value.opacity,value.gradient);assert(value.covered);
  const saved=value;await page.reload();await tick();value=await read();assert(Math.abs(value.y-saved.y)<.01,'reload retains translation');assert(Math.abs(value.opacity-saved.opacity)<.001,'reload retains opacity');assert.equal(value.gradient,value.opacity);
  await page.waitForTimeout(100);assert(Math.abs((await read()).y-value.y)<.01,'reload idle stable');
  await scroll(Math.round(viewport.height*.8));value=await read();assert.equal(value.opacity,0);assert(Math.abs(value.y-viewport.height*.02)<.01);assert(value.covered);
  await scroll(0);value=await read();assert.equal(value.opacity,1);assert(value.covered);
  await page.evaluate(()=>pb.destroy());assert.equal(await page.$eval('.image',n=>n.style.opacity),'','teardown restores authored opacity after reload');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({viewport,firstPassAndReload:true}));await page.close();
 }} finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

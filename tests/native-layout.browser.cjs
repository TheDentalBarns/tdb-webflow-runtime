const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.TDB_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname,'..');
const css = fs.readFileSync(path.join(__dirname,'native-treatment.css'),'utf8');
const source = fs.readFileSync(path.join(root,'src/sliders/parallax.js'),'utf8');
const cards = Array.from({length:6},(_,i)=>`<div class="swiper-slide tdb-treatment-slide"><div class="tdb-treatment-card"><div class="tdb-treatment-image-wrap"><div class="tdb-treatment-overlay"></div><img class="tdb-treatment-image" data-swiper-parallax-x="30%"></div><div class="tdb-treatment-content"><h3 class="tdb-treatment-title">Treatment ${i+1}</h3><div class="tdb-treatment-copy" data-tdb-service-copy><p class="tdb-treatment-paragraph">Treatment description for the native component geometry test.</p></div><a class="tdb-treatment-source" aria-hidden="true" href="/treatments/test-${i}"></a></div><div class="tdb-treatment-blur"></div></div></div>`).join('');
const html=`<!doctype html><html data-wf-page="677cf86df9952f978d94d8a9"><head><style>*{box-sizing:border-box}body{margin:0}html{font-size:14px}.swiper-wrapper{position:relative;transition-property:transform}.swiper-slide{position:relative}.swiper{touch-action:pan-y} .tdb-service-arrow{width:3rem;height:3rem;pointer-events:auto} ${css}</style></head><body><section id="All-treatments" style="padding:5vw"><h2>Cosmetic dental treatments</h2><p>Native component fixture</p><div class="parallax-swiper_component tdb-treatment-parallax" data-tdb-treatment data-tdb-banner-parallax="native"><div class="swiper tdb-treatment-viewport"><div class="swiper-wrapper tdb-treatment-wrapper">${cards}</div></div><div class="tdb-treatment-controls"><div class="swiper-buttons-wrapper tdb-treatment-buttons"><button class="tdb-service-arrow swiper-btn-prev">Prev</button><button class="tdb-service-arrow swiper-btn-next">Next</button></div></div><div class="tdb-treatment-progress" data-tdb-native-progress><div class="tdb-treatment-marker"></div><div class="tdb-treatment-marker is-wrap"></div></div><div class="tdb-treatment-cta"><a id="native-cta" class="tdb-service-discover" data-tdb-parallax-cta href="/treatments/test-0"><div>Discover Treatment</div><span>→</span></a></div></div></section><div id="following">Following content</div></body></html>`;
async function sample(page){return page.evaluate(()=>Object.fromEntries(['.tdb-treatment-parallax','.tdb-treatment-viewport','.tdb-treatment-cta','.tdb-treatment-controls','.tdb-treatment-progress','#following'].map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return[s,{x:r.x,y:r.y,width:r.width,height:r.height}]})));}
function equalBoxes(before,after,label){for(const s of Object.keys(before))for(const k of ['x','y','width','height'])assert(Math.abs(before[s][k]-after[s][k])<0.02,`${label} ${s} ${k}: ${before[s][k]} -> ${after[s][k]}`);}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.TDB_TEST_CHROMIUM||'/tmp/tdb-chromium',args:['--no-sandbox','--disable-gpu']});
 const results=[];
 for(const [width,height] of [[320,568],[375,812],[390,844],[667,375],[767,393],[852,393],[820,1180],[1024,768],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height}});
  await page.route('**/*',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
  await page.goto('https://fixture.invalid/');
  // Designer sentence case differs from the hidden CMS source's title case.
  await page.evaluate(()=>document.querySelector('[data-tdb-parallax-cta] > div').textContent='Discover treatment');
  const before=await sample(page);
  await page.evaluate(()=>{
   window.changes=[];window.nativeCTA=document.querySelector('[data-tdb-parallax-cta]');window.nativeLabel=window.nativeCTA.firstElementChild.firstChild;
   new MutationObserver(records=>{for(const r of records)if(r.type==='childList')window.changes.push({target:r.target.className,added:r.addedNodes.length,removed:r.removedNodes.length})}).observe(document.querySelector('[data-tdb-treatment]'),{subtree:true,childList:true});
  });
  await page.addScriptTag({content:source});
  await page.evaluate(()=>TDBParallax.refresh());
  equalBoxes(before,await sample(page),`${width} preparation`);
  assert.deepEqual(await page.evaluate(()=>window.changes),[],`${width}: preparation moved native DOM`);
  assert(await page.evaluate(()=>document.getElementById('native-cta')===window.nativeCTA));
  assert(await page.evaluate(()=>window.nativeCTA.firstElementChild.firstChild===window.nativeLabel&&window.nativeCTA.firstElementChild.textContent==='Discover treatment'));
  for(const name of ['tdb-motion.js','tdb-swiper-8.4.7.min.js','tdb-parallax.js'])await page.addScriptTag({path:path.join(process.env.TDB_TEST_ASSET_DIR || path.join(root,'dist'),name)});
  await page.evaluate(()=>TDBSwiper.mount('parallax',document.querySelector('[data-tdb-treatment]')));
  await page.waitForTimeout(1400);
  equalBoxes(before,await sample(page),`${width} engine`);
  const result=await page.evaluate(()=>{
   const root=document.querySelector('[data-tdb-treatment]'),swiper=root.querySelector('.swiper').swiper;
   const cta=root.querySelector('[data-tdb-parallax-cta]');
   const source=swiper.slides[swiper.activeIndex].querySelector('a.tdb-treatment-source');
   return{sameCTA:cta===window.nativeCTA,href:cta.getAttribute('href'),expected:source.getAttribute('href'),overlays:root.querySelectorAll('.tdb-parallax-cta-layer').length};
  });
  assert(result.sameCTA);assert.equal(result.href,result.expected);assert.equal(result.overlays,0);
  await page.evaluate(()=>document.querySelector('.swiper').swiper.slideNext(0));
  await page.waitForTimeout(20);
  equalBoxes(before,await sample(page),`${width} navigation`);
  assert(await page.evaluate(()=>{const r=document.querySelector('[data-tdb-treatment]'),s=r.querySelector('.swiper').swiper;return r.querySelector('[data-tdb-parallax-cta]').getAttribute('href')===s.slides[s.activeIndex].querySelector('a.tdb-treatment-source').getAttribute('href')}));
  assert(await page.evaluate(()=>window.nativeCTA.firstElementChild.firstChild===window.nativeLabel&&window.nativeCTA.firstElementChild.textContent==='Discover treatment'));
  results.push({width,height,layoutShift:0,ctaPreserved:true,cmsLinkUpdated:true,designerLabelPreserved:true});
  await page.close();
 }
 // Missing authored CTA must not trigger fallback cloning.
 const page=await browser.newPage();await page.setContent(html);
 await page.evaluate(()=>document.querySelector('.tdb-treatment-cta').remove());
 await page.addScriptTag({content:source});await page.evaluate(()=>TDBParallax.refresh());
 assert.equal(await page.locator('.tdb-parallax-cta-layer').count(),0);
 await browser.close();
 console.log(JSON.stringify({cases:results,missingNativeCTA:'no generated replacement'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});

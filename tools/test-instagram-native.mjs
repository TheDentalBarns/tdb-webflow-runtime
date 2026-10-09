// Offline integration fixture built from the last published homepage snapshot.
// Usage: node tools/test-instagram-native.mjs <before.html> <dependency-dir> <css-dir>
// Requires Playwright and Chromium; optional TDB_CHROMIUM_EXECUTABLE override.
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean)}));
const [snapshot,dependencyDir,cssDir]=process.argv.slice(2);
if(!snapshot||!dependencyDir||!cssDir)throw Error('Pass homepage snapshot, dependency directory and CSS directory');
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=await readFile(snapshot,'utf8');
const css=(await Promise.all((await readdir(cssDir)).filter(name=>/^webflow-.*\.css$/.test(name)).map(name=>readFile(resolve(cssDir,name),'utf8')))).join('\n');
const browser=await chromium.launch({headless:true,executablePath:process.env.TDB_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const requestedImages=new Set();
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='tdb-fixture.invalid'){
      const name=url.pathname.split('/').pop();
      const path=name==='tdb-instagram-native.js'?resolve(repo,'src/instagram/native.js'):resolve(dependencyDir,name);
      await route.fulfill({contentType:'text/javascript',body:await readFile(path,'utf8')});
    }else{
      if(route.request().resourceType()==='image')requestedImages.add(route.request().url());
      await route.abort();
    }
  });
  async function fixture(count=16,top=0,invalid=false){
    await page.goto('about:blank');requestedImages.clear();errors.length=0;
    await page.setContent('<meta charset="utf-8"><style>'+css+'</style><div id="fixture"></div>');
    await page.evaluate(({html,count,top,invalid})=>{
      const doc=new DOMParser().parseFromString(html,'text/html');
      const feed=doc.querySelector('[data-tdb-ig-native="awards"]').cloneNode(true);
      const track=feed.querySelector('[data-ig-track]'),template=track.firstElementChild;
      const records=[...doc.querySelector('[data-tdb-ig-source="awards"]').querySelectorAll('[data-tdb-ig-record]')].slice(0,count);
      const cards=records.map(record=>{
        // Emulate Webflow's server-rendered Collection Items in the fixture.
        const card=template.cloneNode(true),sourceImage=record.querySelector('img');
        card.classList.remove('is-current');card.classList.add('w-dyn-item');card.setAttribute('role','listitem');
        card.querySelectorAll('img').forEach(image=>{
          for(const name of ['src','srcset'])sourceImage.hasAttribute(name)?image.setAttribute(name,sourceImage.getAttribute(name)):image.removeAttribute(name);
          image.loading='lazy';image.decoding='async';image.draggable=false;
          image.sizes='(max-width: 767px) 90vw, (max-width: 991px) 70vw, 30vw';
          image.alt=image.classList.contains('ig-native_photo')?sourceImage.alt:'';
        });
        const metadata=record.cloneNode(true);metadata.querySelectorAll('img').forEach(image=>image.remove());metadata.hidden=true;
        card.append(metadata);return card;
      });
      track.replaceChildren(...cards);track.classList.add('w-dyn-items');track.setAttribute('role','list');
      const collection=feed.querySelector('[data-ig-viewport]');collection.setAttribute('data-ig-cms','');collection.classList.add('w-dyn-list');
      if(!count){track.remove();const empty=document.createElement('div');empty.className='w-dyn-empty';collection.append(empty);}
      if(invalid)cards[0].querySelector('[data-ig-field="url"]').setAttribute('href','javascript:alert(1)');
      const host=document.querySelector('#fixture');host.style.paddingTop=top+'px';
      host.innerHTML='<div class="padding-global"><div class="container-large"><div class="tdb-home-awards-ig"></div></div></div>';
      host.querySelector('.tdb-home-awards-ig').append(feed);
      window.originalCards=[...track.children];
      window.originalImages=cards.flatMap(card=>[...card.querySelectorAll('img')].map(image=>({node:image,src:image.getAttribute('src'),srcset:image.getAttribute('srcset'),alt:image.alt,loading:image.loading})));
    },{html,count,top,invalid});
    for(const name of ['tdb-motion-policy.js','tdb-rendered-progress.js','tdb-motion.js','tdb-swiper-8.4.7.min.js','tdb-ticker.js','tdb-gallery.js','tdb-modules.js','tdb-instagram-native.js'])await page.addScriptTag({url:'https://tdb-fixture.invalid/dist/'+name});
  }
  const settled=()=>page.waitForFunction(()=>{
    const root=document.querySelector('[data-tdb-ig-native]'),swiper=root.querySelector('[data-ig-viewport]').swiper;
    return root.dataset.tdbIgReady==='2.0.0'&&swiper&&!swiper.animating&&root.getAttribute('data-tdb-slider-first-view')!=='pending';
  });
  await fixture(16,6000);
  assert.equal(requestedImages.size,0,'Offscreen native lazy images must not be requested');
  assert.equal(await page.locator('[data-ig-track] > [data-ig-slide]').count(),16);
  await page.locator('[data-tdb-ig-native]').scrollIntoViewIfNeeded();await settled();
  assert.equal(await page.locator('[data-ig-label]').textContent(),'Post 1 of 16','One-entry advance must land on the first CMS item');
  assert.equal(await page.evaluate(()=>window.TDBMotion.reduced.matches),false,'Shared full-motion policy must override OS reduction');
  const preserved=await page.evaluate(()=>({
    cards:originalCards.every(node=>node.isConnected)&&document.querySelectorAll('[data-ig-slide]:not(.swiper-slide-duplicate)').length===originalCards.length,
    images:originalImages.every(x=>x.node.isConnected&&x.src===x.node.getAttribute('src')&&x.srcset===x.node.getAttribute('srcset')&&x.alt===x.node.alt&&x.loading===x.node.loading)
  }));assert.deepEqual(preserved,{cards:true,images:true});
  results.push('16 native CMS cards retained by identity; image bindings unchanged; offscreen images deferred; one-entry advance/full-motion preserved');
  for(let i=0;i<16;i++){
    const state=await page.evaluate(()=>{
      const root=document.querySelector('[data-tdb-ig-native]'),swiper=root.querySelector('[data-ig-viewport]').swiper,card=swiper.slides[swiper.activeIndex];
      const logical=Number(card.dataset.igIndex),url=card.querySelector('[data-ig-field="url"]').getAttribute('href');
      const result={logical,label:root.querySelector('[data-ig-label]').textContent,url,link:root.querySelector('[data-ig-post-link]').getAttribute('href'),photo:card.querySelector('.ig-native_photo').src,reflection:card.querySelector('.ig-native_reflection-photo').src};
      swiper.slideNext(0);return result;
    });
    assert.equal(state.logical,i);assert.equal(state.label,'Post '+(i+1)+' of 16');assert.equal(state.url,state.link);assert.equal(state.photo,state.reflection);
  }
  await page.locator('[data-ig-next]').click();await settled();
  assert.equal(await page.locator('[data-ig-label]').textContent(),'Post 2 of 16');
  await page.locator('[data-ig-prev]').focus();await page.keyboard.press('Enter');await settled();
  assert.equal(await page.locator('[data-ig-label]').textContent(),'Post 1 of 16');
  results.push('All 16 card/photo/reflection/link/counter states agree; next and keyboard previous work');
  for(const width of [1440,991,767,390,320]){
    await page.setViewportSize({width,height:1000});
    await page.waitForFunction(()=>{
      const root=document.querySelector('[data-tdb-ig-native]');
      return Math.abs(root.querySelector('.ig-native_frame').getBoundingClientRect().width-root.querySelector('[data-ig-viewport]').getBoundingClientRect().width)<1;
    });
    const sizes=await page.evaluate(()=>{
      const root=document.querySelector('[data-tdb-ig-native]'),frame=root.querySelector('.ig-native_frame').getBoundingClientRect(),view=root.querySelector('[data-ig-viewport]').getBoundingClientRect();
      return {width:innerWidth,frameWidth:frame.width,viewportWidth:view.width,aligned:Math.abs(frame.left-view.left)<1};
    });assert.equal(sizes.aligned,true);results.push(sizes);
  }
  await page.evaluate(()=>{const root=document.querySelector('[data-tdb-ig-native]');window.TDBInstagramNative.mount(root).destroy();});
  const restored=await page.evaluate(()=>[...document.querySelector('[data-ig-track]').children].every((node,index)=>node===originalCards[index]));
  assert.equal(restored,true,'Destroy must restore CMS order and node identity');
  await page.evaluate(()=>window.TDBInstagramNative.refresh());await settled();
  assert.equal(await page.locator('[data-ig-label]').textContent(),'Post 1 of 16');
  results.push('Destroy/remount restores CMS order without another entrance rotation');
  assert.deepEqual(errors,[]);
  await fixture(1);await settled();
  assert.equal(await page.locator('.ig-native_controls').evaluate(node=>getComputedStyle(node).visibility),'hidden');
  assert.equal(await page.locator('[data-ig-label]').textContent(),'Post 1 of 1');
  await fixture(0);
  assert.equal(await page.locator('.ig-native_frame').evaluate(node=>getComputedStyle(node).display),'none');
  assert.equal(await page.locator('.ig-native_empty').evaluate(node=>getComputedStyle(node).display),'block');
  await fixture(16,0,true);
  assert.match(await page.locator('[data-tdb-ig-native]').getAttribute('data-tdb-ig-error'),/unique post link/);
  assert.equal(await page.locator('[data-ig-track] > [data-ig-slide]').count(),16,'Invalid metadata must not delete or replace CMS cards');
  results.push('Single, empty and invalid CMS metadata states preserve authored content');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,results},null,2));
}finally{await browser.close();}

/* Real loader/introduction/CSS, deterministic delayed dependencies and a drawer
 * double. Native geometry mirrors the Designer control, not runtime CSS. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const native=`body{font-family:sans-serif}.review-summary_card{display:flex;align-items:center;gap:16px;width:250px;height:80px;background:white;cursor:pointer}.review-summary_arrow{position:relative;display:flex;align-items:center;justify-content:center;flex:0 0 48px;width:48px;height:48px;color:#d6cab4}.tdb-control-pulse,.tdb-control-loading,.tdb-icon_circle{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.tdb-control-pulse{opacity:0;border-radius:50%;background:#f9f2e6}.tdb-control-loading{opacity:0;visibility:hidden}.tdb-control-content{position:relative;display:flex;align-items:center;justify-content:center;pointer-events:none}.review-summary_arrow-icon{display:block;width:14px;height:14px;transform:rotate(180deg)}`;
const markup=`<section data-tdb-review-introduction><div class="review-summary_card" data-tdb-review-trigger data-tdb-review-summary role="button" tabindex="-1" aria-disabled="true" aria-expanded="false">Read reviews<div class="review-summary_arrow"><div class="tdb-control-pulse" data-tdb-pulse="true" aria-hidden="true"></div><div class="tdb-icon_circle"><svg viewBox="0 0 48 48"><circle fill="none" stroke="currentColor" cx="24" cy="24" r="23.5"/></svg></div><div class="tdb-control-content" data-tdb-loading-content><div class="review-summary_arrow-icon"><svg viewBox="0 0 16 16"><path fill="none" stroke="currentColor" d="M2 8h12M10 3l4 5-4 5"/></svg></div></div><div class="tdb-control-loading" data-tdb-loading-indicator><svg width="100%" height="100%" viewBox="0 0 100 100"><path fill="currentColor" d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50"/></svg></div></div></div><span data-tdb-review-status role="status"></span></section><aside data-tdb-reviews></aside>`;
(async()=>{
 const b=await chromium.launch({executablePath:process.env.TDB_CHROMIUM||'/tmp/tdb-review-touch/chromium',args:['--no-sandbox']});
 try{for(const scenario of ['ready','slow','early','failure','withdraw']){
  const ctx=await b.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await ctx.route('https://review.test/**',r=>{
   const file=path.basename(new URL(r.request().url()).pathname);
   if(file.endsWith('.js'))return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'dist',file),'utf8')});
   return r.fulfill({contentType:'text/html',body:`<style>${native}${fs.readFileSync(path.join(root,'src/styles/tdb-control-effects.css'),'utf8')}</style>${markup}<script>
    window.allowed=true;window.holdIntro=${['early','withdraw'].includes(scenario)};window.holdDrawer=${scenario!=='ready'};window.opens=0;window.drawerRequests=0;window.jobs={};
    window.TDBReviewOptions={permission:()=>allowed};window.TDBNativeTicker={};window.TDBMotion={ddText:()=>({destroy(){}})};
    const data={records:[],total:85,average:4.94,ensureIdentity:async()=>{},ensure:async()=>{}};
    window.TDBReviewCMS={load:async()=>data,resolveIdentity:()=>''};
    window.TDBReviews={mount:()=>({open:async trigger=>{window.opens++;trigger.setAttribute('aria-expanded','true');await new Promise(r=>setTimeout(r,350));},destroy(){}})};
    const flights=new Map();window.TDBModules={load:url=>{const name=new URL(url).pathname.split('/').pop();if(flights.has(name))return flights.get(name);const flight=(async()=>{
     if(name==='tdb-review-introduction.js'){if(holdIntro)await new Promise(resolve=>jobs.intro=resolve);await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=reject;document.head.append(s);});}
     if(name==='tdb-reviews.js'){window.drawerRequests++;if(holdDrawer)await new Promise((resolve,reject)=>jobs.drawer=fail=>fail?reject(Error('Offline')):resolve());}
    })();flights.set(name,flight);flight.catch(()=>{if(flights.get(name)===flight)flights.delete(name)});return flight;}};
   </script><script defer src="/tdb-reviews-loader.js"></script>`});
  });
  await p.goto('https://review.test/');await p.waitForFunction(()=>window.TDBReviewLoader);
  const trigger=p.locator('[data-tdb-review-trigger]'),pulse=p.locator('[data-tdb-pulse]'),spinner=p.locator('[data-tdb-loading-indicator]'),content=p.locator('[data-tdb-loading-content]');
  const box=await p.locator('.review-summary_arrow').boundingBox();
  assert.equal(await pulse.evaluate(n=>getComputedStyle(n).animationName),'tdbBtnPulseOpacity');
  assert.equal(await spinner.evaluate(n=>getComputedStyle(n).visibility),'hidden');
  assert.equal(await spinner.locator('svg').evaluate(n=>getComputedStyle(n).animationName),'none','Spinner uses no animation while idle');
  if(scenario==='ready')await p.evaluate(()=>TDBReviewLoader.prepare());
  else if(!['early','withdraw'].includes(scenario))await p.waitForFunction(()=>TDBReviewLoader.status().instances===1);
  if(scenario==='early'){await trigger.focus();await p.keyboard.press('Enter');}else await trigger.click();
  if(scenario==='ready'){
   await p.waitForFunction(()=>opens===1);assert.equal(await trigger.getAttribute('data-tdb-loading'),null);assert.equal(await spinner.evaluate(n=>getComputedStyle(n).opacity),'0','Ready drawer never flashes spinner');
  }else{
   await p.waitForTimeout(300);
   assert.equal(await trigger.getAttribute('data-tdb-loading'),'true');assert.equal(await spinner.evaluate(n=>getComputedStyle(n).opacity),'1');assert.equal(await spinner.locator('svg').evaluate(n=>getComputedStyle(n).animationName),'tdbControlSpin');assert.equal(await content.evaluate(n=>getComputedStyle(n).visibility),'hidden');assert.equal(await pulse.evaluate(n=>getComputedStyle(n).animationName),'none');
   assert.deepEqual(await p.locator('.review-summary_arrow').boundingBox(),box,'Control dimensions cannot move while loading');
   await trigger.click();assert.equal(await p.evaluate(()=>opens),0);
   if(scenario==='early'){await p.evaluate(()=>{holdIntro=false;jobs.intro()});await p.waitForFunction(()=>TDBReviewLoader.status().instances===1);await trigger.click();}
   if(scenario==='failure'){
    await p.evaluate(()=>jobs.drawer(true));await p.waitForFunction(()=>!document.querySelector('[data-tdb-review-trigger]').hasAttribute('aria-busy'));
    assert.equal(await spinner.evaluate(n=>getComputedStyle(n).visibility),'hidden');assert.equal(await pulse.evaluate(n=>getComputedStyle(n).animationName),'tdbBtnPulseOpacity');assert.match(await p.locator('[data-tdb-review-status]').textContent(),/could not load/);
    await p.evaluate(()=>{holdDrawer=false;jobs.drawer?.(false)});await trigger.click();
   }else if(scenario==='withdraw'){
    await p.evaluate(()=>{allowed=false;dispatchEvent(new Event('CookieScriptReject'))});assert.equal(await trigger.getAttribute('data-tdb-loading'),null);assert.equal(await trigger.getAttribute('aria-disabled'),'true');
    await p.evaluate(()=>{holdIntro=false;holdDrawer=false;jobs.intro();jobs.drawer(false)});await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>opens),0);
    await p.evaluate(()=>{allowed=true;dispatchEvent(new Event('CookieScriptAccept'))});await trigger.click();
   }else await p.evaluate(()=>{holdDrawer=false;jobs.drawer(false)});
   await p.waitForFunction(()=>opens===1);
   assert.equal(await trigger.getAttribute('data-tdb-loading'),null,'Loading ends as opening starts');
   assert.equal(await spinner.evaluate(n=>getComputedStyle(n).visibility),'hidden');
  }
  await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>opens),1,'Exactly one opening despite repeated activation');
  assert.equal(await pulse.getAttribute('data-tdb-pulse'),'false');
  await trigger.evaluate(n=>n.setAttribute('aria-expanded','false'));await p.waitForTimeout(50);assert.equal(await pulse.getAttribute('data-tdb-pulse'),'true');assert.equal(await content.evaluate(n=>getComputedStyle(n).visibility),'visible');assert.deepEqual(errors,[]);
  console.log('PASS',scenario,'shared feedback, fixed geometry and single opening');await ctx.close();
 }}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

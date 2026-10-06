/* Run against locally captured staging exports and their exact assets.
   node tests/team-quotes.browser.cjs /tmp/tdb-owner-cms-audit
   Captures contain editorial content and are intentionally not committed. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const dir=process.argv[2],repo=path.resolve(__dirname,'..');
const resources=JSON.parse(fs.readFileSync(dir+'/resources.json','utf8'));
const registryURL=Object.keys(resources).find(u=>u.endsWith('/tdb-motion.js')).replace('tdb-motion.js','tdb-modules.js');
const runtimeURL='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@dd7e13bf7edadba5799177e5d946b70ca4e38a52/dist/tdb-team-quotes.js';
function measure(){
 const r=document.querySelector('[data-tdb-team-cms]'),v=r.querySelector('[data-tdb-team-viewport]'),s=v.swiper;
 const box=n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height}};
 return {section:box(r.closest('.section_standard-testimonial')),root:box(r),viewport:box(v),counter:box(r.querySelector('[data-tdb-team-position]')),after:box(document.querySelector('#after-quotes')),count:r.querySelectorAll('[data-tdb-team-slide]:not(.swiper-slide-duplicate)').length,index:s?.realIndex,state:r.dataset.tdbTeamQuoteState,hidden:getComputedStyle(r.closest('.section_standard-testimonial')).display==='none',cards:[...r.querySelectorAll('[data-tdb-team-slide]:not(.swiper-slide-duplicate)')].map(n=>({box:box(n),content:box(n.querySelector('[data-tdb-team-content]')),text:n.querySelector('[data-tdb-team-text]').textContent,author:n.querySelector('[data-tdb-team-author-line]').textContent})),active:s?box(s.slides[s.activeIndex]):null};
}
function same(a,b,label){for(const key of ['section','root','viewport','counter','after'])for(const dim of ['y','width','height'])assert(Math.abs(a[key][dim]-b[key][dim])<.12,`${label} ${key}.${dim}: ${a[key][dim]} -> ${b[key][dim]}`)}
async function settled(p){await p.waitForFunction(()=>{const r=document.querySelector('[data-tdb-team-cms]'),s=r.querySelector('[data-tdb-team-viewport]').swiper;return s&&!s.animating&&r.dataset.tdbSliderFirstView!=='pending'&&r.dataset.tdbSliderFirstView!=='moving'},null,{timeout:8000});await p.waitForTimeout(200)}
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const smoke=process.argv.includes('--final-smoke');
const results=[],files=fs.readdirSync(dir).filter(f=>f.endsWith('.fixture.html')&&(!smoke||['home.fixture.html','services__general-dentistry.fixture.html','services__hygiene-care.fixture.html','services__facial-aesthetics.fixture.html'].includes(f))); 
const viewports=[[320,568],[375,667],[390,844],[479,800],[480,320],[568,320],[667,375],[767,1024],[768,1024],[820,1180],[991,800],[992,800],[1024,768],[1280,900],[1440,900],[1920,1080]];
async function fixture(file,w,h,{fail=false,reduced=false,touch=false,lazy=false}={}){
 const c=await browser.newContext({viewport:{width:w,height:h},reducedMotion:reduced?'reduce':'no-preference',hasTouch:touch,isMobile:touch}),p=await c.newPage();
 await p.route('**/*',async route=>{const u=route.request().url();if(u.endsWith('/__owner-fixture')){let html=fs.readFileSync(dir+'/'+file,'utf8');if(lazy)html=html.replace('<body>','<body><div style="height:3000px"></div>');return route.fulfill({body:html,contentType:'text/html'})}if(u===runtimeURL)return route.fulfill({path:repo+'/dist/tdb-team-quotes.js',contentType:'text/javascript'});if(u===registryURL)return route.fulfill({path:'/tmp/tdb-owner-modules.js',contentType:'text/javascript'});if(fail&&u.endsWith('/tdb-motion.js'))return route.abort();if(resources[u])return route.fulfill({path:resources[u],contentType:u.includes('.css')?'text/css':/\.(woff2?|ttf|otf)(\?|$)/.test(u)?'font/woff2':'text/javascript'});return route.abort()});
 await p.goto('https://dentalbarns.webflow.io/__owner-fixture');await p.evaluate(()=>document.fonts.ready);return{c,p};
}
async function enhance(p){await p.addScriptTag({url:registryURL});await p.addScriptTag({url:registryURL.replace('tdb-modules.js','tdb-motion-policy.js')});await p.addScriptTag({url:runtimeURL});}
for(const file of files){
 const cases=smoke?viewports.filter(([w])=>[320,667,768,1440].includes(w)):file==='home.fixture.html'?viewports:viewports.filter(([w])=>[320,375,568,768,992,1440,1920].includes(w));
 for(const[w,h]of cases){const{c,p}=await fixture(file,w,h);const cold=await p.evaluate(measure);await p.waitForTimeout(100);same(cold,await p.evaluate(measure),'delayed '+file+' '+w);
 if(smoke&&cold.count){const preview=await p.evaluate(async()=>{const s=document.querySelector('style[data-tdb-owner-quotes-empty]');s.sheet.disabled=true;await new Promise(resolve=>setTimeout(resolve,450));const r=document.querySelector('[data-tdb-team-cms]'),state=[getComputedStyle(r.querySelector('[data-tdb-team-content]')).opacity,getComputedStyle(r.querySelector('[data-tdb-team-author-line]')).opacity];s.sheet.disabled=false;return state});assert.deepEqual(preview,['1','1'],'Designer native text is visible');}
 if(cold.count){assert(!cold.hidden);for(const card of cold.cards){assert(Math.abs(card.box.width-cold.viewport.width)<.12,'native slide width');assert(card.content.height<=cold.viewport.height+.12,'native copy fits');}assert(cold.counter.height>=44,'native counter reservation');}
 else assert(cold.hidden,'empty collection hidden without JS');
 await p.evaluate(()=>{window.__sizes=[];window.__watch=true;const sample=()=>{if(!window.__watch)return;window.__sizes.push(document.querySelector('#after-quotes').getBoundingClientRect().y);requestAnimationFrame(sample)};sample()});
 await enhance(p);if(cold.count)await settled(p);else await p.waitForTimeout(50);const warm=await p.evaluate(measure);same(cold,warm,'initialized '+file+' '+w);
 const ys=await p.evaluate(()=>{window.__watch=false;return window.__sizes});assert(Math.max(...ys)-Math.min(...ys)<.12,'no height movement during initialization');
 assert.deepEqual(warm.cards.map(x=>[x.text,x.author]),cold.cards.map(x=>[x.text,x.author]),'authored content unchanged');
 if(smoke&&cold.count)assert(await p.evaluate(()=>{const v=document.querySelector('[data-tdb-team-viewport]'),s=v.swiper;return Number(getComputedStyle(s.slides[s.activeIndex].querySelector('[data-tdb-team-content]')).opacity)>.1}),'published opening reveal');
 if(warm.active)assert(Math.abs(warm.active.x-warm.viewport.x)<.12,'active slide aligned');
 results.push({file,w,h,count:cold.count,height:cold.root.height,sectionHeight:cold.section.height,maxShift:Math.max(...ys)-Math.min(...ys)});await c.close();
 }console.log('PASS native/delayed/initialized:',file,cases.length+' widths');
}
for(const[w,h,touch]of[[1440,900,false],[375,667,true],[667,375,true]]){
 const{c,p}=await fixture('home.fixture.html',w,h,{reduced:true,touch});await enhance(p);await settled(p);const baseline=await p.evaluate(measure),v=p.locator('[data-tdb-team-cms] [data-tdb-team-viewport]');
 for(const key of ['ArrowRight','ArrowLeft'])for(let i=0;i<5;i++){const before=await p.evaluate(measure);await v.press(key);await settled(p);const after=await p.evaluate(measure);assert.equal(after.index,(before.index+(key==='ArrowRight'?1:2))%3,'loop '+key);same(baseline,after,'loop height');assert(Math.abs(after.active.x-after.viewport.x)<.12,'loop alignment');}
 for(const key of ['ArrowRight','ArrowLeft']){for(let i=0;i<8;i++)await v.press(key);await settled(p);const a=await p.evaluate(measure);same(baseline,a,'rapid navigation');assert(Math.abs(a.active.x-a.viewport.x)<.12,'rapid aligned');assert.equal(await p.locator('[data-tdb-team-slide][aria-hidden="false"]').count(),1,'one accessible slide');}
 const before=await p.evaluate(measure),box=before.viewport,x=box.x+box.width*.7,y=box.y+box.height*.5;
 if(touch){const session=await c.newCDPSession(p);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-box.width*.5*i/8,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x-box.width*.5,y,{steps:8});await p.mouse.up();}
 await settled(p);const dragged=await p.evaluate(measure);assert.equal(dragged.index,(before.index+1)%3,'drag changes quote');same(baseline,dragged,'drag height');
 assert.equal(await p.evaluate(()=>TDBMotion.reduced.matches),false,'full motion policy kept');
 for(const[nw,nh]of[[320,568],[768,1024],[1920,1080],[667,375],[1440,900]]){await p.setViewportSize({width:nw,height:nh});await p.waitForTimeout(180);const a=await p.evaluate(measure);assert(Math.abs(a.active.x-a.viewport.x)<.12,'resize alignment');const expected=results.find(r=>r.file==='home.fixture.html'&&r.w===nw);if(expected)assert(Math.abs(a.root.height-expected.height)<.12,'resize reserved height');}
 console.log('PASS keyboard/rapid/drag/loop/resize/full-motion:',w,h);await c.close();
}
{
 const{c,p}=await fixture('home.fixture.html',375,667,{fail:true});const cold=await p.evaluate(measure);await enhance(p);await p.waitForFunction(()=>document.querySelector('[data-tdb-team-cms]').dataset.tdbTeamQuoteState==='fallback');same(cold,await p.evaluate(measure),'dependency fallback');assert(await p.locator('[data-tdb-team-content].is-visible').count());await c.close();console.log('PASS failed dependency fallback');
}
{
 const{c,p}=await fixture('home.fixture.html',375,667,{lazy:true});await enhance(p);assert.equal(await p.locator('script[src$="tdb-motion.js"]').count(),0,'below-fold dependencies stay lazy');await p.locator('[data-tdb-team-cms]').scrollIntoViewIfNeeded();await settled(p);await c.close();console.log('PASS proximity lazy loading');
}
{
 const{c,p}=await fixture('services__hygiene-care.fixture.html',667,375,{touch:true});const cold=await p.evaluate(measure);await enhance(p);await settled(p);const v=p.locator('[data-tdb-team-cms] [data-tdb-team-viewport]');
 for(const key of ['ArrowRight','ArrowLeft'])for(let i=0;i<5;i++){const a=await p.evaluate(measure);await v.press(key);await settled(p);const b=await p.evaluate(measure);assert.equal(b.index,(a.index+1)%2,'two-quote loop');same(cold,b,'two-quote height');assert(Math.abs(b.active.x-b.viewport.x)<.12,'two-quote aligned');}
 for(let i=0;i<8;i++)await v.press('ArrowLeft');await settled(p);same(cold,await p.evaluate(measure),'two-quote rapid');await c.close();console.log('PASS two-quote bidirectional looping and rapid navigation');
}
fs.writeFileSync(dir+(smoke?'/final-smoke-results.json':'/results.json'),JSON.stringify(results,null,2));await browser.close();console.log('PASS',results.length,'cold-load responsive cases');
})().catch(e=>{console.error(e);process.exit(1)});

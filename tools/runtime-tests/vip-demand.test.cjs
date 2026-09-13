const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const footer=fs.readFileSync(process.env.TDB_RUNTIME_FILE||path.resolve(__dirname,'../../src/runtime/site-asset-loader.js'),'utf8');
const vip=fs.readFileSync(process.env.TDB_VIP_FILE||path.resolve(__dirname,'../../src/vip-drawer/vip-drawer.js'),'utf8');
const EXPECTED_LEGACY_VIP_URL = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@432ab3ab12553c9bbff97123453272ebde1ad6da/dist/tdb-vip-drawer.js';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const turns=async()=>{await pause(15);};
async function setup(t,{home=true,mobile=false,y=0,hash='',near=false}={}){
 const requests=[],errors=[],observed=[];
 class Network extends ResourceLoader{
  fetch(url,{element}){
   if (!element.hasAttribute("data-tdb-vip-drawer-js")) { const done=Promise.resolve(Buffer.from(";"));done.abort=()=>{};return done; }
   let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});promise.abort=()=>{};
   requests.push({url,element,resolve,reject});return promise;
  }
 }
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));vc.on('error',()=>{});
 const dom=new JSDOM(`<!doctype html><html data-wf-page="${home?'677cf86df9952f978d94d8a9':'vip-page'}" style="--tdb-ui-ready:1"><head></head><body>
 <a id="cta" href="#VIP">Join VIP</a><section id="VIP"><form id="main-form"></form></section>
 <div id="tdb-vip-drawer"><a class="tdb-vip-drawer-handle" href="#VIP"><span class="tdb-vip-drawer-label">Join VIP</span></a><div class="tdb-vip-drawer-body"><form id="vip-drawer-form"></form></div></div></body></html>`,{
 url:`https://dentalbarns.webflow.io/${home?'':'vip/become-a-patient'}${hash}`,runScripts:'dangerously',resources:new Network(),virtualConsole:vc,
 beforeParse(w){
  w.innerWidth=mobile?390:1366;w.innerHeight=800;w.scrollY=y;
  w.matchMedia=q=>({matches:q.includes('hover')?false:q.includes('max-width:767')?mobile:q.includes('min-width:768')?!mobile:false,addEventListener(){},removeEventListener(){}});
  w.requestIdleCallback=()=>1;w.requestAnimationFrame=cb=>setTimeout(()=>cb(0),0);w.cancelAnimationFrame=clearTimeout;
  w.scrollTo=(x,v)=>{w.scrollY=v;};
  w.IntersectionObserver=class{constructor(cb,config){this.cb=cb;this.config=config;observed.push(this);}observe(){}disconnect(){}};
 }
 });
 const w=dom.window;t.after(()=>w.close());
 w.document.querySelector('#VIP').getBoundingClientRect=()=>({top:near?500:5000,bottom:near?900:5500});
 let fallback=0;w.document.querySelector('#VIP').scrollIntoView=()=>fallback++;
 w.eval(footer);await turns();
 const vipRequests=()=>requests.filter(r=>r.element.hasAttribute('data-tdb-vip-drawer-js'));
 const event=(type,key)=>w.document.querySelector('#cta').dispatchEvent(key?new w.KeyboardEvent(type,{key,bubbles:true,cancelable:true}):new w.Event(type,{bubbles:true,cancelable:true}));
 const scroll=async value=>{w.scrollY=value;w.dispatchEvent(new w.Event('scroll'));await turns();};
 const finish=async()=>{const r=vipRequests().at(-1);assert.ok(r,'VIP requested');r.resolve(Buffer.from(vip));await turns();await turns();};
 return {w,requests,vipRequests,event,scroll,finish,errors,fallback:()=>fallback,prepared:()=>w.document.querySelector('#tdb-vip-drawer').hasAttribute('data-tdb-vip-prepared')};
}
test('homepage stays dormant after priority-ready, load, stationary scroll and unrelated pointer events',async t=>{
 const h=await setup(t);h.w.dispatchEvent(new h.w.Event('tdb:priority-ready'));h.w.dispatchEvent(new h.w.Event('load'));await h.scroll(0);
 h.w.document.body.dispatchEvent(new h.w.Event('pointerover',{bubbles:true}));await turns();
 assert.equal(h.vipRequests().length,0);assert.equal(h.prepared(),false);assert.equal(h.w.TDBVIPDrawer,undefined);
});
test('hover prepares once without opening; later click opens and Escape closes',async t=>{
 const h=await setup(t);h.event('pointerover');h.event('focusin');await turns();assert.equal(h.vipRequests().length,1);assert.ok(h.prepared());
 await h.finish();assert.equal(h.w.TDBVIPDrawer.status().state,0);h.event('click');await turns();assert.equal(h.w.TDBVIPDrawer.status().state,2);
 h.w.document.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(h.w.TDBVIPDrawer.status().state,3);
 await pause(570);assert.equal(h.w.TDBVIPDrawer.status().state,0);
});
for(const mobile of [false,true]){
 test(`cold ${mobile?'mobile':'desktop'} click is retained during download`,async t=>{
  const h=await setup(t,{mobile});h.event('pointerdown');h.event('click');h.event('click');await turns();assert.equal(h.vipRequests().length,1);
  await h.finish();assert.equal(h.w.TDBVIPDrawer.status().state,2);
 });
 test(`${mobile?'mobile':'desktop'} first reversal survives runtime download and down-scroll hides peek`,async t=>{
  const h=await setup(t,{mobile});await h.scroll(1000);await h.scroll(850);assert.equal(h.vipRequests().length,1);
  await h.finish();assert.equal(h.w.TDBVIPDrawer.status().state,1);
  await h.scroll(1000);assert.equal(h.w.TDBVIPDrawer.status().state,0);
 });
}
test('keyboard-only intent retains Enter and opens after load',async t=>{
 const h=await setup(t);h.event('keydown','Enter');await turns();await h.finish();assert.equal(h.w.TDBVIPDrawer.status().state,2);
});
test('reversal above the 50vh boundary never peeks',async t=>{
 const h=await setup(t);await h.scroll(600);await h.scroll(350);await h.finish();assert.equal(h.w.TDBVIPDrawer.status().state,0);
});
test('native VIP form proximity suppresses a pending peek',async t=>{
 const h=await setup(t,{near:true});await h.scroll(1000);await h.scroll(850);await h.finish();assert.equal(h.w.TDBVIPDrawer.status().state,0);
});
test('downward reversal cancels a pending peek before runtime arrives',async t=>{
 const h=await setup(t);await h.scroll(1000);await h.scroll(850);await h.scroll(1000);await h.finish();assert.equal(h.w.TDBVIPDrawer.status().state,0);
});
test('restored deep position prepares immediately but does not invent a peek',async t=>{
 const h=await setup(t,{y:1500});assert.equal(h.vipRequests().length,1);await h.finish();assert.equal(h.w.TDBVIPDrawer.status().state,0);
});
test('homepage desktop VIP hash prepares and opens without scrolling',async t=>{
 const h=await setup(t,{hash:'#VIP'});assert.equal(h.vipRequests().length,1);await h.finish();assert.equal(h.w.TDBVIPDrawer.status().state,2);
});
test('VIP landing page retains priority-ready loading and its distinct runtime dependency',async t=>{
 const h=await setup(t,{home:false});assert.equal(h.vipRequests().length,0);h.w.dispatchEvent(new h.w.Event('tdb:priority-ready'));await turns();
 assert.equal(h.vipRequests().length,1);assert.equal(h.vipRequests()[0].url,EXPECTED_LEGACY_VIP_URL);assert.equal(h.prepared(),false);
});
test('persistent request failure restores dormant guard and routes a retained click to the native form',async t=>{
 const h=await setup(t);h.event('click');await turns();h.vipRequests()[0].reject(new Error('network'));
 await pause(280);assert.equal(h.vipRequests().length,2);h.vipRequests()[1].reject(new Error('network'));await turns();
 assert.equal(h.prepared(),false);assert.equal(h.fallback(),1);
 h.event('pointerdown');await turns();assert.equal(h.vipRequests().length,3);await h.finish();assert.equal(h.w.TDBVIPDrawer.status().state,0);
});

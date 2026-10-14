const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const tick = () => new Promise(resolve => setImmediate(resolve));
const markup = '<div class="navbar10_component" data-tdb-navbar-native data-duration="500"><button class="navbar10_menu-button w-nav-button"></button><nav class="w-nav-menu"></nav></div>';
function fixture(loading = false) {
  const dom = new JSDOM('<!doctype html><html><head><script data-tdb-consent-js></script></head><body>'+(loading?'':markup)+'</body></html>', {runScripts:'outside-only', url:'https://dentalbarns.webflow.io/'});
  const w=dom.window, d=w.document;
  let state=loading?'loading':'complete';
  Object.defineProperty(d,'readyState',{get:()=>state});
  w.matchMedia=()=>({matches:false,addEventListener(){}});
  w.console.warn=()=>{};
  function evaluate(file){w.eval(fs.readFileSync(file,'utf8'));}
  evaluate('dist/tdb-navbar-loader.js');
  return {w,d,evaluate,nav:()=>d.querySelector('.navbar10_component'),ready(){d.body.innerHTML=markup;state='interactive';d.dispatchEvent(new w.Event('DOMContentLoaded'));},close(){w.close();}};
}
test('head loading initialises all navbar consumers after DOM readiness',async()=>{
 const f=fixture(true);try{
  assert.equal(f.w.TDBNavbarLoader,undefined);f.ready();await tick();
  assert.equal(f.nav().hasAttribute('data-tdb-nav-basic'),true);
  assert.equal(f.nav().hasAttribute('data-tdb-nav-scroll-lock'),true);
  assert.equal(f.nav().getAttribute('data-duration'),'0');
 }finally{f.close();}
});
for(const first of ['activate','register'])test('upgrade is independent of '+first+' arriving first',async()=>{
 const f=fixture();try{
  let installs=0;const install=()=>installs++,schedule=fn=>Promise.resolve().then(fn);
  if(first==='activate'){f.w.TDBNavbarLoader.activate(schedule);f.w.TDBNavbarLoader.register(install);}
  else{f.w.TDBNavbarLoader.register(install);f.w.TDBNavbarLoader.activate(schedule);}
  await tick();assert.equal(installs,1);assert.equal(f.w.TDBNavbarLoader.status().ready,true);
  f.w.TDBNavbarLoader.activate(schedule);await tick();assert.equal(installs,1);
 }finally{f.close();}
});
for(const mode of ['reject','throw','install'])test(mode+' failure retains basic mode and retries on online',async()=>{
 const f=fixture();try{
  let attempts=0,installs=0;
  f.w.TDBNavbarLoader.register(()=>{installs++;if(mode==='install'&&installs===1)throw Error('fixture');});
  f.w.TDBNavbarLoader.activate(fn=>{attempts++;if(attempts===1&&mode==='throw')throw Error('fixture');if(attempts===1&&mode==='reject')return Promise.reject(Error('fixture'));return Promise.resolve().then(fn);});
  await tick();assert.equal(f.nav().getAttribute('data-duration'),'0');assert.equal(f.nav().hasAttribute('data-tdb-nav-basic'),true);
  f.w.dispatchEvent(new f.w.Event('online'));await tick();assert.equal(f.w.TDBNavbarLoader.status().ready,true);assert.equal(attempts,2);
 }finally{f.close();}
});
test('opening while queued prevents takeover until the native close finishes',async()=>{
 const f=fixture();try{
  const queue=[];let installs=0;
  f.w.TDBNavbarLoader.register(()=>installs++);f.w.TDBNavbarLoader.activate(fn=>new Promise(resolve=>queue.push(()=>resolve(fn()))));
  await tick();const button=f.d.querySelector('.w-nav-button'),menu=f.d.querySelector('.w-nav-menu');
  button.classList.add('w--open');menu.setAttribute('data-nav-menu-open','');await tick();queue.shift()();await tick();assert.equal(installs,0);
  button.classList.remove('w--open');await tick();assert.equal(queue.length,0);
  menu.removeAttribute('data-nav-menu-open');await tick();queue.shift()();await tick();assert.equal(installs,1);
 }finally{f.close();}
});
test('a cancelled scheduler does not spin or activate the navbar',async()=>{
 const f=fixture();try{let scheduled=0,installs=0;f.w.TDBNavbarLoader.register(()=>installs++);f.w.TDBNavbarLoader.activate(()=>{scheduled++;return Promise.resolve(null);});await tick();assert.equal(scheduled,1);assert.equal(installs,0);}finally{f.close();}
});
test('late shared lock catches an open menu and retains BFCache handling',async()=>{
 const f=fixture();try{
  const menu=f.d.querySelector('.w-nav-menu');menu.setAttribute('data-nav-menu-open','');await tick();
  let active=0;f.w.TDBScrollLock={acquire(){active++;return()=>active--;}};
  f.d.querySelector('[data-tdb-consent-js]').dispatchEvent(new f.w.Event('load'));assert.equal(active,1);
  f.w.dispatchEvent(new f.w.Event('pagehide'));assert.equal(active,0);
  f.w.dispatchEvent(new f.w.Event('pageshow'));assert.equal(active,1);
  menu.removeAttribute('data-nav-menu-open');await tick();assert.equal(active,0);
 }finally{f.close();}
});

const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const {JSDOM} = require('jsdom');
const read = file => fs.readFileSync(file, 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(choice) {
  const dom = new JSDOM('<!doctype html><html><head></head><body>'+read('src/consent/banner.html')+
    '<div class="navbar10_component w-nav" data-tdb-navbar-native data-duration="500" transparent-nav="true">'+
    '<div class="tdb-nav-bar-glass"></div><a class="navbar10_logo-link"></a><div class="navbar_line"></div>'+
    '<button class="navbar10_menu-button w-nav-button" aria-expanded="false">Menu</button>'+
    '<div class="w-nav-overlay"><nav class="navbar10_menu w-nav-menu"><div class="navbar10_menu-left"></div><div class="navbar10_menu-right"></div></nav></div>'+
    '<div class="tdb-desktop-nav-backdrop"></div></div>'+
    '<div data-tdb-disclosure-item><button data-tdb-disclosure-trigger aria-expanded="false">Question</button><div data-tdb-disclosure-panel><div data-tdb-disclosure-reveal>Answer</div></div></div>'+
    '</body></html>', {url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,timers=new Map(),idles=new Map();
  let current,now=0,id=0,turn=0;
  Object.defineProperty(d,'currentScript',{get:()=>current});
  Object.defineProperty(d,'readyState',{get:()=> 'complete'});
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.setTimeout=(fn,delay=0)=>{timers.set(++id,{fn,at:now+delay});return id;};
  w.clearTimeout=id=>timers.delete(id);
  w.requestAnimationFrame=fn=>w.setTimeout(fn,16);w.cancelAnimationFrame=w.clearTimeout;
  w.requestIdleCallback=fn=>{idles.set(++id,fn);return id;};w.cancelIdleCallback=id=>idles.delete(id);
  w.Element.prototype.getAnimations=()=>[];
  w.Element.prototype.animate=()=>({finished:Promise.resolve(),cancel(){}});
  w.console.warn=()=>{};
  if(choice)d.cookie='CookieScriptConsent='+encodeURIComponent({accept:JSON.stringify({action:'accept',categories:['strict','performance','functionality']}),reject:JSON.stringify({action:'reject',categories:['strict']})}[choice]);
  function evaluate(file,node) {
    current=node || Object.assign(d.createElement('script'),{src:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@'+'b'.repeat(40)+'/dist/'+file.split('/').pop()});
    if(!current.isConnected)d.head.append(current);
    w.eval(read(file));current=null;
  }
  evaluate('dist/tdb-consent.js');evaluate('dist/tdb-navbar-loader.js');
  async function advance(ms){await tick();const end=now+ms;for(;;){const row=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!row)break;now=row[1].at;timers.delete(row[0]);row[1].fn();await tick();}now=end;await tick();}
  async function idle(){await tick();const row=idles.entries().next().value;if(!row)return false;idles.delete(row[0]);turn++;row[1]({didTimeout:false,timeRemaining:()=>20});await tick();return true;}
  const runtime=()=>d.querySelector('[data-tdb-runtime]');
  const css=()=>d.querySelector('[data-tdb-control-motion-css]');
  const script=()=>d.querySelector('[data-tdb-navbar-enhancement]');
  async function loadRuntime(){evaluate('dist/tdb-runtime.js',runtime());runtime().dispatchEvent(new w.Event('load'));await advance(150);while(!css()&&await idle()){}assert(css());}
  function completeCss(){css().dispatchEvent(new w.Event('load'));}
  async function loadScript(){completeCss();while(!script()&&await idle()){}assert(script());evaluate('dist/tdb-navbar.min.js',script());script().dispatchEvent(new w.Event('load'));await tick();}
  async function setOpen(open){d.querySelector('.w-nav-button').classList.toggle('w--open',open);d.querySelector('.w-nav-menu').toggleAttribute('data-nav-menu-open',open);await tick();}
  return {w,d,evaluate,runtime,css,script,advance,idle,loadRuntime,loadScript,setOpen,close(){w.TDBRuntime?.destroy();w.close();}};
}
for(const choice of ['accept','reject'])test('new '+choice+' waits for banner settlement, downloads and idle activation',async()=>{
 const f=fixture();try{
  assert.equal(f.runtime(),null);await f.w.TDBNavbarLoader.prepare();assert.equal(f.script(),null);
  f.w.CookieScript.instance[choice==='accept'?'acceptAllAction':'rejectAllAction']();
  await f.advance(469);assert.equal(f.runtime(),null);await f.advance(1);assert(f.runtime());
  await f.loadRuntime();assert.equal(f.script(),null);
  await f.loadScript();assert.equal(f.w.TDBNavbar,undefined,'download completion must not initialise the navbar');
  while(await f.idle()){}assert(f.w.TDBNavbar);assert(f.d.querySelector('[data-tdb-nav-enhanced]'));
 }finally{f.close();}
});
for(const choice of ['accept','reject'])test('saved '+choice+' enters runtime immediately but still schedules enhancement',async()=>{
 const f=fixture(choice);try{assert(f.runtime());assert.equal(f.script(),null);await f.loadRuntime();await f.loadScript();while(await f.idle()){}assert(f.w.TDBNavbar);}finally{f.close();}
});
test('open menu and reopening before the idle callback postpone takeover safely',async()=>{
 const f=fixture('reject');try{
  await f.setOpen(true);await f.loadRuntime();await f.loadScript();while(await f.idle()){}assert.equal(f.w.TDBNavbar,undefined);
  await f.setOpen(false);await f.setOpen(true);while(await f.idle()){}assert.equal(f.w.TDBNavbar,undefined);
  await f.setOpen(false);while(await f.idle()){}assert(f.w.TDBNavbar);
 }finally{f.close();}
});
test('stylesheet failure retains native controls and online retries without duplicate script requests',async()=>{
 const f=fixture('reject');try{
  await f.loadRuntime();f.css().dispatchEvent(new f.w.Event('error'));await tick();assert.equal(f.script(),null);
  const trigger=f.d.querySelector('[data-tdb-disclosure-trigger]');trigger.click();assert.equal(trigger.getAttribute('aria-expanded'),'true');
  f.w.dispatchEvent(new f.w.Event('online'));while(!f.css()&&await f.idle()){}await f.loadScript();while(await f.idle()){}
  assert(f.w.TDBNavbar);assert.equal(f.d.querySelectorAll('[data-tdb-navbar-enhancement]').length,1);
  assert.equal(trigger.getAttribute('aria-expanded'),'true');assert.equal(f.d.querySelector('[data-tdb-disclosure-interacted]'),null,'already visible text does not replay its entrance');
 }finally{f.close();}
});
test('missing navbar export can retry and a destroyed runtime never activates a late download',async()=>{
 const f=fixture('reject');try{
  await f.loadRuntime();f.css().dispatchEvent(new f.w.Event('load'));while(!f.script()&&await f.idle()){}
  f.script().dispatchEvent(new f.w.Event('load'));await tick();assert.equal(f.w.TDBNavbar,undefined);
  f.w.dispatchEvent(new f.w.Event('online'));while(!f.script()&&await f.idle()){}
  const script=f.script();assert(script);f.w.TDBRuntime.destroy();f.evaluate('dist/tdb-navbar.min.js',script);script.dispatchEvent(new f.w.Event('load'));await tick();
  while(await f.idle()){}assert.equal(f.w.TDBNavbar,undefined);
 }finally{f.close();}
});
test('essential bundle has no download or cookie watcher',()=>{
 const f=fixture();try{
  assert(!read('dist/tdb-navbar-loader.js').includes('CookieScript'));
  const lock=f.d.querySelector('style[data-tdb-basic-nav-lock]');
  assert(lock,'the basic lock must be available before the first menu interaction');
  assert.equal(lock.textContent,'html[data-tdb-nav-basic-open]{overflow:hidden}');
  assert.equal(f.d.querySelectorAll('style').length,1,'startup adds only the small menu lock');
  assert.equal(f.css(),null);assert.equal(f.script(),null);
 }finally{f.close();}
});

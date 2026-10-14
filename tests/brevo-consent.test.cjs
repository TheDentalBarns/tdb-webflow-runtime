const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({allowed=false,decided=true,url='https://www.thedentalbarns.co.uk/'}={}){
 let choice={allowed,decided},subscriber,reloads=0,id=0;const timers=new Map();
 const vc=new VirtualConsole();vc.on('jsdomError',error=>{if(error.message.includes('navigation'))reloads++;else throw error;});
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url,runScripts:'outside-only',virtualConsole:vc});
 const w=dom.window,d=w.document;
 w.console.warn=()=>{};
 w.setTimeout=(fn,delay)=>{timers.set(++id,{fn,delay});return id;};w.clearTimeout=id=>timers.delete(id);
 w.TDBConsent={allows:category=>category==='targeting'&&choice.allowed,
  currentState:()=>({decided:choice.decided}),
  subscribe(fn){subscriber=fn;fn();return()=>{subscriber=null;}}};
 w.eval(fs.readFileSync('src/shared/modules.js','utf8'));
 w.eval(fs.readFileSync('src/brevo/consent.js','utf8'));
 function prepare(){w.prepareBrevoConsent();}
 function choose(allowed,decided=true,notify=true){choice={allowed,decided};if(notify)subscriber?.();}
 function tag(){return d.querySelector('script[data-tdb-brevo-js]');}
 function loaded(){tag().dispatchEvent(new w.Event('load'));}
 async function delay(ms){const jobs=[...timers].filter(([,v])=>v.delay===ms);for(const [key,{fn}]of jobs){timers.delete(key);fn();await tick();}}
 return {w,d,prepare,choose,tag,loaded,delay,timers,reloads:()=>reloads,status:()=>w.TDBBrevoConsent.status(),close:()=>w.close()};
}
test('definition and undecided/essential-only states never request the SDK',()=>{
 const f=fixture({decided:false});try{
  assert.equal(f.w.TDBBrevoConsent,undefined);assert.equal(f.tag(),null);
  f.prepare();assert.equal(f.tag(),null);
  f.choose(false);assert.equal(f.tag(),null);assert.equal(f.w.Brevo,undefined);
 }finally{f.close();}
});
test('targeting opt-in starts once and queues init only after bootstrap loads',async()=>{
 const f=fixture();try{
  f.prepare();f.choose(true);const script=f.tag();assert(script);
  assert.equal(f.w.Brevo,undefined);
  f.prepare();f.choose(true);f.w.dispatchEvent(new f.w.Event('pageshow'));
  assert.equal(f.d.querySelectorAll('[data-tdb-brevo-js]').length,1);
  f.loaded();await tick();assert.equal(f.status().state,'initialising');
  assert.equal(f.w.Brevo.filter(Array.isArray).length,1);
  f.w.Brevo.find(item=>typeof item==='function')();assert.equal(f.status().state,'ready');
  f.choose(true);assert.equal(f.status().attempts,1);
 }finally{f.close();}
});
test('explicit network error removes failed tag and retries only once without duplicate init',async()=>{
 const f=fixture({allowed:true});try{
  f.prepare();const first=f.tag();first.dispatchEvent(new f.w.Event('error'));await tick();
  assert.equal(first.isConnected,false);assert.equal(f.w.Brevo,undefined);
  await f.delay(1000);assert(f.tag());assert.notEqual(f.tag(),first);
  f.loaded();await tick();assert.equal(f.status().attempts,2);
  assert.equal(f.w.Brevo.filter(Array.isArray).length,1);
 }finally{f.close();}
});
test('second explicit failure is bounded and denial after failed transport does not reload',async()=>{
 const f=fixture({allowed:true});try{
  f.prepare();f.tag().dispatchEvent(new f.w.Event('error'));await tick();await f.delay(1000);
  f.tag().dispatchEvent(new f.w.Event('error'));await tick();await f.delay(1000);
  assert.equal(f.tag(),null);assert.equal(f.status().attempts,2);
  f.choose(false);assert.equal(f.reloads(),0);
 }finally{f.close();}
});
test('withdrawal cancels scheduled retry',async()=>{
 const f=fixture({allowed:true});try{
  f.prepare();f.tag().dispatchEvent(new f.w.Event('error'));await tick();
  f.choose(false);await f.delay(1000);assert.equal(f.tag(),null);assert.equal(f.reloads(),0);
 }finally{f.close();}
});
test('withdrawal during download never queues init even if reload is cancelled',async()=>{
 const f=fixture({allowed:true});try{
  f.prepare();const script=f.tag();f.choose(false);
  assert.equal(f.reloads(),1);assert.equal(f.status().state,'reload-required');
  script.dispatchEvent(new f.w.Event('load'));await tick();
  assert.equal(f.w.Brevo,undefined);assert.equal(f.status().initialised,false);
  f.choose(true);f.choose(false);assert.equal(f.reloads(),1);
  assert.equal(f.status().reloadRequired,true);
 }finally{f.close();}
});
test('withdrawal after init stays truthful when navigation has not completed',async()=>{
 const f=fixture({allowed:true});try{
  f.prepare();f.loaded();await tick();
  f.choose(false);f.w.Brevo.find(item=>typeof item==='function')();
  assert.equal(f.status().state,'reload-required');assert.equal(f.reloads(),1);
  f.choose(true);assert.equal(f.status().state,'reload-required');
 }finally{f.close();}
});
test('transport timeout is not retried because the original script may still execute',async()=>{
 const f=fixture({allowed:true});try{
  f.prepare();await f.delay(20000);await f.delay(1000);
  assert.equal(f.status().attempts,1);assert.equal(f.status().state,'error');
  f.w.dispatchEvent(new f.w.Event('pageshow'));assert.equal(f.status().attempts,1);
  f.choose(false);assert.equal(f.reloads(),1);
 }finally{f.close();}
});
for(const url of ['https://www.thedentalbarns.co.uk/','https://www.thedentalbarns.com/'])
test('clears confirmed cookie on host and parent scope: '+url,()=>{
 const f=fixture({url});try{
  const root=new URL(url).hostname.replace(/^www\./,'');
  f.d.cookie='sib_cuid=host; Path=/';
  f.d.cookie='sib_cuid=parent; Domain='+root+'; Path=/';
  f.d.cookie='uuid=unrelated; Domain='+root+'; Path=/';
  f.prepare();assert(!f.d.cookie.includes('sib_cuid='));
  assert(f.d.cookie.includes('uuid=unrelated'));
 }finally{f.close();}
});
test('undecided startup does not erase identifiers before a decision',()=>{
 const f=fixture({decided:false});try{f.d.cookie='sib_cuid=old; Path=/';f.prepare();assert(f.d.cookie.includes('sib_cuid='));}finally{f.close();}
});
test('page restoration and visible-tab checks re-read shared consent',()=>{
 const f=fixture();try{
  f.prepare();f.choose(true,true,false);f.w.dispatchEvent(new f.w.Event('pageshow'));assert(f.tag());
  f.choose(false,true,false);Object.defineProperty(f.d,'visibilityState',{value:'visible'});
  f.d.dispatchEvent(new f.w.Event('visibilitychange'));assert.equal(f.reloads(),1);
 }finally{f.close();}
});
test('existing SDK is not reinitialised or claimed ready',()=>{
 const f=fixture({allowed:true});try{
  const script=f.d.createElement('script');script.id='sendinblue-js';f.d.head.append(script);
  f.prepare();assert.equal(f.tag(),null);assert.equal(f.status().state,'existing');assert.equal(f.w.Brevo,undefined);
  f.choose(false);assert.equal(f.reloads(),1);assert.equal(script.isConnected,true);
 }finally{f.close();}
});
test('public bootstrap accepts delayed init after transport',{skip:!process.env.TDB_BREVO_SDK},async()=>{
 const f=fixture({allowed:true});try{
  f.prepare();f.w.eval(fs.readFileSync(process.env.TDB_BREVO_SDK,'utf8'));
  assert.equal(f.d.getElementById('sendinblue-js'),null);
  f.loaded();await tick();
  const inner=f.d.getElementById('sendinblue-js');assert(inner);
  assert.equal(inner.src,'https://sibautomation.com/sa.js?key=hpwhoa9n2kbqn118b9von9ae');
  inner.dispatchEvent(new f.w.Event('error'));assert.equal(f.status().state,'error');
 }finally{f.close();}
});

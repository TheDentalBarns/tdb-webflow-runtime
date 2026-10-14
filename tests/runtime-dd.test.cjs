/* Real consent/registry/runtime integration, with controlled network and scheduling. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const {JSDOM} = require(process.env.TDB_JSDOM || 'jsdom');
const read = file => fs.readFileSync(file, 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const accepted = {action:'accept',categories:['strict','functionality','performance']};
const rejected = {action:'reject',categories:['strict']};
function fixture({choice, runtime=false, count=19, idle=true, lcp=true, ready='complete'}={}) {
  const markup=Array.from({length:count},(_,i)=>'<p data-tdb-dd-page="viewport" id="dd-'+i+'" style="opacity:1">Text '+i+'</p>').join('');
  const dom=new JSDOM('<!doctype html><html><body>'+read('src/consent/banner.html')+markup+
    '<div class="tdbc-dialog"><span class="tdbc-dd-fade" id="calculator"></span><div class="tdbc-section-footer"><span class="tdbc-dd-fade" id="excluded"></span></div></div>'+
    '<div data-tdb-quotes-template><p data-tdb-dd-page id="template"></p></div><p data-tdb-dd-page data-tdb-dd-legacy data-w-id="ix" id="legacy"></p></body></html>',
    {url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,timers=new Map(),idles=new Map(),mounts=[],destroyed=[],observations=[];
  let now=0,next=0,current=null,idleTurn=0,docReady=ready;
  Object.defineProperty(d,'readyState',{get:()=>docReady});
  w.setTimeout=(fn,delay=0)=>{timers.set(++next,{fn,at:now+delay});return next;};
  w.clearTimeout=id=>timers.delete(id);
  w.requestAnimationFrame=fn=>w.setTimeout(fn,16);w.cancelAnimationFrame=w.clearTimeout;
  if(idle){w.requestIdleCallback=(fn,options)=>{idles.set(++next,{fn,options});return next;};w.cancelIdleCallback=id=>idles.delete(id);}
  if(lcp)w.PerformanceObserver=class {
    static supportedEntryTypes=['largest-contentful-paint'];
    constructor(cb){this.cb=cb;this.disconnected=false;observations.push(this);}
    observe(options){this.options=options;}disconnect(){this.disconnected=true;}
  };
  Object.defineProperty(d,'currentScript',{get:()=>current});
  w.Element.prototype.getAnimations=()=>[];
  w.Element.prototype.animate=()=>({cancel(){}});
  w.TDBMotion={ddText(nodes,options){
    mounts.push({id:nodes[0].id,options,turn:idleTurn});
    return {destroy(){destroyed.push(nodes[0].id);}};
  }};
  function evalFile(file,node) {
    current=node||Object.assign(d.createElement('script'),{src:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@'+'b'.repeat(40)+'/dist/'+file.split('/').pop()});
    if(!current.isConnected)d.head.append(current);
    // Exercise DD's scheduler independently of unrelated feature-loader tasks.
    // The complete distribution is covered by runtime-ownership.test.cjs.
    try{w.eval(read(file==='dist/tdb-runtime.js'?'src/runtime/runtime.js':file));}finally{current=null;}
  }
  if(choice)d.cookie='CookieScriptConsent='+encodeURIComponent(JSON.stringify(choice))+'; Path=/';
  if(runtime){
    w.TDBModules={load:()=>Promise.resolve()};
    evalFile('dist/tdb-runtime.js');
  }else evalFile('dist/tdb-consent.js');
  async function advance(ms) {
    await tick();const end=now+ms;
    for(;;){
      const row=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!row)break;now=row[1].at;timers.delete(row[0]);row[1].fn();await tick();
    }
    now=end;await tick();
  }
  async function runIdle() {
    await tick();const first=idles.entries().next().value;if(!first)return false;
    idles.delete(first[0]);idleTurn++;first[1].fn({didTimeout:false,timeRemaining:()=>20});await tick();return true;
  }
  const requests=()=>[...d.querySelectorAll('script[data-tdb-runtime]')];
  function complete(){
    const node=requests()[0];assert(node);evalFile('dist/tdb-runtime.js',node);node.dispatchEvent(new w.Event('load'));
  }
  return {w,d,mounts,destroyed,observations,idles,timers,advance,runIdle,requests,complete,evalFile,
    setReady(value){docReady=value;},
    close(){w.TDBRuntime?.destroy();w.close();}};
}
for(const method of ['acceptAllAction','rejectAllAction'])test(method+' hands off once after 470ms, even if refreshed during closing',async()=>{
  const f=fixture();await f.advance(50);assert.equal(f.requests().length,0);
  f.w.CookieScript.instance[method]();f.w.TDBConsent.refresh();f.w.TDBConsent.settle();
  await f.advance(469);assert.equal(f.requests().length,0);
  await f.advance(1);assert.equal(f.requests().length,1);
  assert(f.requests()[0].src.endsWith('b'.repeat(40)+'/dist/tdb-runtime.js'));
  f.w.TDBConsent.refresh();f.w.TDBConsent.settle();assert.equal(f.requests().length,1);
  f.complete();await f.advance(150);
  assert.equal(f.w.TDBDDFades,f.w.TDBRuntime);
  assert.equal(f.mounts.length,0,'no eager mounting after download or initial-render gate');
  await f.runIdle();assert.equal(f.mounts.length,0,'dependency load has its own turn');
  await f.runIdle();assert(f.mounts.length>0&&f.mounts.length<=8);
  while(await f.runIdle()){}
  assert.equal(f.mounts.length,20);
  assert.equal(new Set(f.mounts.map(m=>m.id)).size,20);
  assert.equal(f.mounts.find(m=>m.id==='calculator').options.root.className,'tdbc-dialog');
  assert.equal(f.w.TDBRuntime.count(),20);
  f.w.TDBConsent.refresh();assert.equal(f.requests().length,1);f.close();
});
for(const choice of [accepted,rejected])test('saved '+choice.action+' requests runtime without another decision',async()=>{
  const f=fixture({choice});await tick();assert.equal(f.requests().length,1);
  assert.equal(f.w.CookieScript.instance.isOpen(),false);f.close();
});
test('runtime handoff retries a failed request once and deduplicates intervening events',async()=>{
  const f=fixture({choice:rejected});await tick();
  const first=f.requests()[0];first.dispatchEvent(new f.w.Event('error'));await tick();
  f.w.TDBConsent.refresh();assert.equal(f.requests().length,0);
  await f.advance(999);assert.equal(f.requests().length,0);
  await f.advance(1);assert.equal(f.requests().length,1);
  f.complete();await tick();f.w.TDBConsent.refresh();assert.equal(f.requests().length,1);f.close();
});
test('failed retry waits while settings are open and resumes after closing',async()=>{
  const f=fixture({choice:rejected});await tick();
  f.requests()[0].dispatchEvent(new f.w.Event('error'));await tick();
  f.w.CookieScript.instance.show();await f.advance(1000);assert.equal(f.requests().length,0);
  f.w.CookieScript.instance.hide();await f.advance(470);assert.equal(f.requests().length,1);f.close();
});
test('mount batches, dynamic discovery, removal cleanup and destroy preserve ownership',async()=>{
  const f=fixture({runtime:true});await f.advance(150);
  while(await f.runIdle()){}
  const groups=new Map();for(const m of f.mounts)groups.set(m.turn,(groups.get(m.turn)||0)+1);
  assert([...groups.values()].every(n=>n<=8));assert(groups.size>=3);
  const p=f.d.createElement('p');p.id='dynamic';p.setAttribute('data-tdb-dd-page','native');p.setAttribute('data-tdb-dd-preset','orange');
  f.d.body.append(p);await tick();while(await f.runIdle()){}
  assert.equal(f.mounts.filter(m=>m.id==='dynamic').length,1);
  assert.equal(f.mounts.find(m=>m.id==='dynamic').options.preset,'orange');
  p.remove();await tick();while(await f.runIdle()){}
  assert.equal(f.destroyed.filter(id=>id==='dynamic').length,1);
  f.w.TDBRuntime.destroy();assert.equal(f.w.TDBRuntime.count(),0);assert.equal(f.idles.size,0);
  const before=f.mounts.length;f.d.body.append(p);await f.w.TDBRuntime.refresh();await tick();
  assert.equal(f.mounts.length,before);f.close();
});
test('destroy before initial-render readiness cancels all scheduled work',async()=>{
  const f=fixture({runtime:true,ready:'interactive'});
  f.w.TDBRuntime.destroy();await f.advance(2000);
  assert.equal(f.mounts.length,0);assert.equal(f.idles.size,0);assert.equal(f.timers.size,0);
  assert(f.observations.every(o=>o.disconnected));f.close();
});
test('LCP quiet period uses buffered entries and disconnects after bounded readiness',async()=>{
  const f=fixture({runtime:true});
  assert.equal(f.observations[0].options.buffered,true);
  await f.advance(100);f.observations[0].cb();await f.advance(100);assert.equal(f.idles.size,0);
  await f.advance(50);assert.equal(f.idles.size,1);assert.equal(f.observations[0].disconnected,true);f.close();
});
test('missing LCP and a delayed load cannot block the runtime indefinitely',async()=>{
  const f=fixture({runtime:true,lcp:false,ready:'interactive'});
  await f.advance(1499);assert.equal(f.idles.size,0);
  await f.advance(1);assert.equal(f.idles.size,1);
  while(await f.runIdle()){}assert.equal(f.mounts.length,20);f.close();
});
test('browsers without idle callbacks use yielding timer batches',async()=>{
  const f=fixture({runtime:true,idle:false,lcp:false});
  await f.advance(165);assert.equal(f.mounts.length,0);
  await f.advance(1);assert.equal(f.mounts.length,0);
  await f.advance(16);assert(f.mounts.length>0&&f.mounts.length<=8);
  await f.advance(100);assert.equal(f.mounts.length,20);f.close();
});
test('motion load failure remains readable and can recover on interaction',async()=>{
  const f=fixture({runtime:true});
  let attempts=0;
  f.w.TDBModules.load=()=>++attempts===1?Promise.reject(Error('offline')):Promise.resolve();
  await f.advance(150);await f.runIdle();
  assert.equal(f.mounts.length,0);assert.equal(f.w.TDBRuntime.status().retryNeeded,true);
  assert.equal(f.d.getElementById('dd-0').style.opacity,'1');
  f.w.dispatchEvent(new f.w.Event('touchstart'));await tick();
  while(await f.runIdle()){}assert.equal(f.mounts.length,20);assert.equal(attempts,2);f.close();
});
test('destroy while motion is downloading never mounts its late completion',async()=>{
  const f=fixture({runtime:true});let finish;
  f.w.TDBModules.load=()=>new Promise(resolve=>{finish=resolve;});
  await f.advance(150);await f.runIdle();assert(finish);
  f.w.TDBRuntime.destroy();finish();await tick();
  assert.equal(f.mounts.length,0);assert.equal(f.idles.size,0);f.close();
});

test('handoff stops after two failed attempts for this page',async()=>{
  const f=fixture({choice:rejected});await tick();
  f.requests()[0].dispatchEvent(new f.w.Event('error'));await tick();await f.advance(1000);
  f.requests()[0].dispatchEvent(new f.w.Event('error'));await tick();await f.advance(2000);
  f.w.TDBConsent.refresh();await tick();assert.equal(f.requests().length,0);f.close();
});
test('no eligible targets means no motion request, and repeated evaluation keeps one owner',async()=>{
  const f=fixture({runtime:true,count:0});f.d.querySelector('.tdbc-dialog').remove();
  let loads=0;f.w.TDBModules.load=()=>{loads++;return Promise.resolve();};
  const api=f.w.TDBRuntime;f.evalFile('dist/tdb-runtime.js');
  assert.equal(f.w.TDBRuntime,api);
  await f.advance(150);while(await f.runIdle()){}
  assert.equal(loads,0);assert.equal(f.mounts.length,0);f.close();
});

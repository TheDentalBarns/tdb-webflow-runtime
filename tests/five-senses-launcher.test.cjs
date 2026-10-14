const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const launcher="const TDBRuntimeModuleRoot=new URL('https://cdn.example/release/dist/');"+fs.readFileSync('src/five-senses/launcher.js','utf8');
const controller=fs.readFileSync('src/five-senses/loader.js','utf8');
const tick=()=>new Promise(r=>setTimeout(r,40));
function setup(html='<a href="/five-senses-experience" data-tdb-senses-open>Open</a>') {
 const dom=new JSDOM(html,{url:'https://dentalbarns.webflow.io/services/nervous-patient-care',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.console.warn=()=>{};
 w.eval("const TDBRuntimeModuleRoot=new URL('https://cdn.example/release/dist/');");
 return {w,dom,close:()=>w.close()};
}
test('launcher is inert until runtime startup and fetches nothing for hover, focus or scroll',()=>{
 const {w,close}=setup();let loads=0;
 w.TDBModules={load(){loads++;return Promise.resolve();}};
 w.eval(launcher);assert.equal(w.TDBFiveSensesLauncher,undefined);
 w.eval('prepareFiveSensesLauncher()');
 for(const type of ['pointerover','focusin','pointerdown','wheel'])w.document.querySelector('a').dispatchEvent(new w.Event(type,{bubbles:true}));
 assert.equal(loads,0);close();
});
test('first click loads once and opens after busy clears, retaining the exact trigger',async()=>{
 const {w,close}=setup();let loads=0,opens=0;const a=w.document.querySelector('a');
 w.TDBModules={load(url,opts){loads++;assert.equal(url.href,'https://cdn.example/release/dist/tdb-five-senses-loader.js');w.TDBFiveSensesEntry={open(el){assert.equal(el,a);assert.equal(el.hasAttribute('aria-busy'),false);opens++;}};assert.equal(opts.ready(),true);return Promise.resolve();},
 async withBusy(el,work){el.setAttribute('aria-busy','true');try{await work();}finally{el.removeAttribute('aria-busy');}}};
 w.eval(launcher+';prepareFiveSensesLauncher()');a.click();a.click();await tick();
 assert.equal(loads,1);assert.equal(opens,1);a.click();await tick();assert.equal(loads,1);assert.equal(opens,2);close();
});
test('plain navigation and modified overlay clicks retain native link behaviour',()=>{
 const {w,close}=setup('<a href="/five-senses-experience">Page</a><a data-tdb-senses-open href="/five-senses-experience">Overlay</a>');
 w.TDBModules={load(){throw Error('must not load');}};
 w.eval(launcher+';prepareFiveSensesLauncher()');
 for(const [a,ctrl] of [[w.document.querySelector('a'),false],[w.document.querySelectorAll('a')[1],true]]){
  const e=new w.MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:ctrl,button:0});
  a.dispatchEvent(e);assert.equal(e.defaultPrevented,false);
 }close();
});
test('delegation handles dynamically inserted native buttons and refresh makes custom controls focusable',async()=>{
 const {w,close}=setup('');let opens=0;
 w.TDBModules={load(){w.TDBFiveSensesEntry={open(){opens++;}};return Promise.resolve();},withBusy:(_,work)=>work()};
 w.eval(launcher+';prepareFiveSensesLauncher()');
 w.document.body.innerHTML='<button data-tdb-senses-open>New</button><div data-tdb-senses-open>Custom</div>';
 w.document.querySelector('button').click();await tick();assert.equal(opens,1);
 w.TDBFiveSensesLauncher.refresh();const div=w.document.querySelector('div');assert.equal(div.tabIndex,0);
 div.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await tick();assert.equal(opens,2);
 div.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true,cancelable:true}));await tick();assert.equal(opens,2);close();
});
test('failed controller load can retry; destroying during load does not open it',async()=>{
 const {w,close}=setup();let fail=true,resolve,opens=0;
 w.TDBModules={load(){return fail?Promise.reject(Error('offline')):new Promise(r=>resolve=r);},withBusy:(_,work)=>work()};
 w.eval(launcher+';prepareFiveSensesLauncher()');const a=w.document.querySelector('a');
 a.click();await tick();fail=false;a.click();await tick();
 w.TDBFiveSensesLauncher.destroy();w.TDBFiveSensesEntry={open(){opens++;}};resolve();await tick();assert.equal(opens,0);close();
});
function shell(options={}) {
 const e=setup('<button id="open">Open</button><script data-tdb-senses-assets type="application/json">'+(options.assets||'{}')+'</script>');
 const {w}=e;let requests=0,locks=0,releases=0,mounts=0,aborts=0,stops=0,assetMap;
 w.matchMedia=()=>({matches:false});w.TDBMotionPolicy={reduced:{matches:false}};
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 w.Element.prototype.animate=function(){return {finished:Promise.resolve(),cancel(){}};};
 w.Element.prototype.getAnimations=()=>[];
 w.TDBScrollLock={acquire(){locks++;return ()=>{releases++;};},active:false};
 const audio={ready:true,muted:false,stop(){stops++;},setMuted(v){this.muted=v;}};
 w.testImport=async()=>{requests++;return {mountExperience:async({dialog,signal,assetBase})=>{
  mounts++;assetMap=assetBase;signal.addEventListener('abort',()=>aborts++);
  if(options.noStart)return {releaseAudio:()=>audio};
  const start=w.document.createElement('button');start.className='tdb-senses-start';
  start.innerHTML=options.simple?'Begin':'<span class="tdb-senses-circle"><svg></svg></span><span class="tdb-senses-start-label">Begin</span>';
  dialog.append(start);return {releaseAudio:()=>audio};
 }};};
 const append=w.document.head.append.bind(w.document.head);
 w.document.head.append=(...nodes)=>{append(...nodes);for(const n of nodes)if(n.tagName==='LINK')queueMicrotask(()=>n.onload());};
 const script=w.document.createElement('script');w.document.body.append(script);
 Object.defineProperty(w.document,'currentScript',{value:script,configurable:true});
 w.eval(controller.replace('import(moduleURL)','window.testImport(moduleURL)'));
 return {...e,stats:()=>({requests,locks,releases,mounts,aborts,stops,assetMap}),audio,open:()=>w.TDBFiveSensesEntry.open(w.document.querySelector('#open'))};
}
test('controller evaluates without CSS/module requests and malformed assets retain complete defaults',async()=>{
 const e=shell({assets:'{bad'});assert.equal(e.stats().requests,0);assert.equal(e.w.document.querySelectorAll('link').length,0);
 e.open();await tick();assert.equal(e.stats().requests,1);assert.match(e.stats().assetMap['surgery-warm.webp'],/^https:/);assert.match(e.stats().assetMap['calm.mp3'],/piano-birdsong/);
 e.w.TDBFiveSensesEntry.destroy();assert.equal(e.stats().locks,e.stats().releases);e.close();
});
test('missing morph decoration reveals a usable start instead of leaving the loading cover',async()=>{
 const e=shell({simple:true});e.open();await tick();
 assert.equal(e.w.document.querySelector('.tdb-senses-loading-view'),null);
 assert.equal(e.w.document.querySelector('.tdb-senses-start').inert,false);
 assert.equal(e.w.document.querySelector('[data-senses-handover]'),null);e.w.TDBFiveSensesEntry.destroy();e.close();
});
test('normal morph completes; close releases lock, restores focus and carries audio control',async()=>{
 const e=shell();e.open();await tick();
 assert.equal(e.w.document.querySelector('.tdb-senses-loading-view'),null);
 e.w.document.querySelector('.tdb-senses-persistent-close').click();await tick();
 assert.equal(e.w.document.querySelector('dialog'),null);assert.equal(e.stats().releases,1);
 assert.equal(e.w.document.activeElement.id,'open');
 const audioButton=e.w.document.querySelector('.tdb-senses-page-audio');assert.ok(audioButton);audioButton.click();assert.equal(e.audio.muted,true);
 e.w.TDBFiveSensesEntry.destroy();assert.equal(e.w.document.querySelector('.tdb-senses-page-audio'),null);e.close();
});
test('missing start aborts partial mount and provides retry; closing remains available',async()=>{
 const e=shell({noStart:true});e.open();await tick();
 assert.ok(e.w.document.querySelector('.tdb-senses-loading-retry'));assert.equal(e.stats().aborts,1);
 e.w.document.querySelector('.tdb-senses-persistent-close').click();await tick();assert.equal(e.stats().releases,1);e.close();
});

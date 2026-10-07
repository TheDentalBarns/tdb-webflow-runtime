const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
require('node:events').setMaxListeners(0);
const source=file=>fs.readFileSync(path.join(__dirname,'../',file),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));

function motion(kind,{coarse=true}={}){
 const w=new EventTarget(),d=new EventTarget(),frames=new Map();let now=0,seq=0,top=800;
 Object.assign(w,{scrollY:0,innerWidth:390,innerHeight:800});
 Object.assign(d,{hidden:false,documentElement:{},body:{}});
 const attrs=kind==='bg'?{'data-tdb-parallax-mode':'opacity','data-tdb-parallax-fade-curve':'0:.38,.06:.28,.14:.18,.25:.12,.75:.12,.92:.45'}:{'data-tdb-parallax-from':'15%','data-tdb-parallax-to':'-10%','data-tdb-parallax-crop':'allow','data-tdb-parallax-reveal-in':'.7','data-tdb-parallax-reveal-out':'.7','data-tdb-parallax-reveal-out-end':'.45'};
 const overlay={style:{opacity:'.38'},getAttribute:name=>name==='data-tdb-parallax-fade'?'0':null};
 const node=Object.assign(new EventTarget(),{style:{opacity:'0',transform:''},getBoundingClientRect:()=>({height:800,top:top-w.scrollY,bottom:top-w.scrollY+800})});
 const wrapper=Object.assign(new EventTarget(),{style:{},getAttribute:name=>attrs[name]??null,querySelector:selector=>selector==='[data-tdb-parallax-frame]'?{getBoundingClientRect:()=>({height:800})}:node,querySelectorAll:()=>kind==='bg'?[overlay]:[],getBoundingClientRect:()=>({top:top-w.scrollY,bottom:top+(kind==='bg'?800:1600)-w.scrollY,height:kind==='bg'?800:1600})});
 let observer;
 vm.runInNewContext(source('src/shared/motion.js'),{window:w,document:d,AbortController,performance:{now:()=>now},getComputedStyle:n=>({transform:n.style.transform||'none',opacity:n.style.opacity||'0'}),DOMMatrixReadOnly:class{constructor(){this.m42=0;}},requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq;},cancelAnimationFrame:id=>frames.delete(id),matchMedia:()=>({matches:coarse}),ResizeObserver:class{constructor(fn){observer=fn;}observe(){}unobserve(){}disconnect(){}}});
 const api=w.TDBMotion.pageBreaks([wrapper]);
 const flush=()=>{const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn());};
 function step(y,{height,input=true,time=100,end=false}={}){now+=time;if(input)w.dispatchEvent(new Event('touchmove'));w.scrollY=y;if(height){w.innerHeight=height;w.dispatchEvent(new Event('resize'));observer();}w.dispatchEvent(new Event('scroll'));if(end)w.dispatchEvent(new Event('scrollend'));flush();return read();}
 const read=()=>+(kind==='bg'?overlay.style.opacity:node.style.opacity);
 return {w,d,api,step,read,flush,frames,layout(value){top=value;observer();flush();}};
}
for(const kind of ['bg','sketch']){
 test(`${kind}: mobile toolbar resize and observer notifications do not freeze scroll`,()=>{
  const t=motion(kind);try{
   for(const [i,y]of[100,400,800,1000,1200,1400].entries()){
    t.step(y,{height:810+i*10});
    if(kind==='bg'&&y===800)assert(t.read()<.2,`background should fade, got ${t.read()}`);
   }
   if(kind==='sketch')assert(t.read()>.95,`sketch should reveal, got ${t.read()}`);
   const painted=t.read();t.w.innerHeight+=40;t.w.dispatchEvent(new Event('resize'));t.flush();
   assert.equal(t.read(),painted,'height-only event cannot animate an idle section');
   assert.equal(t.frames.size,0);
  }finally{t.api.destroy();}
 });
 test(`${kind}: continuous momentum beyond two seconds matches fresh-input scrolling`,()=>{
  const expected=motion(kind),actual=motion(kind);try{
   for(let i=1;i<=35;i++){
    expected.step(i*40);actual.step(i*40,{input:i===1,end:i===35});
    assert(Math.abs(actual.read()-expected.read())<.00001,`momentum frame ${i}`);
   }
   const held=actual.read();actual.step(1450,{input:false,time:25});
   assert.equal(actual.read(),held,'scrollend prevents a later programmatic move from consuming correction');
  }finally{expected.api.destroy();actual.api.destroy();}
 });
 test(`${kind}: layout changes, rotation and restored pages retain the painted frame`,()=>{
  const t=motion(kind);try{
   t.step(1000);let held=t.read();t.layout(850);assert.equal(t.read(),held);
   t.w.innerWidth=844;t.step(1050,{height:390});assert.equal(t.read(),held,'width change rebases');
   t.w.dispatchEvent(new Event('pagehide'));t.w.dispatchEvent(new Event('pageshow'));t.flush();
   held=t.read();t.step(1100,{input:false,time:25});assert.equal(t.read(),held,'restoration is not an active gesture');
   t.step(1450);assert.notEqual(t.read(),held,'fresh input resumes motion');
  }finally{t.api.destroy();}
 });
}
test('desktop height resize continues to rebase a visible parallax section',()=>{
 const t=motion('sketch',{coarse:false});try{t.step(1000);const held=t.read();t.step(1100,{height:700});assert.equal(t.read(),held);}finally{t.api.destroy();}
});

for(const kind of ['dd','page-break'])test(`${kind}: repeated failed downloads recover with touch and online, without duplicate mounts`,async()=>{
 const w=new EventTarget(),d=new EventTarget();let attempts=0,mounts=0,finish;
 const image={style:{opacity:'0'}};
 const node={isConnected:true,closest:()=>null,matches:()=>false,hasAttribute:()=>false,getAttribute:n=>n==='data-tdb-parallax-reveal-in'?'.7':null,querySelector:()=>image};
 Object.assign(d,{readyState:'complete',currentScript:{src:`https://cdn.example.test/dist/tdb-${kind}-loader.js`},body:{},querySelectorAll:()=>[node]});
 w.TDBModules={load:()=>{attempts++;return new Promise((resolve,reject)=>{finish=()=>attempts<3?reject(Error('offline')):resolve();});}};
 w.TDBMotion={ddText(){mounts++;return{destroy(){}}},pageBreaks(){mounts++;return{refresh(){},status:()=>[]}}};
 vm.runInNewContext(source(kind==='dd'?'src/shared/dd-loader.js':'src/page-break/loader.js'),{window:w,document:d,URL,MutationObserver:class{observe(){}disconnect(){}},queueMicrotask,console:{warn(){}}});
 assert.equal(attempts,1);finish();await settle();
 if(kind==='page-break')assert.equal(image.style.opacity,'1','failed reveal stays visible as a static fallback');
 w.dispatchEvent(new Event('touchstart'));w.dispatchEvent(new Event('pointerdown'));assert.equal(attempts,2,'one in-flight request');
 finish();await settle();w.dispatchEvent(new Event('online'));assert.equal(attempts,3);finish();await settle();assert.equal(mounts,1);
 for(const event of ['touchstart','wheel','online'])w.dispatchEvent(new Event(event));await settle();
 assert.equal(attempts,3);assert.equal(mounts,1);
});

function consent(initial){
 const w=new EventTarget(),d=new EventTarget(),scripts=[];let state=initial,reloads=0,cookieWrites=0;
 Object.assign(w,{CookieScript:{instance:{currentState(){if(state instanceof Error)throw state;return state;}}},location:{hostname:'dentalbarns.webflow.io',reload(){reloads++;}}});
 Object.assign(d,{visibilityState:'visible',querySelector:()=>null,createElement:()=>({setAttribute(){}}),head:{appendChild:s=>scripts.push(s)}});
 Object.defineProperty(d,'cookie',{set(){cookieWrites++;}});
 vm.runInNewContext(source('src/consent/brevo.js'),{window:w,document:d});
 return{w,d,scripts,set:value=>{state=value},stats:()=>({reloads,cookieWrites})};
}
test('unknown consent blocks startup and cannot reload a previously authorised page',()=>{
 const t=consent(undefined);assert.equal(t.scripts.length,0);
 t.set({action:'accept',categories:['targeting']});t.w.dispatchEvent(new Event('CookieScriptAccept'));assert.equal(t.scripts.length,1);
 for(const unknown of [undefined,{}, {action:'accept'},new Error('controller resuming')]){
  t.set(unknown);t.w.dispatchEvent(new Event('pageshow'));t.d.dispatchEvent(new Event('visibilitychange'));
 }
 assert.deepEqual(t.stats(),{reloads:0,cookieWrites:0});
 t.set({action:'accept',categories:['targeting']});t.w.dispatchEvent(new Event('CookieScriptLoaded'));assert.equal(t.scripts.length,1);
});
for(const explicitEvent of [false,true])test(`confirmed targeting withdrawal still clears cookies and reloads once (reject event ${explicitEvent})`,()=>{
 const t=consent({action:'accept',categories:['targeting']});
 t.set(explicitEvent?undefined:{action:'accept',categories:['strict']});
 t.w.dispatchEvent(new Event(explicitEvent?'CookieScriptReject':'CookieScriptAccept'));
 t.w.dispatchEvent(new Event('pageshow'));assert.equal(t.stats().reloads,1);assert(t.stats().cookieWrites>=2);
});

function boot(){
 const w=new EventTarget(),scripts=[],timers=new Map();let id=0;
 const d={readyState:'complete',currentScript:{src:'https://cdn.example.test/new/dist/batch.js',dataset:{tdbRuntimeBase:'https://cdn.example.test/preserved/dist/'}},querySelector:()=>null,createElement:()=>Object.assign(new EventTarget(),{attrs:{},setAttribute(k,v){this.attrs[k]=v;}}),head:{appendChild:s=>scripts.push(s)}};
 vm.runInNewContext(source('src/runtime/immediate-runtime-batch.js'),{window:w,document:d,URL,Event,console,setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:i=>timers.delete(i)});
 return{w,scripts,timers};
}
test('optional attribution can stall without blocking priority UI or changing the footer pin',async()=>{
 const t=boot();for(const s of t.scripts)if(!('data-tdb-attribution-js'in s.attrs))s.dispatchEvent(new Event('load'));
 await settle();assert.equal(t.w.TDBImmediateRuntimeBatch.status().priorityReady,true);
 assert.equal(t.scripts.find(s=>'data-tdb-footer-runtime-js'in s.attrs).src,'https://cdn.example.test/preserved/dist/tdb-footer-runtime.min.js');
 for(const fn of [...t.timers.values()])fn();await t.w.TDBImmediateRuntimeBatch.ready;assert.equal(t.timers.size,0);
});
test('a blocked required host has a finite startup timeout',async()=>{
 const t=boot();for(const s of t.scripts)if(!('data-cookie-script-js'in s.attrs))s.dispatchEvent(new Event('load'));
 await settle();assert.equal(t.w.TDBImmediateRuntimeBatch.status().priorityReady,false);
 for(const fn of [...t.timers.values()])fn();await t.w.TDBImmediateRuntimeBatch.priorityReady;
 assert.equal(t.w.TDBImmediateRuntimeBatch.status().priorityReady,true);
});

test('slider focus survives toolbar/keyboard height changes but clears on width change or rotation',()=>{
 const w=new EventTarget(),d=new EventTarget(),classes=new Set();let releases=0;
 const html={dataset:{},scrollTop:0,classList:{contains:s=>classes.has(s),add:s=>classes.add(s),remove:s=>classes.delete(s)}};
 Object.assign(d,{documentElement:html,body:{},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null});
 Object.assign(w,{scrollY:1000,innerWidth:390,innerHeight:800,TDBNavScroll:{focus(){},release(){releases++;}}});
 const slider={closest:()=>null};
 const button={closest(selector){if(selector==='.logo-slider'||selector.includes('[disabled]')||selector.includes('input,textarea')||selector.includes('.navbar10_component'))return null;if(selector.includes('.swiper-btn-prev'))return button;if(selector.includes('.highlight-swiper_component'))return slider;return null;}};
 vm.runInNewContext(source('src/shared/slider-focus.js'),{window:w,document:d,MutationObserver:class{observe(){}},getComputedStyle:()=>({getPropertyValue:()=>''}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){}});
 function focus(){const event=new Event('pointerdown');Object.defineProperty(event,'target',{value:button});Object.assign(event,{button:0,pointerId:1,isPrimary:true,clientX:100,clientY:100});d.dispatchEvent(event);assert(classes.has('tdb-slider-focus'));}
 focus();w.innerHeight=860;w.dispatchEvent(new Event('resize'));assert(classes.has('tdb-slider-focus'));assert.equal(releases,0);
 w.innerWidth=844;w.dispatchEvent(new Event('resize'));assert(!classes.has('tdb-slider-focus'));assert.equal(releases,1);
 focus();w.dispatchEvent(new Event('orientationchange'));assert(!classes.has('tdb-slider-focus'));assert.equal(releases,2);
});

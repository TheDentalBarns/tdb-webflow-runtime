const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../src/runtime/site-asset-loader.js','utf8');
const snapshot=source.slice(0,source.indexOf('\n(() => {'));
function announcement(y=0){
 const events={},frames=[],idle=[],log=[],classes=new Set();let loaded=0;
 const root={classList:{toggle(name,on){log.push('write');on?classes.add(name):classes.delete(name);}},get scrollTop(){throw Error('unnecessary root scroll read');}};
 const body={append(node){log.push('move');node.parentElement=body;}};
 const shell={parentElement:{}};
 const window={get scrollY(){log.push('read');return y;},TDBAnnouncementLoader:{load(){loaded++;return Promise.resolve({mount(){}});}}};
 const document={documentElement:root,body,querySelector:s=>s.startsWith('[data-tdb-announcement]')?shell:null,getElementById:()=>shell};
 const context={window,document,location:{pathname:'/'},matchMedia:()=>({matches:false,addEventListener(){}}),innerHeight:800,addEventListener:(type,fn)=>(events[type]??=[]).push(fn),removeEventListener(){},requestAnimationFrame:fn=>(frames.push(fn),frames.length),requestIdleCallback:fn=>idle.push(fn),MutationObserver:class{observe(){}}};
 window.requestIdleCallback=context.requestIdleCallback;
 vm.runInNewContext(source.slice(0,source.indexOf('\n})();')+6),context);
 return {log,classes,shell,setY:n=>{y=n;},fire:type=>events[type]?.forEach(fn=>fn()),frame:()=>{while(frames.length)frames.shift()(123456);},idle:()=>{while(idle.length)idle.shift()();},loaded:()=>loaded};
}
test('announcement pageshow reads before visibility writes, preserving thresholds',()=>{
 const a=announcement();a.log.length=0;a.fire('pageshow');
 assert.deepEqual(a.log,['read','write']);assert(a.classes.has('tdb-timer-hidden'));assert.equal(a.loaded(),0);
 a.setY(3300);a.fire('scroll');a.frame();assert(!a.classes.has('tdb-timer-hidden'));
 a.setY(0);a.fire('scroll');a.frame();assert(a.classes.has('tdb-timer-hidden'),'frame timestamp must never become scroll position');
});
test('announcement measures before moving its native shell',()=>{
 const a=announcement(3500);a.log.length=0;a.fire('pointerdown');a.idle();
 assert.deepEqual(a.log,['read','move','write']);assert.equal(a.loaded(),1);assert(!a.classes.has('tdb-timer-hidden'));
});
function vip(initialY=0){
 let y=initialY,loads=0,flushes=0,resumed;const events={};
 const drawer={setAttribute(){},getBoundingClientRect(){flushes++;},removeAttribute(){}};
 const document={documentElement:{getAttribute:()=> '677cf86df9952f978d94d8a9'},currentScript:{src:'https://example.test/dist/tdb-footer-runtime.min.js'},getElementById:()=>drawer,querySelector:()=>null,addEventListener(){},removeEventListener(){}};
 const window={get scrollY(){return y;},addEventListener:(type,fn)=>events[type]=fn,removeEventListener:type=>delete events[type]};
 const context={window,document,URL,location:{hash:''},innerHeight:800,console,Element:class{},tdbPreloadVIPScript(){},tdbEnsureUI:()=>Promise.resolve(),tdbEnsureVIPUI:()=>Promise.resolve(),tdbUIIsReady:()=>true,tdbLoadVIPScript:()=>{loads++;window.TDBVIPDrawer={resumeScroll:seed=>{resumed={...seed};}};return Promise.resolve();}};
 const start=source.indexOf('function prepareVIPDrawerLoader() {'),end=source.indexOf('\nfunction prepareSliderLoader()',start);
 vm.runInNewContext(snapshot+'\n'+source.slice(start,end)+'\nprepareVIPDrawerLoader();',context);
 return {window,loads:()=>loads,flushes:()=>flushes,resumed:()=>resumed,scroll:n=>{y=n;events.scroll?.();}};
}
test('homepage VIP stays demand-loaded and retains scroll direction and preparation',async()=>{
 const v=vip();await new Promise(setImmediate);assert.equal(v.loads(),0);
 v.scroll(950);v.scroll(600);await new Promise(setImmediate);
 assert.equal(v.loads(),1);assert.equal(v.flushes(),1);
 assert.equal(v.resumed().peek,true);assert.equal(v.resumed().lastY,600);
});
test('restored homepage scroll prepares VIP immediately',async()=>{
 const v=vip(900);await new Promise(setImmediate);assert.equal(v.loads(),1);assert.equal(v.resumed().lastY,900);
});

// Exercise both production listeners together: separate component tests cannot
// catch a visibility write in one listener followed by a read in the other.
function combined({shellPresent=true,drawerPresent=true}={}) {
 let y=0,height=800,loads=0;const log=[],events=new Map(),frames=[];
 const add=(type,fn)=>{if(!events.has(type))events.set(type,new Set());events.get(type).add(fn);};
 const remove=(type,fn)=>events.get(type)?.delete(fn);
 const root={getAttribute:()=> '677cf86df9952f978d94d8a9',classList:{toggle(){log.push('write');}},get scrollTop(){throw Error('root fallback read');}};
 const shell={},drawer={setAttribute(){},getBoundingClientRect(){return {};}};
 const window={get scrollY(){log.push('scroll');return y;},addEventListener:add,removeEventListener:remove};
 const document={documentElement:root,currentScript:{src:'https://example.test/dist/tdb-footer-runtime.min.js'},getElementById:id=>id==='tdb-vip-drawer'?(drawerPresent?drawer:null):(shellPresent?shell:null),querySelector:()=>null,addEventListener(){},removeEventListener(){}};
 const context={window,document,URL,location:{pathname:'/',hash:''},get innerHeight(){log.push('height');return height;},console,Element:class{},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:add,removeEventListener:remove,requestAnimationFrame:fn=>frames.push(fn),setTimeout(){},tdbPreloadVIPScript(){loads++;},tdbEnsureUI:()=>new Promise(()=>{}),tdbEnsureVIPUI:()=>Promise.resolve(),tdbUIIsReady:()=>true};
 const first=source.slice(0,source.indexOf('\n})();')+6),start=source.indexOf('function prepareVIPDrawerLoader() {'),end=source.indexOf('\nfunction prepareSliderLoader()',start);
 vm.runInNewContext(first+'\n'+source.slice(start,end)+'\nprepareVIPDrawerLoader();',context);
 return {log,loads:()=>loads,pageshow(nextY,nextHeight,persisted=false){y=nextY;height=nextHeight;log.length=0;const event={type:'pageshow',persisted};events.get('pageshow').forEach(fn=>fn(event));}};
}
test('announcement and VIP share one pageshow snapshot before either writes',()=>{
 const c=combined();c.pageshow(0,800);
 assert.deepEqual(c.log,['scroll','height','write']);assert.equal(c.loads(),0,'normal load at top remains lazy');
 c.pageshow(900,700,true);
 assert.deepEqual(c.log,['scroll','height'],'restoration takes a fresh snapshot, not the previous zero');
 assert.equal(c.loads(),1,'restored position still triggers VIP preparation');
});
test('shared pageshow position works when either native component is absent',()=>{
 const noShell=combined({shellPresent:false});noShell.pageshow(900,800,true);
 assert.deepEqual(noShell.log,['scroll','height']);assert.equal(noShell.loads(),1);
 const noDrawer=combined({drawerPresent:false});noDrawer.pageshow(0,800);
 assert.deepEqual(noDrawer.log,['scroll','height','write']);assert.equal(noDrawer.loads(),0);
});

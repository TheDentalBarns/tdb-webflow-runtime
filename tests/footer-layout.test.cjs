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

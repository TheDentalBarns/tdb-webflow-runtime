const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
function setup(){
 const dom=new JSDOM('<section><div></div></section>',{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,root=w.document.querySelector('section'),target=root.firstElementChild;
 const frames=new Map(),timers=new Map(),observers=[];let serial=0,hidden=false;
 Object.defineProperty(w.document,'hidden',{get:()=>hidden});
 w.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};w.cancelAnimationFrame=id=>frames.delete(id);
 w.setTimeout=(fn,delay)=>{timers.set(++serial,{fn,delay});return serial;};w.clearTimeout=id=>timers.delete(id);
 w.IntersectionObserver=class{constructor(fn,options){this.fn=fn;this.options=options;observers.push(this);}observe(node){this.node=node;}disconnect(){this.disconnected=true;}notify(ratio){this.fn([{isIntersecting:ratio>0,intersectionRatio:ratio}]);}};
 w.TDBMotion={carousel:{entryStart:123}};
 w.eval(fs.readFileSync(path.join(__dirname,'../dist/tdb-swiper-8.4.7.min.js'),'utf8'));
 const frame=()=>{const batch=[...frames];frames.clear();batch.forEach(([,fn])=>fn());};
 const timer=()=>{const batch=[...timers];timers.clear();batch.forEach(([,x])=>x.fn());};
 return{w,root,target,frames,timers,observers,frame,timer,hide(value){hidden=value;w.document.dispatchEvent(new w.Event('visibilitychange'));},close:()=>w.close()};
}
test('entry preserves frames/delay and is armed separately from visibility and preloading',()=>{
 const t=setup();try{
  let enters=0,ready=false;
  const entry=t.w.TDBSwiper.firstView(t.root,{target:t.target,armed:false,ready:()=>ready,enter:()=>enters++});
  t.observers[0].notify(1);assert.equal(t.frames.size,0);entry.arm();assert.equal(t.frames.size,0);
  ready=true;entry.arm();assert.equal(t.frames.size,1);t.frame();assert.equal(t.timers.size,0);t.frame();
  assert.equal([...t.timers.values()][0].delay,123);t.timer();assert.equal(enters,1);assert.equal(entry.pending,false);assert(t.observers[0].disconnected);
  entry.arm();t.observers[0].notify(1);t.frame();t.timer();assert.equal(enters,1);
 }finally{t.close();}
});
test('background and scroll-out pause pending work; return restarts the full entry sequence',()=>{
 const t=setup();try{
  let enters=0;
  t.w.TDBSwiper.firstView(t.root,{enter:()=>enters++});t.observers[0].notify(1);t.frame();t.hide(true);
  assert.equal(t.frames.size,0);assert.equal(t.timers.size,0);t.hide(false);t.frame();t.frame();
  assert.equal(t.timers.size,1);t.observers[0].notify(0);assert.equal(t.timers.size,0);t.timer();assert.equal(enters,0);
  t.observers[0].notify(1);t.frame();t.frame();t.timer();assert.equal(enters,1);
 }finally{t.close();}
});
test('quote threshold retains its zero-frame delay and input cancels once',()=>{
 const t=setup();try{
  const cancellations=[];let enters=0;
  const entry=t.w.TDBSwiper.firstView(t.root,{threshold:.2,frames:0,enter:()=>enters++,cancel:reason=>cancellations.push(reason)});
  t.observers[0].notify(.19);assert.equal(t.timers.size,0);t.observers[0].notify(.2);assert.equal(t.frames.size,0);assert.equal(t.timers.size,1);
  t.root.dispatchEvent(new t.w.Event('pointerdown',{bubbles:true}));t.root.dispatchEvent(new t.w.Event('focusin',{bubbles:true}));t.timer();
  assert.equal(enters,0);assert.deepEqual(cancellations,['interaction']);assert.equal(entry.pending,false);assert(t.observers[0].disconnected);
 }finally{t.close();}
});
test('detachment, explicit destruction and abort release timers and observers without stale entry',()=>{
 for(const mode of ['detach','destroy','abort']){
  const t=setup();try{
   let enters=0;const cancellations=[],signal=new t.w.AbortController();
   const entry=t.w.TDBSwiper.firstView(t.root,{signal:signal.signal,frames:0,enter:()=>enters++,cancel:x=>cancellations.push(x)});
   t.observers[0].notify(1);
   if(mode==='detach')t.root.remove();else if(mode==='destroy')entry.destroy();else signal.abort();
   t.timer();assert.equal(enters,0);assert.equal(entry.pending,false);assert.equal(t.timers.size,0);assert(t.observers[0].disconnected);
   assert.deepEqual(cancellations,mode==='detach'?['detached']:mode==='abort'?['destroyed']:[]);
  }finally{t.close();}
 }
});
test('portrait parallax can enter immediately while still respecting background-tab suspension',()=>{
 const t=setup();try{
  let enters=0;t.hide(true);
  t.w.TDBSwiper.firstView(t.root,{observe:false,frames:0,delay:0,immediate:true,enter:()=>enters++});
  assert.equal(enters,0);t.hide(false);assert.equal(enters,1);assert.equal(t.frames.size+t.timers.size,0);assert.equal(t.observers.length,0);
 }finally{t.close();}
});
test('unsupported observation settles the consumer fallback instead of stranding pending content',()=>{
 const t=setup();try{delete t.w.IntersectionObserver;const reasons=[];const entry=t.w.TDBSwiper.firstView(t.root,{enter(){throw Error('unexpected entry');},cancel:x=>reasons.push(x)});assert.deepEqual(reasons,['unsupported']);assert.equal(entry.pending,false);}finally{t.close();}
});

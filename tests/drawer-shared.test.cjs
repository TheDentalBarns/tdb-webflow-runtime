const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const read=path=>fs.readFileSync(__dirname+'/../'+path,'utf8');
function setup(html=''){
 const dom=new JSDOM(html,{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'}),w=dom.window;
 const query=new w.EventTarget();query.matches=false;w.matchMedia=()=>query;
 const observers=[];w.ResizeObserver=class{constructor(fn){this.fn=fn;observers.push(this)}observe(){}disconnect(){this.disconnected=true}};
 w.TDBMotion={duration:width=>Math.round(width/2),reduced:{matches:false,addEventListener(){}}};
 w.eval(read('dist/tdb-swiper-8.4.7.min.js'));
 w.TDBSwiper={onSettled(swiper,fn){swiper.on('settled',fn);return()=>swiper.off('settled',fn)}};
 w.eval(read('dist/tdb-modules.js'));w.eval(read('dist/tdb-drawer.js'));
 return {w,doc:w.document,query,observers,close:()=>w.close()};
}
function swiper(slides=[]){
 const listeners=new Map();return {slides,activeIndex:0,visibleSlides:[],params:{},originalParams:{},animating:false,updates:0,
 on(names,fn){for(const name of names.split(' ')){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn)}},
 off(names,fn){for(const name of names.split(' '))listeners.get(name)?.delete(fn)},
 emit(name){for(const fn of listeners.get(name)||[])fn()},update(){this.updates++;this.emit('update')}
 };
}
test('loop copies expose exactly the active physical slide, including loopFix and teardown',()=>{
 const t=setup('<div id="track"><div data-swiper-slide-index="0"></div><div data-swiper-slide-index="1"></div><div data-swiper-slide-index="0"></div></div>');
 try{
  const slides=[...t.doc.querySelector('#track').children],s=swiper(slides);s.visibleSlides=slides;
  const api=t.w.TDBCarouselVisibility.bind(s,{activeOnly:true});
  const exposed=()=>slides.filter(n=>!n.hasAttribute('inert')&&n.getAttribute('aria-hidden')==='false');
  assert.deepEqual(exposed(),[slides[0]]);s.activeIndex=2;s.emit('loopFix');assert.deepEqual(exposed(),[slides[2]]);
  s.activeIndex=1;s.emit('slideChange');assert.deepEqual(exposed(),[slides[1]]);
  api.destroy();assert(slides.every(n=>!n.hasAttribute('aria-hidden')&&!n.hasAttribute('inert')));
 }finally{t.close()}
});
test('landscape preserves reading/footer positions and ignores its own height changes',()=>{
 const t=setup('<div id="pane"><header></header><div id="viewport"><div id="track"><article id="slide"></article></div></div><footer></footer></div>');
 try{
  const pane=t.doc.querySelector('#pane'),viewport=t.doc.querySelector('#viewport'),track=t.doc.querySelector('#track'),slide=t.doc.querySelector('#slide'),footer=t.doc.querySelector('footer');
  const metrics={height:1200,width:600};Object.defineProperties(pane,{scrollHeight:{get:()=>metrics.height},clientHeight:{value:400}});
  Object.defineProperty(viewport,'clientWidth',{get:()=>metrics.width});Object.defineProperty(footer,'offsetHeight',{value:80});
  const s=swiper([slide]);let modes=[];
  const reader=t.w.TDBDrawerReading.mount({pane,footer,viewport,track,nodes:()=>[pane,slide],slideScroll:()=>slide,swiper:()=>s,active:()=>true,onMode:value=>modes.push(value)});
  reader.bind();slide.scrollTop=170;t.query.matches=true;t.query.dispatchEvent(new t.w.Event('change'));
  assert.equal(reader.scroll(),pane);assert.equal(pane.scrollTop,170);assert.equal(s.params.autoHeight,true);
  pane.scrollTop=730;reader.capture();metrics.height=900;reader.apply();assert.equal(pane.scrollTop,430,'retain the footer distance from the bottom');
  reader.clear();pane.scrollTop=180;reader.capture();metrics.height=1100;reader.apply();assert.equal(pane.scrollTop,180,'retain the reading offset when footer is not in view');
  const updates=s.updates;t.observers[0].fn();assert.equal(s.updates,updates,'height output must not trigger another Swiper update');
  metrics.width=650;t.observers[0].fn();assert.equal(s.updates,updates+1);
  s.animating=true;const speed=s.params.speed;t.w.innerWidth=1400;t.w.dispatchEvent(new t.w.Event('resize'));assert.equal(s.params.speed,speed,'never retime an in-flight transition');
  s.animating=false;s.emit('settled');assert.equal(s.params.speed,700);
  t.query.matches=false;t.query.dispatchEvent(new t.w.Event('change'));assert.equal(slide.scrollTop,180);assert.equal(s.params.autoHeight,false);
  reader.destroy();assert(t.observers[0].disconnected);assert.deepEqual(modes,[true,false]);
 }finally{t.close()}
});
test('shared scroll lock allows inner scrolling but blocks page and edge chaining',()=>{
 const t=setup('<main>Page</main><aside><div id="scroll" style="overflow-y:auto"><span>Content</span></div></aside>');
 try{
  const node=t.doc.querySelector('#scroll');Object.defineProperties(node,{clientHeight:{value:200},scrollHeight:{value:600}});
  const release=t.w.TDBScrollLock.acquire({allow:[t.doc.querySelector('aside')]});
  const wheel=(target,delta)=>{const event=new t.w.WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:delta});target.dispatchEvent(event);return event.defaultPrevented};
  node.scrollTop=100;assert.equal(wheel(node.firstElementChild,40),false);assert.equal(wheel(t.doc.querySelector('main'),40),true);
  node.scrollTop=400;assert.equal(wheel(node,40),true);assert.equal(wheel(node,-40),false);
  release();assert.equal(wheel(t.doc.querySelector('main'),40),false);
 }finally{t.close()}
});
test('busy state deduplicates opens and aborted completion cannot clear a newer operation',async()=>{
 const t=setup('<button id="trigger">Open</button>');
 try{
  const button=t.doc.querySelector('button'),controller=new t.w.AbortController();let finishOld,finishNew,calls=0;
  const old=t.w.TDBModules.withBusy(button,()=>{calls++;return new Promise(resolve=>finishOld=resolve)},{signal:controller.signal});
  await t.w.TDBModules.withBusy(button,()=>{calls++});assert.equal(calls,1);assert.equal(button.getAttribute('data-tdb-loading'),'true');
  controller.abort();assert.equal(button.hasAttribute('aria-busy'),false);
  const fresh=t.w.TDBModules.withBusy(button,()=>new Promise(resolve=>finishNew=resolve));finishOld();await old;
  assert.equal(button.getAttribute('aria-busy'),'true');finishNew();await fresh;assert.equal(button.hasAttribute('data-tdb-loading'),false);
  let error;await t.w.TDBModules.withBusy(button,async()=>{throw Error('Offline')},{onError:e=>error=e});assert.equal(error.message,'Offline');assert.equal(button.hasAttribute('aria-busy'),false);
 }finally{t.close()}
});
test('shared controls keep editable fields and disabled buttons out of navigation',()=>{
 const t=setup('<section><div id="prev" aria-disabled="true"></div><div id="next"></div><input></section>');
 try{
  const root=t.doc.querySelector('section'),previous=t.doc.querySelector('#prev'),next=t.doc.querySelector('#next'),moves=[],controller=new t.w.AbortController();
  t.w.TDBCarouselControls.bind({root,previous,next,navigate:direction=>moves.push(direction),signal:controller.signal});
  previous.click();next.click();next.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  t.doc.querySelector('input').dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  root.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));assert.deepEqual(moves,[1,1,-1]);
  controller.abort();next.click();assert.equal(moves.length,3);
 }finally{t.close()}
});

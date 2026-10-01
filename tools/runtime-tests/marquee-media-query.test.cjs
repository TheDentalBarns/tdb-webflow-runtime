const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../../dist/tdb-logo-marquee.js'),'utf8');
function fixture(t,{width=390,reduced=false}={}){
 let now=0,id=0;const frames=new Map(),observers=[],media=[];
 const dom=new JSDOM('<!doctype html><div class="logo-slider"><div class="partner-featured_component">'+Array.from({length:6},(_,i)=>'<div class="partner_logos"><img class="logo_image" alt="Logo '+i+'"></div>').join('')+'</div></div><button id="outside">Outside</button>',{runScripts:'outside-only',pretendToBeVisual:true,beforeParse(w){
  w.matchMedia=q=>{const m={matches:q.includes('reduced-motion')?reduced:q.includes('min-width')?width>=992:width<=767,addEventListener(){}};media.push(m);return m;};
  w.performance.now=()=>now;w.requestAnimationFrame=cb=>{frames.set(++id,cb);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
  w.IntersectionObserver=class{constructor(cb,options){this.cb=cb;this.options=options;observers.push(this);}observe(){}unobserve(){}disconnect(){}};
  Object.defineProperty(w.HTMLElement.prototype,'offsetLeft',{get(){return this.matches('.partner_logos')?[...this.parentElement.children].indexOf(this)*200:0;}});
  w.HTMLElement.prototype.getBoundingClientRect=function(){const track=this.closest('.partner-featured_component');const x=track?Number((track.style.transform.match(/translate3d\(([-.\d]+)/)||[])[1]||0):0;return this.matches('.partner_logos')?{left:this.offsetLeft+x,width:100}:{left:0,width};};
 }});
 t.after(()=>dom.window.close());const w=dom.window;w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const track=w.document.querySelector('.partner-featured_component'),view=track.parentElement;
 observers.find(o=>o.options.rootMargin==='600px 0px').cb([{target:track,isIntersecting:true}]);
 observers.find(o=>o.options.rootMargin==='200px 0px').cb([{target:track,isIntersecting:true}]);
 const tick=(ms=16)=>{now+=ms;const batch=[...frames.values()];frames.clear();batch.forEach(cb=>cb(now));};
 const pointer=(type,x,y=0,dt=16)=>{now+=dt;const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId:1,button:0,isPrimary:true});Object.defineProperty(e,'timeStamp',{value:now});track.dispatchEvent(e);};
 return {w,track,view,tick,pointer,status:()=>w.TDBLogoMarquee.status().instances[0],media};
}
test('desktop ignores reduced motion and keeps 40px/s; mobile retains 22px/s and preference',t=>{
 const a=fixture(t,{width:1366,reduced:true});a.tick(100);const x=a.status().targetX;a.tick(100);assert.ok(Math.abs(a.status().targetX-x+4)<1e-6);
 const b=fixture(t);b.tick(100);const y=b.status().targetX;b.tick(100);assert.ok(Math.abs(b.status().targetX-y+2.2)<1e-6);
 const c=fixture(t,{reduced:true});c.tick(100);assert.equal(c.status().currentX,0);
});
test('mobile throw carries release velocity into auto motion, suppresses delayed release-click and resumes outside',t=>{
 const a=fixture(t);a.tick();a.pointer('pointerdown',100);a.pointer('pointermove',150);a.pointer('pointermove',220);a.pointer('pointerup',220);
 const released=a.status().currentX;assert.ok(a.status().momentum>0);assert.equal(a.status().paused,false);
 a.track.dispatchEvent(new a.w.MouseEvent('click',{bubbles:true}));assert.ok(a.status().momentum>0);
 a.tick();assert.ok(a.status().currentX>released);const v=a.status().momentum;a.tick();assert.ok(a.status().momentum<v);
 for(let i=0;i<240;i++)a.tick();assert.equal(a.status().momentum,0);assert.equal(a.status().paused,false);assert.equal(a.status().selected,null);assert.ok(Math.abs(a.status().targetX-a.status().currentX)<.1);
 a.w.document.querySelector('#outside').click();assert.equal(a.status().paused,false);const x=a.status().currentX;a.tick();assert.ok(a.status().currentX<x);
});
test('catching a settle follows finger; vertical gesture and page scroll resume; reverse throws retain direction',t=>{
 const a=fixture(t);const item=a.track.children[2];item.click();a.tick();
 const x=a.status().currentX;a.pointer('pointerdown',200);a.pointer('pointermove',170);assert.equal(a.status().currentX,x-30);
 a.pointer('pointermove',120);a.pointer('pointerup',120);assert.ok(a.status().momentum<0);
 a.pointer('pointerdown',120);a.pointer('pointermove',120,40);assert.equal(a.status().paused,false);assert.equal(a.status().momentum,0);
 item.click();assert.equal(a.status().paused,true);Object.defineProperty(a.w,'scrollY',{value:120,configurable:true});a.w.dispatchEvent(new a.w.Event('scroll'));assert.equal(a.status().paused,false);
});
test('repeat selection resumes from same position and nearest centring survives loop boundaries',t=>{
 const a=fixture(t,{width:1366});a.tick();const item=a.track.children[0];item.click();for(let i=0;i<150;i++)a.tick();
 assert.equal(a.status().selected,'0');assert.equal(a.status().paused,true);
 const x=a.status().currentX;item.click();assert.equal(a.status().paused,false);assert.equal(a.status().currentX,x);
 assert.equal(a.media.length,3);
});

test('swipe after tap never re-centres, including delayed synthetic click and slow release',t=>{
 const a=fixture(t);const item=a.track.children[2];item.click();for(let i=0;i<150;i++)a.tick();
 a.pointer('pointerdown',200);a.pointer('pointermove',140);a.pointer('pointerup',140,0,120);
 assert.equal(a.status().paused,false);assert.equal(a.status().selected,null);
 for(let i=0;i<60;i++)a.tick();
 item.dispatchEvent(new a.w.MouseEvent('click',{bubbles:true}));
 assert.equal(a.status().paused,false);assert.equal(a.status().selected,null);
 const x=a.status().currentX;a.tick();assert.ok(a.status().currentX<x);
 a.pointer('pointerdown',140);a.pointer('pointerup',140);item.click();assert.equal(a.status().paused,true);assert.equal(a.status().selected,'2');
});

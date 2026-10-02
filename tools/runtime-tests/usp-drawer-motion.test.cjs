const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../dist/tdb-usp-drawer.js'),'utf8');

function setup(width=1440){
  const items=['Location','Standards','Experience','Results','Care'].map(title=>`<div class="banner-feature_item"><div class="banner-feature_item-content"></div><div class="modal1_component"><img class="usp-logo_top-image"><div class="usp-logo_top-wrapper"><span class="text-style-tagline">${title}</span></div><div class="modal-content-split"><img><div><p>${title} description</p></div></div></div></div>`).join('');
  const dom=new JSDOM(`<html><body><main>${items}</main></body></html>`,{url:'https://dentalbarns.webflow.io',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,pending=[],timers=[],captures=new Set();
  Object.defineProperty(w,'innerWidth',{value:width});
  w.matchMedia=()=>({matches:width>=992});w.scrollTo=()=>{};
  w.requestAnimationFrame=fn=>fn();w.ResizeObserver=class{observe(){}};
  w.setTimeout=(fn,ms)=>{timers.push({fn,ms});return timers.length};w.clearTimeout=()=>{};
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return width>=992?900:width}});
  w.HTMLElement.prototype.setPointerCapture=id=>captures.add(id);
  w.HTMLElement.prototype.hasPointerCapture=id=>captures.has(id);
  w.HTMLElement.prototype.releasePointerCapture=id=>captures.delete(id);
  w.DOMMatrixReadOnly=class{constructor(value){this.m41=Number(/translate3d\(([-.\d]+)/.exec(value)?.[1]||0)}};
  w.HTMLElement.prototype.animate=function(frames,options){
    let resolve;const finished=new Promise(r=>resolve=r),node=this;
    const animation={finished,frames,options,finish(){node.style.transform=frames.at(-1).transform;resolve()},cancel(){resolve()}};
    pending.push(animation);return animation;
  };
  w.eval(source);d.dispatchEvent(new w.Event('DOMContentLoaded'));
  d.querySelector('.tdb-usp-launch').click();
  const frame=d.querySelector('.tdb-usp-frame');
  function pointer(type,x,y=300,time=0){
    const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});
    Object.defineProperties(e,{pointerId:{value:1},isPrimary:{value:true},pointerType:{value:'touch'},timeStamp:{value:time}});
    frame.dispatchEvent(e);return e;
  }
  async function finish(){pending.splice(0).forEach(a=>a.finish());for(let i=0;i<6;i++)await Promise.resolve();}
  const current=()=>d.querySelector('.tdb-usp-slide');
  return {w,d,frame,pointer,pending,timers,captures,finish,current,close:()=>w.close()};
}

test('USP follows the pointer before release, then settles for remaining distance',async()=>{
  const a=setup();
  a.pointer('pointerdown',700);a.pointer('pointermove',500,305,500);
  assert.equal(a.current().style.transform,'translate3d(-200px,0,0)');
  assert.equal(a.frame.children[1].style.transform,'translate3d(700px,0,0)');
  assert.equal(a.pending.length,0,'no timed animation while the pointer is held');
  assert.ok(a.captures.has(1));
  a.pointer('pointerup',500,305,600);
  assert.equal(a.pending[0].options.duration,784*700/900);
  await a.finish();assert.equal(a.current().getAttribute('aria-label'),'Standards');
  assert.equal(a.frame.children.length,1);assert.equal(a.captures.size,0);a.close();
});

test('cancelled and short drags return to their starting slide; vertical input stays native',async()=>{
  const a=setup();
  a.pointer('pointerdown',700);a.pointer('pointermove',680,350,100);a.pointer('pointerup',680,350,500);
  assert.equal(a.frame.children.length,1);assert.equal(a.pending.length,0);
  a.pointer('pointerdown',700);a.pointer('pointermove',500,300,100);a.pointer('pointercancel',500,300,500);
  await a.finish();assert.equal(a.current().getAttribute('aria-label'),'Location');
  a.pointer('pointerdown',700);a.pointer('pointermove',670,300,100);a.pointer('pointerup',670,300,500);
  await a.finish();assert.equal(a.current().getAttribute('aria-label'),'Location');
  a.close();
});

test('direct dragging preserves infinite wrapping in both directions',async()=>{
  const a=setup();
  a.pointer('pointerdown',500);a.pointer('pointermove',750,300,100);a.pointer('pointerup',750,300,200);
  await a.finish();assert.equal(a.current().getAttribute('aria-label'),'Care');
  a.pointer('pointerdown',750);a.pointer('pointermove',500,300,300);a.pointer('pointerup',500,300,400);
  await a.finish();assert.equal(a.current().getAttribute('aria-label'),'Location');a.close();
});

test('arrows, opening and close cleanup use the same responsive timing',async()=>{
  for(const [width,expected] of [[390,400],[1440,784],[3840,950]]){
    const a=setup(width),overlay=a.d.querySelector('.tdb-usp-overlay');
    assert.equal(overlay.style.getPropertyValue('--usp-duration'),expected+'ms');
    a.d.querySelector('.tdb-usp-arrow:not(.is-prev)').click();
    assert.equal(a.pending[0].options.duration,expected);await a.finish();
    a.d.querySelector('.tdb-usp-dismiss').click();
    assert.equal(a.timers.at(-1).ms,expected);assert.equal(overlay.hidden,false);
    a.timers.at(-1).fn();assert.equal(overlay.hidden,true);a.close();
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('src/runtime/home-paint-window.js', 'utf8');
const idle = 'data-tdb-home-paint-idle', resuming = 'data-tdb-home-paint-resuming';
function setup({home = true, mobile = true, supported = true} = {}) {
  const dom = new JSDOM(`<html data-wf-page="${home ? '677cf86df9952f978d94d8a9' : '677cfb8a0f25478449823c5f'}"><body>
    <div class="tdb-service-parallax"><div class="tdb-service-card"><img src="/service.jpg"></div></div>
    <div data-tdb-treatment><div class="tdb-treatment-blur"></div></div>
    <div data-tdb-ig-placeholder><div class="ig-native_glass"></div></div>
    <div class="tdb-smile-placeholder" ${home ? 'data-tdb-smile-placeholder="home"' : ''}></div><nav></nav></body></html>`, {runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, d=w.document, ios=[], timers=new Map(), frames=new Map(), changes=new Set();
  let now=0, id=0;
  const media={matches:mobile,addEventListener(_,fn){changes.add(fn)},removeEventListener(_,fn){changes.delete(fn)}};
  w.matchMedia=()=>media;
  w.setTimeout=(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id};
  w.clearTimeout=id=>timers.delete(id);
  w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id};
  w.cancelAnimationFrame=id=>frames.delete(id);
  if(supported)w.IntersectionObserver=class{
    constructor(fn,opts){this.fn=fn;this.opts=opts;this.nodes=new Set();ios.push(this)}
    observe(n){this.nodes.add(n)}disconnect(){this.nodes.clear()}
  };
  w.eval(source);
  const owner=w.createHomePaintWindow(), roots=[...d.querySelectorAll('.tdb-service-parallax,[data-tdb-treatment],[data-tdb-ig-placeholder]')];
  return {w,d,owner,roots,ios,timers,frames,changes,
    notify(near,targets=roots,io=ios.at(-1)){io.fn(targets.map(target=>({target,isIntersecting:near})))},
    advance(ms){now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn()}},
    frame(){const pending=[...frames];frames.clear();pending.forEach(([,fn])=>fn())},
    mobile(value){media.matches=value;[...changes].forEach(fn=>fn())},
    close(){owner?.destroy();w.close()}
  };
}
test('guard is Home-only and leaves desktop / unsupported browsers unchanged',()=>{
  for(const options of [{home:false},{supported:false},{mobile:false}]){
    const f=setup(options);try{assert.equal(f.ios.length,0);assert(!f.d.querySelector(`[${idle}]`));}finally{f.close()}
  }
});
test('distant blur parking preserves image sources, card nodes and layout ownership',()=>{
  const f=setup();try{
    const card=f.d.querySelector('.tdb-service-card'), image=card.querySelector('img'), before=card.outerHTML;
    assert.equal(f.ios[0].nodes.size,3);
    f.notify(false,[f.roots[0]]);f.advance(179);assert(!f.roots[0].hasAttribute(idle));
    f.advance(1);assert(f.roots[0].hasAttribute(idle));
    assert.equal(card.outerHTML,before);assert.equal(card.querySelector('img'),image);
    assert.equal(f.d.querySelectorAll(`[${idle}]`).length,1);
    assert.equal(f.frames.size,0);assert.equal(f.timers.size,0);
    f.notify(true,[f.roots[0]]);assert(!f.roots[0].hasAttribute(idle));assert(f.roots[0].hasAttribute(resuming));
    f.frame();f.frame();assert(!f.roots[0].hasAttribute(resuming));assert.equal(f.frames.size,0);
  }finally{f.close()}
});
test('rapid boundary reversals cancel pending parking without accumulating work',()=>{
  const f=setup();try{
    for(let i=0;i<80;i++){f.notify(false);assert.equal(f.timers.size,3);f.advance(20);f.notify(true);assert.equal(f.timers.size,0)}
    f.advance(1000);assert(!f.d.querySelector(`[${idle}],[${resuming}]`));assert.equal(f.frames.size,0);
    f.notify(false);f.advance(180);f.notify(true);f.frame();f.notify(true);f.frame();f.frame();
    assert(!f.d.querySelector(`[${idle}],[${resuming}]`));assert.equal(f.frames.size,0);
  }finally{f.close()}
});
test('a new departure cancels an unfinished restoration and safely parks again',()=>{
  const f=setup();try{
    f.notify(false);f.advance(180);f.notify(true);f.frame();f.notify(false);f.advance(180);
    assert.equal(f.frames.size,0);assert.equal(f.d.querySelectorAll(`[${idle}]`).length,3);
    assert(!f.d.querySelector(`[${resuming}]`));
    f.notify(true);f.frame();f.frame();assert(!f.d.querySelector(`[${idle}],[${resuming}]`));
  }finally{f.close()}
});
test('breakpoint and bfcache resets discard stale observers; destroy restores all surfaces',()=>{
  const f=setup();try{
    const old=f.ios[0];f.notify(false);f.advance(180);f.mobile(false);
    assert(!f.d.querySelector(`[${idle}]`));assert.equal(old.nodes.size,0);
    f.notify(false,f.roots,old);f.advance(500);assert(!f.d.querySelector(`[${idle}]`));
    f.mobile(true);f.notify(false);f.advance(180);
    f.w.dispatchEvent(new f.w.Event('pageshow'));assert(!f.d.querySelector(`[${idle}]`));
    f.notify(false);f.advance(180);f.notify(true);assert.equal(f.frames.size,3);
    const active=f.ios.at(-1);f.owner.destroy();f.notify(false,f.roots,active);f.advance(500);f.frame();
    assert(!f.d.querySelector(`[${idle}],[${resuming}]`));assert.equal(f.timers.size,0);assert.equal(f.frames.size,0);assert.equal(f.changes.size,0);
  }finally{f.close()}
});

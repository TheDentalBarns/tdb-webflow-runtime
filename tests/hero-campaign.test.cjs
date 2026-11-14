const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function setup(code) {
  const dom = new JSDOM(`<main data-tdb-campaign-hero>
    <div data-tdb-campaign-opening><div data-vimeo-hero-content style="color:white">Logo</div><iframe></iframe></div>
    <section data-tdb-campaign-panel><h2>Campaign</h2><a href="/implants">Discover</a></section>
    <nav data-tdb-campaign-rail><a href="#first" data-tdb-campaign-step="0" aria-current="step"><span></span></a><a href="#second" data-tdb-campaign-step="1"><span></span></a></nav>
  </main>`, { runScripts:'outside-only', pretendToBeVisual:true });
  const w=dom.window, root=w.document.querySelector('main'), opening=root.firstElementChild,
    panel=root.querySelector('section'), copy=root.querySelector('[data-vimeo-hero-content]'),
    rail=root.querySelector('nav'), links=[...rail.querySelectorAll('a')], queue=new Map(), jumps=[];
  let seq=0;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.requestAnimationFrame=cb=>{queue.set(++seq,cb);return seq;};
  w.cancelAnimationFrame=id=>queue.delete(id);
  w.innerHeight=800;
  const rect=(top,height)=>({top,bottom:top+height,left:0,right:1200,width:1200,height});
  root.getBoundingClientRect=()=>rect(-w.scrollY,1600);
  opening.getBoundingClientRect=()=>rect(Math.min(0,800-w.scrollY),800);
  panel.getBoundingClientRect=()=>rect(800-w.scrollY,800);
  w.lenis={scrollTo:(...args)=>{jumps.push(args);args[1]?.onComplete?.();}};
  w.eval(code);
  const flush=()=>{const tasks=[...queue.values()];queue.clear();tasks.forEach(cb=>cb());};
  const scroll=y=>{w.scrollY=y;w.dispatchEvent(new w.Event('scroll'));flush();};
  return {dom,w,root,opening,panel,copy,rail,links,queue,jumps,flush,scroll};
}

for(const file of ['src/shared/motion.js','dist/tdb-motion.js']) {
  test(`${file}: cover progress fades and scrolls copy, preserves media, reverses and becomes idle`,()=>{
    const e=setup(fs.readFileSync(file,'utf8')), owner=e.w.TDBMotion.campaignHero(e.root);
    assert.equal(e.w.TDBMotion.campaignHero(e.root),owner,'one owner per root');
    e.scroll(400);
    assert.equal(e.copy.style.translate,'0 -400px');
    assert.ok(Math.abs(Number(e.copy.style.opacity)-1/3)<.001);
    assert.equal(e.links[1].getAttribute('aria-current'),'step');
    assert.equal(e.root.querySelector('iframe').getAttribute('style'),null);
    assert.equal(e.panel.getAttribute('style'),null,'native second panel handles scrolling');
    assert.equal(e.queue.size,0,'no perpetual requestAnimationFrame loop');
    e.scroll(800);assert.equal(e.copy.style.opacity,'0');assert.equal(e.opening.inert,true);
    e.scroll(1600);assert.equal(e.rail.inert,true);assert.equal(e.rail.style.opacity,'0');
    e.scroll(0);assert.equal(e.copy.style.opacity,'1');assert.ok(!e.opening.inert);assert.ok(!e.rail.inert);
    assert.equal(e.links[0].getAttribute('aria-current'),'step');
    owner.destroy();assert.equal(e.copy.getAttribute('style'),'color:white');
    assert.equal(e.rail.getAttribute('style'),null);assert.equal(e.links[1].getAttribute('aria-current'),null);
    e.scroll(300);assert.equal(e.queue.size,0);assert.equal(e.copy.style.translate,'');
    e.dom.window.close();
  });
  test(`${file}: native destinations are enhanced once; lifecycle suspends and resumes`,()=>{
    const e=setup(fs.readFileSync(file,'utf8')), owner=e.w.TDBMotion.campaignHero(e.root);
    e.flush();
    e.links[1].click();assert.equal(e.jumps.length,1);assert.equal(e.jumps[0][0],800);
    const modified=new e.w.MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true});
    e.links[0].dispatchEvent(modified);assert.equal(modified.defaultPrevented,false);assert.equal(e.jumps.length,1);
    e.w.dispatchEvent(new e.w.Event('pagehide'));e.scroll(400);assert.equal(e.copy.style.opacity,'1');
    e.w.dispatchEvent(new e.w.Event('pageshow'));e.flush();assert.ok(Number(e.copy.style.opacity)<.5);
    owner.destroy();e.panel.remove();assert.equal(e.w.TDBMotion.campaignHero(e.root),null,'campaign off keeps the original hero');
    e.dom.window.close();
  });
  test(`${file}: a released hero gesture snaps forward and back but leaves the page below free`,async()=>{
    const e=setup(fs.readFileSync(file,'utf8')), owner=e.w.TDBMotion.campaignHero(e.root);
    const wheel=delta=>e.root.dispatchEvent(new e.w.WheelEvent('wheel',{deltaY:delta,bubbles:true}));
    wheel(120);e.scroll(120);await new Promise(r=>setTimeout(r,200));
    assert.equal(e.jumps.at(-1)[0],800,'small intentional gesture advances to the second hero');
    e.scroll(800);wheel(-120);e.scroll(680);await new Promise(r=>setTimeout(r,200));
    assert.equal(e.jumps.at(-1)[0],0,'reverse gesture returns to the opening hero');
    const count=e.jumps.length;
    e.scroll(1000);wheel(120);e.scroll(1120);await new Promise(r=>setTimeout(r,200));
    assert.equal(e.jumps.length,count,'rest of page retains normal scroll');
    e.scroll(0);e.w.TDBScrollLock={active:true};wheel(120);e.scroll(120);
    await new Promise(r=>setTimeout(r,200));assert.equal(e.jumps.length,count,'dialogs suppress snapping');
    owner.destroy();e.dom.window.close();
  });
}

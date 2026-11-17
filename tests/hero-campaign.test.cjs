const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function setup(code) {
  const dom = new JSDOM(`<main data-tdb-campaign-hero>
    <div data-tdb-campaign-opening><div data-vimeo-hero-content><div class="hero-vimeo_content" style="color:white">Logo</div></div><iframe></iframe><button data-tdb-hero-toggle></button></div>
    <section data-tdb-campaign-panel><h2>Campaign</h2><a href="/implants">Discover</a></section>
    <nav data-tdb-campaign-rail><a href="#first" data-tdb-campaign-step="0" aria-current="step"><span></span></a><a href="#second" data-tdb-campaign-step="1"><span></span></a></nav>
  </main>`, { runScripts:'outside-only', pretendToBeVisual:true });
  const w=dom.window, root=w.document.querySelector('main'), opening=root.firstElementChild,
    panel=root.querySelector('section'), copy=root.querySelector('.hero-vimeo_content'),
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
  const flush=(now=0)=>{const tasks=[...queue.values()];queue.clear();tasks.forEach(cb=>cb(now));};
  const scroll=y=>{w.scrollY=y;w.dispatchEvent(new w.Event('scroll'));flush();};
  return {dom,w,root,opening,panel,copy,rail,links,queue,jumps,flush,scroll};
}

for(const file of ['src/shared/motion.js','dist/tdb-motion.js']) {
  test(`${file}: cover progress fades and scrolls copy, preserves media, reverses and becomes idle`,()=>{
    const e=setup(fs.readFileSync(file,'utf8')), owner=e.w.TDBMotion.campaignHero(e.root);
    assert.equal(e.w.TDBMotion.campaignHero(e.root),owner,'one owner per root');
    e.flush();
    assert.equal(e.root.querySelector('[data-vimeo-hero-content]').getAttribute('style'),null,'unpositioned padding must not create a stacking context behind the video');
    assert.equal(e.copy.style.opacity,'1','logo remains visible before any input');
    e.scroll(400);
    assert.equal(e.copy.style.translate,'0 -400px');
    assert.ok(Math.abs(Number(e.copy.style.opacity)-2/3)<.001);
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
    assert.equal(e.jumps[0][1].duration,e.w.TDBMotion.duration()*2/1000,'slide takes one-third less time than the previous three-times duration');
    assert.equal(e.jumps[0][1].easing(.5),.5,'movement is still halfway at half time instead of appearing settled while locked');
    const modified=new e.w.MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true});
    e.links[0].dispatchEvent(modified);assert.equal(modified.defaultPrevented,false);assert.equal(e.jumps.length,1);
    e.w.dispatchEvent(new e.w.Event('pagehide'));e.scroll(400);assert.equal(e.copy.style.opacity,'1');
    e.w.dispatchEvent(new e.w.Event('pageshow'));e.flush();assert.ok(Number(e.copy.style.opacity)<1);
    owner.destroy();e.panel.remove();assert.equal(e.w.TDBMotion.campaignHero(e.root),null,'campaign off keeps the original hero');
    e.dom.window.close();
  });
  test(`${file}: two opening wheel inputs advance, one upward input returns, and the second hero has no runway`,async()=>{
    const e=setup(fs.readFileSync(file,'utf8')), owner=e.w.TDBMotion.campaignHero(e.root);
    const wheel=delta=>{const event=new e.w.WheelEvent('wheel',{deltaY:delta,bubbles:true,cancelable:true});e.root.querySelector('[data-tdb-hero-toggle]').dispatchEvent(event);e.flush();return event;};
    const hint=wheel(270);
    assert.equal(hint.defaultPrevented,true,'the full-video play target still permits section navigation');
    assert.equal(hint.lenisStopPropagation,true,'the same input must not also be applied by Lenis');
    assert.equal(e.jumps.length,0);assert.equal(e.w.scrollY,0);assert.equal(e.copy.style.opacity,'1');
    assert.ok(parseFloat(e.links[1].style.height)>44,'pill shows intent without moving the hero');
    wheel(270);assert.equal(e.jumps.at(-1)[0],800,'two wheel inputs cross the shorter opening threshold');
    assert.equal(e.jumps.at(-1)[1].lock,true,'a transition completes rather than pausing halfway');
    await new Promise(r=>setTimeout(r,200));e.scroll(800);wheel(-120);
    assert.equal(e.jumps.at(-1)[0],0,'reverse gesture returns to the opening hero');
    await new Promise(r=>setTimeout(r,200));
    const count=e.jumps.length;
    e.scroll(800);assert.equal(wheel(120).defaultPrevented,false,'downward scrolling leaves the second hero immediately');
    e.scroll(1000);assert.equal(wheel(120).defaultPrevented,false);e.scroll(1120);await new Promise(r=>setTimeout(r,200));
    assert.equal(e.jumps.length,count,'rest of page retains normal scroll');
    e.scroll(0);e.w.TDBScrollLock={active:true};wheel(800);e.scroll(120);
    await new Promise(r=>setTimeout(r,200));assert.equal(e.jumps.length,count,'dialogs suppress snapping');
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: remaining touch movement cannot carry a triggered slide past its landing`,()=>{
    const e=setup(fs.readFileSync(file,'utf8')), owner=e.w.TDBMotion.campaignHero(e.root);
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const touch=(type,y)=>{const event=new e.w.Event(type,{bubbles:true,cancelable:true});event.touches=[{clientY:y}];e.root.dispatchEvent(event);return event;};
    touch('touchstart',700);touch('touchmove',500);touch('touchmove',300);
    assert.equal(e.jumps.at(-1)[0],800);
    const tail=touch('touchmove',240);
    assert.equal(tail.defaultPrevented,true);assert.equal(tail.lenisStopPropagation,true);
    assert.equal(e.jumps.length,1);
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: settled wheel chapters reverse immediately both ways without repeating the opening runway`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBMotion.campaignHero(e.root);
    const wheel=delta=>{const event=new e.w.WheelEvent('wheel',{deltaY:delta,bubbles:true,cancelable:true});e.root.dispatchEvent(event);return event;};
    const finish=()=>{const [top,options]=e.jumps.at(-1);e.scroll(top);options.onComplete();};
    wheel(270);assert.equal(e.jumps.length,0,'fresh load still has an initial runway');
    wheel(270);assert.equal(e.jumps.length,1);assert.equal(e.jumps.at(-1)[0],800);
    wheel(-120);assert.equal(e.jumps.length,1,'an unfinished transition still completes');
    finish();
    assert.equal(wheel(30).defaultPrevented,true,'same-direction momentum cannot overshoot');
    wheel(-120);assert.equal(e.jumps.length,2);assert.equal(e.jumps.at(-1)[0],0,'opposite input works inside the quiet period');
    finish();
    wheel(-30);assert.equal(e.jumps.length,2,'the return gesture tail is consumed');
    wheel(120);assert.equal(e.jumps.length,3);assert.equal(e.jumps.at(-1)[0],800,'going down again needs one input, not another runway');
    finish();wheel(-120);finish();
    e.w.dispatchEvent(new e.w.Event('pagehide'));e.w.dispatchEvent(new e.w.Event('pageshow'));
    const count=e.jumps.length;
    wheel(120);assert.equal(e.jumps.length,count+1,'lifecycle gesture reset retains the completed introduction');
    finish();now+=200;
    assert.equal(wheel(120).defaultPrevented,false,'the second hero releases normal onward scrolling');
    owner.destroy();
    e.scroll(0);const fresh=e.w.TDBMotion.campaignHero(e.root), freshCount=e.jumps.length;
    wheel(120);assert.equal(e.jumps.length,freshCount,'a fresh owner starts with the initial runway again');
    fresh.destroy();e.dom.window.close();
  });
  test(`${file}: touch reversals after landing bypass the quiet period in both directions`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    Object.defineProperty(e.w.performance,'now',{value:()=>0});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBMotion.campaignHero(e.root);
    const touch=(type,y)=>{const event=new e.w.Event(type,{bubbles:true,cancelable:true});event.touches=y==null?[]:[{clientY:y}];e.root.dispatchEvent(event);return event;};
    const finish=()=>{const [top,options]=e.jumps.at(-1);e.scroll(top);options.onComplete();};
    touch('touchstart',700);touch('touchmove',400);touch('touchend');finish();
    touch('touchstart',400);touch('touchmove',420);
    assert.equal(e.jumps.length,2);assert.equal(e.jumps.at(-1)[0],0);
    touch('touchend');finish();
    touch('touchstart',420);touch('touchmove',400);
    assert.equal(e.jumps.length,3);assert.equal(e.jumps.at(-1)[0],800);
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: native phone scrolling uses the same slide duration and cancels its finite animation on teardown`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    delete e.w.lenis;
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.scrollTo=({top})=>{e.w.scrollY=top;e.jumps.push(top);};
    const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();e.links[1].click();
    now=e.w.TDBMotion.duration();e.flush(now);
    assert.ok(e.w.scrollY>0&&e.w.scrollY<800,'still travelling at half time');
    now*=2;e.flush(now);e.flush(now);assert.equal(e.w.scrollY,800);assert.equal(e.queue.size,0);
    e.links[0].click();assert.ok(e.queue.size>0);owner.destroy();assert.equal(e.queue.size,0);
    e.dom.window.close();
  });
}

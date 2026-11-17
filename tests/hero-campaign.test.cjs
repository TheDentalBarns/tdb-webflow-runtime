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

function mobileTouch(e,type,y,x=180,count=1,cancelable=true) {
  const event=new e.w.Event(type,{bubbles:true,cancelable});
  event.touches=y==null?[]:Array.from({length:count},(_,i)=>({clientX:x+i*30,clientY:y,identifier:i}));
  e.root.dispatchEvent(event);
  return event;
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
    assert.equal(e.jumps[0][1].duration,e.w.TDBMotion.duration()/1000,'slide takes half the previous duration');
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
    assert.ok(e.queue.size>0,'pill eases intent without moving the hero');
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
    touch('touchstart',400);touch('touchmove',460);
    assert.equal(e.jumps.length,2);assert.equal(e.jumps.at(-1)[0],0);
    touch('touchend');finish();
    touch('touchstart',460);touch('touchmove',400);
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
    now=e.w.TDBMotion.duration()/2;e.flush(now);
    assert.ok(e.w.scrollY>0&&e.w.scrollY<800,'still travelling at half time');
    now*=2;e.flush(now);e.flush(now);assert.equal(e.w.scrollY,800);assert.equal(e.queue.size,0);
    e.links[0].click();assert.ok(e.queue.size>0);owner.destroy();assert.equal(e.queue.size,0);
    e.dom.window.close();
  });
  test(`${file}: pill hint eases in and remains continuous when either slide starts or finishes`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();
    const wheel=delta=>{e.root.dispatchEvent(new e.w.WheelEvent('wheel',{deltaY:delta,bubbles:true,cancelable:true}));owner.refresh();e.flush(now);};
    const height=()=>parseFloat(e.links[1].style.height);
    wheel(270);assert.equal(height(),44,'no jump on the first wheel input');
    now=80;e.flush(now);const middle=height();assert.ok(middle>44&&middle<48.1);
    now=160;e.flush(now);const hinted=height();assert.ok(hinted>middle);assert.equal(e.queue.size,0,'hint animation stops when settled');
    wheel(270);assert.equal(height(),hinted,'crossing the threshold preserves the displayed pill size');
    e.scroll(400);assert.ok(height()>hinted&&height()<100);
    e.scroll(800);assert.equal(height(),100);e.jumps.at(-1)[1].onComplete();e.flush(now);assert.equal(height(),100);
    wheel(-120);assert.equal(height(),100,'reverse input has no negative pressure jump');
    e.scroll(400);assert.ok(height()>44&&height()<100);
    e.scroll(0);e.jumps.at(-1)[1].onComplete();e.flush(now);assert.equal(height(),44);
    wheel(120);assert.equal(height(),44,'down again also starts continuously');
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: a hidden tab retains its native slide and catches up when frames resume`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    delete e.w.lenis;
    let now=0, hidden=false;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    Object.defineProperty(e.w.document,'hidden',{get:()=>hidden});
    e.w.scrollTo=({top})=>{e.w.scrollY=top;};
    const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();e.links[1].click();
    now=e.w.TDBMotion.duration()/4;e.flush(now);const partial=e.w.scrollY;
    assert.ok(partial>0&&partial<800);
    e.w.dispatchEvent(new e.w.Event('blur'));hidden=true;e.w.document.dispatchEvent(new e.w.Event('visibilitychange'));
    assert.ok(e.queue.size>0,'losing visibility must not cancel the pending slide frame');
    now=e.w.TDBMotion.duration()*2;hidden=false;e.w.document.dispatchEvent(new e.w.Event('visibilitychange'));
    e.flush(now);e.flush(now);assert.equal(e.w.scrollY,800);assert.equal(e.copy.style.opacity,'0');assert.equal(e.queue.size,0);
    e.root.dispatchEvent(new e.w.WheelEvent('wheel',{deltaY:-120,bubbles:true,cancelable:true}));
    now+=e.w.TDBMotion.duration();e.flush(now);e.flush(now);assert.equal(e.w.scrollY,0,'immediate reversal remains available after returning');
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: one short vertical swipe advances; the same finger cannot overshoot and the next swipe scrolls onward`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBMotion.campaignHero(e.root);
    mobileTouch(e,'touchstart',600);now=200;mobileTouch(e,'touchmove',570);
    assert.equal(e.jumps.length,0,'a small slow movement does not trigger a slide');
    now=300;mobileTouch(e,'touchend');assert.equal(e.jumps.length,0);
    mobileTouch(e,'touchstart',600);now+=100;mobileTouch(e,'touchmove',548);
    assert.equal(e.jumps.length,1);assert.equal(e.jumps[0][0],800,'one comfortable swipe replaces the mouse-wheel runway');
    e.scroll(800);e.jumps[0][1].onComplete();now+=500;
    assert.equal(mobileTouch(e,'touchmove',400).defaultPrevented,true,'the rest of the original stroke stays consumed even after landing');
    assert.equal(e.jumps.length,1);
    mobileTouch(e,'touchend');mobileTouch(e,'touchstart',600);
    assert.equal(mobileTouch(e,'touchmove',548).defaultPrevented,false,'a fresh forward swipe immediately releases the normal page');
    mobileTouch(e,'touchend');
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: a short deliberate flick works; taps, cancellations and non-vertical gestures remain native`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBMotion.campaignHero(e.root);
    mobileTouch(e,'touchstart',600);mobileTouch(e,'touchend');assert.equal(e.jumps.length,0,'tap');
    mobileTouch(e,'touchstart',600);assert.equal(mobileTouch(e,'touchmove',590,260).defaultPrevented,false);mobileTouch(e,'touchend');
    mobileTouch(e,'touchstart',600,10);assert.equal(mobileTouch(e,'touchmove',520,10).defaultPrevented,false);mobileTouch(e,'touchend');
    mobileTouch(e,'touchstart',600,180,2);assert.equal(mobileTouch(e,'touchmove',500,180,2).defaultPrevented,false);mobileTouch(e,'touchend');
    mobileTouch(e,'touchstart',600);mobileTouch(e,'touchmove',500,180,1,false);mobileTouch(e,'touchend');
    assert.equal(e.jumps.length,0,'horizontal, edge, pinch and already-native gestures are not hijacked');
    mobileTouch(e,'touchstart',600);now+=40;mobileTouch(e,'touchmove',576);mobileTouch(e,'touchcancel');
    assert.equal(e.jumps.length,0,'touchcancel must not create flick momentum');
    mobileTouch(e,'touchstart',600);now+=60;mobileTouch(e,'touchmove',576);
    assert.equal(e.jumps.length,0);mobileTouch(e,'touchend');
    assert.equal(e.jumps.length,1);assert.equal(e.jumps[0][0],800,'a 24px deliberate flick commits on release');
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: native slides finish at the remeasured chapter after viewport height changes or rotation`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    delete e.w.lenis;
    let now=0,height=800;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    const rect=(top,size)=>({top,bottom:top+size,height:size,left:0,right:390,width:390});
    e.root.getBoundingClientRect=()=>rect(-e.w.scrollY,height*2);
    e.opening.getBoundingClientRect=()=>rect(Math.min(0,height-e.w.scrollY),height);
    e.panel.getBoundingClientRect=()=>rect(height-e.w.scrollY,height);
    e.w.scrollTo=({top})=>{e.w.scrollY=top;};
    const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();e.links[1].click();
    const duration=e.w.TDBMotion.duration();now=duration/4;e.flush(now);
    height=e.w.innerHeight=700;e.w.dispatchEvent(new e.w.Event('resize'));
    assert.ok(e.queue.size>0,'browser chrome resize must not cancel the slide');
    now=duration;e.flush(now);owner.refresh();e.flush(now);
    assert.equal(e.w.scrollY,700);assert.equal(e.panel.getBoundingClientRect().top,0);assert.equal(e.copy.style.opacity,'0');
    e.links[0].click();now+=duration/4;e.flush(now);
    height=e.w.innerHeight=390;e.w.innerWidth=844;e.w.dispatchEvent(new e.w.Event('resize'));
    now=duration*2;e.flush(now);owner.refresh();e.flush(now);
    assert.equal(e.w.scrollY,0,'rotation during the return still lands on the first hero');
    assert.equal(e.copy.style.opacity,'1');assert.equal(e.queue.size,0);
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: a height-only resize keeps an in-progress touch gesture`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBMotion.campaignHero(e.root);
    mobileTouch(e,'touchstart',600);mobileTouch(e,'touchmove',580);
    e.w.innerHeight=700;e.w.dispatchEvent(new e.w.Event('resize'));
    mobileTouch(e,'touchmove',548);
    assert.equal(e.jumps.length,1);assert.equal(e.jumps[0][0],800);
    owner.destroy();e.dom.window.close();
  });
}

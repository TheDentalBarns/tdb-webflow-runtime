const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function setup(code,{width=1024,height=800,coarse=false,profile=false}={}) {
  const dom = new JSDOM(`<main data-tdb-campaign-hero>
    <div data-tdb-campaign-opening><div data-vimeo-hero-content><div class="hero-vimeo_content" style="color:white">Logo</div></div><iframe></iframe><button data-tdb-hero-toggle></button></div>
    <section data-tdb-campaign-panel><h2>Campaign</h2><a href="/implants">Discover</a></section>
    <nav data-tdb-campaign-rail><a href="#first" data-tdb-campaign-step="0" aria-current="step"><span></span></a><a href="#second" data-tdb-campaign-step="1"><span></span></a></nav>
  </main>`, { runScripts:'outside-only', pretendToBeVisual:true });
  const w=dom.window, root=w.document.querySelector('main'), opening=root.firstElementChild,
    panel=root.querySelector('section'), copy=root.querySelector('.hero-vimeo_content'),
    rail=root.querySelector('nav'), links=[...rail.querySelectorAll('a')], queue=new Map(), jumps=[];
  let seq=0;
  w.innerWidth=width;
  w.matchMedia=query=>({matches:query==='(pointer: coarse)'?coarse:query==='(min-width:992px)'?w.innerWidth>=992:false,addEventListener(){},removeEventListener(){}});
  w.requestAnimationFrame=cb=>{queue.set(++seq,cb);return seq;};
  w.cancelAnimationFrame=id=>queue.delete(id);
  w.innerHeight=height;
  const rect=(top,height)=>({top,bottom:top+height,left:0,right:1200,width:1200,height});
  root.getBoundingClientRect=()=>rect(-w.scrollY,height*2);
  opening.getBoundingClientRect=()=>rect(Math.min(0,height-w.scrollY),height);
  panel.getBoundingClientRect=()=>rect(height-w.scrollY,height);
  Object.defineProperty(panel,'offsetTop',{get:()=>panel.getBoundingClientRect().top+w.scrollY});
  w.lenis={scrollTo:(...args)=>{jumps.push(args);args[1]?.onComplete?.();}};
  if(profile)w.eval(fs.readFileSync('src/shared/motion-profile.js','utf8').replace('__TDB_MOTION_PROFILE__',fs.readFileSync('config/motion.json','utf8')));
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

function compositor(e) {
  delete e.w.lenis;
  const animations=[],scrolls=[];
  e.w.Element.prototype.animate=function(frames,options){
    const animation={node:this,frames,options,cancelled:false,cancel(){this.cancelled=true;}};
    animations.push(animation);
    return animation;
  };
  e.w.scrollTo=({top})=>{scrolls.push(top);e.w.scrollY=top;e.w.dispatchEvent(new e.w.Event('scroll'));};
  return {animations,scrolls,flight:()=>animations.filter(a=>a.node===e.panel).at(-1)};
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
    assert.equal(e.jumps[0][1].duration,e.w.TDBMotion.duration()/1000,'desktop keeps its established timing');
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
  test(`${file}: a held swipe waits for release and cannot carry a slide past its landing`,()=>{
    const e=setup(fs.readFileSync(file,'utf8')), owner=e.w.TDBMotion.campaignHero(e.root);
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const touch=(type,y)=>mobileTouch(e,type,y);
    touch('touchstart',700);touch('touchmove',500);touch('touchmove',300);
    assert.equal(e.jumps.length,0,'the page never starts its slide under a held finger');
    const tail=touch('touchmove',240);
    assert.equal(tail.defaultPrevented,true);assert.equal(tail.lenisStopPropagation,true);
    touch('touchend');assert.equal(e.jumps.at(-1)[0],800);
    touch('touchstart',600);assert.equal(touch('touchmove',300).defaultPrevented,true);
    touch('touchend');
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
    touch('touchstart',400);touch('touchmove',560);
    assert.equal(e.jumps.length,1);touch('touchend');
    assert.equal(e.jumps.length,2);assert.equal(e.jumps.at(-1)[0],0);
    finish();
    touch('touchstart',560);touch('touchmove',400);
    assert.equal(e.jumps.length,2);touch('touchend');
    assert.equal(e.jumps.length,3);assert.equal(e.jumps.at(-1)[0],800);
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: native phone scrolling takes a full second, eases both ends and cancels on teardown`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'),{width:390,coarse:true,profile:true});
    delete e.w.lenis;
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.scrollTo=({top})=>{e.w.scrollY=top;e.jumps.push(top);};
    const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();e.links[1].click();
    now=200;e.flush(now);const early=e.w.scrollY;
    assert.ok(early>0&&early<160,'gentle acceleration');
    now=500;e.flush(now);assert.equal(e.w.scrollY,400,'halfway through at the previous mobile completion time');
    now=800;e.flush(now);assert.ok(e.w.scrollY>640&&e.w.scrollY<800,'still easing toward the landing');
    assert.ok(Math.abs(800-e.w.scrollY-early)<.001,'matching acceleration and deceleration');
    now=1000;e.flush(now);e.flush(now);assert.equal(e.w.scrollY,800);assert.equal(e.queue.size,0);
    e.links[0].click();assert.ok(e.queue.size>0);owner.destroy();assert.equal(e.queue.size,0);
    e.dom.window.close();
  });
  test(`${file}: phone, tablet and coarse-pointer slides use the slower timing without changing desktop`,()=>{
    for(const device of [{width:390},{width:820},{width:1280,coarse:true},{width:1280,coarse:false}]){
      const e=setup(fs.readFileSync(file,'utf8'),{...device,profile:true});
      const owner=e.w.TDBMotion.campaignHero(e.root);e.links[1].click();
      assert.equal(e.jumps[0][1].duration,device.width<992||device.coarse?1:e.w.TDBMotion.duration()/1000);
      owner.destroy();e.dom.window.close();
    }
  });
  test(`${file}: pills animate continuously inside a fixed rail and fade through the exit`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();
    const wheel=delta=>{e.root.dispatchEvent(new e.w.WheelEvent('wheel',{deltaY:delta,bubbles:true,cancelable:true}));owner.refresh();e.flush(now);};
    const opacity=()=>parseFloat(e.links[1].firstElementChild.style.opacity);
    const stationary=()=>e.links.forEach(link=>{
      assert.equal(link.style.height,'','native hit-target layout never changes');
      assert.match(link.style.transform,/^translate3d\(0,[-\d.]+px,0\)$/,'pills move locally within their fixed rail');
      const marker=link.firstElementChild;
      for(const property of ['height','clipPath','translate'])assert.equal(marker.style[property],'','no per-frame layout or clipping');
      assert.match(marker.style.transform,/^scaleY\([\d.]+\)$/,'pill length uses compositor scaling');
      for(const property of ['top','transform','translate'])assert.equal(e.rail.style[property],'','rail never travels with the panel');
    });
    stationary();assert.equal(e.links[0].style.transform,'translate3d(0,14px,0)');
    assert.equal(e.links[0].firstElementChild.style.transform,'scaleY(1)');
    wheel(270);assert.equal(opacity(),.4,'no brightness jump on the first wheel input');
    now=80;e.flush(now);const middle=opacity();assert.ok(middle>.4&&middle<.44);stationary();
    now=160;e.flush(now);const hinted=opacity();assert.ok(hinted>middle);assert.equal(e.queue.size,0,'hint animation stops when settled');
    wheel(270);assert.equal(opacity(),hinted,'crossing the threshold preserves the displayed fade');
    e.scroll(400);assert.ok(opacity()>hinted&&opacity()<1);stationary();
    e.scroll(800);assert.equal(opacity(),1);e.jumps.at(-1)[1].onComplete();e.flush(now);assert.equal(opacity(),1);
    assert.equal(e.links[1].style.transform,'translate3d(0,-14px,0)');
    assert.equal(e.links[1].firstElementChild.style.transform,'scaleY(1)');
    wheel(-120);assert.equal(opacity(),1,'reverse input has no brightness jump');
    e.scroll(400);assert.ok(opacity()>.4&&opacity()<1);
    e.scroll(0);e.jumps.at(-1)[1].onComplete();e.flush(now);assert.equal(opacity(),.4);
    wheel(120);assert.equal(opacity(),.4,'down again also starts continuously');
    e.scroll(800);e.jumps.at(-1)[1].onComplete();
    e.scroll(1000);assert.equal(e.rail.style.opacity,'0.5');stationary();
    e.scroll(1200);assert.equal(e.rail.style.opacity,'0');assert.equal(e.rail.inert,true);stationary();
    e.scroll(1000);assert.equal(e.rail.style.opacity,'0.5');assert.ok(!e.rail.inert);
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: touch follows the local panel and compositor flights scroll only at landing`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'),{width:390,coarse:true,profile:true});
    const c=compositor(e);
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();
    mobileTouch(e,'touchstart',600);now=100;mobileTouch(e,'touchmove',440);e.flush(now);
    assert.equal(e.panel.style.transform,'translate3d(0,-160px,0)');
    assert.equal(e.copy.style.translate,'0 -160px');
    assert.equal(e.w.scrollY,0);assert.equal(c.animations.length,0,'the held finger previews before settling');
    mobileTouch(e,'touchend');
    assert.deepEqual(Array.from(c.flight().frames,f=>f.transform),['translate3d(0,-160px,0)','translate3d(0,-800px,0)']);
    assert.equal(c.flight().options.duration,800,'remaining distance retains the slower full-height pace');
    assert.equal(c.animations.length,6,'one panel, foreground and four pill transforms');
    const copyFrames=c.animations.find(a=>a.node===e.copy).frames;
    assert.equal(copyFrames[0].translate,'0 -160px');assert.equal(copyFrames.at(-1).opacity,'0');
    assert.ok(copyFrames.some(f=>f.translate==='0 -200px'&&f.opacity==='1'),'logo fades only after its first quarter');
    for(let frame=1;frame<=60;frame++){now+=16;e.flush(now);}
    assert.equal(c.scrolls.length,0,'no whole-document scroll writes during the animation');
    assert.equal(e.queue.size,0,'the compositor flight needs no JavaScript frame loop');
    e.links[0].click();assert.equal(c.animations.length,6,'a pill click does not interrupt the current flight');
    c.flight().onfinish();e.flush(now);
    assert.deepEqual(c.scrolls,[800]);assert.equal(e.panel.getAttribute('style'),null);
    assert.equal(e.copy.style.translate,'0 -800px');assert.equal(e.copy.style.opacity,'0');
    assert.equal(e.links[1].getAttribute('aria-current'),'step');
    assert.ok(c.animations.every(a=>a.cancelled),'native endpoint takes over from filled animations');
    mobileTouch(e,'touchstart',400);now+=100;mobileTouch(e,'touchmove',560);e.flush(now);
    assert.equal(e.panel.style.transform,'translate3d(0,160px,0)');assert.equal(e.w.scrollY,800);
    mobileTouch(e,'touchend');assert.equal(c.flight().frames.at(-1).transform,'translate3d(0,800px,0)');
    c.flight().onfinish();e.flush(now);assert.deepEqual(c.scrolls,[800,0]);assert.equal(e.copy.style.opacity,'1');
    // A long drag must use the native anchor, not the transformed panel rect.
    const nativeRect=e.panel.getBoundingClientRect;
    Object.defineProperty(e.panel,'getBoundingClientRect',{value:()=>{
      const box=nativeRect(),shift=parseFloat(e.panel.style.transform.split(',')[1])||0;
      return {...box,top:box.top+shift,bottom:box.bottom+shift};
    }});
    mobileTouch(e,'touchstart',700);now+=100;mobileTouch(e,'touchmove',100);e.flush(now);mobileTouch(e,'touchend');
    assert.equal(c.flight().frames.at(-1).transform,'translate3d(0,-800px,0)','one immediate forward swipe reverses again');
    c.flight().onfinish();e.flush(now);
    mobileTouch(e,'touchstart',600);now+=100;
    assert.equal(mobileTouch(e,'touchmove',500).defaultPrevented,false,'fresh forward swipe releases native scrolling at chapter two');
    mobileTouch(e,'touchend');assert.equal(c.scrolls.length,3);
    owner.destroy();assert.equal(e.panel.getAttribute('style'),null);e.dom.window.close();
  });
  test(`${file}: mobile release commits at 20% of the visible height and returns below it at any speed`,()=>{
    for(const height of [600,800,1000]){
      const e=setup(fs.readFileSync(file,'utf8'),{width:390,height,coarse:true,profile:true}),c=compositor(e);
      let now=0;Object.defineProperty(e.w.performance,'now',{value:()=>now});
      const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();
      const release=(from,to,elapsed)=>{
        mobileTouch(e,'touchstart',from);now+=elapsed;mobileTouch(e,'touchmove',to);e.flush(now);
        assert.equal(e.queue.size,0,'held drag becomes idle between finger movements');
        mobileTouch(e,'touchend');return c.flight();
      };
      for(const elapsed of [60,600])for(const distance of [height*.1,height*.2-1]){
        const flight=release(height*.8,height*.8-distance,elapsed);
        assert.equal(flight.frames[0].transform,`translate3d(0,${-distance}px,0)`);
        assert.equal(flight.frames.at(-1).transform,'translate3d(0,0px,0)','10% and just-under-20% drags return, including fast flicks');
        assert.equal(flight.options.duration,500);assert.equal(e.w.scrollY,0);
        flight.onfinish();e.flush(now);assert.equal(e.w.scrollY,0);assert.equal(e.copy.style.opacity,'1');
      }
      const forward=release(height*.8,height*.6,60);
      assert.equal(forward.frames.at(-1).transform,`translate3d(0,${-height}px,0)`,'20% advances on each viewport size');
      forward.onfinish();e.flush(now);assert.equal(e.w.scrollY,height);
      const shortReverse=release(height*.4,height*.5,60);
      assert.equal(shortReverse.frames.at(-1).transform,'translate3d(0,0px,0)','a short reverse returns to chapter two');
      shortReverse.onfinish();e.flush(now);assert.equal(e.w.scrollY,height);
      const reverse=release(height*.4,height*.6,600);
      assert.equal(reverse.frames.at(-1).transform,`translate3d(0,${height}px,0)`,'one qualifying reverse remains available immediately');
      reverse.onfinish();e.flush(now);assert.equal(e.w.scrollY,0);
      owner.destroy();e.dom.window.close();
    }
  });
  test(`${file}: an early native scroll settles when the deferred hero owner arrives`,async()=>{
    for(const initial of [80,200]){
      const e=setup(fs.readFileSync(file,'utf8'),{width:390,coarse:true,profile:true}),c=compositor(e);
      e.w.scrollY=initial;
      const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();
      await new Promise(r=>setTimeout(r,200));
      const destination=initial<160?0:800,flight=c.flight();
      assert.ok(flight,'an early partial scroll cannot remain stranded between chapters');
      assert.equal(flight.frames[0].transform,'translate3d(0,0px,0)');
      assert.equal(flight.frames.at(-1).transform,`translate3d(0,${initial-destination}px,0)`);
      assert.equal(e.w.scrollY,initial,'the recovery also avoids per-frame document scrolling');
      if(initial<160)assert.equal(flight.options.duration,500);
      flight.onfinish();e.flush();assert.equal(e.w.scrollY,destination);
      assert.equal(e.panel.getAttribute('style'),null);assert.equal(e.copy.style.opacity,destination===0?'1':'0');
      if(initial<160){
        const count=c.animations.length;
        e.root.dispatchEvent(new e.w.WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true}));
        assert.equal(c.animations.length,count,'returning an early short scroll does not consume the initial wheel runway');
      }
      owner.destroy();e.dom.window.close();
    }
  });
  test(`${file}: a touch already moving when the owner loads keeps its preview and release threshold`,()=>{
    for(const remaining of [60,100]){
      const e=setup(fs.readFileSync(file,'utf8'),{width:390,coarse:true,profile:true}),c=compositor(e);
      e.w.scrollY=80;
      const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();
      assert.equal(mobileTouch(e,'touchmove',600).defaultPrevented,true,'adopt the touch whose start preceded module loading');
      e.flush();assert.equal(e.panel.style.transform,'translate3d(0,0px,0)');
      mobileTouch(e,'touchmove',600-remaining);e.flush();
      assert.equal(e.panel.style.transform,`translate3d(0,${-remaining}px,0)`);
      assert.equal(e.copy.style.translate,`0 ${-80-remaining}px`);
      assert.equal(c.animations.length,0,'the moving finger still owns the preview');
      mobileTouch(e,'touchend');
      const destination=80+remaining<160?0:800;
      assert.equal(c.flight().frames.at(-1).transform,`translate3d(0,${80-destination}px,0)`);
      if(destination===0)assert.equal(c.flight().options.duration,500);
      c.flight().onfinish();e.flush();assert.equal(e.w.scrollY,destination);
      owner.destroy();e.dom.window.close();
    }
  });
  test(`${file}: short carousel drags return smoothly and cancellation restores the native panel`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'),{width:390,coarse:true,profile:true}),c=compositor(e);
    let now=0;Object.defineProperty(e.w.performance,'now',{value:()=>now});
    const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();
    mobileTouch(e,'touchstart',600);now=300;mobileTouch(e,'touchmove',570);e.flush(now);mobileTouch(e,'touchend');
    assert.equal(c.flight().frames[0].transform,'translate3d(0,-30px,0)');
    assert.equal(c.flight().frames[1].transform,'translate3d(0,0px,0)');
    assert.equal(c.flight().options.duration,500,'short cancelled intent has a softer half-second return');
    assert.equal(c.flight().options.easing,'cubic-bezier(0.22,1,0.36,1)');
    c.flight().onfinish();e.flush(now);assert.equal(e.w.scrollY,0);assert.equal(e.copy.style.opacity,'1');
    mobileTouch(e,'touchstart',600);mobileTouch(e,'touchmove',500);e.flush(now);mobileTouch(e,'touchcancel');e.flush(now);
    assert.equal(e.panel.getAttribute('style'),null);assert.equal(e.copy.style.translate,'0 0px');
    assert.equal(c.animations.length,6,'touchcancel never creates a new flight');
    mobileTouch(e,'touchstart',600);mobileTouch(e,'touchmove',500);e.flush(now);
    mobileTouch(e,'touchmove',500,180,2);e.flush(now);
    assert.equal(e.panel.getAttribute('style'),null,'pinch returns the preview to native layout');
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: carousel resize, hidden-tab return and teardown cannot leave a half slide`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'),{width:390,coarse:true,profile:true}),c=compositor(e);
    let now=0,height=800,hidden=false;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    Object.defineProperty(e.w.document,'hidden',{get:()=>hidden});
    e.root.getBoundingClientRect=()=>({top:-e.w.scrollY,bottom:height*2-e.w.scrollY,height:height*2});
    e.opening.getBoundingClientRect=()=>({top:Math.min(0,height-e.w.scrollY),height});
    e.panel.getBoundingClientRect=()=>({top:height-e.w.scrollY,height});
    const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();e.links[1].click();
    assert.equal(c.flight().options.duration,1000);
    height=e.w.innerHeight=700;e.w.dispatchEvent(new e.w.Event('resize'));e.flush(now);
    assert.equal(e.w.scrollY,700);assert.equal(e.panel.getAttribute('style'),null);assert.ok(c.flight().cancelled);
    e.links[0].click();hidden=true;e.w.document.dispatchEvent(new e.w.Event('visibilitychange'));
    now=1500;e.w.dispatchEvent(new e.w.Event('blur'));hidden=false;e.w.document.dispatchEvent(new e.w.Event('visibilitychange'));e.flush(now);
    assert.equal(e.w.scrollY,0);assert.equal(e.copy.style.opacity,'1');assert.ok(c.flight().cancelled);
    e.links[1].click();const interrupted=c.flight();e.w.dispatchEvent(new e.w.Event('pagehide'));
    assert.ok(interrupted.cancelled);assert.equal(e.panel.getAttribute('style'),null);
    interrupted.onfinish();assert.equal(c.scrolls.length,2,'late completion after pagehide has no effect');
    e.w.dispatchEvent(new e.w.Event('pageshow'));e.flush(now);assert.equal(e.copy.style.opacity,'1');
    e.links[1].click();const destroyed=c.flight();owner.destroy();destroyed.onfinish();
    assert.ok(destroyed.cancelled);assert.equal(c.scrolls.length,2);assert.equal(e.queue.size,0);
    assert.equal(e.copy.getAttribute('style'),'color:white');assert.equal(e.panel.getAttribute('style'),null);
    e.dom.window.close();
  });
  test(`${file}: a native mobile slide reuses geometry and paints copy in the same frame`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'),{width:390,coarse:true,profile:true});
    delete e.w.lenis;
    let now=0,measurements=0,resizeCallback;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    for(const node of [e.root,e.opening,e.panel]){
      const read=node.getBoundingClientRect;
      node.getBoundingClientRect=()=>{measurements++;return read();};
    }
    e.w.ResizeObserver=class{constructor(callback){resizeCallback=callback;}observe(){}disconnect(){}};
    e.w.scrollTo=({top})=>{e.w.scrollY=top;e.w.dispatchEvent(new e.w.Event('scroll'));};
    const owner=e.w.TDBMotion.campaignHero(e.root);e.flush();e.links[1].click();
    const initialReads=measurements;
    for(let frame=1;frame<=60;frame++){
      now=frame*1000/60;e.flush(now);
      assert.ok(Math.abs(parseFloat(e.copy.style.translate.split(' ')[1])+e.w.scrollY)<.001,'foreground follows the scroll written in this frame');
      assert.ok(e.queue.size<=1,'one shared animation frame remains scheduled');
    }
    e.flush(now);e.flush(now);
    assert.equal(e.w.scrollY,800);assert.equal(measurements,initialReads,'no repeated layout measurements throughout 60 animation frames');
    assert.equal(e.queue.size,0,'no work remains after landing');
    resizeCallback();e.flush(now);assert.equal(measurements,initialReads+3,'observed layout changes are remeasured once');
    const afterResize=measurements;
    for(let y=820;y<=1400;y+=20)e.scroll(y);
    assert.equal(measurements,afterResize,'ordinary page scrolling also reuses document anchors');
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
  test(`${file}: one deliberate vertical swipe advances; the same finger cannot overshoot and the next swipe scrolls onward`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBMotion.campaignHero(e.root);
    mobileTouch(e,'touchstart',600);now=200;mobileTouch(e,'touchmove',570);
    assert.equal(e.jumps.length,0,'a small slow movement does not trigger a slide');
    now=300;mobileTouch(e,'touchend');assert.equal(e.jumps.length,0);
    mobileTouch(e,'touchstart',600);now+=400;mobileTouch(e,'touchmove',440);
    assert.equal(e.jumps.length,0,'even a qualifying swipe waits for finger release');
    now+=400;mobileTouch(e,'touchend');
    assert.equal(e.jumps.length,1);assert.equal(e.jumps[0][0],800,'one comfortable swipe replaces the mouse-wheel runway');
    mobileTouch(e,'touchstart',600);
    e.scroll(800);e.jumps[0][1].onComplete();now+=500;
    assert.equal(mobileTouch(e,'touchmove',400).defaultPrevented,true,'a finger placed during the slide stays consumed even after landing');
    assert.equal(e.jumps.length,1);
    mobileTouch(e,'touchend');mobileTouch(e,'touchstart',600);
    assert.equal(mobileTouch(e,'touchmove',548).defaultPrevented,false,'a fresh forward swipe immediately releases the normal page');
    mobileTouch(e,'touchend');
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: short flicks do not bypass the threshold; taps, cancellations and non-vertical gestures remain native`,()=>{
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
    mobileTouch(e,'touchstart',600);now+=40;mobileTouch(e,'touchmove',520);mobileTouch(e,'touchcancel');
    assert.equal(e.jumps.length,0,'touchcancel must not create flick momentum');
    mobileTouch(e,'touchstart',600);now+=100;mobileTouch(e,'touchmove',400);now+=100;mobileTouch(e,'touchmove',596);mobileTouch(e,'touchend');
    assert.equal(e.jumps.length,0,'drawing a qualifying swipe back before release cancels its intent');
    mobileTouch(e,'touchstart',600);now+=60;mobileTouch(e,'touchmove',576);
    assert.equal(e.jumps.length,0);mobileTouch(e,'touchend');
    assert.equal(e.jumps.length,0,'a 24px fast flick still releases below the 20% threshold');
    mobileTouch(e,'touchstart',600);now+=60;mobileTouch(e,'touchmove',440);mobileTouch(e,'touchend');
    assert.equal(e.jumps.length,1);assert.equal(e.jumps[0][0],800,'a 20% flick commits on release');
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
  test(`${file}: browser chrome resize preserves the current gesture threshold and updates the next`,()=>{
    const e=setup(fs.readFileSync(file,'utf8'));
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBMotion.campaignHero(e.root);
    mobileTouch(e,'touchstart',600);mobileTouch(e,'touchmove',580);
    e.w.innerHeight=700;e.w.dispatchEvent(new e.w.Event('resize'));
    mobileTouch(e,'touchmove',441);
    assert.equal(e.jumps.length,0);mobileTouch(e,'touchend');
    assert.equal(e.jumps.length,0,'159px stays below the captured 160px threshold after height shrinks');
    mobileTouch(e,'touchstart',600);mobileTouch(e,'touchmove',460);mobileTouch(e,'touchend');
    assert.equal(e.jumps.length,1);assert.equal(e.jumps[0][0],800);
    owner.destroy();e.dom.window.close();
  });
}

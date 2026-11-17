const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function setup(file,{width=1024,height=800,coarse=false,profile=false}={}) {
  const dom = new JSDOM(`<main data-tdb-campaign-hero>
    <div data-tdb-campaign-opening><div data-vimeo-hero-content><div class="hero-vimeo_content" style="color:white">Logo</div></div><iframe></iframe><button data-tdb-hero-toggle data-vimeo-controls-layer><span class="tdb-hero-toggle-art"></span></button></div>
    <section data-tdb-campaign-panel><img class="tdb-campaign-image"><button data-vimeo-controls-layer aria-label="Play campaign"><span class="tdb-hero-toggle-art"></span></button><div class="tdb-campaign-copy" style="color:white"><h2>Campaign</h2><a href="/implants">Discover</a></div></section>
    <nav data-tdb-campaign-rail><a href="#first" data-tdb-campaign-step="0" aria-current="step"><span></span></a><a href="#second" data-tdb-campaign-step="1"><span></span></a></nav>
  </main>`, { runScripts:'outside-only', pretendToBeVisual:true });
  const w=dom.window, root=w.document.querySelector('main'), opening=root.firstElementChild,
    panel=root.querySelector('section'), copy=root.querySelector('.hero-vimeo_content'),campaignCopy=panel.querySelector('.tdb-campaign-copy'),
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
  for(const [section,control] of [[opening,opening.querySelector('[data-vimeo-controls-layer]')],[panel,panel.querySelector('[data-vimeo-controls-layer]')]]){
    control.getBoundingClientRect=()=>rect(section.getBoundingClientRect().top+(parseFloat(control.style.translate.split(' ')[1])||0),height);
    control.firstElementChild.getBoundingClientRect=()=>rect(control.getBoundingClientRect().top+height-80,60);
  }
  Object.defineProperty(panel,'offsetTop',{get:()=>panel.getBoundingClientRect().top+w.scrollY});
  w.lenis={scrollTo:(...args)=>{jumps.push(args);args[1]?.onComplete?.();}};
  if(profile)w.eval(fs.readFileSync('src/shared/motion-profile.js','utf8').replace('__TDB_MOTION_PROFILE__',fs.readFileSync('config/motion.json','utf8')));
  w.eval(fs.readFileSync(file.startsWith('src/') ? 'src/shared/motion.js' : 'dist/tdb-motion.js','utf8'));
  w.eval(fs.readFileSync(file,'utf8'));
  const flush=(now=0)=>{const tasks=[...queue.values()];queue.clear();tasks.forEach(cb=>cb(now));};
  const scroll=y=>{w.scrollY=y;w.dispatchEvent(new w.Event('scroll'));flush();};
  return {dom,w,root,opening,panel,copy,campaignCopy,rail,links,queue,jumps,flush,scroll};
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

for(const file of ['src/components/hero-campaign.js','dist/tdb-hero-campaign.js']) {
  test(`${file}: campaign menu tone follows Designer colour only at the header crossing and restores`,()=>{
    const e=setup(file), nav=e.w.document.createElement('header');
    nav.className='navbar10_component';nav.setAttribute('transparent-nav','true');
    nav.getBoundingClientRect=()=>({top:0,bottom:80,height:80});e.w.document.body.prepend(nav);
    e.panel.style.color='black';
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
    assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'light');
    e.scroll(719);assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'light','white while the first hero is behind the menu');
    e.scroll(721);assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'dark');
    e.scroll(1000);assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'dark','dark as the attached menu leaves with the campaign');
    e.scroll(1600);assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'light','normal nav owner resumes below the hero');
    e.scroll(800);assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'dark');
    e.scroll(0);assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'light');
    e.panel.style.color='white';owner.refresh();e.flush();e.scroll(800);
    assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'light','future white campaigns keep white navigation');
    owner.destroy();assert.equal(nav.hasAttribute('data-tdb-campaign-nav'),false);e.w.close();
  });
  test(`${file}: touch colour crossing follows the compositor and cancelled flights cannot change it later`,()=>{
    const e=setup(file,{width:390,coarse:true}), nav=e.w.document.createElement('header');
    nav.className='navbar10_component';nav.setAttribute('transparent-nav','true');nav.getBoundingClientRect=()=>({height:80});
    e.w.document.body.prepend(nav);e.panel.style.color='black';const c=compositor(e),timers=new Map();let id=0;
    e.w.setTimeout=(fn,delay)=>{timers.set(++id,{fn,delay});return id;};e.w.clearTimeout=id=>timers.delete(id);
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();e.links[1].click();
    assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'light','starting the slide must not darken the opening');
    const crossing=[...timers.values()].find(t=>t.delay>250&&t.delay<500);assert(crossing);
    crossing.fn();assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'dark');c.flight().onfinish();
    e.links[0].click();assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'dark');
    c.flight().onfinish();assert.equal(nav.getAttribute('data-tdb-campaign-nav'),'light');
    owner.destroy();assert.equal(timers.size,0);e.w.close();
  });
  test(`${file}: next-video preparation starts with intent, never with mount or passive scroll`,()=>{
    const e=setup(file), calls=[],video=e.w.document.createElement('div');video.setAttribute('data-vimeo-hero-shell','');e.panel.append(video);
    e.w.TDBVimeoLoader={warm:root=>calls.push(root)};
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();e.scroll(10);
    assert.equal(calls.length,0);e.scroll(0);
    e.root.dispatchEvent(new e.w.WheelEvent('wheel',{deltaY:120,bubbles:true,cancelable:true}));
    assert.equal(calls[0],video);owner.destroy();e.w.close();
  });
  test(`${file}: cover progress fades and scrolls copy, preserves media, reverses and becomes idle`,()=>{
    const e=setup(file), owner=e.w.TDBCampaignHero.mount(e.root);
    assert.equal(e.w.TDBCampaignHero.mount(e.root),owner,'one owner per root');
    e.flush();
    assert.equal(e.root.querySelector('[data-vimeo-hero-content]').getAttribute('style'),null,'unpositioned padding must not create a stacking context behind the video');
    assert.equal(e.copy.style.opacity,'1','logo remains visible before any input');
    assert.equal(e.campaignCopy.style.translate,'0 200px','campaign copy starts a quarter-screen below its native position');
    e.scroll(400);
    assert.equal(e.copy.style.translate,'0 -400px');
    assert.equal(e.copy.style.opacity,'0.5','outgoing logo fades directly with slide progress');
    assert.equal(e.campaignCopy.style.translate,'0 100px','incoming copy moves independently of its image');
    assert.equal(e.links[1].getAttribute('aria-current'),'step');
    assert.equal(e.root.querySelector('iframe').getAttribute('style'),null);
    assert.equal(e.panel.getAttribute('style'),null,'native second panel handles scrolling');
    assert.equal(e.queue.size,0,'no perpetual requestAnimationFrame loop');
    e.scroll(800);assert.equal(e.copy.style.opacity,'0');assert.equal(e.opening.inert,true);
    assert.equal(e.campaignCopy.style.translate,'0 0px','text and CTA settle at their native position');
    e.scroll(1600);assert.equal(e.rail.inert,true);assert.equal(e.rail.style.opacity,'0');
    assert.equal(e.campaignCopy.style.translate,'0 0px','onward scrolling adds no extra parallax');
    e.scroll(400);assert.equal(e.campaignCopy.style.translate,'0 100px');assert.equal(e.copy.style.opacity,'0.5');
    e.scroll(0);assert.equal(e.copy.style.opacity,'1');assert.ok(!e.opening.inert);assert.ok(!e.rail.inert);
    assert.equal(e.links[0].getAttribute('aria-current'),'step');
    owner.destroy();assert.equal(e.copy.getAttribute('style'),'color:white');
    assert.equal(e.campaignCopy.getAttribute('style'),'color:white');
    assert.equal(e.rail.getAttribute('style'),null);assert.equal(e.links[1].getAttribute('aria-current'),null);
    e.scroll(300);assert.equal(e.queue.size,0);assert.equal(e.copy.style.translate,'');
    e.dom.window.close();
  });
  test(`${file}: each playback control fades out at 6rem from the viewport top and restores on return`,()=>{
    for(const [height,rem] of [[800,16],[600,20]]){
      const e=setup(file,{height});e.w.document.documentElement.style.fontSize=rem+'px';
      const openingControl=e.opening.querySelector('[data-vimeo-controls-layer]'),campaignControl=e.panel.querySelector('[data-vimeo-controls-layer]');
      const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
      const clearAfter=height-80-rem*6;
      assert.equal(openingControl.style.opacity,'1');assert.equal(campaignControl.style.opacity,'1');
      e.scroll(clearAfter/2);assert.equal(openingControl.style.opacity,'0.5');
      e.scroll(clearAfter);assert.equal(openingControl.firstElementChild.getBoundingClientRect().top,rem*6);assert.equal(openingControl.style.opacity,'0');
      assert.equal(campaignControl.style.opacity,'1','the incoming video does not inherit the opening fade');
      e.scroll(height+clearAfter/2);assert.equal(campaignControl.style.opacity,'0.5');
      e.scroll(height+clearAfter);assert.equal(campaignControl.style.opacity,'0');
      e.scroll(height);assert.equal(campaignControl.style.opacity,'1');e.scroll(0);assert.equal(openingControl.style.opacity,'1');
      owner.destroy();assert.equal(openingControl.getAttribute('style'),null);assert.equal(campaignControl.getAttribute('style'),null);e.dom.window.close();
    }
  });
  test(`${file}: native destinations are enhanced once; lifecycle suspends and resumes`,()=>{
    const e=setup(file), owner=e.w.TDBCampaignHero.mount(e.root);
    e.flush();
    e.links[1].click();assert.equal(e.jumps.length,1);assert.equal(e.jumps[0][0],800);
    assert.equal(e.jumps[0][1].duration,e.w.TDBMotion.duration()/1000,'desktop keeps its established timing');
    assert.equal(e.jumps[0][1].easing(.5),.5,'movement is still halfway at half time instead of appearing settled while locked');
    const modified=new e.w.MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true});
    e.links[0].dispatchEvent(modified);assert.equal(modified.defaultPrevented,false);assert.equal(e.jumps.length,1);
    e.w.dispatchEvent(new e.w.Event('pagehide'));e.scroll(400);assert.equal(e.copy.style.opacity,'1');
    e.w.dispatchEvent(new e.w.Event('pageshow'));e.flush();assert.ok(Number(e.copy.style.opacity)<1);
    owner.destroy();e.panel.remove();assert.equal(e.w.TDBCampaignHero.mount(e.root),null,'campaign off keeps the original hero');
    e.dom.window.close();
  });
  test(`${file}: two opening wheel inputs advance, one upward input returns, and the second hero has no runway`,async()=>{
    const e=setup(file), owner=e.w.TDBCampaignHero.mount(e.root);
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
    const e=setup(file), owner=e.w.TDBCampaignHero.mount(e.root);
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
    const e=setup(file);
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBCampaignHero.mount(e.root);
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
    e.scroll(0);const fresh=e.w.TDBCampaignHero.mount(e.root), freshCount=e.jumps.length;
    wheel(120);assert.equal(e.jumps.length,freshCount,'a fresh owner starts with the initial runway again');
    fresh.destroy();e.dom.window.close();
  });
  test(`${file}: touch reversals after landing bypass the quiet period in both directions`,()=>{
    const e=setup(file);
    Object.defineProperty(e.w.performance,'now',{value:()=>0});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBCampaignHero.mount(e.root);
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
  test(`${file}: native phone scrolling matches the 500ms CSS ease and cancels on teardown`,()=>{
    const e=setup(file,{width:390,coarse:true,profile:true});delete e.w.lenis;let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.scrollTo=({top})=>{e.w.scrollY=top;e.jumps.push(top);};
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();e.links[1].click();
    now=100;e.flush(now);assert.ok(e.w.scrollY>220&&e.w.scrollY<250);
    now=250;e.flush(now);assert.ok(e.w.scrollY>630&&e.w.scrollY<650,'CSS ease has travelled about 80% at half time');
    now=500;e.flush(now);e.flush(now);assert.equal(e.w.scrollY,800);assert.equal(e.queue.size,0);
    e.links[0].click();assert.ok(e.queue.size>0);owner.destroy();assert.equal(e.queue.size,0);e.dom.window.close();
  });
  test(`${file}: phone and tablet use Omega breakpoints without scaling the durations or changing desktop`,()=>{
    for(const device of [{width:390},{width:639},{width:640},{width:820},{width:1280,coarse:true},{width:1280,coarse:false}]){
      const e=setup(file,{...device,profile:true});
      const owner=e.w.TDBCampaignHero.mount(e.root);e.links[1].click();
      assert.equal(e.jumps[0][1].duration,device.width<992||device.coarse?(device.width<=639?.5:1):e.w.TDBMotion.duration()/1000);
      owner.destroy();e.dom.window.close();
    }
  });
  test(`${file}: pills animate continuously inside a fixed rail and fade through the exit`,()=>{
    const e=setup(file);
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
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
    const e=setup(file,{width:390,coarse:true,profile:true});
    const c=compositor(e);
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
    mobileTouch(e,'touchstart',600);now=100;mobileTouch(e,'touchmove',440);e.flush(now);
    const openingControl=e.opening.querySelector('[data-vimeo-controls-layer]'),campaignControl=e.panel.querySelector('[data-vimeo-controls-layer]');
    assert.equal(openingControl.style.translate,'0 -160px','opening playback control travels with its departing chapter');
    assert.equal(campaignControl.style.opacity,'1');assert.equal(campaignControl.style.translate,'','incoming control stays inside its own moving media panel');
    assert.equal(e.panel.style.transform,'translate3d(0,-160px,0)');
    assert.equal(e.copy.style.translate,'0 -160px');
    assert.equal(e.copy.style.opacity,'0.8');
    assert.equal(e.campaignCopy.style.translate,'0 160px');
    assert.equal(e.w.scrollY,0);assert.equal(c.animations.length,0,'the held finger previews before settling');
    mobileTouch(e,'touchend');
    assert.deepEqual(Array.from(c.flight().frames,f=>f.transform),['translate3d(0,-160px,0)','translate3d(0,-800px,0)']);
    assert.equal(c.flight().options.duration,500,'release uses the full Omega duration regardless of remaining distance');
    assert.equal(c.animations.length,8,'one panel, two foregrounds, opening control and four pill transforms');
    const controlFrames=c.animations.find(a=>a.node===openingControl).frames;assert.equal(controlFrames[0].translate,'0 -160px');assert.equal(controlFrames.at(-1).translate,'0 -800px');assert.equal(controlFrames[1].translate,'0 -624px');assert.equal(controlFrames[1].opacity,'0');assert.ok(Math.abs(controlFrames[1].offset-.725)<.00001);
    assert.ok(!c.animations.some(a=>a.node===campaignControl),'the second control must not be independently pinned or parallaxed');
    const copyFrames=c.animations.find(a=>a.node===e.copy).frames;
    assert.equal(copyFrames[0].translate,'0 -160px');assert.equal(copyFrames.at(-1).opacity,'0');
    assert.equal(copyFrames[0].opacity,'0.8','logo continues fading from the exact drag progress');
    const incoming=c.animations.find(a=>a.node===e.campaignCopy);
    assert.deepEqual(Array.from(incoming.frames,f=>f.translate),['0 160px','0 0px']);
    assert.equal(incoming.options,c.flight().options,'copy and panel share their timing');
    assert.equal(e.panel.querySelector('img').getAttribute('style'),null,'media has no foreground parallax');
    for(let frame=1;frame<=60;frame++){now+=16;e.flush(now);}
    assert.equal(c.scrolls.length,0,'no whole-document scroll writes during the animation');
    assert.equal(e.queue.size,0,'the compositor flight needs no JavaScript frame loop');
    e.links[0].click();assert.equal(c.animations.length,8,'a pill click does not interrupt the current flight');
    c.flight().onfinish();e.flush(now);
    assert.deepEqual(c.scrolls,[800]);assert.equal(e.panel.getAttribute('style'),null);
    assert.equal(e.copy.style.translate,'0 -800px');assert.equal(e.copy.style.opacity,'0');
    assert.equal(e.campaignCopy.style.translate,'0 0px');
    assert.equal(e.links[1].getAttribute('aria-current'),'step');
    assert.ok(c.animations.every(a=>a.cancelled),'native endpoint takes over from filled animations');
    mobileTouch(e,'touchstart',400);now+=100;mobileTouch(e,'touchmove',560);e.flush(now);
    assert.equal(e.panel.style.transform,'translate3d(0,160px,0)');assert.equal(e.w.scrollY,800);
    assert.ok(Math.abs(parseFloat(e.campaignCopy.style.translate.split(' ')[1])-40)<.001,'reverse drag retraces the same foreground offset');
    mobileTouch(e,'touchend');assert.equal(c.flight().frames.at(-1).transform,'translate3d(0,800px,0)');
    assert.equal(c.animations.filter(a=>a.node===e.campaignCopy).at(-1).frames.at(-1).translate,'0 200px');
    c.flight().onfinish();e.flush(now);assert.deepEqual(c.scrolls,[800,0]);assert.equal(e.copy.style.opacity,'1');
    assert.equal(openingControl.style.translate,'0 0px');
    assert.equal(e.campaignCopy.style.translate,'0 200px');
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
  test(`${file}: Omega quick flicks advance and held drags snap at half the actual slide in both directions`,()=>{
    for(const height of [600,800,1000]){
      const e=setup(file,{width:390,height,coarse:true,profile:true}),c=compositor(e);let now=0;
      Object.defineProperty(e.w.performance,'now',{value:()=>now});const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
      const release=(direction,distance,elapsed)=>{
        mobileTouch(e,'touchstart',height*.5);now+=elapsed;mobileTouch(e,'touchmove',height*.5-direction*distance);e.flush(now);mobileTouch(e,'touchend');return c.flight();
      };
      for(const direction of [1,-1]){
        const origin=direction===1?0:height;
        for(const distance of [height*.2,height*.5-1]){
          const flight=release(direction,distance,301);assert.equal(flight.frames.at(-1).transform,'translate3d(0,0px,0)');
          assert.equal(flight.options.duration,500);assert.equal(flight.options.easing,'ease');flight.onfinish();e.flush();assert.equal(e.w.scrollY,origin);
        }
        const flight=release(direction,height*.5,301);assert.equal(flight.frames.at(-1).transform,`translate3d(0,${-direction*height}px,0)`);
        flight.onfinish();e.flush();assert.equal(e.w.scrollY,height-origin);
      }
      for(const direction of [1,-1]){
        const flight=release(direction,6,300);assert.equal(flight.frames.at(-1).transform,`translate3d(0,${-direction*height}px,0)`);
        flight.onfinish();e.flush();assert.equal(e.w.scrollY,direction===1?height:0);
      }
      const count=c.animations.length;release(1,5,100);assert.equal(c.animations.length,count,'5px jitter does not start a slide');
      owner.destroy();e.dom.window.close();
    }
  });
  test(`${file}: an early native scroll settles when the deferred hero owner arrives`,async()=>{
    for(const initial of [80,500]){
      const e=setup(file,{width:390,coarse:true,profile:true}),c=compositor(e);
      e.w.scrollY=initial;
      const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
      await new Promise(r=>setTimeout(r,200));
      const destination=initial<400?0:800,flight=c.flight();
      assert.ok(flight,'an early partial scroll cannot remain stranded between chapters');
      assert.equal(flight.frames[0].transform,'translate3d(0,0px,0)');
      assert.equal(flight.frames.at(-1).transform,`translate3d(0,${initial-destination}px,0)`);
      assert.equal(e.w.scrollY,initial,'the recovery also avoids per-frame document scrolling');
      if(initial<400)assert.equal(flight.options.duration,500);
      flight.onfinish();e.flush();assert.equal(e.w.scrollY,destination);
      assert.equal(e.panel.getAttribute('style'),null);assert.equal(e.copy.style.opacity,destination===0?'1':'0');
      if(initial<400){
        const count=c.animations.length;
        e.root.dispatchEvent(new e.w.WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true}));
        assert.equal(c.animations.length,count,'returning an early short scroll does not consume the initial wheel runway');
      }
      owner.destroy();e.dom.window.close();
    }
  });
  test(`${file}: a touch already moving when the owner loads keeps its preview and release threshold`,()=>{
    for(const remaining of [60,350]){
      const e=setup(file,{width:390,coarse:true,profile:true}),c=compositor(e);
      e.w.scrollY=80;
      const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
      assert.equal(mobileTouch(e,'touchmove',600).defaultPrevented,true,'adopt the touch whose start preceded module loading');
      e.flush();assert.equal(e.panel.style.transform,'translate3d(0,0px,0)');
      mobileTouch(e,'touchmove',600-remaining);e.flush();
      assert.equal(e.panel.style.transform,`translate3d(0,${-remaining}px,0)`);
      assert.equal(e.copy.style.translate,`0 ${-80-remaining}px`);
      assert.equal(c.animations.length,0,'the moving finger still owns the preview');
      mobileTouch(e,'touchend');
      const destination=80+remaining<400?0:800;
      assert.equal(c.flight().frames.at(-1).transform,`translate3d(0,${80-destination}px,0)`);
      if(destination===0)assert.equal(c.flight().options.duration,500);
      c.flight().onfinish();e.flush();assert.equal(e.w.scrollY,destination);
      owner.destroy();e.dom.window.close();
    }
  });
  test(`${file}: repeated held native swipes recover through browser chrome resize at the halfway threshold`,async()=>{
    const e=setup(file,{width:390,coarse:true,profile:true}),c=compositor(e);
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
    for(const [origin,travel,destination] of [[0,100,0],[0,400,800],[800,-100,800],[800,-400,0],[0,400,800]]){
      assert.equal(e.w.scrollY,origin);
      let now=0;Object.defineProperty(e.w.performance,'now',{value:()=>now,configurable:true});
      mobileTouch(e,'touchstart',400);now=400;
      mobileTouch(e,'touchmove',400-travel,180,1,false);
      e.scroll(origin+travel);mobileTouch(e,'touchend');
      e.w.innerHeight=760;e.w.dispatchEvent(new e.w.Event('resize'));e.flush();
      await new Promise(r=>setTimeout(r,200));
      const flight=c.flight();assert.ok(flight&&!flight.cancelled,'native movement must settle after chrome resize');
      assert.equal(flight.frames.at(-1).transform,`translate3d(0,${origin+travel-destination}px,0)`);
      flight.onfinish();e.flush();assert.equal(e.w.scrollY,destination);
      e.w.innerHeight=800;e.w.dispatchEvent(new e.w.Event('resize'));e.flush();
    }
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: native settling preserves the flick duration captured at finger release`,async()=>{
    const e=setup(file,{width:390,coarse:true,profile:true}),c=compositor(e);
    let now=0;Object.defineProperty(e.w.performance,'now',{value:()=>now});
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
    for(const [origin,travel,destination] of [[0,24,800],[800,-24,0]]){
      mobileTouch(e,'touchstart',400);now+=280;
      mobileTouch(e,'touchmove',400-travel,180,1,false);e.scroll(origin+travel);
      mobileTouch(e,'touchend');now+=200;
      await new Promise(r=>setTimeout(r,200));
      const flight=c.flight();assert.ok(flight&&!flight.cancelled);
      flight.onfinish();e.flush();assert.equal(e.w.scrollY,destination,'the settling delay does not turn a quick flick into a held swipe');
    }
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: native movement after mount and after later landings cannot strand a partial hero`,async()=>{
    const e=setup(file,{width:390,coarse:true,profile:true}),c=compositor(e);
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
    for(const [position,destination] of [[80,0],[500,800],[700,800],[300,0],[500,800]]){
      e.scroll(position);await new Promise(r=>setTimeout(r,200));
      const flight=c.flight();assert.ok(flight&&!flight.cancelled,'scroll recovery is not limited to the mount-time probe');
      flight.onfinish();e.flush();assert.equal(e.w.scrollY,destination);
    }
    // Keyboard scroll is deliberately free, even inside the hero.
    e.root.dispatchEvent(new e.w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
    const count=c.animations.length;e.scroll(700);await new Promise(r=>setTimeout(r,200));
    assert.equal(c.animations.length,count);
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: release is observed when a descendant stops bubbling, and a late touch can resume a partial return`,()=>{
    const e=setup(file,{width:390,coarse:true,profile:true}),c=compositor(e);
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
    e.root.addEventListener('touchend',event=>event.stopPropagation());
    mobileTouch(e,'touchstart',600);mobileTouch(e,'touchmove',400);e.flush();mobileTouch(e,'touchend');
    assert.ok(c.flight(),'release must not depend on bubbling through other controls');
    c.flight().onfinish();e.flush();assert.equal(e.w.scrollY,800);
    e.scroll(720);
    mobileTouch(e,'touchmove',400);e.flush();
    mobileTouch(e,'touchmove',750);e.flush();mobileTouch(e,'touchend');
    assert.equal(c.flight().frames.at(-1).transform,'translate3d(0,720px,0)');
    c.flight().onfinish();e.flush();assert.equal(e.w.scrollY,0);
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: short carousel drags return smoothly and cancellation restores the native panel`,()=>{
    const e=setup(file,{width:390,coarse:true,profile:true}),c=compositor(e);
    let now=0;Object.defineProperty(e.w.performance,'now',{value:()=>now});
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();
    mobileTouch(e,'touchstart',600);now=301;mobileTouch(e,'touchmove',570);e.flush(now);mobileTouch(e,'touchend');
    assert.equal(c.flight().frames[0].transform,'translate3d(0,-30px,0)');
    assert.equal(c.flight().frames[1].transform,'translate3d(0,0px,0)');
    assert.equal(c.flight().options.duration,500,'a held short drag uses Omega’s half-second return');
    assert.equal(c.flight().options.easing,'ease');
    const returningCopy=c.animations.find(a=>a.node===e.campaignCopy);
    assert.equal(returningCopy.frames[0].translate,'0 192.5px');
    assert.equal(returningCopy.frames.at(-1).translate,'0 200px');
    c.flight().onfinish();e.flush(now);assert.equal(e.w.scrollY,0);assert.equal(e.copy.style.opacity,'1');
    assert.equal(e.campaignCopy.style.translate,'0 200px');
    mobileTouch(e,'touchstart',600);mobileTouch(e,'touchmove',500);e.flush(now);mobileTouch(e,'touchcancel');e.flush(now);
    assert.equal(e.panel.getAttribute('style'),null);assert.equal(e.copy.style.translate,'0 0px');
    assert.equal(c.animations.length,8,'touchcancel never creates a new flight');
    mobileTouch(e,'touchstart',600);mobileTouch(e,'touchmove',500);e.flush(now);
    mobileTouch(e,'touchmove',500,180,2);e.flush(now);
    assert.equal(e.panel.getAttribute('style'),null,'pinch returns the preview to native layout');
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: carousel resize, hidden-tab return and teardown cannot leave a half slide`,()=>{
    const e=setup(file,{width:390,coarse:true,profile:true}),c=compositor(e);
    let now=0,height=800,hidden=false;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    Object.defineProperty(e.w.document,'hidden',{get:()=>hidden});
    e.root.getBoundingClientRect=()=>({top:-e.w.scrollY,bottom:height*2-e.w.scrollY,height:height*2});
    e.opening.getBoundingClientRect=()=>({top:Math.min(0,height-e.w.scrollY),height});
    e.panel.getBoundingClientRect=()=>({top:height-e.w.scrollY,height});
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();e.links[1].click();
    assert.equal(c.flight().options.duration,500);
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
    assert.equal(e.campaignCopy.getAttribute('style'),'color:white');
    e.dom.window.close();
  });
  test(`${file}: a native mobile slide reuses geometry and paints copy in the same frame`,()=>{
    const e=setup(file,{width:390,coarse:true,profile:true});
    delete e.w.lenis;
    let now=0,measurements=0,resizeCallback;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    for(const node of [e.root,e.opening,e.panel]){
      const read=node.getBoundingClientRect;
      node.getBoundingClientRect=()=>{measurements++;return read();};
    }
    e.w.ResizeObserver=class{constructor(callback){resizeCallback=callback;}observe(){}disconnect(){}};
    e.w.scrollTo=({top})=>{e.w.scrollY=top;e.w.dispatchEvent(new e.w.Event('scroll'));};
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();e.links[1].click();
    const initialReads=measurements;
    for(let frame=1;frame<=60;frame++){
      now=frame*500/60;e.flush(now);
      assert.ok(Math.abs(parseFloat(e.copy.style.translate.split(' ')[1])+e.w.scrollY)<.001,'foreground follows the scroll written in this frame');
      assert.ok(Math.abs(parseFloat(e.campaignCopy.style.translate.split(' ')[1])-(800-e.w.scrollY)*.25)<.001,'incoming parallax stays in that same frame');
      assert.ok(e.queue.size<=1,'one shared animation frame remains scheduled');
    }
    e.flush(now);e.flush(now);
    assert.equal(e.w.scrollY,800);assert.equal(measurements,initialReads,'no repeated layout measurements throughout 60 animation frames');
    assert.equal(e.queue.size,0,'no work remains after landing');
    resizeCallback();e.flush(now);assert.equal(measurements,initialReads+7,'observed layout changes remeasure the native panels and both control positions once');
    const afterResize=measurements;
    for(let y=820;y<=1400;y+=20)e.scroll(y);
    assert.equal(measurements,afterResize,'ordinary page scrolling also reuses document anchors');
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: a hidden tab retains its native slide and catches up when frames resume`,()=>{
    const e=setup(file);
    delete e.w.lenis;
    let now=0, hidden=false;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    Object.defineProperty(e.w.document,'hidden',{get:()=>hidden});
    e.w.scrollTo=({top})=>{e.w.scrollY=top;};
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();e.links[1].click();
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
    const e=setup(file);
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBCampaignHero.mount(e.root);
    mobileTouch(e,'touchstart',600);now=200;mobileTouch(e,'touchmove',570);
    assert.equal(e.jumps.length,0,'a small slow movement does not trigger a slide');
    now=301;mobileTouch(e,'touchend');assert.equal(e.jumps.length,0);
    mobileTouch(e,'touchstart',600);now+=400;mobileTouch(e,'touchmove',200);
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
  test(`${file}: quick flicks advance while taps, cancellations and non-vertical gestures remain native`,()=>{
    const e=setup(file);
    let now=0;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    e.w.lenis.scrollTo=(...args)=>e.jumps.push(args);
    const owner=e.w.TDBCampaignHero.mount(e.root);
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
    assert.equal(e.jumps.length,1,'a 24px fast flick advances like Omega');
    mobileTouch(e,'touchstart',600);now+=60;mobileTouch(e,'touchmove',440);mobileTouch(e,'touchend');
    assert.equal(e.jumps.length,1);assert.equal(e.jumps.at(-1)[0],800,'another flick during the unfinished transition stays consumed');
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: native slides finish at the remeasured chapter after viewport height changes or rotation`,()=>{
    const e=setup(file);
    delete e.w.lenis;
    let now=0,height=800;
    Object.defineProperty(e.w.performance,'now',{value:()=>now});
    const rect=(top,size)=>({top,bottom:top+size,height:size,left:0,right:390,width:390});
    e.root.getBoundingClientRect=()=>rect(-e.w.scrollY,height*2);
    e.opening.getBoundingClientRect=()=>rect(Math.min(0,height-e.w.scrollY),height);
    e.panel.getBoundingClientRect=()=>rect(height-e.w.scrollY,height);
    e.w.scrollTo=({top})=>{e.w.scrollY=top;};
    const owner=e.w.TDBCampaignHero.mount(e.root);e.flush();e.links[1].click();
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
    assert.equal(e.campaignCopy.style.translate,'0 97.5px','rotation remeasures the quarter-screen offset');
    owner.destroy();e.dom.window.close();
  });
  test(`${file}: browser chrome does not move the halfway snap point during a held swipe`,()=>{
    const e=setup(file,{width:390,coarse:true,profile:true});let now=0;Object.defineProperty(e.w.performance,'now',{value:()=>now});
    const owner=e.w.TDBCampaignHero.mount(e.root);
    mobileTouch(e,'touchstart',600);now=400;e.w.innerHeight=600;e.w.dispatchEvent(new e.w.Event('resize'));
    mobileTouch(e,'touchmove',201);mobileTouch(e,'touchend');assert.equal(e.jumps.length,0,'399px stays below half an 800px panel');
    mobileTouch(e,'touchstart',600);now=800;mobileTouch(e,'touchmove',200);mobileTouch(e,'touchend');assert.equal(e.jumps.at(-1)[0],800);
    owner.destroy();e.dom.window.close();
  });
}

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const read = file => fs.readFileSync(__dirname + '/../' + file, 'utf8');
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function chromeFixture() {
  const dom = new JSDOM('<nav class="navbar10_component"></nav>', {runScripts:'outside-only'});
  const w = dom.window, nav = w.document.querySelector('nav'), animations = [];
  let nativePose = 'matrix(1, 0, 0, 1, 0, 0)';
  const css = w.getComputedStyle.bind(w);
  w.getComputedStyle = node => node === nav ? {transform: [...animations].reverse().find(a => !a.cancelled)?.pose || nativePose} : css(node);
  nav.getBoundingClientRect = () => {
    const pose = w.getComputedStyle(nav).transform;
    const shift = pose.startsWith('matrix(') ? Number(pose.slice(7,-1).split(',')[5]) : parseFloat(pose.match(/translateY\(([^)]+)/)?.[1]) || 0;
    return {top:20+shift,bottom:120+shift,height:100};
  };
  w.TDBMotion = {reduced:{matches:false}};
  nav.animate = (frames, options) => {
    let resolve, reject;
    const animation = {frames,options,pose:frames[0].transform,cancelled:false,
      finished:new Promise((a,b) => {resolve=a;reject=b;}),
      finish(){this.pose=frames[1].transform;resolve();},
      cancel(){this.cancelled=true;reject(Error('cancelled'));}};
    animations.push(animation); return animation;
  };
  w.eval(read('src/shared/site-chrome.js'));
  return {w,nav,animations,setNative(pose){nativePose=pose;},close(){w.close();}};
}

test('drawer chrome returns with motion to the current native pose after the last owner releases', async () => {
  const f = chromeFixture();
  try {
    const first=f.w.TDBSiteChrome.acquire(), second=f.w.TDBSiteChrome.acquire();
    assert.equal(f.animations.length,1); f.animations[0].finish();
    first(); assert.equal(f.animations.length,1,'another drawer still owns hiding');
    f.setNative('matrix(1, 0, 0, 1, 0, -12)'); second();
    const returning=f.animations[1];
    assert.equal(returning.frames[0].transform,'translateY(-120px)');
    assert.equal(returning.frames[1].transform,'matrix(1, 0, 0, 1, 0, -12)');
    assert.equal(returning.options.duration,420);
    returning.finish(); await flush(); assert.equal(returning.cancelled,true);
  } finally {f.close();}
});

test('a rapid reopen continues from the visible return pose; old completion cannot cancel the new hide', async () => {
  const f = chromeFixture();
  try {
    const release=f.w.TDBSiteChrome.acquire();f.animations[0].finish();release();
    f.animations[1].pose='matrix(1, 0, 0, 1, 0, -65)';
    const releaseAgain=f.w.TDBSiteChrome.acquire(), hiding=f.animations[2];
    assert.equal(hiding.frames[0].transform,'matrix(1, 0, 0, 1, 0, -65)');
    await flush();assert.equal(hiding.cancelled,false);
    hiding.finish();releaseAgain();f.animations[3].finish();await flush();
  } finally {f.close();}
});

test('late banners inherit the hidden chrome state and return only after the final owner', async () => {
  const f = chromeFixture();
  try {
    const first = f.w.TDBSiteChrome.acquire(), second = f.w.TDBSiteChrome.acquire();
    f.animations[0].finish();
    const banner = f.w.document.createElement('aside');
    banner.className = 'tdb-announcement';
    banner.getBoundingClientRect = () => ({ top: 100, bottom: 180, height: 80 });
    const motions = [];
    banner.animate = (frames, options) => {
      const animation = { frames, options, finished: Promise.resolve(), cancel() {} };
      motions.push(animation);
      return animation;
    };
    f.w.document.body.append(banner);
    await flush();
    assert.equal(motions.length, 1);
    assert.equal(motions[0].frames[0].transform, 'translateY(-180px)');
    assert.equal(motions[0].frames[1].transform, 'translateY(-180px)');
    assert.equal(motions[0].options.duration, 0, 'new chrome cannot flash over an active component');
    banner.append(f.w.document.createElement('span'));
    await flush();
    assert.equal(motions.length, 1, 'content changes cannot create duplicate animation owners');
    first();
    assert.equal(motions.length, 1);
    second();
    assert.equal(motions.length, 2);
    assert.equal(motions[1].options.duration, 420, 'late banner shares the animated return');
    const after = f.w.document.createElement('aside');
    after.className = 'tdb-announcement';
    after.animate = () => { throw Error('observer remained after release'); };
    f.w.document.body.append(after);
    await flush();
  } finally { f.close(); }
});

test('a hidden empty announcement shell follows its eventual height without covering controls', () => {
  const f = chromeFixture();
  try {
    let onSize, disconnected = false, height = 0;
    f.w.ResizeObserver = class { constructor(fn) { onSize = fn; } observe() {} disconnect() { disconnected = true; } };
    const shell = f.w.document.createElement('div'), motions = [];
    shell.id = 'tdb-elfsight-timer-shell';
    const computed = f.w.getComputedStyle;
    f.w.getComputedStyle = node => node === shell ? { transform: motions.findLast(a => !a.cancelled)?.frames[1].transform || 'none' } : computed(node);
    shell.getBoundingClientRect = () => {
      const shift = parseFloat(f.w.getComputedStyle(shell).transform.match(/translateY\(([^)]+)/)?.[1]) || 0;
      return { height, top: shift, bottom: height + shift };
    };
    shell.animate = (frames, options) => {
      const animation = { frames, options, finished: Promise.resolve(), cancel() { this.cancelled = true; } };
      motions.push(animation);return animation;
    };
    f.w.document.body.append(shell);
    const release = f.w.TDBSiteChrome.acquire();
    f.animations[0].finish();
    height = 80;
    onSize();
    assert.equal(motions[1].frames[0].transform, 'translateY(-80px)');
    assert.equal(motions[1].frames[1].transform, 'translateY(-80px)');
    assert.equal(motions[1].options.duration, 0);
    assert.equal(shell.getBoundingClientRect().bottom, 0, 'invisible shell cannot intercept guide taps');
    onSize();assert.equal(motions.length, 2, 'no resize feedback');
    release();assert.equal(disconnected, true);
    assert.equal(motions[2].options.duration, 420);
  } finally { f.close(); }
});

test('VIP permits its mobile scroller under a menu lock and releases only its own lease', () => {
  const dom=new JSDOM('<nav class="navbar10_component"><button class="navbar10_menu-button" aria-expanded="true"></button><div class="navbar10_menu"></div></nav><a href="#VIP" id="join">Join</a><div id="tdb-vip-drawer" style="overflow-y:auto"><a class="tdb-vip-drawer-handle"><span class="tdb-vip-drawer-label"></span></a><div class="tdb-vip-drawer-body"><input></div></div><main>Page</main>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, doc=w.document, drawer=doc.querySelector('#tdb-vip-drawer');
  Object.defineProperty(w,'innerWidth',{value:390});
  w.matchMedia=q=>({matches:q.includes('max-width'),addEventListener(){}});
  w.scrollTo=()=>{};w.lenis={start(){},stop(){},resize(){}};
  Object.defineProperties(drawer,{clientHeight:{value:600},scrollHeight:{value:1200}});
  try {
    w.eval(read('src/shared/scroll-lock.js').replace('__TDB_SCROLL_LOCK_CSS__',JSON.stringify(read('src/styles/tdb-scroll-lock.css'))));
    const releaseMenu=w.TDBScrollLock.acquire({allow:()=>[doc.querySelector('.navbar10_menu')]});
    const wheel=target=>{const event=new w.WheelEvent('wheel',{deltaY:40,bubbles:true,cancelable:true});target.dispatchEvent(event);return event.defaultPrevented;};
    assert.equal(wheel(drawer.querySelector('input')),true,'menu alone blocks the separate VIP surface');
    w.eval(read('dist/tdb-vip-drawer.js'));doc.querySelector('#join').click();
    assert.equal(w.TDBVIPDrawer.status().state,2);drawer.scrollTop=100;
    assert.equal(wheel(drawer.querySelector('input')),false);
    assert.equal(wheel(doc.querySelector('main')),true);
    const touch=new w.Event('touchstart',{bubbles:true});Object.defineProperty(touch,'touches',{value:[{clientX:10,clientY:100}]});drawer.querySelector('input').dispatchEvent(touch);
    const move=new w.Event('touchmove',{bubbles:true,cancelable:true});Object.defineProperty(move,'touches',{value:[{clientX:10,clientY:60}]});drawer.querySelector('input').dispatchEvent(move);
    assert.equal(move.defaultPrevented,false,'touch scrolling reaches the VIP body too');
    w.TDBVIPDrawer.reset();assert.equal(w.TDBScrollLock.active,true);
    assert.equal(wheel(drawer.querySelector('input')),true);
    releaseMenu();assert.equal(w.TDBScrollLock.active,false);
  } finally {w.close();}
});

test('Explore treatments stops stale wheel inertia before native navigation without taking over the link', () => {
  const dom=new JSDOM('<a href="#All-treatments"><span>Explore</span></a><section id="All-treatments"></section>',{runScripts:'outside-only'});
  const w=dom.window, doc=w.document, order=[];
  doc.documentElement.dataset.wfPage='677cf86df9952f978d94d8a9';
  w.lenis={isScrolling:'smooth',reset(){order.push('reset');this.isScrolling=false;}};
  w.eval(read('src/shared/anchor-settlement.js'));
  doc.addEventListener('click',event=>{order.push('native');assert.equal(event.defaultPrevented,false);});
  try {
    doc.querySelector('span').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
    assert.deepEqual(order,['reset','native']);order.length=0;
    w.lenis.isScrolling='smooth';doc.querySelector('span').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true}));
    assert.deepEqual(order,['native'],'modified clicks retain their normal behavior');
  } finally {w.close();}
});

test('USP barn selection survives pointer exit and transfers to the next activated highlight', async () => {
  const dom=new JSDOM('<section data-tdb-usp>'+[0,1].map(i=>`<div data-tdb-usp-trigger-zone><img class="feature-item_door-image"><span data-tdb-usp-label>Highlight ${i}</span><a data-tdb-usp-launch="${i}">Open</a></div>`).join('')+'</section>',{runScripts:'outside-only'});
  const w=dom.window, doc=w.document, opened=[];
  Object.defineProperty(doc,'currentScript',{value:{src:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@3217122904abee907bac1af3c23c28320e421219/dist/tdb-usp-drawer.js'}});
  w.TDBModules={load:()=>Promise.resolve(),withBusy:(_trigger,action)=>action()};
  w.TDBSwiper={register(){},mount(){return {open:index=>opened.push(index)}}};
  try {
    w.eval(read('src/usp/drawer.js'));doc.dispatchEvent(new w.Event('DOMContentLoaded'));
    const zones=[...doc.querySelectorAll('[data-tdb-usp-trigger-zone]')];
    zones[0].querySelector('a').focus();
    zones[0].dispatchEvent(new w.Event('pointerdown',{bubbles:true}));
    zones[0].querySelector('a').blur();await flush();
    assert.equal(zones[0].querySelector('img').classList.contains('is-usp-active'),true,'press retains the dim state when native focus leaves before click');
    zones[0].dispatchEvent(new w.Event('pointercancel',{bubbles:true}));await flush();
    assert.equal(zones[0].querySelector('img').classList.contains('is-usp-active'),false,'a cancelled gesture does not select a barn');
    zones[0].querySelector('a').click();await flush();
    zones[0].dispatchEvent(new w.Event('pointerleave'));await flush();
    assert.equal(zones[0].querySelector('img').classList.contains('is-usp-active'),true);
    zones[1].querySelector('a').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await flush();
    assert.deepEqual(opened,[0,1]);
    assert.equal(zones[0].querySelector('img').classList.contains('is-usp-active'),false);
    assert.equal(zones[1].querySelector('img').classList.contains('is-usp-active'),true);
  } finally {w.close();}
});

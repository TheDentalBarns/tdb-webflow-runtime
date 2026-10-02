const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/navbar/desktop-dropdowns.js'),'utf8');
function fixture(t,width=1440){
 const dom=new JSDOM('<div class="navbar10_component">'+['Services','Discover'].map(label=>`<div class="navbar10_menu-dropdown"><button class="w-dropdown-toggle" aria-expanded="false">${label}</button><nav class="w-dropdown-list"><div class="navbar10_container"><div class="navbar10_dropdown-content-left"><a href="/">Link</a></div><div class="navbar10_dropdown-content-right">More</div></div></nav></div>`).join('')+'</div><main>Background</main>',{runScripts:'outside-only',pretendToBeVisual:true});
 t.after(()=>dom.window.close());const w=dom.window,media={matches:width>=992,addEventListener(type,fn){this.change=fn;}};
 w.matchMedia=()=>media;let flushes=0,stops=0;w.lenis={scrollTo(y,options){assert.equal(y,0);assert.equal(options.immediate,true);flushes++;},stop(){stops++;}};
 const animations=[];w.HTMLElement.prototype.animate=function(frames,options){let finish;const a={target:this,frames,options,finished:new Promise(resolve=>finish=resolve),cancel(){finish();},finish(){finish();}};animations.push(a);return a;};
 w.eval(source);const toggles=[...w.document.querySelectorAll('button')],panels=[...w.document.querySelectorAll('nav')];
 const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
 return {w,media,animations,panels,async set(i,open){toggles[i].setAttribute('aria-expanded',String(open));await tick();},async finish(){animations.forEach(a=>a.finish());await tick();},tick,get locked(){return w.document.documentElement.classList.contains('tdb-desktop-nav-locked');},get flushes(){return flushes;},get stops(){return stops;}};
}
test('desktop opens with mobile cadence despite reduced-motion settings and blocks background wheel only',async t=>{
 const h=fixture(t);assert(!h.locked);await h.set(0,true);assert(h.locked);assert.equal(h.flushes,1);assert.equal(h.stops,0);
 assert.deepEqual(h.animations.map(a=>a.options.duration),[500,500,520,520]);assert.equal(h.animations[2].options.delay,70);
 for(const [target,prevented] of [[h.w.document.querySelector('main'),true],[h.panels[0].querySelector('a'),false]]){const event=new h.w.WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:100});target.dispatchEvent(event);assert.equal(event.defaultPrevented,prevented);}
 await h.finish();assert.equal(h.panels[0].dataset.tdbDesktopPanel,'open');
});
test('closing remains rendered, inert and locked until the reverse animation ends',async t=>{
 const h=fixture(t);await h.set(0,true);await h.finish();await h.set(0,false);assert(h.locked);assert.equal(h.panels[0].dataset.tdbDesktopPanel,'closing');assert.equal(h.panels[0].inert,true);assert.equal(h.animations.at(-1).options.duration,420);
 await h.finish();assert(!h.locked);assert(!h.panels[0].hasAttribute('data-tdb-desktop-panel'));assert(!h.w.document.body.hasAttribute('data-lenis-prevent'));
});
test('rapid reopen cancels stale closure; switching menus keeps one continuous scroll lock',async t=>{
 const h=fixture(t);await h.set(0,true);await h.set(0,false);await h.set(0,true);await h.finish();assert(h.locked);assert.equal(h.panels[0].dataset.tdbDesktopPanel,'open');
 await h.set(0,false);await h.set(1,true);await h.finish();assert(h.locked);assert(!h.panels[0].hasAttribute('data-tdb-desktop-panel'));assert.equal(h.panels[1].dataset.tdbDesktopPanel,'open');assert.equal(h.flushes,1);
 await h.set(1,false);await h.finish();assert(!h.locked);
});
test('mobile is untouched and a breakpoint change releases desktop styles and lock',async t=>{
 const mobile=fixture(t,390);await mobile.set(0,true);assert(!mobile.locked);assert.equal(mobile.animations.length,0);
 const h=fixture(t);h.w.document.body.setAttribute('data-lenis-prevent','existing');await h.set(0,true);h.media.matches=false;h.media.change();await h.tick();assert(!h.locked);assert(!h.panels[0].hasAttribute('data-tdb-desktop-panel'));assert.equal(h.w.document.body.getAttribute('data-lenis-prevent'),'existing');
});

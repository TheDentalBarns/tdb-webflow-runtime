const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8'), sleep=ms=>new Promise(r=>setTimeout(r,ms));
function fixture(home=true){
 const dom=new JSDOM('<html data-wf-page="'+(home?'677cf86df9952f978d94d8a9':'other')+'"><head><style>'+read('src/styles/tdb-scroll-lock.css')+'</style></head><body style="padding-right:3px" data-lenis-prevent="original"><p id="outside">Page</p><div id="panel" style="overflow-y:auto;overflow-x:auto"><span id="inside">Panel</span></div>'+read('src/consent/banner.html')+'</body></html>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://dentalbarns.webflow.io/'});
 const w=dom.window,d=w.document;w.Element.prototype.getAnimations=()=>[];w.Element.prototype.animate=()=>({cancel(){}});
 Object.defineProperty(d.documentElement,'clientWidth',{value:1000});Object.defineProperty(w,'innerWidth',{value:1015});
 return{dom,w,d,close:()=>w.close()};
}
for(const home of [true,false])test('fixed stylesheet locks correct root; owners and Lenis restore ('+home+')',()=>{
 const f=fixture(home),{w,d}=f;w.eval(read('src/shared/scroll-lock.js'));
 const styles=d.querySelectorAll('style').length;
 const one=w.TDBScrollLock.acquire(),two=w.TDBScrollLock.acquire();
 assert.equal(w.getComputedStyle(d.documentElement).overflow,'hidden');
 assert.equal(w.getComputedStyle(d.body).overflow,home?'':'hidden');
 assert.equal(d.documentElement.style.getPropertyValue('--tdb-scroll-lock-padding'),'18px');
 assert.equal(d.querySelectorAll('style').length,styles,'locking inserts no CSS');
 assert.equal(d.body.getAttribute('data-lenis-prevent'),'');
 one();one();assert(w.TDBScrollLock.active);two();assert(!w.TDBScrollLock.active);
 assert.equal(d.body.getAttribute('data-lenis-prevent'),'original');assert.equal(d.body.style.paddingRight,'3px');f.close();
});
test('wheel and mobile touch allow internal scrolling but contain edges and background',()=>{
 const f=fixture(),{w,d}=f;w.eval(read('src/shared/scroll-lock.js'));
 const panel=d.querySelector('#panel'),inside=d.querySelector('#inside'),outside=d.querySelector('#outside');
 Object.defineProperty(panel,'scrollHeight',{value:500});Object.defineProperty(panel,'clientHeight',{value:100});
 panel.scrollTop=100;const release=w.TDBScrollLock.acquire({allow:()=>[panel]});
 function wheel(target,dy,extra={}){const event=new w.WheelEvent('wheel',{deltaY:dy,bubbles:true,cancelable:true,...extra});target.dispatchEvent(event);return event.defaultPrevented;}
 assert.equal(wheel(inside,30),false);assert.equal(wheel(outside,30),true);assert.equal(wheel(outside,30,{ctrlKey:true}),false);
 panel.scrollTop=400;assert.equal(wheel(inside,30),true);assert.equal(wheel(inside,-30),false);
 function touch(type,target,y){const event=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'touches',{value:[{clientX:0,clientY:y}]});target.dispatchEvent(event);return event.defaultPrevented;}
 touch('touchstart',inside,100);assert.equal(touch('touchmove',inside,80),true);
 panel.scrollTop=100;touch('touchstart',inside,100);assert.equal(touch('touchmove',inside,80),false);
 touch('touchstart',outside,100);assert.equal(touch('touchmove',outside,80),true);
 release();assert.equal(wheel(outside,30),false);f.close();
});
test('banner keyboard lock is inactive after closing; modifiers and editing are preserved',async()=>{
 const f=fixture(),{w,d}=f;w.eval(read('dist/tdb-consent-startup.min.js'));d.dispatchEvent(new w.Event('DOMContentLoaded'));await sleep(40);
 const root=d.querySelector('#tdb-consent-root');
 const editable=d.createElement('div');editable.setAttribute('contenteditable','');root.append(editable);
 function key(target,key,extra={}){const event=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra});target.dispatchEvent(event);return event.defaultPrevented;}
 const outside=d.querySelector('#outside');assert.equal(key(outside,'PageDown'),true);assert.equal(key(outside,'ArrowDown',{ctrlKey:true}),false);assert.equal(key(editable,'Home'),false);
 assert.equal(key(d.querySelector('#cookiescript_accept'),' '),false);
 w.CookieScript.instance.hide();await sleep(490);
 for(const k of ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '])assert.equal(key(outside,k),false,k+' remains usable after closure');f.close();
});

const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(process.env.TDB_VIP_SOURCE || path.join(__dirname,'../../dist/tdb-vip-drawer.js'),'utf8');
const patch=fs.readFileSync(path.join(__dirname,'../../src/vip-drawer/vip-focus.js'),'utf8');
const turn=()=>new Promise(r=>setImmediate(r));
async function setup(t,mobile=false,options={}){
 const dom=new JSDOM(`<html><body><main><nav><a href="#VIP" id="open">Join VIP</a><a href="/first-visit">First visit</a></nav><div id="was-inert" inert>Prior inert</div><footer><div id="VIP">Native form</div><div id="tdb-vip-drawer"><a class="tdb-vip-drawer-handle" href="#VIP"><span class="tdb-vip-drawer-label">Join VIP</span></a><div class="tdb-vip-drawer-body"><form><input id="name" value="Preserved"><button type="button" id="last">Continue</button><button disabled>Disabled</button></form></div></div></footer></main><div id="tdb-consent-root"><button id="consent">Essential only</button></div></body></html>`,{url:'https://dentalbarns.webflow.io/'+(options.hash?'#VIP':''),runScripts:'outside-only',pretendToBeVisual:true});
 t.after(()=>dom.window.close());const w=dom.window;w.matchMedia=q=>({matches:q.includes('max-width')?mobile:!mobile,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.scrollY=1000;
 w.HTMLElement.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[this.getBoundingClientRect()]};
 w.HTMLElement.prototype.getBoundingClientRect=function(){const top=this.id==='VIP'?10000:0;return {width:100,height:40,top,bottom:top+40,left:0,right:100}};
 w.IntersectionObserver=class{observe(){}disconnect(){}};if(options.consent){w.document.getElementById('tdb-consent-root').classList.add('tdb-consent-active');w.document.getElementById('consent').focus();}w.eval(source);w.eval(patch);await turn();
 const q=s=>w.document.querySelector(s),key=(key,shiftKey=false)=>w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key,shiftKey,bubbles:true,cancelable:true}));
 const close=async()=>{w.TDBVIPDrawer.close();await turn();const e=new w.Event('transitionend');Object.defineProperty(e,'propertyName',{value:'transform'});q('#tdb-vip-drawer').dispatchEvent(e);await turn();await new Promise(r=>setTimeout(r,25));};
 return{w,q,key,close};
}
for(const mobile of [false,true])test(`keyboard modal lifecycle, mobile=${mobile}`,async t=>{
 const {w,q,key,close}=await setup(t,mobile);const d=q('#tdb-vip-drawer'),body=q('.tdb-vip-drawer-body'),handle=q('.tdb-vip-drawer-handle');
 assert.equal(d.hasAttribute('inert'),true);assert.equal(body.hasAttribute('inert'),true);
 q('#open').focus();w.TDBVIPDrawer.open();await turn();
 assert.equal(w.document.activeElement,handle,'No automatic text-input/mobile keyboard focus');assert.equal(d.getAttribute('role'),'dialog');assert.equal(d.getAttribute('aria-modal'),'true');assert.equal(body.hasAttribute('inert'),false);assert.equal(q('nav').hasAttribute('inert'),true);
 q('#last').focus();key('Tab');assert.equal(w.document.activeElement,handle);key('Tab',true);assert.equal(w.document.activeElement,q('#last'));
 q('#open').focus();assert.equal(w.document.activeElement,handle,'Programmatic focus escape redirected');
 q('#name').value='Kept after close';await close();
 assert.equal(w.document.activeElement,q('#open'));assert.equal(q('#name').value,'Kept after close');assert.equal(q('nav').hasAttribute('inert'),false);assert.equal(q('#was-inert').hasAttribute('inert'),true);assert.equal(d.hasAttribute('inert'),true);assert.equal(d.hasAttribute('aria-modal'),false);
 if(w.TDBVIPDrawer.resumeScroll){w.TDBVIPDrawer.resumeScroll({peek:true,up:130,down:0});await turn();}else{w.scrollY=1600;w.dispatchEvent(new w.Event('scroll'));await new Promise(r=>setTimeout(r,25));w.scrollY=1450;w.dispatchEvent(new w.Event('scroll'));await new Promise(r=>setTimeout(r,25));}assert.equal(d.classList.contains('is-peeking'),true);assert.equal(d.hasAttribute('inert'),false);assert.equal(body.hasAttribute('inert'),true);assert.equal(q('nav').hasAttribute('inert'),false);assert.equal(w.document.activeElement,q('#open'),'Peek never steals focus');
});
test('higher consent dialog retains focus; existing Escape handler still closes VIP',async t=>{
 const {w,q,key,close}=await setup(t);q('#open').focus();w.TDBVIPDrawer.open();await turn();q('#tdb-consent-root').classList.add('tdb-consent-active');q('#consent').focus();assert.equal(w.document.activeElement,q('#consent'));key('Tab');assert.equal(w.document.activeElement,q('#consent'));
 key('Escape');assert.equal(w.TDBVIPDrawer.status().state,2,'Higher consent retains Escape ownership');const wheel=new w.Event('wheel',{bubbles:true,cancelable:true});q('#consent').dispatchEvent(wheel);assert.equal(wheel.defaultPrevented,false);
 q('#tdb-consent-root').classList.remove('tdb-consent-active');q('.tdb-vip-drawer-handle').focus();key('Escape');assert.equal(w.TDBVIPDrawer.status().state,3);await close();assert.equal(w.TDBVIPDrawer.status().state,0);
});

test('closing then reopening retains originating trigger and delayed cookie mount is excluded',async t=>{
 const {w,q,close}=await setup(t);q('#tdb-consent-root').remove();q('#open').focus();w.TDBVIPDrawer.open();await turn();w.TDBVIPDrawer.close();await turn();w.TDBVIPDrawer.open();await turn();assert.equal(q('#tdb-vip-drawer').getAttribute('aria-modal'),'true');assert.equal(q('nav').hasAttribute('inert'),true);
 const cookie=w.document.createElement('div');cookie.id='tdb-consent-root';cookie.className='tdb-consent-active';cookie.innerHTML='<button id="late-consent">Essential only</button>';w.document.body.append(cookie);q('#late-consent').focus();assert.equal(w.document.activeElement,q('#late-consent'));assert.equal(cookie.hasAttribute('inert'),false);cookie.remove();await close();assert.equal(w.document.activeElement,q('#open'));
});

test('initial desktop VIP hash waits behind active cookie dialog then focuses VIP',async t=>{
 const {w,q,close}=await setup(t,false,{hash:true,consent:true});await new Promise(r=>setTimeout(r,25));assert.equal(w.TDBVIPDrawer.status().state,2);assert.equal(w.document.activeElement,q('#consent'));assert.equal(q('#tdb-consent-root').hasAttribute('inert'),false);
 q('#tdb-consent-root').classList.remove('tdb-consent-active');w.document.dispatchEvent(new w.CustomEvent('CookieScriptCurrentState',{bubbles:true}));assert.equal(w.document.activeElement,q('.tdb-vip-drawer-handle'));await close();assert.equal(q('#tdb-vip-drawer').hasAttribute('inert'),true);
});

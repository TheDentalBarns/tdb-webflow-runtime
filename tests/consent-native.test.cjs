/* Native consent contract checks for the preserved CookieScript interface. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {JSDOM} = require(process.env.TDB_JSDOM || 'jsdom');
const source = fs.readFileSync('dist/tdb-consent-startup.min.js', 'utf8');
const markup = fs.readFileSync('src/consent/banner.html', 'utf8');
let advance;
const sleep = ms => advance(ms);
function setup(cookie, fontGate) {
 const dom = new JSDOM('<!doctype html><html><body style="padding-right:3px"><a id="settings" href="#">Settings</a>'+markup+'</body></html>', {url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window, events=[];
 const timers=new Map();let now=0, timerId=0;
 w.setTimeout=(fn,delay=0)=>{timers.set(++timerId,{fn,time:now+delay});return timerId;};
 w.clearTimeout=id=>timers.delete(id);
 w.requestAnimationFrame=fn=>w.setTimeout(fn,16);w.cancelAnimationFrame=w.clearTimeout;
 advance=async ms=>{
  const end=now+ms;
  for(;;){
   const next=[...timers].filter(([,t])=>t.time<=end).sort((a,b)=>a[1].time-b[1].time)[0];
   if(!next)break;now=next[1].time;timers.delete(next[0]);next[1].fn();await Promise.resolve();
  }
  now=end;await Promise.resolve();
 };
 const fontCalls=[];
 if(fontGate)Object.defineProperty(w.document,'fonts',{value:{check:()=>false,load:(font,text)=>{fontCalls.push([font,text]);return fontGate;}}});
 w.Element.prototype.getAnimations=()=>[];
 w.Element.prototype.animate=()=>({cancel(){},finished:Promise.resolve()});
 if(cookie)w.document.cookie='CookieScriptConsent='+encodeURIComponent(JSON.stringify(cookie))+'; Path=/';
 const bindings=[];
 const add=w.EventTarget.prototype.addEventListener;
 w.EventTarget.prototype.addEventListener=function(type,...args){
  if(['cookiescript_accept','cookiescript_reject','tdb-consent-dialog'].includes(this.id)||(this===w.document&&type==='keydown'))bindings.push([this.id||'document',type]);
  return add.call(this,type,...args);
 };
 for(const event of ['CookieScriptLoaded','CookieScriptCurrentState','CookieScriptAcceptAll','CookieScriptReject','CookieScriptCategory-performance','CookieScriptCategory-strict','CookieScriptCategory-targeting','CookieScriptCategory-functionality'])w.addEventListener(event,()=>events.push(event));
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {dom,w,events,bindings,fontCalls,api:w.CookieScript.instance,root:w.document.getElementById('tdb-consent-root')};
}
(async()=>{
 let x=setup();await sleep(45);
 assert.equal(x.root.getAttribute('aria-hidden'),'false');assert.equal(x.w.TDBScrollLock.active,true);
 assert.equal(x.api.isOpen(),true,'open state is available to nested dialogs');
 assert.equal(x.root.inert,false);
 assert.equal(x.root.querySelector('.tdb-consent-scroll').classList.contains('is-consent-content-open'),true,'content reveals with the cream surface, before the delayed text fade');
 assert.equal(x.root.querySelector('.tdb-consent-motion').classList.contains('is-consent-text-open'),false);await sleep(80);assert.equal(x.root.querySelector('.tdb-consent-motion').classList.contains('is-consent-text-open'),true);
 assert.equal(x.w.document.querySelectorAll('#tdb-consent-root').length,1);
 assert.deepEqual(Array.from(x.api.currentState().categories),['strict']);
 x.events.length=0;x.w.document.getElementById('cookiescript_accept').click();
 assert.equal(x.api.currentState().action,'accept');assert.deepEqual(x.events,[]);assert.equal(x.w.TDBScrollLock.active,true);
 assert.equal(x.api.isOpen(),true,'closing banner retains dialog ownership');
 assert.equal(x.root.querySelector('.tdb-consent-scroll').classList.contains('is-consent-content-open'),false,'content remains clipped to the departing surface');
 x.w.document.getElementById('cookiescript_accept').click();await sleep(490);
 assert.equal(x.root.getAttribute('aria-hidden'),'true');assert.equal(x.w.TDBScrollLock.active,false);
 assert.equal(x.root.inert,true);
 assert.equal(x.api.isOpen(),false,'ownership ends after the full closing motion');
 assert.deepEqual(x.events,['CookieScriptAcceptAll','CookieScriptCurrentState','CookieScriptCategory-performance','CookieScriptCategory-strict','CookieScriptCategory-targeting','CookieScriptCategory-functionality']);
 assert.equal(x.w.dataLayer.length,1);assert.equal(x.w.document.body.hasAttribute('data-lenis-prevent'),false);
 assert.equal(x.w.document.body.style.paddingRight,'3px');
 const saved=x.api.currentState();x.dom.window.close();
 x=setup(saved);await sleep(45);assert.equal(x.root.getAttribute('aria-hidden'),'true');assert.equal(x.w.TDBScrollLock.active,false);
 assert.equal(x.root.inert,true);assert.deepEqual(x.bindings,[],'saved choice leaves banner controls unbound');
 assert.deepEqual(x.events,['CookieScriptLoaded','CookieScriptCurrentState'],'saved choice still announces its state');
 assert.equal(x.root.inert,true);
 const link=x.w.document.getElementById('settings');link.focus();const unlockNav=x.w.TDBScrollLock.acquire();x.api.show();await sleep(45);
 assert.equal(x.bindings.filter(([id,type])=>id==='cookiescript_accept'&&type==='click').length,1);
 const reject=x.w.document.getElementById('cookiescript_reject');reject.focus();const tab=new x.w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true});reject.dispatchEvent(tab);assert.equal(x.w.document.activeElement.id,'cookiescript_accept');
 x.events.length=0;reject.click();await sleep(490);assert.equal(x.api.currentState().action,'reject');assert.equal(x.w.TDBScrollLock.active,true);unlockNav();assert.equal(x.w.TDBScrollLock.active,false);assert.equal(x.w.document.activeElement,link);
 assert.deepEqual(x.events,['CookieScriptReject','CookieScriptCurrentState','CookieScriptCategory-strict']);
 x.api.show();x.api.hide();x.api.show();await sleep(520);assert.equal(x.root.getAttribute('aria-hidden'),'false');assert.equal(x.w.TDBScrollLock.active,true);
 assert.equal(x.root.querySelector('.tdb-consent-scroll').classList.contains('is-consent-content-open'),true,'rapid reopening restores the content reveal');
 x.api.hide();await sleep(490);assert.equal(x.w.TDBScrollLock.active,false);x.dom.window.close();
 for(const cookie of [{action:'reject',categories:[]},{a:'accept',c:'performance,targeting'},{action:'acceptall',categories:[]}]){x=setup(cookie);await sleep(40);assert.equal(x.root.getAttribute('aria-hidden'),'true');assert.ok(['accept','reject'].includes(x.api.currentState().action));x.dom.window.close();}
 x=setup({action:'invalid'});await sleep(40);assert.equal(x.root.getAttribute('aria-hidden'),'false');x.dom.window.close();
 x=setup(undefined,new Promise(()=>{}));await sleep(45);
 assert.equal(x.root.getAttribute('aria-hidden'),'false','banner opens even when fonts never become ready');
 assert.equal(x.w.TDBScrollLock.active,true);
 assert.equal(x.fontCalls.length,0,'consent does not initiate font loads');
 x.api.hide();await sleep(490);assert.equal(x.root.getAttribute('aria-hidden'),'true');assert.equal(x.w.TDBScrollLock.active,false);x.dom.window.close();
 assert.equal(source.includes('insertAdjacentHTML'),false);assert.equal(source.includes('offsetHeight'),false);
 console.log('PASS: fresh/saved/legacy choices, cookie categories, event order, 470ms close, double click, focus trap/return, independent lock owners, rapid reopen, no injected markup/reflow restart.');
})().catch(error=>{console.error(error);process.exitCode=1});

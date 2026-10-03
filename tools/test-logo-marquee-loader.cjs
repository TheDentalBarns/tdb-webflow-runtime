const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');
const code=fs.readFileSync(require('path').join(__dirname,'../dist/tdb-logo-marquee-loader.js'),'utf8');
class Bus {constructor(){this.events={};}addEventListener(k,f,o={}){(this.events[k] ||= []).push(f);o.signal?.addEventListener('abort',()=>this.events[k]=this.events[k].filter(x=>x!==f),{once:true});}emit(type){for(const f of [...(this.events[type]||[])])f({type});}}
class Element {constructor(){this.isConnected=true;}matches(){return true;}querySelectorAll(){return [];}}
const tick=()=>new Promise(r=>setImmediate(r));
function setup({exists=true,saved=false,fail=false}={}){
 const win=new Bus(),doc=new Bus(),track=new Element();let requests=0,io,mo;
 doc.currentScript={src:'https://cdn.test/abc/dist/tdb-logo-marquee-loader.js'};doc.readyState='complete';doc.cookie=saved?'CookieScriptConsent='+encodeURIComponent(JSON.stringify({action:'reject'})):'';doc.body={};doc.hidden=false;
 doc.querySelectorAll=()=>exists?[track]:[];
 doc.createElement=()=>({dataset:{},remove(){this.isConnected=false;}});
 doc.head={append(script){requests++;assert.equal(script.src,'https://cdn.test/abc/dist/tdb-logo-marquee.js');if(fail&&requests===1)queueMicrotask(()=>script.onerror());else queueMicrotask(()=>{win.TDBLogoMarquee={refresh(){},start(){}};script.onload();});}};
 class IO {constructor(cb){this.cb=cb;io=this;}observe(){}disconnect(){this.disconnected=true;}}
 class MO {constructor(cb){this.cb=cb;mo=this;}observe(){}disconnect(){}}
 win.IntersectionObserver=IO;
 vm.runInNewContext(code,{window:win,document:doc,Element,IntersectionObserver:IO,MutationObserver:MO,URL,AbortController,Set,Promise,console});
 return {win,doc,track,near(value=true){io.cb([{target:track,isIntersecting:value}]);},add(){const t=new Element();mo.cb([{addedNodes:[t]}]);return t;},requests:()=>requests};
}
(async()=>{
 let x=setup();x.near();await tick();assert.equal(x.requests(),0);x.win.emit('CookieScriptReject');await tick();assert.equal(x.requests(),1);for(let i=0;i<5;i++)x.win.emit('CookieScriptAcceptAll');await tick();assert.equal(x.requests(),1);console.log('PASS proximity first; Reject releases; duplicate events');
 x=setup();x.win.emit('CookieScriptAccept');await tick();assert.equal(x.requests(),0);x.near();await tick();assert.equal(x.requests(),1);console.log('PASS decision first; requires proximity');
 x=setup({saved:true});await tick();assert.equal(x.requests(),0);x.near();await tick();assert.equal(x.requests(),1);console.log('PASS saved rejection');
 x=setup({exists:false});x.win.emit('CookieScriptAccept');await tick();assert.equal(x.requests(),0);console.log('PASS absent component');
 x=setup();x.near();x.near(false);x.win.emit('CookieScriptAccept');await tick();assert.equal(x.requests(),0);console.log('PASS departed viewport');
 x=setup({saved:true,fail:true});x.near();await tick();assert.equal(x.win.TDBLogoMarqueeLoader.status().failed,true);x.win.emit('online');await tick();assert.equal(x.requests(),2);assert.equal(x.win.TDBLogoMarqueeLoader.status().loaded,true);console.log('PASS download failure/retry');
 x=setup();x.near();x.track.isConnected=false;x.win.emit('CookieScriptAccept');await tick();assert.equal(x.requests(),0);console.log('PASS removed component');
 x=setup();x.doc.cookie='CookieScriptConsent=bad-json';x.near();x.win.emit('CookieScriptLoaded');await tick();assert.equal(x.requests(),0);console.log('PASS malformed cookie stays gated');
})().catch(e=>{console.error(e);process.exit(1)});

/* Behavioural checks: real gate/loader/registry, controlled network completions. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const read = path => fs.readFileSync(path, 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const content = '<section id="video" class="vimeo-player" data-vimeo-player-init data-vimeo-content-init data-vimeo-video-id="123"><iframe></iframe><button data-vimeo-control="play">Play</button><button data-vimeo-control="pause">Pause</button></section>';
const hero = '<section id="video" data-vimeo-hero-shell><button data-vimeo-control="play">Play</button></section>';
const accept = {action:'accept',categories:['strict','functionality']};
const reject = {action:'reject',categories:['strict']};
function fixture({choice, markup=content, sharedReady=true, native=false}={}) {
  const dom = new JSDOM('<!doctype html><html><head><link data-tdb-ui-css rel="stylesheet" media="all" href="https://cdn.test/dist/tdb-ui.css"></head><body>'+markup+(native?read('src/consent/banner.html'):'')+'</body></html>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, d=w.document, observers=[], calls=[], warnings=[];
  let script=null, state=choice||{categories:['strict']};
  Object.defineProperty(d,'currentScript',{get:()=>script});
  w.console.warn=message=>warnings.push(message);
  w.Element.prototype.getAnimations=()=>[];
  w.Element.prototype.animate=()=>({cancel(){},finished:Promise.resolve()});
  w.Element.prototype.getBoundingClientRect=()=>({width:200,height:200,top:100,bottom:300,left:0,right:200});
  w.IntersectionObserver=class {
    constructor(cb,options){this.cb=cb;this.options=options;this.targets=new Set();observers.push(this);}
    observe(el){this.targets.add(el);}unobserve(el){this.targets.delete(el);}disconnect(){this.targets.clear();}
  };
  function evalFile(path, node={src:'https://cdn.test/dist/'+path.split('/').pop(),dataset:{}}) {
    script=node;try{w.eval(read(path));}finally{script=null;}
  }
  evalFile('dist/tdb-modules.js');
  if (native) {
    if(choice)d.cookie='CookieScriptConsent='+encodeURIComponent(JSON.stringify(choice))+'; Path=/';
    evalFile('dist/tdb-consent-startup.min.js');
  } else w.CookieScript={instance:{currentState:()=>state,show:()=>calls.push('settings')}};
  const shared=d.querySelector('link');
  function loadedStyle(node){Object.defineProperty(node,'sheet',{value:{},configurable:true});node.dispatchEvent(new w.Event('load'));}
  if(sharedReady)loadedStyle(shared);
  evalFile('dist/tdb-consent.min.js');
  d.dispatchEvent(new w.Event('DOMContentLoaded'));
  const find=marker=>d.querySelector('['+marker+']');
  function choiceChange(value,type='CookieScriptCurrentState') {
    state=value;
    if(native)d.cookie='CookieScriptConsent='+encodeURIComponent(JSON.stringify(value))+'; Path=/';
    w.dispatchEvent(new w.CustomEvent(type,{detail:value}));
  }
  function complete(marker,stub=false) {
    const node=find(marker);assert(node,marker+' was requested');
    if(stub){let ready=false;w.TDBVimeo={get initialised(){return ready;},init(){ready=true;calls.push('init');return{play:el=>calls.push('play:'+el.id)}}};}
    else evalFile('dist/'+new URL(node.src).pathname.split('/').pop(),node);
    node.dispatchEvent(new w.Event('load'));
    return node;
  }
  function near(){for(const o of [...observers])if(o.targets.size)o.cb([...o.targets].map(target=>({target,isIntersecting:true})));}
  const assets=()=>[...d.querySelectorAll('script[src],link[href]')].map(n=>n.src||n.href).filter(url=>/vimeo/i.test(url));
  return {dom,w,d,observers,calls,warnings,find,near,assets,choiceChange,complete,loadedStyle,shared,evalFile,close:()=>w.close()};
}
for(const choice of [undefined,reject,{action:'reject',categories:['functionality']},{action:'invalid',categories:['functionality']}])test('no Vimeo assets/observers for '+JSON.stringify(choice),async()=>{
  const f=fixture({choice,markup:hero});await tick();
  assert.deepEqual(f.assets(),[]);assert.equal(f.observers.length,0);
  f.d.querySelector('[data-vimeo-control="play"]').click();
  assert.deepEqual(f.calls,['settings']);assert.deepEqual(f.assets(),[]);
  assert.equal(f.d.querySelector('#video').getAttribute('data-vimeo-ui'),'awaiting-consent');
  f.w.dispatchEvent(new f.w.Event('CookieScriptClose'));
  assert.equal(f.d.querySelector('#video').getAttribute('data-vimeo-ui'),'idle');f.close();
});
for (const baseMarkup of [hero, content]) for (const target of ['.vimeo-player__loading path', '.vimeo-player__bg span', '[data-vimeo-control="pause"]']) {
  test('declined consent reopens from '+target+' in '+(baseMarkup===hero?'hero':'content'),async()=>{
    const extra='<div class="vimeo-player__loading"><svg><path></path></svg></div><div class="vimeo-player__bg"><span></span></div>'+(baseMarkup===hero?'<button data-vimeo-control="pause">Pause</button>':'');
    const f=fixture({choice:reject,markup:baseMarkup.replace('</section>',extra+'</section>')});await tick();
    const activate=()=>f.d.querySelector(target).dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,cancelable:true}));
    activate();assert.deepEqual(f.calls,['settings']);assert.deepEqual(f.assets(),[]);
    f.choiceChange(reject,'CookieScriptReject');
    assert.equal(f.d.querySelector('[data-vimeo-control="play"]').getAttribute('aria-busy'),'false');
    activate();assert.deepEqual(f.calls,['settings','settings']);assert.deepEqual(f.assets(),[]);
    f.close();
  });
}
test('a spinner consent request resumes the requested video after acceptance',async()=>{
  const f=fixture({choice:reject,markup:hero.replace('</section>','<div class="vimeo-player__loading"><svg><path></path></svg></div></section>')});
  f.d.querySelector('.vimeo-player__loading path').dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.deepEqual(f.calls,['settings']);assert.deepEqual(f.assets(),[]);
  f.choiceChange(accept);await tick();f.complete('data-tdb-vimeo-loader');await tick();
  f.loadedStyle(f.find('data-tdb-vimeo-css'));await tick();f.complete('data-vimeo-controller-js',true);await tick();
  assert.deepEqual(f.calls,['settings','init','play:video']);f.close();
});
test('permitted spinner/backplate/pause clicks are left to the player',async()=>{
  const f=fixture({choice:accept,markup:content.replace('</section>','<div class="vimeo-player__loading"></div><div class="vimeo-player__bg"></div></section>')});
  let received=0;f.d.querySelector('#video').addEventListener('click',()=>received++);
  for(const selector of ['.vimeo-player__loading','.vimeo-player__bg','[data-vimeo-control="pause"]'])f.d.querySelector(selector).click();
  assert.equal(received,3);assert.deepEqual(f.calls,[]);f.close();
});
test('a saved permitted choice releases one loader, then waits for proximity and both styles',async()=>{
  const f=fixture({choice:accept,sharedReady:false});await tick();
  assert.equal(f.assets().length,1);f.complete('data-tdb-vimeo-loader');await tick();
  assert.equal(f.assets().length,1);assert.equal(f.observers.length,1);
  f.near();const css=f.find('data-tdb-vimeo-css');assert(css);
  f.loadedStyle(css);await tick();assert.equal(f.find('data-vimeo-controller-js'),null);
  f.loadedStyle(f.shared);await tick();assert(f.find('data-vimeo-controller-js'));
  f.complete('data-vimeo-controller-js',true);await tick();assert.deepEqual(f.calls,['init']);
  assert.equal(f.w.TDBVimeoLoader.status().ready,true);
  assert(f.observers.every(o=>!o.targets.size));
  f.choiceChange(accept,'CookieScriptAcceptAll');await tick();assert.equal(f.d.querySelectorAll('[data-tdb-vimeo-loader]').length,1);f.close();
});
test('no video roots means no loader even with saved permission',async()=>{
  const f=fixture({choice:accept,markup:'<p>Plain page</p>'});await tick();assert.deepEqual(f.assets(),[]);f.close();
});
test('native first-visit decision releases Vimeo only after the preserved 470ms close',async()=>{
  const f=fixture({native:true});await sleep(40);
  f.d.querySelector('[data-vimeo-control="play"]').click();
  f.w.CookieScript.instance.acceptAllAction();
  await sleep(430);assert.deepEqual(f.assets(),[]);
  await sleep(65);assert(f.find('data-tdb-vimeo-loader'));
  f.complete('data-tdb-vimeo-loader');await tick();
  assert(f.find('data-tdb-vimeo-css'),'remembered play bypasses proximity after consent');
  f.loadedStyle(f.find('data-tdb-vimeo-css'));await tick();f.complete('data-vimeo-controller-js',true);await tick();
  assert.deepEqual(f.calls,['init','play:video']);
  assert.equal(f.d.querySelector('[data-vimeo-control="play"]').getAttribute('aria-busy'),'false');f.close();
});
test('native reject and closing settings cancel remembered play without Vimeo work',async()=>{
  const f=fixture({native:true});await sleep(40);f.w.CookieScript.instance.rejectAllAction();await sleep(490);
  assert.deepEqual(f.assets(),[]);
  f.d.querySelector('[data-vimeo-control="play"]').click();f.w.CookieScript.instance.hide();await sleep(490);
  assert.equal(f.d.querySelector('#video').getAttribute('data-vimeo-loading'),'false');
  assert.deepEqual(f.assets(),[]);f.close();
});
for(const stage of ['loader','css','controller'])test('withdrawal during '+stage+' blocks subsequent preparation',async()=>{
  const f=fixture({choice:accept});await tick();
  if(stage!=='loader'){f.complete('data-tdb-vimeo-loader');await tick();f.near();}
  if(stage==='controller'){f.loadedStyle(f.find('data-tdb-vimeo-css'));await tick();}
  f.choiceChange(reject,'CookieScriptReject');
  if(stage==='loader')f.complete('data-tdb-vimeo-loader');
  else if(stage==='css')f.loadedStyle(f.find('data-tdb-vimeo-css'));
  else f.complete('data-vimeo-controller-js',true);
  await tick();assert(!f.calls.includes('init'));
  if(stage==='loader')assert.equal(f.find('data-tdb-vimeo-css'),null);
  if(stage==='css')assert.equal(f.find('data-vimeo-controller-js'),null);
  assert(f.observers.every(o=>o.targets.size===0));f.close();
});
for(const stage of ['loader','css','controller'])test(stage+' failure can retry without duplicate assets',async()=>{
  const f=fixture({choice:accept});await tick();
  if(stage!=='loader'){f.complete('data-tdb-vimeo-loader');await tick();f.near();}
  if(stage==='controller'){f.loadedStyle(f.find('data-tdb-vimeo-css'));await tick();}
  const marker=stage==='loader'?'data-tdb-vimeo-loader':stage==='css'?'data-tdb-vimeo-css':'data-vimeo-controller-js';
  const first=f.find(marker);first.dispatchEvent(new f.w.Event('error'));await tick();
  f.d.querySelector('[data-vimeo-control="play"]').click();await tick();
  assert(f.find(marker));assert.notEqual(f.find(marker),first);assert.equal(f.d.querySelectorAll('['+marker+']').length,1);f.close();
});
test('real controller pauses active playback and prevents new playback after withdrawal',async()=>{
  const f=fixture({choice:accept});await tick();f.complete('data-tdb-vimeo-loader');await tick();f.near();f.loadedStyle(f.find('data-tdb-vimeo-css'));await tick();
  const players=[];let resolveReady;
  class Player {
    constructor(){this.events={};this.plays=0;this.pauses=0;players.push(this);}
    ready(){return Promise.resolve();}on(name,fn){this.events[name]=fn;}off(){}
    setMuted(){return Promise.resolve();}play(){this.plays++;this.events.play?.();return Promise.resolve();}
    pause(){this.pauses++;this.events.pause?.();return Promise.resolve();}
  }
  f.w.Vimeo={Player};f.complete('data-vimeo-controller-js');await tick();
  f.d.querySelector('[data-vimeo-control="play"]').click();await tick();await tick();
  assert.equal(players[0].plays,1);f.choiceChange(reject,'CookieScriptReject');await tick();
  assert(players[0].pauses>0);assert.equal(f.d.querySelector('#video').getAttribute('data-vimeo-playing'),'false');
  const count=players[0].plays;f.d.querySelector('[data-vimeo-control="play"]').click();await tick();assert.equal(players[0].plays,count);assert(f.calls.includes('settings'));f.close();
});
test('controller init failure never reports readiness or rebinds partially started work',async()=>{
  const f=fixture({choice:accept});await tick();f.evalFile('dist/tdb-vimeo.js');
  let attempts=0;f.w.IntersectionObserver=class{constructor(){attempts++;throw Error('synthetic init failure');}};
  assert.throws(()=>f.w.TDBVimeo.init(),/synthetic init failure/);assert.equal(f.w.TDBVimeo.initialised,false);
  assert.throws(()=>f.w.TDBVimeo.init(),/synthetic init failure/);assert.equal(attempts,1);f.close();
});
test('withdrawal while the SDK is in flight prevents iframe navigation and player creation',async()=>{
  const f=fixture({choice:accept});await tick();f.complete('data-tdb-vimeo-loader');await tick();f.near();f.loadedStyle(f.find('data-tdb-vimeo-css'));await tick();
  f.complete('data-vimeo-controller-js');await tick();
  const sdk=f.d.querySelector('script[src="https://player.vimeo.com/api/player.js"]');assert(sdk);
  f.d.querySelector('[data-vimeo-control="play"]').click();f.choiceChange(reject,'CookieScriptReject');
  let created=0;f.w.Vimeo={Player:class{constructor(){created++;}}};sdk.dispatchEvent(new f.w.Event('load'));
  await tick();await tick();assert.equal(created,0);assert.equal(f.d.querySelector('iframe').getAttribute('src'),null);f.close();
});
test('the deployed analytics policy is retained and retired Elfsight is never restored',async()=>{
  const f=fixture({choice:reject});await tick();
  assert.equal(f.find('data-tdb-ga-js'),null);assert.equal(f.find('data-tdb-elfsight-js'),null);
  f.choiceChange(accept,'CookieScriptAccept');await tick();
  assert.equal(f.find('data-tdb-ga-js'),null,'functionality alone does not release performance trackers');
  f.choiceChange({action:'accept',categories:['strict','performance','functionality']},'CookieScriptAcceptAll');await tick();
  for(const marker of ['data-tdb-ga-js','data-tdb-intellimize-js','data-tdb-meta-js'])assert.equal(f.d.querySelectorAll('['+marker+']').length,1);
  f.w.dispatchEvent(new f.w.Event('CookieScriptLoaded'));f.w.dispatchEvent(new f.w.Event('CookieScriptAcceptAll'));
  assert.equal(f.d.querySelectorAll('[data-tdb-ga-js]').length,1);assert.equal(f.find('data-tdb-elfsight-js'),null);f.close();
});

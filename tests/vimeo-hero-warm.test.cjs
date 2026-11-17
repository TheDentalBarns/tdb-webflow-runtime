const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture(file, { permitted=true, complete=true, slow=false, saved=false, sdk=true }={}) {
  const dom=new JSDOM(`<section data-vimeo-hero-shell><button data-vimeo-controls-layer data-tdb-hero-toggle></button>
    <div id="landscape" data-vimeo-player-init data-vimeo-hero-init data-vimeo-video-id="123" data-vimeo-autoplay="true"><iframe></iframe><img class="vimeo-bg__placeholder"></div>
    <div id="portrait" style="display:none" data-vimeo-player-init data-vimeo-hero-init data-vimeo-video-id="456" data-vimeo-autoplay="true"><iframe></iframe></div></section>`,
    {url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,shell=d.querySelector('section'),players=[],observers=[];
  let consent=true,top=900,visible=true,ready=complete;
  w.innerHeight=800;
  Object.defineProperty(d,'readyState',{get:()=>ready?'complete':'loading'});
  Object.defineProperty(d,'visibilityState',{get:()=>visible?'visible':'hidden'});
  Object.defineProperty(w.navigator,'connection',{value:{saveData:saved,effectiveType:slow?'3g':'4g'}});
  w.Element.prototype.getBoundingClientRect=()=>({top,bottom:top+800,left:0,right:1280,width:1280,height:800});
  w.IntersectionObserver=class {constructor(cb){this.cb=cb;observers.push(this);}observe(){}disconnect(){}};
  w.TDBConsent={allows:()=>consent,subscribe:()=>()=>{}};
  class Player {
    constructor(iframe){this.iframe=iframe;this.events={};this.plays=0;this.pauses=0;players.push(this);}
    ready(){return Promise.resolve();}setMuted(){return Promise.resolve();}
    on(name,fn){this.events[name]=fn;}off(){}
    play(){this.plays++;this.events.play?.();this.events.playing?.();return Promise.resolve();}
    pause(){this.pauses++;this.events.pause?.();return Promise.resolve();}
  }
  if(sdk)w.Vimeo={Player};
  w.eval(fs.readFileSync(file,'utf8'));const api=w.TDBVimeo.init();consent=permitted;
  return {w,d,shell,api,players,observers,Player,close:()=>w.close(),setConsent:v=>consent=v,setTop:v=>top=v,setVisible:v=>visible=v,setReady:v=>ready=v};
}

for (const file of ['src/components/vimeo.js','dist/tdb-vimeo.js']) {
  test(`${file}: warm selected hero once, keep poster, and reuse it on visible playback`,async()=>{
    const f=fixture(file);try {
      await tick();assert.equal(f.players.length,0,'idle page makes no speculative player');
      assert.equal(f.d.querySelector('iframe').getAttribute('src'),null);
      await Promise.all([f.api.warm(f.shell),f.api.warm(f.shell)]);
      assert.equal(f.players.length,1);assert.equal(f.players[0].plays,0);
      const url=new URL(f.d.querySelector('#landscape iframe').src);
      assert.equal(url.searchParams.get('preload'),'auto');assert.equal(url.searchParams.get('autoplay'),'0');
      assert.equal(f.d.querySelector('#portrait iframe').getAttribute('src'),null);
      assert.equal(f.d.querySelector('#landscape').getAttribute('data-vimeo-started'),'false');
      assert.equal(f.shell.getAttribute('data-vimeo-ui'),'idle');
      f.setTop(0);await f.api.play(f.shell);assert.equal(f.players.length,1);assert.equal(f.players[0].plays,1);
      f.d.querySelector('button').click();await tick();assert(f.players[0].pauses>0);
      await f.api.warm(f.shell);assert.equal(f.players[0].plays,1,'warming never overrides manual pause');
    } finally {f.close();}
  });
  for (const options of [{permitted:false},{complete:false},{slow:true},{saved:true}])
    test(`${file}: preparation respects ${JSON.stringify(options)}`,async()=>{
      const f=fixture(file,options);try{await f.api.warm(f.shell);assert.equal(f.players.length,0);assert.equal(f.d.querySelector('iframe').getAttribute('src'),null);}finally{f.close();}
    });
  test(`${file}: hidden or distant pages do no preparation; portrait selection is native`,async()=>{
    const f=fixture(file);try {
      f.setVisible(false);await f.api.warm(f.shell);assert.equal(f.players.length,0);
      f.setVisible(true);f.setTop(2000);await f.api.warm(f.shell);assert.equal(f.players.length,0);
      f.setTop(900);f.d.querySelector('#landscape').style.display='none';f.d.querySelector('#portrait').style.display='block';
      await f.api.warm(f.shell);assert.equal(f.players.length,1);assert.equal(f.players[0].iframe.parentElement.id,'portrait');
    } finally {f.close();}
  });
  test(`${file}: withdrawal while SDK loads prevents iframe preparation`,async()=>{
    const f=fixture(file,{sdk:false});try {
      const pending=f.api.warm(f.shell);f.setConsent(false);f.w.Vimeo={Player:f.Player};
      f.d.querySelector('script').dispatchEvent(new f.w.Event('load'));await pending;
      assert.equal(f.players.length,0);assert.equal(f.d.querySelector('iframe').getAttribute('src'),null);
    } finally {f.close();}
  });
}

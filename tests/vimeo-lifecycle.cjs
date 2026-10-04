/* Deterministic consent/network tests; the Vimeo SDK is stubbed, not real streaming. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const repo=path.resolve(__dirname,'..');
const mock=`window.players=[];window.Vimeo={Player:class {constructor(iframe){this.iframe=iframe;this.handlers={};this.plays=0;this.pauses=0;players.push(this)}ready(){return Promise.resolve()}on(n,f){(this.handlers[n]||=[]).push(f)}off(n,f){this.handlers[n]=(this.handlers[n]||[]).filter(v=>v!==f)}emit(n,arg){(this.handlers[n]||[]).forEach(f=>f(arg))}setMuted(x){this.muted=x;return Promise.resolve()}setVolume(x){this.volume=x;return Promise.resolve()}play(){this.plays++;this.emit('play');this.emit('playing');return Promise.resolve()}pause(){this.pauses++;this.emit('pause');return Promise.resolve()}setCurrentTime(x){return Promise.resolve()}getVideoWidth(){return Promise.resolve(1920)}getVideoHeight(){return Promise.resolve(1080)}}};`;
function root(cls,attrs,hero=false){return `<div class="${cls}" ${attrs}><div class="${hero?'vimeo-bg__iframe-wrapper':''}"><iframe class="${hero?'vimeo-bg__iframe':'vimeo-player__iframe'}" src=""></iframe></div><div class="${hero?'vimeo-bg__placeholder':'vimeo-player__placeholder'}"></div><div class="vimeo-player__before"></div>${!hero?controls():''}</div>`}
function controls(){return `<div class="vimeo-player__play" data-vimeo-control="play"><span class="vimeo-player__btn"><svg></svg></span></div><div class="vimeo-player__pause" data-vimeo-control="pause"><span class="vimeo-player__btn"><svg></svg></span></div><div class="vimeo-player__loading"></div><div class="vimeo-player__bg"><span class="vimeo-player__btn-pulse"></span></div>`}
const hero=`<section data-vimeo-hero-shell><div class="vimeo-controls-layer" data-vimeo-controls-layer>${controls()}</div>${root('vimeo-bg desktop','data-vimeo-player-init data-vimeo-hero-init data-vimeo-autoplay="true" data-vimeo-video-id="desktop"',true)}${root('vimeo-bg mobile','data-vimeo-player-init data-vimeo-hero-init data-vimeo-autoplay="true" data-vimeo-video-id="mobile"',true)}</section>`;
const content=root('vimeo-player','data-vimeo-player-init data-vimeo-content-init data-vimeo-video-id="content" data-vimeo-muted="false"');
const ambient=root('vimeo-bg ambient','data-vimeo-ambient-init data-vimeo-autoplay="true" data-vimeo-video-id="ambient"',true);
const style=`body{margin:0}section,.vimeo-player,.ambient{position:relative;height:300px;width:100%}.vimeo-bg:not(.ambient){position:absolute;inset:0}.vimeo-player__play,.vimeo-player__pause,.vimeo-player__loading{position:absolute;inset:0}.vimeo-player__btn{display:block;width:64px;height:64px}.vimeo-player__placeholder,.vimeo-bg__placeholder{position:absolute;inset:0}iframe{width:100%;height:100%}.vimeo-controls-layer{z-index:50}.mobile{display:none}@media(max-width:767px){.desktop{display:none}.mobile{display:block}}`;
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE || undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const width of [390,1440]){
 const ctx=await b.newContext({viewport:{width,height:700},hasTouch:width===390,isMobile:width===390});const p=await ctx.newPage(),req=[];
 await ctx.route('https://vimeo.test/**',async r=>{const file=new URL(r.request().url()).pathname.split('/').pop();if(file.endsWith('.js')||file.endsWith('.css')){req.push(file);if(file==='tdb-vimeo.js')await new Promise(res=>setTimeout(res,120));return r.fulfill({contentType:file.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(path.join(repo,'dist',file),'utf8')})}return r.fulfill({contentType:'text/html',body:`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${style}${fs.readFileSync(path.join(__dirname,'fixtures/vimeo-native-defaults.css'),'utf8')}</style><script>window.allowed=false;window.prompts=0;window.CookieScript={instance:{currentState:()=>({categories:allowed?['functionality']:[]}),show:()=>prompts++}};</script>${hero}<div style="height:1600px"></div>${content}<div style="height:1600px"></div>${ambient}<script defer src="/tdb-vimeo-loader.js"></script>`})});
 await ctx.route('https://player.vimeo.com/**',r=>{req.push(r.request().url());return r.fulfill({contentType:'text/javascript',body:r.request().url().endsWith('/api/player.js')?mock:''})});
 await p.goto('https://vimeo.test/');await p.waitForTimeout(250);
 assert.equal(req.includes('tdb-vimeo.js'),false);assert(!req.some(u=>u.includes('player.vimeo.com')));
 assert.equal(await p.locator('.vimeo-player__pause').first().evaluate(n=>getComputedStyle(n).visibility),'hidden');
 await p.locator('[data-vimeo-hero-shell] [data-vimeo-control=play]').click();assert.equal(await p.evaluate(()=>prompts),1);assert.equal(req.includes('tdb-vimeo.js'),false);
 await p.evaluate(()=>{allowed=true;dispatchEvent(new Event('CookieScriptAcceptAll'))});
 await p.waitForFunction(()=>window.TDBVimeo?.initialised&&document.querySelector('[data-vimeo-hero-shell]').getAttribute('data-vimeo-ui')==='playing');await p.waitForTimeout(350);
 assert.equal(req.filter(f=>f==='tdb-vimeo.js').length,1);assert.equal(await p.evaluate(()=>players.length),1);assert.equal(await p.evaluate(()=>players[0].plays),1);
 assert((await p.evaluate(()=>players[0].iframe.src)).includes(width===390?'mobile':'desktop'));
 await p.locator('[data-vimeo-hero-shell] [data-vimeo-control=pause]').click();assert.equal(await p.locator('[data-vimeo-hero-shell]').getAttribute('data-vimeo-ui'),'paused');
 await p.evaluate(()=>scrollTo(0,1200));await p.waitForTimeout(200);await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>players[0].plays),1,'manual pause persists');
 // Content player does not autoplay. Its near/intent warmup shares the same SDK.
 await p.locator('[data-vimeo-content-init]').scrollIntoViewIfNeeded();await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>players.length),1);
 await p.locator('[data-vimeo-content-init] [data-vimeo-control=play]').click();await p.waitForFunction(()=>document.querySelector('[data-vimeo-content-init]').getAttribute('data-vimeo-playing')==='true');
 assert.equal(await p.evaluate(()=>players.find(v=>v.iframe.closest('[data-vimeo-content-init]')).muted),false);
 await p.locator('[data-vimeo-content-init] [data-vimeo-control=pause]').click();assert.equal(await p.locator('[data-vimeo-content-init]').getAttribute('data-vimeo-playing'),'false');
 await p.locator('[data-vimeo-ambient-init]').scrollIntoViewIfNeeded();await p.waitForFunction(()=>players.some(v=>v.iframe.src.includes('ambient')&&v.plays>0));
 await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(250);assert((await p.evaluate(()=>players.find(v=>v.iframe.src.includes('ambient')).pauses))>0);
 await p.evaluate(()=>{allowed=false;dispatchEvent(new Event('CookieScriptReject'))});await p.waitForTimeout(150);assert.equal(await p.locator('[data-vimeo-content-init]').getAttribute('data-vimeo-playing'),'false');
 assert.equal(req.filter(u=>u==='https://player.vimeo.com/api/player.js').length,1,'SDK shared once');
 await p.addScriptTag({content:fs.readFileSync(path.join(repo,'dist/tdb-vimeo.js'),'utf8')});assert(await p.evaluate(()=>TDBVimeo.init()===TDBVimeo.init()));
 console.log('PASS',width,'early consent press, queued play once, responsive hero, pause persistence, content manual play, ambient viewport lifecycle, shared SDK, consent rejection, duplicate guard');await ctx.close();
 }
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

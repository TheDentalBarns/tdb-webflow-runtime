const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../../src/five-senses/loader.js','utf8');
const helper=source.slice(source.indexOf('  function holdPageMedia(){'),source.indexOf('  function dispose('));
function player(paused){return {paused,pauses:0,plays:0,handlers:new Map(),on(e,f){this.handlers.set(e,f)},off(e,f){if(this.handlers.get(e)===f)this.handlers.delete(e)},getPaused(){return Promise.resolve(this.paused)},pause(){this.paused=true;this.pauses++;return Promise.resolve()},play(){this.paused=false;this.plays++;this.handlers.get('play')?.();return Promise.resolve()}}}
function root(p,state){const attrs={'data-vimeo-autoplay':'true'};return {_vimeoPlayer:p,_heroState:state,isConnected:true,getAttribute:k=>attrs[k]??null,setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],getBoundingClientRect:()=>({width:100,height:100,top:0,bottom:100})}}
async function flush(){await new Promise(r=>setImmediate(r));}
function setup(roots){let refreshes=0;const document={hidden:false,querySelectorAll:s=>s==='video'?[]:roots};const env={document,innerHeight:800,active:null,mediaHoldVersion:0,Event,window:{dispatchEvent(){refreshes++}}};vm.createContext(env);vm.runInContext(helper+';this.hold=holdPageMedia',env);return {env,refreshes:()=>refreshes};}
(async()=>{
 // An SDK player can be ready but still paused/loading; no pause event is required.
 const a=player(true),ra=root(a,{ui:'loading',busy:true,pausedByUser:false});let test=setup([ra]);let release=test.env.hold();await flush();assert.equal(a.pauses,1);release();await flush();assert.equal(a.plays,1);assert.equal(a.handlers.size,0);
 // Readiness after close must resume the retained loading intent.
 let ready;const b=player(true),rb=root(null,{ui:'loading',busy:true,pausedByUser:false});rb._vimeoPlayerPromise=new Promise(r=>ready=r);test=setup([rb]);release=test.env.hold();release();ready(b);await flush();assert.equal(b.plays,1);assert.equal(b.pauses,0);assert.equal(b.handlers.size,0);
 // Readiness during the experience pauses; close later resumes exactly once.
 let ready2;const c=player(true),rc=root(null,{ui:'loading',busy:true,pausedByUser:false});rc._vimeoPlayerPromise=new Promise(r=>ready2=r);test=setup([rc]);release=test.env.hold();ready2(c);await flush();assert.equal(c.pauses,1);release();await flush();assert.equal(c.plays,1);
 // A deliberate user pause remains paused.
 const d=player(true),rd=root(d,{ui:'paused',pausedByUser:true});test=setup([rd]);release=test.env.hold();await flush();release();await flush();assert.equal(d.plays,0);
 // A never-created idle player is left to the existing consent-aware controller.
 const re=root(null,{ui:'idle',pausedByUser:false});test=setup([re]);release=test.env.hold();release();await flush();assert(test.refreshes()>0);assert.equal(re.getAttribute('data-vimeo-autoplay'),'true');assert.equal(re._vimeoPlayer,null);
 // Page exit never resumes, including deferred readiness.
 let ready3;const f=player(true),rf=root(null,{ui:'loading',pausedByUser:false});rf._vimeoPlayerPromise=new Promise(r=>ready3=r);test=setup([rf]);release=test.env.hold();release(false);ready3(f);await flush();assert.equal(f.plays,0);assert.equal(test.refreshes(),0);
 // An old close continuation cannot resume after a newer opening owns media.
 let ready4;const g=player(true),rg=root(null,{ui:'loading',pausedByUser:false});rg._vimeoPlayerPromise=new Promise(r=>ready4=r);test=setup([rg]);const oldRelease=test.env.hold();oldRelease();const newRelease=test.env.hold();ready4(g);await flush();assert.equal(g.plays,0);newRelease();await flush();assert.equal(g.plays,1);assert.equal(g.handlers.size,0);
 console.log('PASS: ready/loading, ready-before-close, ready-after-close, user pause, idle consent path, page exit, stale close continuation');
})().catch(e=>{console.error(e);process.exitCode=1});

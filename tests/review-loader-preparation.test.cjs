const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync(__dirname+'/../src/reviews/native/loader.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function settle(){for(let i=0;i<5;i++)await tick();}
function setup(){
 const dom=new JSDOM('<script src="https://example.test/dist/tdb-reviews-loader.js"></script><section data-tdb-review-introduction><button data-tdb-review-trigger>Reviews</button></section><aside data-tdb-reviews></aside>',{url:'https://example.test',runScripts:'outside-only'});
 const w=dom.window,loads=[],mounts=[],observers=[],idle=[];let permitted=false,notify,hooks,fail=false;
 Object.defineProperty(w.document,'currentScript',{value:w.document.querySelector('script')});
 w.IntersectionObserver=class{constructor(fn,opts){this.fn=fn;this.opts=opts;observers.push(this)}observe(){}unobserve(){}};
 w.requestIdleCallback=fn=>idle.push(fn);
 w.TDBReviewOptions={permission:()=>permitted,subscribe:fn=>notify=fn};
 w.TDBModules={load:async url=>{const name=url.pathname.split('/').pop();loads.push(name);if(fail&&name==='tdb-reviews.js')throw Error('Offline');}};
 const data={records:[],total:85,average:4.94,ensureIdentity:async()=>{},ensure:async()=>{}};
 w.TDBReviewCMS={load:async()=>data,resolveIdentity:()=>''};
 w.TDBReviewIntroduction={mount(root,opts){hooks=opts;mounts.push('intro');opts.prepare().then(()=>mounts.push('ticker-ready'));return{destroy(){mounts.push('destroy-intro');}}}};
 w.TDBReviews={mount(){mounts.push('drawer');return{open:async()=>mounts.push('open'),destroy:()=>mounts.push('destroy-drawer')}}};
 w.eval(code);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const root=w.document.querySelector('section'),trigger=root.querySelector('button');
 return {w,loads,mounts,trigger,near(){observers[0].fn([{target:root,isIntersecting:true}]);},visible(){observers[1].fn([{target:root,isIntersecting:true}]);},idle(){idle.splice(0).forEach(fn=>fn());},permit(value){permitted=value;notify();},fail(value){fail=value;},close(){w.close();}};
}
(async()=>{
 const t=setup();t.near();t.visible();t.idle();await settle();assert.deepEqual(t.loads,[]);
 t.permit(true);await settle();assert.deepEqual(t.mounts,['intro','ticker-ready']);
 assert(!t.loads.includes('tdb-reviews.js'));assert(!t.loads.some(x=>x.includes('swiper')),'No drawer modules in intro proximity path');
 t.idle();await settle();assert(t.loads.includes('tdb-reviews.js'));assert(t.loads.some(x=>x.includes('swiper')));assert(!t.mounts.includes('drawer'),'Visible idle warmup only downloads definitions');
 t.trigger.dispatchEvent(new t.w.Event('pointerover',{bubbles:true}));await settle();assert.equal(t.mounts.filter(x=>x==='drawer').length,1);
 await Promise.all([t.w.TDBReviewLoader.prepare(),t.w.TDBReviewLoader.open({trigger:t.trigger})]);assert.equal(t.mounts.filter(x=>x==='drawer').length,1);assert(t.mounts.includes('open'));
 t.permit(false);assert(t.mounts.includes('destroy-drawer'));assert(t.mounts.includes('destroy-intro'));
 t.permit(true);await settle();assert.equal(t.mounts.filter(x=>x==='intro').length,2);assert.equal(t.mounts.filter(x=>x==='drawer').length,1,'Regrant does not eagerly remount drawer');t.close();
 const retry=setup();retry.permit(true);retry.near();await settle();retry.fail(true);await assert.rejects(retry.w.TDBReviewLoader.prepare(),/Offline/);assert(!retry.mounts.includes('drawer'));retry.fail(false);await retry.w.TDBReviewLoader.open({trigger:retry.trigger});assert.equal(retry.mounts.filter(x=>x==='drawer').length,1);assert(retry.mounts.includes('open'));retry.close();
 console.log('PASS intro-only preparation, viewport idle download, intent mount, concurrent open, cancellation, regrant and retry');
})().catch(error=>{console.error(error);process.exitCode=1});

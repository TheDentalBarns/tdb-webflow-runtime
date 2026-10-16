const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
function setup(search=''){
 const dom=new JSDOM('<main><a href="#experience" data-tdb-senses-open>Open experience</a></main>',{url:'https://dentalbarns.webflow.io/'+search,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,frames=[],motions=[];let showed=0;
 Object.defineProperty(w.document,'currentScript',{value:{src:'https://example.test/release/dist/tdb-five-senses-loader.js',dataset:{}}});
 w.eval(fs.readFileSync('src/shared/scroll-lock.js','utf8').replace('__TDB_SCROLL_LOCK_CSS__',JSON.stringify(fs.readFileSync('src/styles/tdb-scroll-lock.css','utf8'))));
 w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};w.cancelAnimationFrame=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){assert(w.document.querySelector('style[data-tdb-senses-shell]'),'loading CSS exists before modal paint');this.open=true;showed++;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.Element.prototype.animate=function(){let finish;const motion={finished:new Promise(resolve=>finish=resolve),cancel(){},finish:()=>finish()};motions.push(motion);return motion;};
 return {w,dom,frames,motions,get showed(){return showed;},load:()=>w.eval(fs.readFileSync('dist/tdb-five-senses-loader.js','utf8'))};
}
test('ordinary homepage installs no dormant shell CSS; first open installs once and remains cancellable',async()=>{
 const f=setup();try{
  f.load();assert.equal(f.w.document.querySelector('[data-tdb-senses-shell]'),null);
  const open=f.w.document.querySelector('a');f.w.TDBFiveSensesEntry.open(open);assert.equal(f.showed,1);assert.equal(f.w.document.querySelectorAll('style[data-tdb-senses-shell]').length,1);assert(f.w.TDBScrollLock.active);
  const dialog=f.w.document.querySelector('dialog');assert(dialog.querySelector('[role="status"]'));dialog.querySelector('button').click();f.motions.at(-1).finish();await Promise.resolve();await Promise.resolve();
  assert.equal(f.w.document.querySelector('dialog'),null);assert(!f.w.TDBScrollLock.active);assert.equal(f.w.document.activeElement,open);
  f.w.TDBFiveSensesEntry.open(open);assert.equal(f.showed,2);assert.equal(f.w.document.querySelectorAll('style[data-tdb-senses-shell]').length,1);
  f.w.dispatchEvent(new f.w.Event('pagehide'));assert.equal(f.w.document.querySelector('dialog'),null);
 }finally{f.w.close();}
});
test('controller remains definition-only even on a legacy automatic-entry URL',()=>{
 const f=setup('?five-senses=1');try{f.load();assert.equal(f.showed,0);assert.equal(f.w.location.search,'?five-senses=1');assert.equal(f.w.document.querySelector('[data-tdb-senses-shell]'),null);f.w.dispatchEvent(new f.w.Event('pagehide'));}finally{f.w.close();}
});
test('minified ES module preserves exports and consults the shared policy before media work',async()=>{
 const source=fs.readFileSync('dist/tdb-five-senses.js','utf8');
 const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 assert.equal(typeof module.mountExperience,'function');
 assert.equal(typeof module.SceneRenderer,'function');
 assert.equal(typeof module.Soundscape,'function');
 const previous=global.window;
 try {for(const owner of ['TDBMotionPolicy','TDBMotion']){
  const sentinel=Error('shared policy read'),window={};Object.defineProperty(window,owner,{value:{get reduced(){throw sentinel;}}});global.window=window;
  await assert.rejects(module.mountExperience({}),error=>error===sentinel);
 }}finally{if(previous===undefined)delete global.window;else global.window=previous;}
});

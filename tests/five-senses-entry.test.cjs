const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
function setup(search=''){
 const dom=new JSDOM('<main><a href="#experience" data-tdb-senses-open>Open experience</a></main>',{url:'https://dentalbarns.webflow.io/'+search,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,frames=[],motions=[];let showed=0;
 Object.defineProperty(w.document,'currentScript',{value:{src:'https://example.test/release/dist/tdb-five-senses-loader.js',dataset:{}}});
 w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};w.cancelAnimationFrame=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){assert(w.document.querySelector('style[data-tdb-senses-shell]'),'loading CSS exists before modal paint');this.open=true;showed++;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.Element.prototype.animate=function(){let finish;const motion={finished:new Promise(resolve=>finish=resolve),cancel(){},finish:()=>finish()};motions.push(motion);return motion;};
 return {w,dom,frames,motions,get showed(){return showed;},load:()=>w.eval(fs.readFileSync('dist/tdb-five-senses-loader.js','utf8'))};
}
test('ordinary homepage installs no dormant shell CSS; first open installs once and remains cancellable',async()=>{
 const f=setup();try{
  f.load();assert.equal(f.w.document.querySelector('[data-tdb-senses-shell]'),null);
  const open=f.w.document.querySelector('a');open.click();assert.equal(f.showed,1);assert.equal(f.w.document.querySelectorAll('style[data-tdb-senses-shell]').length,1);assert(f.w.document.documentElement.classList.contains('tdb-senses-scroll-locked'));
  const dialog=f.w.document.querySelector('dialog');assert(dialog.querySelector('[role="status"]'));dialog.querySelector('button').click();f.motions.at(-1).finish();await Promise.resolve();await Promise.resolve();
  assert.equal(f.w.document.querySelector('dialog'),null);assert(!f.w.document.documentElement.classList.contains('tdb-senses-scroll-locked'));assert.equal(f.w.document.activeElement,open);
  open.click();assert.equal(f.showed,2);assert.equal(f.w.document.querySelectorAll('style[data-tdb-senses-shell]').length,1);
  f.w.dispatchEvent(new f.w.Event('pagehide'));assert.equal(f.w.document.querySelector('dialog'),null);
 }finally{f.w.close();}
});
test('direct-entry boot receives CSS before its automatic loading view and clears the boot cover',()=>{
 const f=setup('?five-senses=1');try{f.w.document.documentElement.classList.add('tdb-senses-boot');f.load();assert.equal(f.showed,1);assert(!f.w.document.documentElement.classList.contains('tdb-senses-boot'));assert.equal(f.w.location.search,'');f.w.dispatchEvent(new f.w.Event('pagehide'));}finally{f.w.close();}
});
test('scene initialization consults the shared policy without starting image or audio work',async()=>{
 const source=fs.readFileSync('dist/tdb-five-senses.js','utf8').replace(/^export /gm,'')+'\nthis.mount=mountExperience;';
 for(const owner of ['TDBMotionPolicy','TDBMotion']){
  const sentinel=Error('shared policy read'),window={};Object.defineProperty(window,owner,{value:{get reduced(){throw sentinel;}}});const context={window,AbortController};vm.createContext(context);vm.runInContext(source,context);await assert.rejects(context.mount({}),error=>error===sentinel);
 }
});
